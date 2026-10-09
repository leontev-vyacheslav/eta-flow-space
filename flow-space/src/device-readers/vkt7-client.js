'use strict';
/**
 * Vkt7Client
 *
 * TCP client for the Teplokom VKT-7 heat calculator, connected through a
 * TCP-serial modem (e.g. Wiznet in TCP server mode) straight to its RS-232 /
 * RS-485 port. Implements "Реализация протокола обмена для связи с
 * вычислителем ВКТ-7" (Teplokom): a Modbus RTU frame (address, function
 * 0x03 read / 0x10 write, CRC16 0xA001 low byte first) with VKT-7's own
 * meaning for the "start address" field:
 *
 *   0x3FFF write  start session (fixed tail CC 80 00 00 00) / element list
 *   0x3FFD write  value type: 4 current, 5 hourly totals, 6 properties
 *   0x3FFC read   list of active elements: { id: u32 LE, size: u16 LE }[]
 *   0x3FFE read   data for the written element list
 *   0x3FF9 read   service info (firmware in byte 0: 0x27 = "2.7")
 *   0x3FFB read   device date and time (firmware 1.9+)
 *
 * Sequence per read():
 *   1. Start session, then one data read: byte 64 of that reply is the
 *      "server version", which says how unit names are encoded.
 *   2. Service info -> firmware.
 *   3. Properties (type 6): decimal places for t, V, M, P, Q. Every value
 *      except flow rates and the additional input comes as a scaled
 *      integer: 12345 with 2 decimal places is 123.45.
 *   4. Active element list: which elements this measurement scheme uses
 *      and how many bytes each one takes in a data reply.
 *   5. Current values (type 4), then hourly totals (type 5): writes the
 *      wanted elements that are active, reads their data. A long list is
 *      split so that one reply stays well below the 264-byte frame limit.
 *   6. Device clock (firmware 1.9+ only).
 *
 * Every element in a data reply is followed by a quality byte (0xC0 good,
 * 0x00 bad: out of range or not in the scheme) and an abnormal-situation
 * byte. Values with bad quality are returned as null.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and a data reply has exactly the length
 * the element list predicts. Anything else fails the whole read() — a
 * value is never stored under the wrong field (see the EK270 shared-line
 * incident).
 *
 * Wake-up: an RS-232 VKT-7 sleeps and needs at least two 0xFF bytes in
 * front of every request; the built-in RS-485 adapter does not (pass
 * wakeUpBytes: 0 there, and an address other than 0).
 *
 * Serial settings of the modem: 8 data bits, no parity, 2 stop bits,
 * 1200-19200 baud as set in the calculator. The calculator ends a frame on
 * 62.5 ms of silence, so the modem must send a request in one piece.
 *
 * Usage:
 *   const client = new Vkt7Client({ host: '10.0.0.10', port: 5000 });
 *   const results = await client.read();
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const FUNCTION_READ = 0x03;
const FUNCTION_WRITE = 0x10;
const EXCEPTION_BIT = 0x80;

const ADDRESS_ELEMENT_LIST = 0x3fff;
const ADDRESS_DATA = 0x3ffe;
const ADDRESS_VALUE_TYPE = 0x3ffd;
const ADDRESS_ACTIVE_ELEMENTS = 0x3ffc;
const ADDRESS_DATE_TIME = 0x3ffb;
const ADDRESS_SERVICE_INFO = 0x3ff9;

const VALUE_TYPE_CURRENT = 4;
const VALUE_TYPE_TOTALS = 5;
const VALUE_TYPE_PROPERTIES = 6;

// Element ids are sent with this bit set in an element list.
const ELEMENT_LIST_FLAG = 0x40000000;

const QUALITY_MASK = 0xc0;
const QUALITY_BAD = 0x00;

// Exception code of a data read: the measurement scheme changed, so the
// active element list has to be read and written again.
const EXCEPTION_SCHEME_CHANGED = 5;

// "Start session" write after the register count: a byte count of 0xCC
// that deliberately does not match the 4 data bytes (protocol, 2.1).
const START_SESSION_TAIL = [0xcc, 0x80, 0x00, 0x00, 0x00];
const SERVER_VERSION_OFFSET = 64;

// Properties read in step 3: [element id, decimal-places key]. Unit names
// come first (7 bytes each in the element list), then decimal places
// (1 byte each), in the order of the protocol description.
const UNIT_ELEMENTS = {
    temperature: 44,
    flowRate: 45,
    volume: 46,
    mass: 47,
    pressure: 48,
    heat: 53,
    normalOperationTime: 55,
    stopTimeOrAdditionalInput: 56,
};
const DECIMAL_ELEMENTS = {
    t: 57,
    v1: 59,
    m1: 60,
    p: 61,
    q1: 66,
    m2: 70,
    v2: 69,
    q2: 76,
};
const UNIT_SIZE = 7;
const DECIMAL_SIZE = 1;

// Wanted elements (heat input 1): name -> [element id, kind,
// decimal-places key]. kind: 'int' scaled integer, 'float' IEEE754 LE,
// 'count' plain integer. Names follow the Взлёт 026 state.
const CURRENT_ELEMENTS = {
    temperatureInputPipe: [0, 'int', 't'],
    temperatureReturnPipe: [1, 'int', 't'],
    pressureInputPipe: [9, 'int', 'p'],
    pressureReturnPipe: [10, 'int', 'p'],
    volumeFlowRateInputPipe: [19, 'float'],
    volumeFlowRateReturnPipe: [20, 'float'],
};

// Hourly totals: integrals from the archive reset to the end of the
// previous hour.
const TOTAL_ELEMENTS = {
    volumeInputPipe: [3, 'int', 'v1'],
    volumeReturnPipe: [4, 'int', 'v1'],
    massInputPipe: [6, 'int', 'm1'],
    massReturnPipe: [7, 'int', 'm1'],
    totalHeatConsumption: [12, 'int', 'q1'],
    normalOperationTime: [17, 'count'],
    noCountTime: [18, 'count'],
};

// CP866 (OEM) letters used in unit names; anything else outside ASCII -> '?'.
function decodeOem(bytes) {
    let out = '';
    for (const b of bytes) {
        if (b < 0x80) out += String.fromCharCode(b);
        else if (b <= 0xaf) out += String.fromCharCode(0x0410 + b - 0x80);
        else if (b >= 0xe0 && b <= 0xef) out += String.fromCharCode(0x0440 + b - 0xe0);
        else if (b === 0xf0) out += 'Ё';
        else if (b === 0xf1) out += 'ё';
        else if (b === 0xf8) out += '°';
        else out += '?';
    }
    return out.replace(/\0/g, '').trim();
}

class Vkt7ExceptionError extends Error {
    constructor(request, code) {
        super(`Vkt7Client: device exception ${code} on request 0x${request.toString(16)}`);
        this.code = code;
    }
}

class Vkt7Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial modem IP/hostname (e.g. Wiznet).
     * @param {number} options.port - Modem TCP port.
     * @param {number} [options.address=0] - Network number of the calculator (0 answers on a point-to-point line).
     * @param {number} [options.wakeUpBytes=2] - 0xFF bytes in front of every request (0 for the built-in RS-485 adapter).
     * @param {number} [options.stepDelayMs=150] - Pause after a reply before the next request (frame gap is 62.5 ms).
     * @param {number} [options.stepTimeoutMs=3000] - Wait for a valid reply to one request.
     * @param {number} [options.frameGapMs=200] - Silence that ends a reply whose length byte does not match.
     * @param {number} [options.retries=1] - Extra requests after a request got no valid reply.
     * @param {number} [options.maxReplyDataBytes=200] - Element list is split so a data reply stays within this.
     * @param {number} [options.responseTimeoutMs=60000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     */
    constructor({
        host,
        port,
        address = 0,
        wakeUpBytes = 2,
        stepDelayMs = 150,
        stepTimeoutMs = 3000,
        frameGapMs = 200,
        retries = 1,
        maxReplyDataBytes = 200,
        responseTimeoutMs = 60000,
        trace = null,
    } = {}) {
        if (!host) throw new Error('Vkt7Client: "host" is required');
        if (!port) throw new Error('Vkt7Client: "port" is required');

        this.host = host;
        this.port = port;
        this.address = address;
        this.wakeUpBytes = wakeUpBytes;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.frameGapMs = frameGapMs;
        this.retries = retries;
        this.maxReplyDataBytes = maxReplyDataBytes;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;

        // Filled by read(): server version, unit names and decimal places
        // as the device reported them (for commissioning; not in the state).
        this.properties = null;
    }

    static get CURRENT_ELEMENTS() {
        return CURRENT_ELEMENTS;
    }

    static get TOTAL_ELEMENTS() {
        return TOTAL_ELEMENTS;
    }

    // CRC16 with polynomial 0xA001 and initial value 0xFFFF (Appendix A).
    static crc16(bytes) {
        let crc = 0xffff;
        for (const b of bytes) {
            crc ^= b;
            for (let i = 0; i < 8; i++) crc = (crc & 1) ? ((crc >>> 1) ^ 0xa001) : (crc >>> 1);
        }
        return crc;
    }

    static _withCrc(bytes) {
        const crc = Vkt7Client.crc16(bytes);
        return Buffer.concat([Buffer.from(bytes), Buffer.from([crc & 0xff, crc >>> 8])]);
    }

    static _crcOk(frame) {
        if (frame.length < 4) return false;
        const crc = Vkt7Client.crc16(frame.subarray(0, frame.length - 2));
        return frame[frame.length - 2] === (crc & 0xff) && frame[frame.length - 1] === (crc >>> 8);
    }

    // Request without wake-up bytes. Start address and register count are
    // big-endian; every other multi-byte field is little-endian.
    buildReadRequest(startAddress) {
        return Vkt7Client._withCrc([this.address, FUNCTION_READ, startAddress >>> 8, startAddress & 0xff, 0, 0]);
    }

    buildWriteRequest(startAddress, body) {
        return Vkt7Client._withCrc([
            this.address, FUNCTION_WRITE, startAddress >>> 8, startAddress & 0xff, 0, 0, body.length, ...body,
        ]);
    }

    buildStartSessionRequest() {
        return Vkt7Client._withCrc([this.address, FUNCTION_WRITE, 0x3f, 0xff, 0, 0, ...START_SESSION_TAIL]);
    }

    buildElementListRequest(elements) {
        const body = Buffer.alloc(elements.length * 6);
        elements.forEach(({ id, size }, i) => {
            body.writeUInt32LE((id | ELEMENT_LIST_FLAG) >>> 0, i * 6);
            body.writeUInt16LE(size, i * 6 + 4);
        });
        return this.buildWriteRequest(ADDRESS_ELEMENT_LIST, body);
    }

    // Opens the socket and returns { request, close }. request(frame)
    // resolves with the data section of a read reply, or true for a write
    // confirmation; rejects with Vkt7ExceptionError on an exception reply,
    // or with an Error when no valid reply came within stepTimeoutMs.
    _connect() {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let buffer = Buffer.alloc(0);
            let pending = null;
            let closedError = null;

            const settle = (fn, value) => {
                const current = pending;
                if (!current) return;
                pending = null;
                clearTimeout(current.timer);
                clearTimeout(current.gapTimer);
                fn === 'resolve' ? current.resolve(value) : current.reject(value);
            };

            // Matches the buffer against the reply expected for `pending`.
            // `gapElapsed` allows a read reply whose length byte disagrees
            // with its real length (the byte cannot count past 255), as
            // long as the CRC over the whole buffer is valid.
            const check = (gapElapsed) => {
                if (!pending) return;
                const { frame } = pending;
                const address = frame[0], fn = frame[1];

                // Drop wake-up bytes and an echo of the request (some
                // RS-232/485 converters echo what they send).
                while (buffer.length && buffer[0] === 0xff && address !== 0xff) buffer = buffer.subarray(1);
                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                if (buffer.length < 2) return;
                if (buffer[0] !== address) return;

                if (buffer[1] === (fn | EXCEPTION_BIT) && buffer.length >= 6 && Vkt7Client._crcOk(buffer.subarray(0, 6))) {
                    settle('reject', new Vkt7ExceptionError(pending.startAddress, buffer[2]));
                    return;
                }
                if (buffer[1] !== fn) return;

                if (fn === FUNCTION_WRITE) {
                    if (buffer.length >= 8 && Vkt7Client._crcOk(buffer.subarray(0, 8))
                        && buffer.subarray(0, 6).equals(frame.subarray(0, 6))) {
                        settle('resolve', true);
                    }
                    return;
                }

                if (buffer.length < 3) return;
                const declaredLength = 3 + buffer[2] + 2;
                if (buffer.length === declaredLength && Vkt7Client._crcOk(buffer)) {
                    settle('resolve', buffer.subarray(3, declaredLength - 2));
                    return;
                }
                if (gapElapsed && buffer.length > 5 && Vkt7Client._crcOk(buffer)) {
                    settle('resolve', buffer.subarray(3, buffer.length - 2));
                }
            };

            const request = (frame) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const startAddress = (frame[2] << 8) | frame[3];
                const out = Buffer.concat([Buffer.alloc(this.wakeUpBytes, 0xff), frame]);
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    startAddress,
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `Vkt7Client: no valid reply to request 0x${startAddress.toString(16)}`)), this.stepTimeoutMs),
                    gapTimer: null,
                };
                if (this.trace) this.trace('>', out);
                socket.write(out);
            });

            socket.on('data', (chunk) => {
                if (this.trace) this.trace('<', chunk);
                buffer = Buffer.concat([buffer, chunk]);
                check(false);
                if (pending) {
                    clearTimeout(pending.gapTimer);
                    pending.gapTimer = setTimeout(() => check(true), this.frameGapMs);
                }
            });

            const onClosed = (err) => {
                if (!closedError) closedError = err;
                settle('reject', closedError);
                reject(closedError);
            };
            socket.on('error', (err) => onClosed(err));
            socket.on('close', () => onClosed(new Error('Vkt7Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Retries a request that got no valid reply; an
                    // exception reply is the device's answer and is not
                    // repeated.
                    request: async (frame) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const reply = await request(frame);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return reply;
                            } catch (err) {
                                if (err instanceof Vkt7ExceptionError || closedError || attempt >= this.retries) throw err;
                            }
                        }
                    },
                    // destroy() instead of end(): the modem never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vkt7Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // Parses the properties reply: 8 unit names, then 8 decimal places,
    // each followed by quality and abnormal-situation bytes. Server
    // version 0 sends unit names as 7 OEM characters, version 1 as a u16
    // length plus the characters. Returns null when the layout does not
    // consume the reply exactly.
    _parseProperties(data, serverVersion) {
        let offset = 0;
        const units = {};
        for (const name of Object.keys(UNIT_ELEMENTS)) {
            let length = UNIT_SIZE;
            if (serverVersion === 1) {
                if (offset + 2 > data.length) return null;
                length = data.readUInt16LE(offset);
                offset += 2;
            }
            if (offset + length + 2 > data.length) return null;
            units[name] = decodeOem(data.subarray(offset, offset + length));
            offset += length + 2;
        }
        const decimals = {};
        for (const key of Object.keys(DECIMAL_ELEMENTS)) {
            if (offset + DECIMAL_SIZE + 2 > data.length) return null;
            decimals[key] = data[offset];
            offset += DECIMAL_SIZE + 2;
        }
        if (offset !== data.length) return null;
        return { serverVersion, units, decimals };
    }

    _decodeValue(bytes, kind, decimals) {
        if (kind === 'float') return bytes.length >= 4 ? bytes.readFloatLE(0) : null;
        let raw;
        if (bytes.length <= 6) raw = bytes.readIntLE(0, bytes.length);
        else if (bytes.length === 8) raw = Number(bytes.readBigInt64LE(0));
        else return null;
        return kind === 'int' ? raw / 10 ** decimals : raw;
    }

    // Reads one group of elements (current values or hourly totals) into
    // `results`: writes the value type, then element lists in chunks that
    // keep a data reply within maxReplyDataBytes, and decodes each reply.
    async _readGroup(connection, valueType, wanted, activeSizes, decimals, results) {
        await connection.request(this.buildWriteRequest(ADDRESS_VALUE_TYPE, [valueType, 0]));

        const elements = [];
        for (const [name, [id, kind, decimalsKey]] of Object.entries(wanted)) {
            if (activeSizes.has(id)) {
                elements.push({ name, id, kind, size: activeSizes.get(id), decimals: decimals[decimalsKey] ?? 0 });
            } else {
                results[name] = null;
            }
        }

        const chunks = [];
        let chunk = [], chunkBytes = 0;
        for (const element of elements) {
            const bytes = element.size + 2;
            if (chunk.length && chunkBytes + bytes > this.maxReplyDataBytes) {
                chunks.push(chunk);
                chunk = [];
                chunkBytes = 0;
            }
            chunk.push(element);
            chunkBytes += bytes;
        }
        if (chunk.length) chunks.push(chunk);

        for (const part of chunks) {
            await connection.request(this.buildElementListRequest(part));
            const data = await connection.request(this.buildReadRequest(ADDRESS_DATA));
            const expected = part.reduce((sum, e) => sum + e.size + 2, 0);
            if (data.length !== expected) {
                throw new Error(`Vkt7Client: data reply has ${data.length} bytes, expected ${expected}`);
            }
            let offset = 0;
            for (const element of part) {
                const value = data.subarray(offset, offset + element.size);
                const quality = data[offset + element.size];
                offset += element.size + 2;
                results[element.name] = (quality & QUALITY_MASK) === QUALITY_BAD
                    ? null
                    : this._decodeValue(value, element.kind, element.decimals);
            }
        }
    }

    async _readActiveSizes(connection) {
        const data = await connection.request(this.buildReadRequest(ADDRESS_ACTIVE_ELEMENTS));
        if (data.length % 6 !== 0) {
            throw new Error(`Vkt7Client: active element list has ${data.length} bytes, not a multiple of 6`);
        }
        const sizes = new Map();
        for (let offset = 0; offset < data.length; offset += 6) {
            sizes.set(data.readUInt32LE(offset) & ~ELEMENT_LIST_FLAG, data.readUInt16LE(offset + 4));
        }
        return sizes;
    }

    // Reads a group again with a fresh active element list when the device
    // reports that the measurement scheme changed.
    async _readGroupWithSchemeCheck(connection, valueType, wanted, state) {
        try {
            await this._readGroup(connection, valueType, wanted, state.activeSizes, state.decimals, state.results);
        } catch (err) {
            if (!(err instanceof Vkt7ExceptionError) || err.code !== EXCEPTION_SCHEME_CHANGED) throw err;
            state.activeSizes = await this._readActiveSizes(connection);
            await this._readGroup(connection, valueType, wanted, state.activeSizes, state.decimals, state.results);
        }
    }

    async _readSession(connection, results) {
        // 1. Start session; its reply needs no analysis. The first data
        // read after it carries the server version.
        await connection.request(this.buildStartSessionRequest());
        let serverVersion = null;
        try {
            const data = await connection.request(this.buildReadRequest(ADDRESS_DATA));
            const index = SERVER_VERSION_OFFSET - 3; // offset counts from the address byte
            if (data.length > index) serverVersion = data[index];
        } catch (err) {
            if (!(err instanceof Vkt7ExceptionError)) throw err;
        }

        // 2. Firmware: high nibble major, low nibble minor.
        const info = await connection.request(this.buildReadRequest(ADDRESS_SERVICE_INFO));
        const firmwareByte = info.length ? info[0] : null;
        results.firmware = firmwareByte === null ? null : `${firmwareByte >> 4}.${firmwareByte & 0x0f}`;

        // 3. Properties. The reported server version is tried first; the
        // other layout is the fallback, accepted only if it fits exactly.
        await connection.request(this.buildWriteRequest(ADDRESS_VALUE_TYPE, [VALUE_TYPE_PROPERTIES, 0]));
        await connection.request(this.buildElementListRequest([
            ...Object.values(UNIT_ELEMENTS).map((id) => ({ id, size: UNIT_SIZE })),
            ...Object.values(DECIMAL_ELEMENTS).map((id) => ({ id, size: DECIMAL_SIZE })),
        ]));
        const propertiesData = await connection.request(this.buildReadRequest(ADDRESS_DATA));
        const versions = serverVersion === 0 ? [0, 1] : [1, 0];
        const properties = versions.map((v) => this._parseProperties(propertiesData, v)).find(Boolean);
        if (!properties) throw new Error('Vkt7Client: properties reply does not match either unit layout');
        this.properties = properties;

        // 4-5. Active elements, current values, hourly totals.
        const state = {
            activeSizes: await this._readActiveSizes(connection),
            decimals: properties.decimals,
            results,
        };
        await this._readGroupWithSchemeCheck(connection, VALUE_TYPE_CURRENT, CURRENT_ELEMENTS, state);
        await this._readGroupWithSchemeCheck(connection, VALUE_TYPE_TOTALS, TOTAL_ELEMENTS, state);

        // 6. Device clock, local wall-clock time (no TZ in the protocol);
        // firmware before 2.7 sends minutes and seconds as 0.
        results.deviceTime = null;
        if (firmwareByte !== null && firmwareByte >= 0x19) {
            const t = await connection.request(this.buildReadRequest(ADDRESS_DATE_TIME));
            if (t.length >= 6) results.deviceTime = new Date(2000 + t[2], t[1] - 1, t[0], t[3], t[4], t[5]).getTime();
        }
    }

    /**
     * Reads current values and hourly totals from the VKT-7 in one session.
     * Resolves with every name of CURRENT_ELEMENTS and TOTAL_ELEMENTS
     * (number, or null when the element is not in the measurement scheme
     * or has bad quality, e.g. a failed pressure sensor), plus
     * firmware (string), deviceTime (epoch ms) and timestamp.
     *
     * Rejects on connection/protocol failure; the Error carries a
     * `.partialResults` property with whatever was read before it.
     *
     * @returns {Promise<Record<string, number|string|boolean|null>>}
     */
    async read() {
        const results = {};
        let connection = null;
        let overallTimer = null;
        try {
            connection = await this._connect();
            const timeout = new Promise((_, reject) => {
                overallTimer = setTimeout(() => {
                    reject(new Error('Vkt7Client: timed out'));
                    connection.close();
                }, this.responseTimeoutMs);
            });
            await Promise.race([this._readSession(connection, results), timeout]);
            return { ...results, timestamp: Date.now() };
        } catch (err) {
            err.partialResults = { ...results, timestamp: Date.now() };
            throw err;
        } finally {
            clearTimeout(overallTimer);
            if (connection) connection.close();
        }
    }
}

module.exports = { Vkt7Client, Vkt7ExceptionError };

// Run directly for a quick standalone test (prints every frame):
//   node vkt7-client.js <host> <port> [address]
if (require.main === module) {
    const [, , host, port, address] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vkt7Client({
        host,
        port: Number(port),
        address: Number(address) || 0,
        trace: (direction, bytes) => console.error(direction, hex(bytes)),
    });

    client.read()
        .then((results) => {
            console.log('Properties:', JSON.stringify(client.properties, null, 2));
            console.log(JSON.stringify(results, null, 2));
        })
        .catch((err) => {
            console.error('Error:', err.message);
            console.error('Partial results:', err.partialResults);
            process.exit(1);
        });
}
