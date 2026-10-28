'use strict';
/**
 * Vzljot034Client
 *
 * TCP client for the Vzljot TSRV-034 heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-034; the ТСРВ-033 is the same modification ТСРВ-03),
 * connected through a transparent TCP-serial gateway (Maestro modem) to its
 * RS-485 port. Plain Modbus RTU, function 0x04 read input registers, 0x03
 * read holding registers (serial numbers and clock only) and 0x11 report
 * slave id, CRC16 0xA001 low byte first; register map from "ТСРВ-03X.
 * Использование протокола Modbus. Версии ПО: 63.01.03.(00..53)"
 * (.docs/vzljot034; firmware 63.01.01.xx has its own document, with the same
 * addresses for what it has).
 *
 * read() returns every current value of the input registers, raw, in the
 * device's units, grouped and named after the register list: the three
 * measuring channels (канал 1-3: temperature ПТ i and flow ПР i of
 * coolant i) as CH1-CH3, the cold-water channel (канал холодной воды) as
 * XV, the heat formulas W1-W6 with their powers E1-E6, the heat-system
 * status word and the alarm НС1-НС5 times. Which channel is the supply or
 * the return is decided by the Node-RED mapping (collect-device-state).
 *
 * Not read: settings (holding registers other than the serial numbers and
 * the clock), archive pointers and times, debug registers (ports, archive
 * rewrite flags, calculation time, stack, Modbus and display counters) and
 * the ADC codes and byte counters that read 0 since 63.01.03.31.
 *
 * Registers:
 *   input  0x0000  mode, current reactions to flow-meter failures, fault
 *                  flags, temperature and flow measurement states,
 *                  accumulation-stopped flags (one byte per register)
 *   input  0x4000  heat-system status word (НС1-НС5, flow-meter power and
 *                  frequency, ПТ failures), restart counters
 *   input  0x8000  integer parts of the totals W1-W3 MJ, M1-M3 kg, V1-V3
 *                  0.001 m3; work and downtime s; НС1-НС5 times s; W4-W6;
 *                  flow-meter power-off times s; measurement cycles; pulses
 *   input  0xC000  temperatures (converted, i.e. used, and measured) °C,
 *                  R Ω, E1-E6 GJ/h, mass flow t/h, volume flow m3/h,
 *                  frequency Hz, density kg/m3, enthalpy kJ/kg, fractional
 *                  parts of the totals, hourly mean flows kg/min, cold water
 *   holding 0x8000 serial numbers of the calculator, flow meters and
 *                  thermometers; clock
 *
 * Encoding: big-endian, high register first. A total is an unsigned
 * integer register pair plus a float register pair holding its fraction,
 * in the same unit; the reader adds them (and turns 0.001 m3 into m3). The
 * clock is the local wall-clock time counted in seconds from 1970-01-01 (no
 * time zone).
 *
 * Found on the live meters 1114237 ("VZLJOT 63.01.03.53", Maestro
 * 10.4.200.25:5010) and 1405566 ("VZLJOT 61.01.03.54", a version the
 * document does not name, same map; Maestro 192.168.0.94:5010), address 1,
 * 2026-10-26: every register of the list reads, 125 registers per request
 * (function 0x11); the first one or two requests after a connect get no
 * reply (none within 20 s), so function 0x11 gets one more attempt; the
 * next ones are answered in 0.8-3.8 s; a session takes 15-35 s. The repeat of a
 * timed-out request may be answered twice (its late first reply too), so
 * after a repeated register read the reader waits one stepTimeoutMs and
 * drops what comes, instead of taking it for the next reply.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and it carries exactly the requested
 * number of registers. Gateways forward every frame on the line to every
 * connected client, so frames of another master are skipped. The serial
 * number is checked when given. Anything else fails the whole read() — a
 * value is never stored under the wrong field (see the EK270 shared-line
 * incident).
 *
 * Usage:
 *   const client = new Vzljot034Client({ host: '10.4.200.25', port: 5010, address: 1, serialNumber: 1114237 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, see ./bars02-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Vzljot034Client({
 *       address: 1,
 *       createSocket: () => gateway.createSocket({ identifier: '0458', port: 'rs485', baudRate: 9600 }),
 *   });
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const FUNCTION_READ_HOLDING = 0x03;
const FUNCTION_READ_INPUT = 0x04;
const FUNCTION_REPORT_ID = 0x11;
const EXCEPTION_BIT = 0x80;
// Exception code 6: slave device busy.
const EXCEPTION_BUSY = 6;

const CHANNELS = ['CH1', 'CH2', 'CH3'];
const ALARM_COUNT = 5;

const BLOCKS = [
    { fn: FUNCTION_READ_INPUT, start: 0x0000, count: 0x18 },
    { fn: FUNCTION_READ_INPUT, start: 0x4000, count: 0x16 },
    { fn: FUNCTION_READ_INPUT, start: 0x8000, count: 0x64 },
    { fn: FUNCTION_READ_INPUT, start: 0xc000, count: 0x60 },
    { fn: FUNCTION_READ_HOLDING, start: 0x8000, count: 0x12 },
];

// Register layout: [path, address, type, extra]. Types: 'u8' (one byte in
// a register), 'u16', 'u32', 'f32', 'total' (u32 integer part + the float
// fraction at extra.fraction, divided by extra.divisor); 'h32' is a u32
// holding register.
const REGISTERS = [
    ['mode', 0x0000, 'u8'],
    ['faultFlags', 0x0005, 'u8'],
    ['heatAccumulationStopped', 0x0012, 'u8'],
    ['massAccumulationStopped', 0x0013, 'u8'],
    ['status', 0x4000, 'u16'],
    ['paramErrorCount', 0x4002, 'u16'],
    ['restartCount', 0x4009, 'u16'],
    ['restartCommandCount', 0x400b, 'u16'],
    ['W1', 0x8000, 'total', { fraction: 0xc03c }],
    ['W2', 0x8002, 'total', { fraction: 0xc03e }],
    ['W3', 0x8004, 'total', { fraction: 0xc040 }],
    ['workTime', 0x8012, 'u32'],
    ['downtime', 0x8014, 'u32'],
    ...Array.from({ length: ALARM_COUNT }, (_, n) => [`alarmTime.${n}`, 0x8016 + n * 2, 'u32']),
    ['eepromWriteErrors', 0x8034, 'u32'],
    ['W4', 0x803e, 'total', { fraction: 0xc052 }],
    ['W5', 0x8040, 'total', { fraction: 0xc054 }],
    ['W6', 0x8042, 'total', { fraction: 0xc056 }],
    ['measurementCounter', 0x804a, 'u32'],
    ['E1', 0xc00c, 'f32'],
    ['E2', 0xc00e, 'f32'],
    ['E3', 0xc010, 'f32'],
    ['E4', 0xc04c, 'f32'],
    ['E5', 0xc04e, 'f32'],
    ['E6', 0xc050, 'f32'],
    ['XV.h', 0xc042, 'f32'],
    ['XV.rho', 0xc044, 'f32'],
    ['XV.t', 0xc05e, 'f32'],
    ['serialNumber', 0x8000, 'h32'],
    ['deviceClock', 0x8010, 'h32'],
    ...CHANNELS.flatMap((name, i) => [
        [`${name}.failureReaction`, 0x0002 + i, 'u8'],
        [`${name}.tState`, 0x000c + i, 'u8'],
        [`${name}.flowState`, 0x000f + i, 'u8'],
        [`${name}.M`, 0x8006 + i * 2, 'total', { fraction: 0xc036 + i * 2 }],
        [`${name}.V`, 0x800c + i * 2, 'total', { fraction: 0xc030 + i * 2, divisor: 1000 }],
        [`${name}.powerOffTime`, 0x8044 + i * 2, 'u32'],
        [`${name}.pulses`, 0x8058 + i * 2, 'u32'],
        [`${name}.t`, 0xc000 + i * 2, 'f32'],
        [`${name}.tMeasured`, 0xc046 + i * 2, 'f32'],
        [`${name}.R`, 0xc006 + i * 2, 'f32'],
        [`${name}.G`, 0xc012 + i * 2, 'f32'],
        [`${name}.Gv`, 0xc018 + i * 2, 'f32'],
        [`${name}.F`, 0xc01e + i * 2, 'f32'],
        [`${name}.rho`, 0xc024 + i * 2, 'f32'],
        [`${name}.h`, 0xc02a + i * 2, 'f32'],
        [`${name}.GHourAverage`, 0xc058 + i * 2, 'f32'],
        [`${name}.PRserialNumber`, 0x8004 + i * 2, 'h32'],
        [`${name}.PTserialNumber`, 0x800a + i * 2, 'h32'],
    ]),
];

class Vzljot034ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot034Client: device exception ${code} on ${what}`);
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

// A float32 carries ~7 significant digits; more would be noise.
const roundFloat = (value) => (Number.isFinite(value) ? Number(value.toPrecision(7)) : null);

// Numeric keys make arrays: 'alarmTime.3' -> alarmTime[3].
function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    keys.slice(0, -1).forEach((key, i) => {
        node = node[key] = node[key] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    });
    node[keys[keys.length - 1]] = value;
}

class Vzljot034Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Modbus address of the calculator (1-247).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=5000] - Wait for a valid reply to one request; also the pause after a repeated request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.retryDelayMs=1000] - Pause before the first extra request; doubles for the next.
     * @param {number} [options.responseTimeoutMs=60000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     * @param {() => net.Socket} [options.createSocket] - Socket factory (default: a new net.Socket); a GPRS modem channel
     *     from the gateway (БАРС-02: Bars02Gateway#createSocket) makes host and port unnecessary.
     */
    constructor({
        host,
        port,
        createSocket = null,
        address = 1,
        serialNumber = null,
        stepDelayMs = 100,
        stepTimeoutMs = 5000,
        retries = 2,
        retryDelayMs = 1000,
        responseTimeoutMs = 60000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('Vzljot034Client: "host" is required');
        if (!port && !createSocket) throw new Error('Vzljot034Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot034Client: "address" must be 1-247');
        }

        this.host = host;
        this.port = port;
        this.createSocket = createSocket || (() => new net.Socket());
        this.address = address;
        this.serialNumber = serialNumber;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.retryDelayMs = retryDelayMs;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;
    }

    buildRequest(bytes) {
        const body = Buffer.from([this.address, ...bytes]);
        const crc = crc16(body);
        return Buffer.concat([body, Buffer.from([crc & 0xff, crc >> 8])]);
    }

    // Opens the socket and returns { reportId, readRegisters, close }.
    // reportId() resolves with the data bytes of the function 0x11 reply;
    // readRegisters({ fn, start, count }) with the register bytes. Both
    // reject with Vzljot034ExceptionError on an exception reply, or with an
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

            // Looks for a reply from our address with the requested function,
            // the expected byte count (any count for function 0x11) and a
            // valid CRC, or a 5-byte exception reply; skips anything else (an
            // echo of the request, another master's requests and replies).
            const check = () => {
                if (!pending) return;
                const { frame, fn, start, dataLength } = pending;

                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                for (let at = 0; at + 5 <= buffer.length; at++) {
                    if (buffer[at] !== this.address) continue;
                    const exception = buffer.subarray(at, at + 5);
                    if (exception[1] === (fn | EXCEPTION_BIT) && crcOk(exception)) {
                        settle('reject', new Vzljot034ExceptionError(fn, start, exception[2]));
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

            // Whatever arrives while no request is pending (a late reply) is
            // dropped when the next request is sent.
            const request = (bytes, start, dataLength) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const frame = this.buildRequest(bytes);
                const fn = bytes[0];
                const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    fn,
                    start,
                    dataLength,
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `Vzljot034Client: no valid reply to ${what}`)), this.stepTimeoutMs),
                };
                if (this.trace) this.trace('>', frame);
                socket.write(frame);
            });

            // Repeats a request that got no valid reply or a "busy"
            // exception; any other exception is the device's answer. After a
            // repeated register read the late reply to the earlier one may
            // still come: wait it out, so it is dropped instead of being
            // taken for the next request's reply. A late function 0x11 reply
            // cannot be taken for a register reply, so no wait after it.
            const requestWithRetries = async (bytes, start, dataLength, retries = this.retries) => {
                for (let attempt = 0; ; attempt++) {
                    try {
                        const data = await request(bytes, start, dataLength);
                        const drain = attempt > 0 && bytes[0] !== FUNCTION_REPORT_ID;
                        await new Promise((r) => setTimeout(r, drain ? this.stepTimeoutMs : this.stepDelayMs));
                        return data;
                    } catch (err) {
                        const retryable = !(err instanceof Vzljot034ExceptionError) || err.code === EXCEPTION_BUSY;
                        if (!retryable || closedError || attempt >= retries) throw err;
                        await new Promise((r) => setTimeout(r, this.retryDelayMs * 2 ** attempt));
                    }
                }
            };

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
            socket.on('close', () => onClosed(new Error('Vzljot034Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // The first request: one or two get lost after a connect.
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null, this.retries + 1),
                    readRegisters: ({ fn, start, count }) => requestWithRetries(
                        [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], start, count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot034Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // Reads every block and returns '<fn>:<address>' -> Buffer of that
    // register's bytes (input and holding registers share addresses).
    async _readBlocks(connection) {
        const registers = new Map();
        for (const block of BLOCKS) {
            const data = await connection.readRegisters(block);
            for (let i = 0; i < block.count; i++) registers.set(`${block.fn}:${block.start + i}`, data.subarray(i * 2));
        }
        return registers;
    }

    static _decode(registers, address, type, extra = {}) {
        const fn = type === 'h32' ? FUNCTION_READ_HOLDING : FUNCTION_READ_INPUT;
        const get = (at) => {
            const bytes = registers.get(`${fn}:${at}`);
            if (!bytes) throw new Error(`Vzljot034Client: register 0x${at.toString(16)} was not read`);
            return bytes;
        };
        switch (type) {
            case 'u8': return get(address).readUInt16BE(0) & 0xff;
            case 'u16': return get(address).readUInt16BE(0);
            case 'u32':
            case 'h32': return get(address).readUInt32BE(0);
            case 'f32': return roundFloat(get(address).readFloatBE(0));
            case 'total': {
                const fraction = get(extra.fraction).readFloatBE(0);
                if (!Number.isFinite(fraction)) return null;
                return Number(((get(address).readUInt32BE(0) + fraction) / (extra.divisor || 1)).toFixed(3));
            }
            default: throw new Error(`Vzljot034Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, results = {}) {
        for (const [path, address, type, extra] of REGISTERS) {
            setPath(results, path, Vzljot034Client._decode(registers, address, type, extra));
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
        return results;
    }

    async _readSession(connection, results) {
        // "VZLJOT 63.01.03.XX ", zero-terminated, then the register counts
        // and the request size limit.
        const id = await connection.reportId();
        const end = id.indexOf(0);
        results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();

        Vzljot034Client.decodeRegisters(await this._readBlocks(connection), results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot034Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block in one session. Resolves with
     * (device units: °C, Ω, t/h, m3/h, Hz, kg/m3, kJ/kg, kg/min, MJ, GJ/h,
     * kg, m3; times in s):
     *
     *   version, serialNumber, deviceTime (epoch ms), mode, faultFlags,
     *   heatAccumulationStopped, massAccumulationStopped, status,
     *   paramErrorCount, restartCount, restartCommandCount, workTime,
     *   downtime, alarmTime[5], eepromWriteErrors, measurementCounter,
     *   W1..W6 (MJ), E1..E6 (GJ/h)
     *   CH1..CH3: { failureReaction, tState, flowState, M, V, powerOffTime,
     *               pulses, t, tMeasured, R, G, Gv, F, rho, h, GHourAverage,
     *               PRserialNumber, PTserialNumber }
     *   XV: { t, h, rho }
     *   timestamp
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
                    reject(new Error('Vzljot034Client: timed out'));
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

module.exports = { Vzljot034Client, Vzljot034ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot034-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot034Client({
        host,
        port: Number(port),
        address: Number(address),
        serialNumber: serialNumber ? Number(serialNumber) : null,
        trace: (direction, bytes) => console.error(direction, hex(bytes)),
    });

    const started = Date.now();
    client.read()
        .then((results) => {
            console.log(JSON.stringify({ ...results, deviceTimeLocal: new Date(results.deviceTime).toString() }, null, 2));
            console.error(`read in ${Date.now() - started} ms`);
        })
        .catch((err) => {
            console.error('Error:', err.message);
            console.error('Partial results:', err.partialResults);
            process.exit(1);
        });
}
