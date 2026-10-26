'use strict';
/**
 * Vzljot023Client
 *
 * TCP client for the Vzljot TSRV-023 heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-023, -023М, firmware 76.10.xx; sold as ВЗЛЕТ ТСР),
 * connected through a transparent TCP-serial gateway (Moxa NPort 5110) to
 * its RS-485 port. Plain Modbus RTU, function 0x04 read input registers,
 * 0x03 read holding registers (this calculator keeps its totals, time
 * counters, serial number and clock there) and 0x11 report slave id, CRC16
 * 0xA001 low byte first; register map from "Протокол связи ТСРВ-023. Список
 * ModBus-регистров" (.docs/vzljot023).
 *
 * read() returns every current value, raw, in the device's units, grouped
 * and named after the register list: measuring points 1-6 ("точка
 * измерения": flow, temperature and pressure sensors) as P1-P6, calculation
 * channels 0-6 ("канал"; 0 is the cold water) as CH0-CH6, heat systems 1-3
 * ("теплосистема", heats W1-W3 and powers E1-E3) as TS1-TS3. Which channel
 * is the supply or the return is decided by the Node-RED mapping
 * (collect-device-state).
 *
 * Not read: settings (holding registers other than the totals, time
 * counters, serial number, clock and the four unit settings), the ADC codes
 * (input 0x4009-0x4010), and the discrete inputs (function 2): they repeat
 * the measuring-point state bytes, not in the order the list names them,
 * and the meter answers a count that is a multiple of 8 with one byte too
 * many.
 *
 * Registers:
 *   input   0x0000  mode, measuring-point states, reverse flow, FJG
 *   input   0x4000  heat-system status words, point frequencies Hz, channel
 *                   states (current, hour, day, month)
 *   input   0x801A  point volumes (u32)
 *   input   0xC000  heat-system powers, channel density kg/m3, enthalpy
 *                   J/kg, temperature °C, pressure MPa, mass flow kg/s;
 *                   point volume flow m3/s, temperature, pressure, R Ω,
 *                   I A; total heat
 *   holding 0x00D3  unit settings: heat, power and volume-flow display units,
 *                   scale (0: 1:1, 1: 1:1000 — heat GJ or TJ, mass t or kt,
 *                   power ×1000)
 *   holding 0x8000  serial number, clock, per heat system work and failure
 *                   time s, alarm НС1-НС3 and НС0 times s
 *   holding 0xC000  heats W1-W3 per heat system, GJ: an integer-valued float
 *                   plus a fraction float
 *   holding 0xC066  channel masses t, the same way (stride 0x1C)
 *
 * Encoding: big-endian, high register first; floats IEEE 754. The clock is
 * the local wall-clock time counted in seconds from 1970-01-01 (no time
 * zone).
 *
 * Found on the live meter 711291 ("VZLJOT 76.10.09.04", Moxa
 * 185.81.220.58:5010, address 1, 2026-10-26): every register of the list
 * reads; 123 registers per request (function 0x11); a request takes
 * 0.25-0.5 s. The powers are in W, not the documented MW (E1 = G × Δh in
 * kg/s and J/kg). The heats are GJ while the display shows Gcal (TS1.W3 is
 * what the meter shows as its heat). A mass fraction can exceed 1 (the list
 * allows -2..2). The point volumes are documented in m3 but count litres
 * (+17 in 4 s at 0.0058 m3/s); the reader keeps the count.
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
 *   const client = new Vzljot023Client({ host: '185.81.220.58', port: 5010, address: 1, serialNumber: 711291 });
 *   const results = await client.read();
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

const POINTS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];
const CHANNELS = ['CH0', 'CH1', 'CH2', 'CH3', 'CH4', 'CH5', 'CH6'];
const HEAT_SYSTEMS = ['TS1', 'TS2', 'TS3'];
const HEATS = [1, 2, 3];

const BLOCKS = [
    { fn: FUNCTION_READ_INPUT, start: 0x0000, count: 0x09 },
    { fn: FUNCTION_READ_INPUT, start: 0x4000, count: 0x2e },
    { fn: FUNCTION_READ_INPUT, start: 0x801a, count: 0x0c },
    { fn: FUNCTION_READ_INPUT, start: 0xc000, count: 0x78 },
    { fn: FUNCTION_READ_INPUT, start: 0xc078, count: 0x1c },
    { fn: FUNCTION_READ_HOLDING, start: 0x00d3, count: 0x04 },
    { fn: FUNCTION_READ_HOLDING, start: 0x8000, count: 0x28 },
    { fn: FUNCTION_READ_HOLDING, start: 0xc000, count: 0x24 },
    { fn: FUNCTION_READ_HOLDING, start: 0xc066, count: 0x3c },
    { fn: FUNCTION_READ_HOLDING, start: 0xc0ba, count: 0x3c },
];

// Register layout: [path, function, address, type, fraction address].
// Types: 'u8' (one byte in a register), 'u16', 'u32', 'f32', 'total' (an
// integer-valued float plus the fraction float at the fifth element).
const I = FUNCTION_READ_INPUT;
const H = FUNCTION_READ_HOLDING;
const REGISTERS = [
    ['mode', I, 0x0000, 'u8'],
    ['reverseFlow', I, 0x0007, 'u8'],
    ['FJG', I, 0x0008, 'u8'],
    ['channelState', I, 0x4011, 'u16'],
    ['totalHeat', I, 0xc092, 'f32'],
    ['units.heat', H, 0x00d3, 'u8'],
    ['units.power', H, 0x00d4, 'u8'],
    ['units.volumeFlow', H, 0x00d5, 'u8'],
    ['units.scale', H, 0x00d6, 'u8'],
    ['serialNumber', H, 0x8000, 'u32'],
    ['deviceClock', H, 0x8002, 'u32'],
    ...POINTS.flatMap((name, i) => [
        [`${name}.state`, I, 0x0001 + i, 'u8'],
        [`${name}.F`, I, 0x4003 + i, 'u16'],
        [`${name}.V`, I, 0x801a + i * 2, 'u32'],
        [`${name}.Gv`, I, 0xc056 + i * 6, 'f32'],
        [`${name}.t`, I, 0xc058 + i * 6, 'f32'],
        [`${name}.P`, I, 0xc05a + i * 6, 'f32'],
        [`${name}.R`, I, 0xc07a + i * 2, 'f32'],
        [`${name}.I`, I, 0xc086 + i * 2, 'f32'],
    ]),
    ...CHANNELS.flatMap((name, c) => {
        // Channel 0 (cold water): rho, h, t, P at 0xC012; channels 1-6 add
        // the mass flow, ten registers each from 0xC01A.
        const base = c === 0 ? 0xc012 : 0xc01a + (c - 1) * 10;
        return [
            [`${name}.state`, I, 0x4012 + c, 'u16'],
            [`${name}.stateHour`, I, 0x4019 + c, 'u16'],
            [`${name}.stateDay`, I, 0x4020 + c, 'u16'],
            [`${name}.stateMonth`, I, 0x4027 + c, 'u16'],
            [`${name}.rho`, I, base, 'f32'],
            [`${name}.h`, I, base + 2, 'f32'],
            [`${name}.t`, I, base + 4, 'f32'],
            [`${name}.P`, I, base + 6, 'f32'],
            ...(c === 0 ? [] : [
                [`${name}.G`, I, base + 8, 'f32'],
                [`${name}.M`, H, 0xc066 + (c - 1) * 0x1c, 'total', 0xc068 + (c - 1) * 0x1c],
            ]),
        ];
    }),
    ...HEAT_SYSTEMS.flatMap((name, j) => [
        [`${name}.status`, I, 0x4000 + j, 'u16'],
        ...HEATS.flatMap((k, n) => [
            [`${name}.E${k}`, I, 0xc000 + j * 6 + n * 2, 'f32'],
            [`${name}.W${k}`, H, 0xc000 + j * 12 + n * 2, 'total', 0xc006 + j * 12 + n * 2],
        ]),
        [`${name}.workTime`, H, 0x8004 + j * 10, 'u32'],
        [`${name}.failureTime`, H, 0x8006 + j * 10, 'u32'],
        // НС0 at 0x8022.., НС1-НС3 next to the work and failure times.
        [`${name}.alarmTime.0`, H, 0x8022 + j * 2, 'u32'],
        ...HEATS.map((n) => [`${name}.alarmTime.${n}`, H, 0x8008 + j * 10 + (n - 1) * 2, 'u32']),
    ]),
];

class Vzljot023ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot023Client: device exception ${code} on ${what}`);
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

// Numeric keys make arrays: 'TS1.alarmTime.3' -> TS1.alarmTime[3].
function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    keys.slice(0, -1).forEach((key, i) => {
        node = node[key] = node[key] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    });
    node[keys[keys.length - 1]] = value;
}

class Vzljot023Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Modbus address of the calculator (1-247).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=3000] - Wait for a valid reply to one request; also the pause after a repeated request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.retryDelayMs=1000] - Pause before the first extra request; doubles for the next.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     */
    constructor({
        host,
        port,
        address = 1,
        serialNumber = null,
        stepDelayMs = 100,
        stepTimeoutMs = 3000,
        retries = 2,
        retryDelayMs = 1000,
        responseTimeoutMs = 30000,
        trace = null,
    } = {}) {
        if (!host) throw new Error('Vzljot023Client: "host" is required');
        if (!port) throw new Error('Vzljot023Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot023Client: "address" must be 1-247');
        }

        this.host = host;
        this.port = port;
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
    // reject with Vzljot023ExceptionError on an exception reply, or with an
    // Error when no valid reply came within stepTimeoutMs.
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
                        settle('reject', new Vzljot023ExceptionError(fn, start, exception[2]));
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
                        `Vzljot023Client: no valid reply to ${what}`)), this.stepTimeoutMs),
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
            const requestWithRetries = async (bytes, start, dataLength) => {
                for (let attempt = 0; ; attempt++) {
                    try {
                        const data = await request(bytes, start, dataLength);
                        const drain = attempt > 0 && bytes[0] !== FUNCTION_REPORT_ID;
                        await new Promise((r) => setTimeout(r, drain ? this.stepTimeoutMs : this.stepDelayMs));
                        return data;
                    } catch (err) {
                        const retryable = !(err instanceof Vzljot023ExceptionError) || err.code === EXCEPTION_BUSY;
                        if (!retryable || closedError || attempt >= this.retries) throw err;
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
            socket.on('close', () => onClosed(new Error('Vzljot023Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null),
                    readRegisters: ({ fn, start, count }) => requestWithRetries(
                        [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], start, count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot023Client: connection closed');
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

    static _decode(registers, fn, address, type, fraction) {
        const get = (at) => {
            const bytes = registers.get(`${fn}:${at}`);
            if (!bytes) throw new Error(`Vzljot023Client: register 0x${at.toString(16)} (function ${fn}) was not read`);
            return bytes;
        };
        switch (type) {
            case 'u8': return get(address).readUInt16BE(0) & 0xff;
            case 'u16': return get(address).readUInt16BE(0);
            case 'u32': return get(address).readUInt32BE(0);
            case 'f32': return roundFloat(get(address).readFloatBE(0));
            case 'total': {
                const value = get(address).readFloatBE(0) + get(fraction).readFloatBE(0);
                return Number.isFinite(value) ? Number(value.toFixed(3)) : null;
            }
            default: throw new Error(`Vzljot023Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, results = {}) {
        for (const [path, fn, address, type, fraction] of REGISTERS) {
            setPath(results, path, Vzljot023Client._decode(registers, fn, address, type, fraction));
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
        return results;
    }

    async _readSession(connection, results) {
        // "VZLJOT 76.10.XX.XX", zero-terminated, then the register counts and
        // the request size limit.
        const id = await connection.reportId();
        const end = id.indexOf(0);
        results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();

        Vzljot023Client.decodeRegisters(await this._readBlocks(connection), results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot023Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block in one session. Resolves with
     * (device units: °C, MPa, kg/m3, J/kg, kg/s, m3/s, Hz, Ω, A, GJ, t, W,
     * point volumes in litres; times in s; the scale setting multiplies
     * heat, mass and power by 1000 when units.scale is 1):
     *
     *   version, serialNumber, deviceTime (epoch ms), mode, reverseFlow, FJG,
     *   channelState, totalHeat, units: { heat, power, volumeFlow, scale }
     *   P1..P6: { state, F, V, Gv, t, P, R, I }
     *   CH0: { state, stateHour, stateDay, stateMonth, rho, h, t, P }
     *   CH1..CH6: { ...the same, G, M }
     *   TS1..TS3: { status, E1, E2, E3, W1, W2, W3, workTime, failureTime,
     *               alarmTime[4] (НС0-НС3) }
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
                    reject(new Error('Vzljot023Client: timed out'));
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

module.exports = { Vzljot023Client, Vzljot023ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot023-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot023Client({
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
