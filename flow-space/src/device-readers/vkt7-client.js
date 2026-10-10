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
 *   0x3FFD write  value type: 4 current, 5 current totals, 6 properties
 *   0x3FFC read   list of active elements: { id: u32 LE, size: u16 LE }[]
 *   0x3FFE read   data for the written element list
 *   0x3FF9 read   service info: firmware, scheme words, subscriber id,
 *                 network number, report date, model
 *   0x3FFB read   device date and time (firmware 1.9+)
 *   0x3ECD/0x3F5B read  measurement scheme number of heat input 1/2 (1.9+)
 *   0x3FE9 read   active settings database (1.9+)
 *   0x3FEE read   discrete output states (2.0+)
 *
 * read() returns every current value the protocol offers, raw, named after
 * the protocol's element table (Cyrillic letters transliterated): the
 * "Текущие значения" and "Итоговые текущие значения" lists for both heat
 * inputs (input1, input2 = Тв1, Тв2) and the device-wide elements, plus the
 * service info and the units the device reports. Which pipe is the supply
 * or the return is decided by the Node-RED mapping (collect-device-state).
 * Archives and the НС durations (QntNS, archive-only) are not read.
 *
 * Sequence per read():
 *   1. Start session, then one data read: byte 64 of that reply is the
 *      "server version", which says how unit names are encoded.
 *   2. Service info.
 *   3. Properties (type 6): unit names and decimal places of every
 *      quantity. Every value except flow rates and the additional input
 *      comes as a scaled integer: 12345 with 2 decimal places is 123.45.
 *      If the device rejects the full property list, the 16 properties of
 *      the protocol's example are read instead.
 *   4. Active element list: which elements this measurement scheme uses
 *      and how many bytes each one takes in a data reply.
 *   5. Current values (type 4), then the active database, the scheme
 *      numbers and the discrete outputs, which need a value type written
 *      first; then current totals (type 5), which are integrals from the
 *      archive reset to the end of the previous hour. For each group only
 *      the elements of that group's list that are active are written; a
 *      long list is split so that one reply stays well below the 264-byte
 *      frame limit.
 *   6. Device clock (firmware 1.9+ only).
 *
 * Every element in a data reply is followed by a quality byte (0xC0 good,
 * 0x00 bad: out of range or not in the scheme) and an abnormal-situation
 * byte. Values with bad quality, and elements that are not active, are
 * returned as null.
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
const ADDRESS_OUTPUTS = 0x3fee;
const ADDRESS_ACTIVE_DB = 0x3fe9;
const ADDRESS_SCHEME = { input1: 0x3ecd, input2: 0x3f5b };

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
// Exception code of a write: the element does not exist.
const EXCEPTION_NO_ELEMENT = 2;
// Exception code of the discrete output read: not remotely controllable.
const EXCEPTION_OUTPUTS_NOT_REMOTE = 7;

// "Start session" write after the register count: a byte count of 0xCC
// that deliberately does not match the 4 data bytes (protocol, 2.1).
const START_SESSION_TAIL = [0xcc, 0x80, 0x00, 0x00, 0x00];
const SERVER_VERSION_OFFSET = 64;

// Unit-name properties: name -> element id (tTypeM ... QntTypeM). QntTypeM
// is the unit of the time counters, or of the additional input when DI is
// active.
const UNIT_ELEMENTS = {
    t: 44, G: 45, V: 46, M: 47, P: 48, dt: 49, tx: 50, ta: 51, Mg: 52, Qo: 53, Qg: 54, VNR: 55, VOS: 56,
};
// Decimal-place properties (tTypeFractDiNum ... QoTypeFractDigNum2): element
// ids 57-76; 58, 67 and 68 are reserved.
const DECIMAL_IDS = Array.from({ length: 20 }, (_, i) => 57 + i);
// Fallback when the full property list is rejected: the 16 properties of
// the protocol's example (5.2).
const BASIC_UNIT_NAMES = ['t', 'G', 'V', 'M', 'P', 'Qo', 'VNR', 'VOS'];
const BASIC_DECIMAL_IDS = [57, 59, 60, 61, 66, 70, 69, 76];
// Decimal places to use when a property was not read: id -> fallback id.
const DECIMAL_FALLBACK = { 62: 57, 63: 57, 64: 57, 65: 60, 71: 61, 72: 57, 75: 70 };
const UNIT_SIZE = 7;
const DECIMAL_SIZE = 1;

