'use strict';
/**
 * IrvisClient
 *
 * TCP client for an IRVIS gas flow meter (ИРВИС-Ультра, ИРВИС-РС4М...): the
 * Modbus RTU interface of its registrar (РИ-3|4|5|7) behind a transparent
 * TCP-serial gateway. Implements "Протокол обмена регистраторов РИ-3|4|5|7,
 * РИА-1" (НПП Ирвис, .docs/irvis): function 0x03 read holding registers and
 * 0x11 report slave id, CRC16 0xA001 low byte first.
 *
 * read() returns every current value of flow meter 1 (ПП1) the registrar
 * offers, raw, in the device's units, named after the protocol. The Node-RED
 * mapping (collect-device-state) gives them their meaning: °C, flag names.
 *
 * Registers (table 4.1), read as one block 0x0086-0x0096:
 *   0x0086-0x0088  clock, BCD: seconds | minutes, hour | day, month | year
 *                  (low byte | high byte of each register)
 *   0x0089         operating time: seconds (low byte), minutes (high byte)
 *   0x008A         operating time, hours
 *   0x008B         Vnc: accumulated volume at standard conditions, m3 (uint32)
 *   0x008D         Qnc: flow rate at standard conditions, nm3/h (float)
 *   0x008F         Qwc: flow rate at working conditions, m3/h (float)
 *   0x0091         P: pressure, kPa (float)
 *   0x0093         T: temperature, K (float)
 *   0x0095         Fl_a: general flags (bit 0 power off, 1 date/time
 *                  changed, 2 clock failure)
 *   0x0096         Fl_b: flow meter flags (table 1.4.1: bits 0-1 Q range,
 *                  2-3 water / sensor failure / no flow, 4-5 bad signal /
 *                  analysis, 6 T out of range, 7 P out of range, 8 no data,
 *                  9 constants archive record, 10 bad-signal accounting copy)
 * 0x0097 (volume at working conditions) is documented only for registrar
 * versions 467-499 and reads nonsense on the 900 series, so it is not read.
 * Function 0x11 returns the registrar id, e.g. "RI7-967-03-1".
 *
 * Byte order: each register goes high byte first; a 32-bit value (uint32,
 * float) goes low register first.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and it carries exactly the requested
 * number of registers. Frames of another master on the line are skipped.
 * Anything else fails the whole read() — a value is never stored under the
 * wrong field (see the EK270 shared-line incident).
 *
 * Usage:
 *   const client = new IrvisClient({ host: '94.180.252.2', port: 504, address: 104 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, see ./bars02-gateway.js),
 * createSocket replaces host and port:
 *   const client = new IrvisClient({
 *       address: 104,
 *       createSocket: () => gateway.createSocket({ identifier: '0458', port: 'rs485', baudRate: 9600 }),
 *   });
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const FUNCTION_READ = 0x03;
const FUNCTION_REPORT_ID = 0x11;
const EXCEPTION_BIT = 0x80;
// Exception code 6: slave device busy.
const EXCEPTION_BUSY = 6;

const CURRENT = { start: 0x0086, count: 0x11 };

class IrvisExceptionError extends Error {
    constructor(fn, code) {
        super(`IrvisClient: device exception ${code} on function 0x${fn.toString(16)}`);
        this.code = code;
    }
}

function crc16(bytes) {
    let crc = 0xffff;
    for (const b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
    return crc;
}

function crcOk(frame) {
    return crc16(frame.subarray(0, frame.length - 2)) === frame.readUInt16LE(frame.length - 2);
}

const fromBcd = (byte) => (byte >> 4) * 10 + (byte & 0x0f);

// A float32 carries ~7 significant digits; more would be noise.
const roundFloat = (value) => (Number.isFinite(value) ? Number(value.toPrecision(7)) : null);

class IrvisClient {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} options.address - Modbus address of the registrar (1-247; set at shipping from the serial number, e.g. 29804 -> 104).
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=2000] - Wait for a valid reply to one request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.responseTimeoutMs=20000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     * @param {() => net.Socket} [options.createSocket] - Socket factory (default: a new net.Socket); a GPRS modem channel
     *     from the gateway (БАРС-02: Bars02Gateway#createSocket) makes host and port unnecessary.
     */
    constructor({
        host,
        port,
        createSocket = null,
        address,
        stepDelayMs = 100,
        stepTimeoutMs = 2000,
        retries = 2,
        responseTimeoutMs = 20000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('IrvisClient: "host" is required');
        if (!port && !createSocket) throw new Error('IrvisClient: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('IrvisClient: "address" must be 1-247');
        }

        this.host = host;
        this.port = port;
        this.createSocket = createSocket || (() => new net.Socket());
        this.address = address;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;
    }

    buildRequest(bytes) {
        const body = Buffer.from([this.address, ...bytes]);
        const crc = crc16(body);
        return Buffer.concat([body, Buffer.from([crc & 0xff, crc >> 8])]);
    }

    // Opens the socket and returns { request, close }. request(bytes,
    // dataLength) resolves with the reply's data bytes (after the byte
    // count); dataLength null accepts any length the byte count announces.
    // Rejects with IrvisExceptionError on an exception reply, or with an
    // Error when no valid reply came within stepTimeoutMs.
    _connect() {
        return new Promise((resolve, reject) => {
            const socket = this.createSocket();
            let buffer = Buffer.alloc(0);
            let pending = null;
            let closedError = null;

            const settle = (fn, value) => {
                const current = pending;
                if (!current) return;
                pending = null;
                clearTimeout(current.timer);
                fn === 'resolve' ? current.resolve(value) : current.reject(value);
            };

            // Looks for a reply from our address with the requested function
            // and a valid CRC, or a 5-byte exception reply; skips anything
            // else (an echo of the request, another master's frames).
            const check = () => {
                if (!pending) return;
                const { frame, dataLength } = pending;
                const fn = frame[1];
                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                for (let at = 0; at + 5 <= buffer.length; at++) {
                    if (buffer[at] !== this.address) continue;
                    const exception = buffer.subarray(at, at + 5);
                    if (exception[1] === (fn | EXCEPTION_BIT) && crcOk(exception)) {
                        settle('reject', new IrvisExceptionError(fn, exception[2]));
                        return;
                    }
                    if (buffer[at + 1] !== fn) continue;
                    const count = buffer[at + 2];
                    if (dataLength !== null && count !== dataLength) continue;
                    const reply = buffer.subarray(at, at + 5 + count);
                    if (reply.length === 5 + count && crcOk(reply)) {
                        settle('resolve', Buffer.from(reply.subarray(3, 3 + count)));
                        return;
                    }
                }
            };

            const request = (bytes, dataLength) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const frame = this.buildRequest(bytes);
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    dataLength,
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `IrvisClient: no valid reply to function 0x${bytes[0].toString(16)}`)), this.stepTimeoutMs),
                };
                if (this.trace) this.trace('>', frame);
                socket.write(frame);
            });

            socket.on('data', (chunk) => {
                if (this.trace) this.trace('<', chunk);
                buffer = Buffer.concat([buffer, chunk]);
                check();
            });

            const onClosed = (err) => {
                if (!closedError) closedError = err;
                settle('reject', closedError);
                reject(closedError);
            };
            socket.on('error', (err) => onClosed(err));
            socket.on('close', () => onClosed(new Error('IrvisClient: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Repeats a request that got no valid reply or a "busy"
                    // exception; any other exception is the device's answer.
                    request: async (bytes, dataLength) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const data = await request(bytes, dataLength);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return data;
                            } catch (err) {
                                const retryable = !(err instanceof IrvisExceptionError) || err.code === EXCEPTION_BUSY;
                                if (!retryable || closedError || attempt >= this.retries) throw err;
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                            }
                        }
                    },
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('IrvisClient: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    async _readSession(connection, results) {
        const id = await connection.request([FUNCTION_REPORT_ID], null);
        results.registrar = id.toString('latin1').replace(/\0/g, '').trim();

        const { start, count } = CURRENT;
        const data = await connection.request(
            [FUNCTION_READ, start >> 8, start & 0xff, count >> 8, count & 0xff], count * 2);
        const offset = (address) => (address - start) * 2;
        const u16 = (address) => data.readUInt16BE(offset(address));
        // 32-bit values: low register first, each register high byte first.
        const swapped = (address) => Buffer.from([...data.subarray(offset(address) + 2, offset(address) + 4),
            ...data.subarray(offset(address), offset(address) + 2)]);

        // Clock: the low byte of each register first (seconds, hour, month).
        const [second, minute, hour, day, month, year] = [0x86, 0x87, 0x88]
            .flatMap((address) => [u16(address) & 0xff, u16(address) >> 8]).map(fromBcd);
        const date = new Date(2000 + year, month - 1, day, hour, minute, second);
        results.deviceTime = date.getDate() === day && date.getMonth() === month - 1 ? date.getTime() : null;

        results.operatingTimeSeconds = u16(0x89) & 0xff;
        results.operatingTimeMinutes = u16(0x89) >> 8;
        results.operatingTimeHours = u16(0x8a);
        results.Vnc = swapped(0x8b).readUInt32BE(0);
        results.Qnc = roundFloat(swapped(0x8d).readFloatBE(0));
        results.Qwc = roundFloat(swapped(0x8f).readFloatBE(0));
        results.P = roundFloat(swapped(0x91).readFloatBE(0));
        results.T = roundFloat(swapped(0x93).readFloatBE(0));
        results.Fl_a = u16(0x95);
        results.Fl_b = u16(0x96);
    }

    /**
     * Reads the registrar id and the current values of flow meter 1 in one
     * session. Resolves with:
     *
     *   registrar (string, e.g. "RI7-967-03-1"), deviceTime (epoch ms, or null)
     *   operatingTimeHours, operatingTimeMinutes, operatingTimeSeconds
     *   Vnc m3, Qnc nm3/h, Qwc m3/h, P kPa, T K
     *   Fl_a, Fl_b (flag words, see the header)
     *   timestamp
     *
     * Rejects on connection/protocol failure; the Error carries a
     * `.partialResults` property with whatever was read before it.
     *
     * @returns {Promise<Record<string, number|string|null>>}
     */
    async read() {
        const results = {};
        let connection = null;
        let overallTimer = null;
        try {
            connection = await this._connect();
            const timeout = new Promise((_, reject) => {
                overallTimer = setTimeout(() => {
                    reject(new Error('IrvisClient: timed out'));
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

module.exports = { IrvisClient, IrvisExceptionError };

// Run directly for a quick standalone test (prints every frame):
//   node irvis-client.js <host> <port> <address>
if (require.main === module) {
    const [, , host, port, address] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new IrvisClient({
        host,
        port: Number(port),
        address: Number(address),
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
