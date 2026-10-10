'use strict';
/**
 * Vzljot026Client
 *
 * TCP client for the Vzljot TSRV-026M heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-026М), connected through a transparent TCP-serial gateway
 * to its RS-485 port. Plain Modbus RTU, function 0x04 read input registers,
 * CRC16 0xA001 low byte first; register map from "Список ModBus-регистров.
 * Тепловычислитель «ВЗЛЕТ ТСРВ» Исполнение ТСРВ-026М" (.docs/vzljot026).
 *
 * read() returns every current value of the input registers, raw, in the
 * device's units, grouped and named after the register list (Cyrillic
 * channel names transliterated): flow channels ПР1-ПР4, ЛОГ1-ЛОГ2 (PR1-PR4,
 * LOG1-LOG2), temperature channels ПТ1-ПТ5 (PT1-PT5), pressure channels
 * ПД1-ПД4 (PD1-PD4), pipes ТР1-ТР4 (TR1-TR4) and the heat system ТС (TS).
 * Which pipe is the supply or the return is decided by the Node-RED
 * mapping (collect-device-state). Verification-mode (ПОВЕРКА), service-mode
 * and programmable-alarm copies of the values, and the archives, are not
 * read.
 *
 * Registers (input registers, one value per register for "1 байт" and
 * "2 байта" types, two for 4-byte integers and floats, four for
 * "long+float" totals):
 *   0x0000  states: summer time, weekday, operating mode, channel and pipe
 *           states, heat-system schemes and algorithms, season mode
 *   0x4000  heat-system status, base checksum, relay events, input states,
 *           hourly average temperatures (°C, signed)
 *   0x8000  clock, serial number, operating and downtime counters, alarm
 *           flags, pulse counts, measurement counter
 *   0xC000  channel values: frequency Hz, resistance Ω, current mA, flow
 *           m3/h, temperature °C, pressure MPa, channel volumes m3
 *   0xC068  heat-system totals Gcal / t, per-pipe t, P, Q, G, h, ρ, E and
 *           heat totals W Gcal
 *   0xC0C8  per-pipe mass M t and volume V m3 totals
 *   0xC12A  heat-system hourly values, current energy and mass flow, outdoor
 *           temperature
 *   0xC16A  per-pipe hourly increments of V, M, W and hourly t, P
 *
 * Encoding: big-endian, high register first. A "long+float" total is an
 * int32 (integer part) followed by a float (fraction); the value is their
 * sum. The clock is the local wall-clock time counted in seconds from
 * 1970-01-01 (no time zone).
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and it carries exactly the requested
 * number of registers. The gateway forwards every reply on the line to
 * every connected client, so frames of another master are skipped. The
 * serial number is checked when given. Anything else fails the whole
 * read() — a value is never stored under the wrong field (see the EK270
 * shared-line incident).
 *
 * Usage:
 *   const client = new Vzljot026Client({ host: '94.180.248.157', port: 5023, address: 1, serialNumber: 1415796 });
 *   const results = await client.read();
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const FUNCTION_READ_INPUT = 0x04;
const EXCEPTION_BIT = 0x80;
// Exception code 6: slave device busy.
const EXCEPTION_BUSY = 6;

const BLOCKS = [
    { start: 0x0000, count: 0x55 },
    // 0x4006 (archive address 5) answers "illegal data address".
    { start: 0x4000, count: 0x06 },
    { start: 0x4007, count: 0x24 },
    { start: 0x8000, count: 0x2e },
    { start: 0xc000, count: 0x68 },
    { start: 0xc068, count: 0x60 },
    { start: 0xc0c8, count: 0x20 },
    // 0xC13E (hourly average cold-water temperature) gets no reply at all.
    { start: 0xc12a, count: 0x14 },
    { start: 0xc16a, count: 0x28 },
];

const FLOW_CHANNELS = ['PR1', 'PR2', 'PR3', 'PR4', 'LOG1', 'LOG2'];
const TEMPERATURE_CHANNELS = ['PT1', 'PT2', 'PT3', 'PT4', 'PT5'];
const PRESSURE_CHANNELS = ['PD1', 'PD2', 'PD3', 'PD4'];
const PIPES = ['TR1', 'TR2', 'TR3', 'TR4'];

// Register layout: [path, address, type]. Types: 'u16', 'i16', 'u32',
// 'f32', 'lf' (long+float).
const REGISTERS = [
    ['summerTime', 0x0000, 'u16'],
    ['weekday', 0x0001, 'u16'],
    ['mode', 0x0002, 'u16'],
    ['TS.initialized', 0x0053, 'u16'],
    ['TS.seasonMode', 0x0054, 'u16'],
    ['TS.scheme1', 0x0012, 'u16'],
    ['TS.scheme2', 0x0013, 'u16'],
    ['TS.heatAlgorithm1', 0x0027, 'u16'],
    ['TS.heatAlgorithm2', 0x0028, 'u16'],
    ['TS.gvsAlgorithm1', 0x0029, 'u16'],
    ['TS.gvsAlgorithm2', 0x002a, 'u16'],
    ['TS.pipeCount1', 0x002b, 'u16'],
    ['TS.pipeCount2', 0x002c, 'u16'],
    ['TS.workTimeHour', 0x004c, 'u16'],
    ['TS.downtimePowerHour', 0x004d, 'u16'],
    ['TS.downtimeSensorsHour', 0x004e, 'u16'],
    ['TS.downtimeAlarmsHour', 0x004f, 'u16'],
    ['TS.downtimeModeHour', 0x0050, 'u16'],
    ['TS.downtimeHeatHour', 0x0051, 'u16'],
    ['TS.downtimeGvsHour', 0x0052, 'u16'],
    ['TS.status', 0x4000, 'u16'],
    ['baseChecksum', 0x4007, 'u16'],
    ['tnvHour', 0x401d, 'i16'],
    ['txHour', 0x402a, 'i16'],
    ['deviceClock', 0x8000, 'u32'],
    ['serialNumber', 0x8002, 'u32'],
    ['TS.workTime', 0x8004, 'u32'],
    ['TS.downtime', 0x8006, 'u32'],
    ['TS.downtimePower', 0x8008, 'u32'],
    ['TS.downtimeSensors', 0x800a, 'u32'],
    ['TS.downtimeAlarms', 0x800c, 'u32'],
    ['TS.downtimeMode', 0x800e, 'u32'],
    ['TS.downtimeHeat', 0x8010, 'u32'],
    ['TS.downtimeGvs', 0x8012, 'u32'],
    ['TS.alarmFlagsHour', 0x8016, 'u32'],
    ['TS.alarmFlags', 0x8018, 'u32'],
    ['measurementCounter', 0x802c, 'u32'],
    ['TS.W', 0xc068, 'lf'],
    ['TS.Wgvs', 0xc06c, 'lf'],
    ['TS.M', 0xc070, 'lf'],
    ['TS.Mgvs', 0xc074, 'lf'],
    ['TS.WHour', 0xc12a, 'f32'],
    ['TS.WgvsHour', 0xc12c, 'f32'],
    ['TS.MHour', 0xc12e, 'f32'],
    ['TS.MgvsHour', 0xc130, 'f32'],
    ['TS.E', 0xc132, 'f32'],
    ['TS.Egvs', 0xc134, 'f32'],
    ['TS.G', 0xc136, 'f32'],
    ['TS.Ggvs', 0xc138, 'f32'],
    ['tnv', 0xc13a, 'f32'],
    ...FLOW_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x000c + i, 'u16'],
        [`${name}.relayEvent`, 0x4008 + i, 'u16'],
        [`${name}.inputState`, 0x4017 + i, 'u16'],
        [`${name}.pulses`, 0x8020 + i * 2, 'u32'],
        [`${name}.F`, 0xc000 + i * 2, 'f32'],
        [`${name}.Q`, 0xc01e + i * 2, 'f32'],
        [`${name}.V`, 0xc03c + i * 4, 'lf'],
    ]),
    ...TEMPERATURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0007 + i, 'u16'],
        [`${name}.inputState`, 0x400e + i, 'u16'],
        [`${name}.R`, 0xc00c + i * 2, 'f32'],
        [`${name}.t`, 0xc02a + i * 2, 'f32'],
    ]),
    ...PRESSURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0003 + i, 'u16'],
        [`${name}.inputState`, 0x4013 + i, 'u16'],
        [`${name}.I`, 0xc016 + i * 2, 'f32'],
        [`${name}.P`, 0xc034 + i * 2, 'f32'],
    ]),
    ...PIPES.flatMap((name, i) => [
        [`${name}.status`, 0x0014 + i, 'u16'],
        [`${name}.statusHour`, 0x002d + i, 'u16'],
        [`${name}.tAverageHour`, 0x401e + i, 'i16'],
        [`${name}.t`, 0xc080 + i * 2, 'f32'],
        [`${name}.P`, 0xc088 + i * 2, 'f32'],
        [`${name}.Q`, 0xc090 + i * 2, 'f32'],
        [`${name}.G`, 0xc098 + i * 2, 'f32'],
        [`${name}.h`, 0xc0a0 + i * 2, 'f32'],
        [`${name}.rho`, 0xc0a8 + i * 2, 'f32'],
        [`${name}.E`, 0xc0b0 + i * 2, 'f32'],
        [`${name}.W`, 0xc0b8 + i * 4, 'lf'],
        [`${name}.M`, 0xc0c8 + i * 4, 'lf'],
        [`${name}.V`, 0xc0d8 + i * 4, 'lf'],
        [`${name}.dVHour`, 0xc16a + i * 2, 'f32'],
        [`${name}.dMHour`, 0xc172 + i * 2, 'f32'],
        [`${name}.dWHour`, 0xc17a + i * 2, 'f32'],
        [`${name}.tHour`, 0xc182 + i * 2, 'f32'],
        [`${name}.PHour`, 0xc18a + i * 2, 'f32'],
    ]),
];

class Vzljot026ExceptionError extends Error {
    constructor(start, code) {
        super(`Vzljot026Client: device exception ${code} on reading register 0x${start.toString(16)}`);
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

function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    for (const key of keys.slice(0, -1)) node = node[key] = node[key] || {};
    node[keys[keys.length - 1]] = value;
}

class Vzljot026Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Modbus address of the calculator (1-247).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=2000] - Wait for a valid reply to one request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     */
    constructor({
        host,
        port,
        address = 1,
        serialNumber = null,
        stepDelayMs = 100,
        stepTimeoutMs = 2000,
        retries = 2,
        responseTimeoutMs = 30000,
        trace = null,
    } = {}) {
        if (!host) throw new Error('Vzljot026Client: "host" is required');
        if (!port) throw new Error('Vzljot026Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot026Client: "address" must be 1-247');
        }

        this.host = host;
        this.port = port;
        this.address = address;
        this.serialNumber = serialNumber;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;
    }

    buildRequest(start, count) {
        const bytes = Buffer.from([this.address, FUNCTION_READ_INPUT, start >> 8, start & 0xff, count >> 8, count & 0xff]);
        const crc = crc16(bytes);
        return Buffer.concat([bytes, Buffer.from([crc & 0xff, crc >> 8])]);
    }

    // Opens the socket and returns { readRegisters, close }.
    // readRegisters({ start, count }) resolves with the register bytes;
    // rejects with Vzljot026ExceptionError on an exception reply, or with an
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

            // Looks for a data reply of the expected length or a 5-byte
            // exception reply from our address with a valid CRC; skips
            // anything else (an echo of the request, another master's
            // requests and replies).
            const check = () => {
                if (!pending) return;
                const { frame, start, count } = pending;
                const length = 5 + count * 2;

                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                for (let at = 0; at + 5 <= buffer.length; at++) {
                    if (buffer[at] !== this.address) continue;
                    const exception = buffer.subarray(at, at + 5);
                    if (exception[1] === (FUNCTION_READ_INPUT | EXCEPTION_BIT) && crcOk(exception)) {
                        settle('reject', new Vzljot026ExceptionError(start, exception[2]));
                        return;
                    }
                    if (at + length > buffer.length) continue;
                    const reply = buffer.subarray(at, at + length);
                    if (reply[1] === FUNCTION_READ_INPUT && reply[2] === count * 2 && crcOk(reply)) {
                        settle('resolve', Buffer.from(reply.subarray(3, 3 + count * 2)));
                        return;
                    }
                }
            };

            const request = (start, count) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const frame = this.buildRequest(start, count);
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    start,
                    count,
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `Vzljot026Client: no valid reply to reading register 0x${start.toString(16)}`)), this.stepTimeoutMs),
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
            socket.on('close', () => onClosed(new Error('Vzljot026Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Repeats a request that got no valid reply or a "busy"
                    // exception; any other exception is the device's answer.
                    readRegisters: async ({ start, count }) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const data = await request(start, count);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return data;
                            } catch (err) {
                                const retryable = !(err instanceof Vzljot026ExceptionError) || err.code === EXCEPTION_BUSY;
                                if (!retryable || closedError || attempt >= this.retries) throw err;
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                            }
                        }
                    },
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot026Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // Reads every block and returns address -> Buffer of that register's bytes.
    async _readBlocks(connection) {
        const registers = new Map();
        for (const block of BLOCKS) {
            const data = await connection.readRegisters(block);
            for (let i = 0; i < block.count; i++) registers.set(block.start + i, data.subarray(i * 2));
        }
        return registers;
    }

    static _decode(registers, address, type) {
        const bytes = registers.get(address);
        if (!bytes) throw new Error(`Vzljot026Client: register 0x${address.toString(16)} was not read`);
        switch (type) {
            case 'u16': return bytes.readUInt16BE(0);
            case 'i16': return bytes.readInt16BE(0);
            case 'u32': return bytes.readUInt32BE(0);
            case 'f32': return roundFloat(bytes.readFloatBE(0));
            case 'lf': {
                const fraction = bytes.readFloatBE(4);
                if (!Number.isFinite(fraction)) return null;
                return Number((bytes.readInt32BE(0) + fraction).toFixed(3));
            }
            default: throw new Error(`Vzljot026Client: unknown type ${type}`);
        }
    }

    async _readSession(connection, results) {
        const registers = await this._readBlocks(connection);
        for (const [path, address, type] of REGISTERS) {
            setPath(results, path, Vzljot026Client._decode(registers, address, type));
        }
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot026Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
    }

    /**
     * Reads every block of input registers in one session. Resolves with
     * (device units: m3/h, °C, MPa, Gcal, Gcal/h, t, t/h, m3, Mcal/t, kg/m3):
     *
     *   serialNumber, deviceTime (epoch ms), summerTime, weekday, mode,
     *   baseChecksum, measurementCounter, tnv, tnvHour, txHour
     *   PR1..PR4, LOG1, LOG2: { state, relayEvent, inputState, pulses, F, Q, V }
     *   PT1..PT5: { state, inputState, R, t }
     *   PD1..PD4: { state, inputState, I, P }
     *   TR1..TR4: { status, statusHour, tAverageHour, t, P, Q, G, h, rho, E,
     *               W, M, V, dVHour, dMHour, dWHour, tHour, PHour }
     *   TS: { W, Wgvs, M, Mgvs (totals), E, Egvs, G, Ggvs (current),
     *         WHour, WgvsHour, MHour, MgvsHour, workTime, downtime...,
     *         alarmFlags, alarmFlagsHour, status, schemes, algorithms... }
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
                    reject(new Error('Vzljot026Client: timed out'));
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

module.exports = { Vzljot026Client, Vzljot026ExceptionError };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot026-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot026Client({
        host,
        port: Number(port),
        address: Number(address),
        serialNumber: serialNumber ? Number(serialNumber) : null,
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