// Elements: name -> [element id, kind, decimal-places element id].
// kind: 'int' scaled integer, 'float' IEEE754 LE, 'count' plain integer,
// 'flag' printable '*' (true) or ' ' (false).
const inputCurrent = (t1, t2, t3, p1, p2, dt, g1, ns, pDecimals, dtDecimals) => ({
    t1: [t1, 'int', 57],
    t2: [t2, 'int', 57],
    t3: [t3, 'int', 57],
    P1: [p1, 'int', pDecimals],
    P2: [p2, 'int', pDecimals],
    dt: [dt, 'int', dtDecimals],
    G1: [g1, 'float'],
    G2: [g1 + 1, 'float'],
    G3: [g1 + 2, 'float'],
    NS: [ns, 'flag'],
});
const inputTotals = (v1, mg, vnr, vDecimals, mDecimals, mgDecimals, qDecimals) => ({
    V1: [v1, 'int', vDecimals],
    V2: [v1 + 1, 'int', vDecimals],
    V3: [v1 + 2, 'int', vDecimals],
    M1: [v1 + 3, 'int', mDecimals],
    M2: [v1 + 4, 'int', mDecimals],
    M3: [v1 + 5, 'int', mDecimals],
    Mg: [mg, 'int', mgDecimals],
    Qo: [mg + 1, 'int', qDecimals],
    Qg: [mg + 2, 'int', qDecimals],
    VNR: [vnr, 'count'],
    VOS: [vnr + 1, 'count'],
});

// "Текущие значения": group -> elements (group null = device-wide).
const CURRENT_ELEMENTS = {
    input1: inputCurrent(0, 1, 2, 9, 10, 14, 19, 77, 61, 62),
    input2: inputCurrent(22, 23, 24, 31, 32, 36, 41, 78, 71, 72),
    device: {
        tx: [15, 'int', 63],
        ta: [16, 'int', 64],
        P3: [82, 'int', 61],
        // The additional input (DopInpImpP_Type), instant value.
        DIrate: [81, 'float'],
    },
};

// "Итоговые текущие значения".
const TOTAL_ELEMENTS = {
    input1: inputTotals(3, 11, 17, 59, 60, 65, 66),
    input2: inputTotals(25, 33, 39, 69, 70, 75, 76),
    device: {
        // The additional input, total.
        DI: [81, 'float'],
    },
};

// A float32 carries ~7 significant digits; more would be noise.
const roundFloat = (value) => (Number.isFinite(value) ? Number(value.toPrecision(7)) : null);

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
    // big-endian; every other multi-byte field is little-endian. The
    // register count is ignored by most requests (protocol, 2.1).
    buildReadRequest(startAddress, count = 0) {
        return Vkt7Client._withCrc([this.address, FUNCTION_READ, startAddress >>> 8, startAddress & 0xff, count >>> 8, count & 0xff]);
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

    // Parses the properties reply for the requested list (unit names, then
    // decimal places), each followed by quality and abnormal-situation
    // bytes. Server version 0 sends unit names as 7 OEM characters,
    // version 1 as a u16 length plus the characters. Returns null when the
    // layout does not consume the reply exactly.
    _parseProperties(data, serverVersion, unitNames, decimalIds) {
        let offset = 0;
        const units = {};
        for (const name of unitNames) {
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
        for (const id of decimalIds) {
            if (offset + DECIMAL_SIZE + 2 > data.length) return null;
            decimals[id] = data[offset];
            offset += DECIMAL_SIZE + 2;
        }
        if (offset !== data.length) return null;
        return { units, decimals };
    }

    async _readProperties(connection, serverVersion, unitNames, decimalIds) {
        await connection.request(this.buildWriteRequest(ADDRESS_VALUE_TYPE, [VALUE_TYPE_PROPERTIES, 0]));
        await connection.request(this.buildElementListRequest([
            ...unitNames.map((name) => ({ id: UNIT_ELEMENTS[name], size: UNIT_SIZE })),
            ...decimalIds.map((id) => ({ id, size: DECIMAL_SIZE })),
        ]));
        const data = await connection.request(this.buildReadRequest(ADDRESS_DATA));
        // The reported server version is tried first; the other layout is
        // the fallback, accepted only if it fits exactly.
        const versions = serverVersion === 0 ? [0, 1] : [1, 0];
        const properties = versions.map((v) => this._parseProperties(data, v, unitNames, decimalIds)).find(Boolean);
        if (!properties) throw new Error('Vkt7Client: properties reply does not match either unit layout');
        return properties;
    }

    _decimalPlaces(decimals, id) {
        if (decimals[id] !== undefined) return decimals[id];
        const fallback = DECIMAL_FALLBACK[id];
        return fallback !== undefined && decimals[fallback] !== undefined ? decimals[fallback] : 0;
    }

    _decodeValue(bytes, kind, decimals) {
        if (kind === 'float') return bytes.length >= 4 ? roundFloat(bytes.readFloatLE(0)) : null;
        if (kind === 'flag') return bytes.length >= 1 ? bytes[0] === 0x2a : null; // '*'
        let raw;
        if (bytes.length <= 6) raw = bytes.readIntLE(0, bytes.length);
        else if (bytes.length === 8) raw = Number(bytes.readBigInt64LE(0));
        else return null;
        return kind === 'int' ? Number((raw / 10 ** decimals).toFixed(decimals)) : raw;
    }

    // Reads one group of elements (current values or current totals) into
    // `results`: writes the value type, then element lists in chunks that
    // keep a data reply within maxReplyDataBytes, and decodes each reply.
    // An element that is not active is set to null.
    async _readGroup(connection, valueType, groups, activeSizes, decimals, results) {
        await connection.request(this.buildWriteRequest(ADDRESS_VALUE_TYPE, [valueType, 0]));

        const elements = [];
        for (const [group, wanted] of Object.entries(groups)) {
            const target = group === 'device' ? results : results[group];
            for (const [name, [id, kind, decimalsId]] of Object.entries(wanted)) {
                if (activeSizes.has(id)) {
                    elements.push({
                        target, name, id, kind, size: activeSizes.get(id),
                        decimals: this._decimalPlaces(decimals, decimalsId),
                    });
                } else {
                    target[name] = null;
                }
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
                element.target[element.name] = (quality & QUALITY_MASK) === QUALITY_BAD
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
    async _readGroupWithSchemeCheck(connection, valueType, groups, state) {
        try {
            await this._readGroup(connection, valueType, groups, state.activeSizes, state.decimals, state.results);
        } catch (err) {
            if (!(err instanceof Vkt7ExceptionError) || err.code !== EXCEPTION_SCHEME_CHANGED) throw err;
            state.activeSizes = await this._readActiveSizes(connection);
            await this._readGroup(connection, valueType, groups, state.activeSizes, state.decimals, state.results);
        }
    }

    // One value byte followed by quality and abnormal-situation bytes (the
    // scheme number and active database requests); null on bad quality.
    async _readValueByte(connection, startAddress) {
        const data = await connection.request(this.buildReadRequest(startAddress, 1));
        return data.length >= 2 && (data[1] & QUALITY_MASK) !== QUALITY_BAD ? data[0] : null;
    }

    // Service info: firmware (high nibble major, low nibble minor), the
    // scheme words of both heat inputs (scheme, ТР3 and t5 assignment bits,
    // raw), subscriber id, network number, report date, model.
    _parseServiceInfo(info, results) {
        if (info.length === 1) {
            results.firmware = null;
            results.reportDate = info[0];
            return null;
        }
        const firmwareByte = info.length ? info[0] : null;
        results.firmware = firmwareByte === null ? null : `${firmwareByte >> 4}.${firmwareByte & 0x0f}`;
        if (info.length >= 16) {
            results.input1.schemeInfo = info.readUInt16LE(1);
            results.input2.schemeInfo = info.readUInt16LE(3);
            results.subscriberId = info.subarray(5, 13).toString('latin1').replace(/\0/g, '').trim();
            results.networkNumber = info[13];
            results.reportDate = info[14];
            results.model = info[15];
        }
        return firmwareByte;
    }

    async _readSession(connection, results) {
        results.input1 = {};
        results.input2 = {};

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

        // 2. Service info.
        const firmwareByte = this._parseServiceInfo(
            await connection.request(this.buildReadRequest(ADDRESS_SERVICE_INFO)), results);

        // 3. Properties: every unit and decimal place, or the protocol's
        // basic 16 when the device does not know the others.
        let properties;
        try {
            properties = await this._readProperties(connection, serverVersion, Object.keys(UNIT_ELEMENTS), DECIMAL_IDS);
        } catch (err) {
            if (!(err instanceof Vkt7ExceptionError) || err.code !== EXCEPTION_NO_ELEMENT) throw err;
            properties = await this._readProperties(connection, serverVersion, BASIC_UNIT_NAMES, BASIC_DECIMAL_IDS);
        }
        results.units = properties.units;

        // 4-5. Active elements, current values, then the requests that need
        // a value type written, then current totals.
        const state = {
            activeSizes: await this._readActiveSizes(connection),
            decimals: properties.decimals,
            results,
        };
        await this._readGroupWithSchemeCheck(connection, VALUE_TYPE_CURRENT, CURRENT_ELEMENTS, state);

        const atLeast = (version) => firmwareByte !== null && firmwareByte >= version;
        results.activeDb = atLeast(0x19) ? await this._readValueByte(connection, ADDRESS_ACTIVE_DB) : null;
        for (const input of ['input1', 'input2']) {
            results[input].scheme = atLeast(0x19) ? await this._readValueByte(connection, ADDRESS_SCHEME[input]) : null;
        }
        results.output1 = null;
        results.output2 = null;
        if (atLeast(0x20)) {
            try {
                const outputs = await connection.request(this.buildReadRequest(ADDRESS_OUTPUTS));
                if (outputs.length >= 2) [results.output1, results.output2] = [outputs[0], outputs[1]];
            } catch (err) {
                if (!(err instanceof Vkt7ExceptionError) || err.code !== EXCEPTION_OUTPUTS_NOT_REMOTE) throw err;
            }
        }

        await this._readGroupWithSchemeCheck(connection, VALUE_TYPE_TOTALS, TOTAL_ELEMENTS, state);

        // 6. Device clock, local wall-clock time (no TZ in the protocol);
        // firmware before 2.7 sends minutes and seconds as 0.
        results.deviceTime = null;
        if (atLeast(0x19)) {
            const t = await connection.request(this.buildReadRequest(ADDRESS_DATE_TIME));
            if (t.length >= 6) results.deviceTime = new Date(2000 + t[2], t[1] - 1, t[0], t[3], t[4], t[5]).getTime();
        }
    }

    /**
     * Reads the service info, properties, current values and current
     * totals from the VKT-7 in one session. Resolves with (units as the
     * device reports them in `units`; null when an element is not in the
     * measurement scheme or has bad quality, e.g. a failed pressure sensor):
     *
     *   firmware (string), model, networkNumber, reportDate, subscriberId
     *   units         t, G, V, M, P, dt, tx, ta, Mg, Qo, Qg, VNR, VOS
     *                 (VOS: the time counters' unit, or the additional
     *                 input's when DI is active)
     *   input1, input2 (Тв1, Тв2), each with
     *     t1, t2, t3, P1, P2, dt, G1, G2, G3 (current values),
     *     NS (abnormal situation on the input, boolean),
     *     V1, V2, V3, M1, M2, M3, Mg (Mг), Qo (Qо), Qg (Qг), VNR (ВНР),
     *     VOS (ВОС) (current totals, to the end of the previous hour),
     *     scheme (measurement scheme number), schemeInfo (raw scheme word)
     *   tx, ta, P3    device-wide current values
     *   DIrate, DI    additional input, current value and total
     *   activeDb      0 БД1, 1 БД2
     *   output1, output2  discrete outputs (null when not remotely controllable)
     *   deviceTime    epoch ms, timestamp
     *
     * Rejects on connection/protocol failure; the Error carries a
     * `.partialResults` property with whatever was read before it.
     *
     * @returns {Promise<Record<string, any>>}
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
//   node vkt7-client.js <host> <port> [address] [wake-up bytes]
if (require.main === module) {
    const [, , host, port, address, wakeUpBytes] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vkt7Client({
        host,
        port: Number(port),
        address: Number(address) || 0,
        wakeUpBytes: wakeUpBytes === undefined ? 2 : Number(wakeUpBytes),
        trace: (direction, bytes) => console.error(direction, hex(bytes)),
    });

    client.read()
        .then((results) => {
            console.log(JSON.stringify({ ...results, deviceTimeLocal: new Date(results.deviceTime).toString() }, null, 2));
        })
        .catch((err) => {
            console.error('Error:', err.message);
            console.error('Partial results:', err.partialResults);
            process.exit(1);
        });
}
