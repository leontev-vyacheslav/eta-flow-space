'use strict';
/**
 * Vzljot024Client
 *
 * TCP client for the Vzljot TSRV-024M heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-024М, sold as ВЗЛЕТ ТСР-М), connected through a
 * transparent TCP-serial gateway (Moxa NPort 5150A) to its RS-485 port.
 * Plain Modbus RTU, function 0x04 read input registers and 0x11 report
 * slave id, CRC16 0xA001 low byte first; register map from "Список
 * ModBus-регистров (Тепловычислитель ТСРВ-024М)" (.docs/vzljot024), data
 * types from "Протокол MODBUS. Стандарт данных" (.docs/vzljot026).
 *
 * read() returns every current value of the input registers, raw, in the
 * device's units, grouped and named after the register list (Cyrillic
 * names transliterated): universal outputs ДИСКР. ВЫХОД 0-8 (output0-
 * output8), measuring channels R 1-6 and I 1-6 (R1-R6, I1-I6), pulse inputs
 * ИМПУЛЬСНЫЙ 1-9 (IMP1-IMP9), pressure channels ПД1-ПД6 (PD1-PD6),
 * temperature channels ПТ1-ПТ9 (PT1-PT9), flow channels ПР1-ПР9 (PR1-PR9)
 * and the heat systems ТС1-ТС3 (TS1-TS3), each with its pipes ТР1-ТР4
 * (TS1.TR1...). Which pipe is the supply or the return is decided by the
 * Node-RED mapping (collect-device-state).
 *
 * Not read: settings (holding registers, and the sensor-to-pipe
 * assignment table at input 0x0054-0x0092), archives and archive pointers,
 * verification-mode (ПОВЕРКА) and service-mode copies of the totals, the
 * programmable-alarm copies of the pipe values (Qк, Gк, Eк, tк, Pк and
 * their condition statuses), and the device's internal variables (the
 * register list's "_" names: accumulators _t/_P/_Q, increments _dV/_dM,
 * _FRAM, _Стат.к, _Ст.TP). Obsolete registers (0x4005, 0x4006) are skipped.
 *
 * Registers (input registers; one per value for the 1- and 2-byte types
 * at 0x0000 and 0x4000, two per 4-byte integer at 0x8000 and per float at
 * 0xC000, four per "long+float" total):
 *   0x0000  summer time, weekday, output errors and states, primary
 *           converter errors, channel states (R, I, pulse, PD, PT, PR),
 *           operating mode, heat-system schemes, pipe statuses
 *   0x00A0  heat and DHW algorithms, pipe counts, hourly pipe statuses,
 *           calculations and averagings per hour
 *   0x00D3  minutes each alarm НС0-НС31 was active in the current hour, per
 *           heat system
 *   0x016F  hourly operating and downtime minutes, initialization, pipe
 *           counts of the 4-pipe scheme
 *   0x4000  request counters, relay-input event, collective alarm-analysis
 *           statuses, checksums (archive pointers in between are skipped)
 *   0x8000  clock, serial number, pulse counts, operating and downtime
 *           counters per heat system
 *   0x805E  hourly and current alarm flags, cold-water enthalpy, total
 *           checksum (archive times in between are skipped)
 *   0xC000  output frequencies, R Ω, I mA, pulse F Hz, PD MPa, PT °C,
 *           PR Q m3/h
 *   0xC06C  PR channel volumes V m3
 *   0xC0AE  device totals WΣ Gcal, MΣ t
 *   0xC0BE  heat-system totals Wтс, Wгв Gcal, Mтс t (one block per heat
 *           system)
 *   0xC106  pipe values averaged over a minute: t °C, P MPa, Q m3/h, and
 *           G t/h, h Mcal/t, ρ kg/m3, E Gcal/h (one block per heat system)
 *   0xC234  pipe totals W Gcal, M t, V m3 (one block per pipe)
 *   0xC4F6  cold-water temperature and pressure per heat system
 *   0xC69A  heat-system hourly W, Wгв, M; current E, Eгв, G; outdoor
 *           temperature tнв
 *
 * Encoding: big-endian, high register first. A "long+float" total is an
 * int32 (integer part) followed by a float (fraction); the value is their
 * sum. The register list shows a "_FRAM" entry in the middle of each PR
 * volume; the PR volumes are long+float totals all the same. The clock is
 * the local wall-clock time counted in seconds from 1970-01-01 (no time
 * zone), as in the ТСРВ-026М.
 *
 * Found on the live meter 1400616 ("VZLJOT 76.30.03.29", Moxa
 * 10.10.3.23:5010, address 1, 2026-10-25): the operating and downtime
 * counters at 0x8016-0x803D count seconds (in whole minutes), although the
 * register list says hours, as in the ТСРВ-026М; the cold-water enthalpy
 * hхв at 0x8064 is a float; at most 122 registers per request (function
 * 0x11); a request takes 0.2-0.5 s.
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
 *   const client = new Vzljot024Client({ host: '10.10.3.23', port: 5010, address: 1, serialNumber: 1400616 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, see ./bars02-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Vzljot024Client({
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

const FUNCTION_READ_INPUT = 0x04;
const FUNCTION_REPORT_ID = 0x11;
const EXCEPTION_BIT = 0x80;
// Exception code 6: slave device busy.
const EXCEPTION_BUSY = 6;

const HEAT_SYSTEMS = ['TS1', 'TS2', 'TS3'];
const PIPES = ['TR1', 'TR2', 'TR3', 'TR4'];
// Pipe k = heat system * 4 + pipe, the order of the register list.
const HEAT_SYSTEM_PIPES = HEAT_SYSTEMS.flatMap((ts) => PIPES.map((tr) => `${ts}.${tr}`));

const OUTPUTS = ['output0', 'output1', 'output2', 'output3', 'output4', 'output5', 'output6', 'output7', 'output8'];
const R_CHANNELS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const I_CHANNELS = ['I1', 'I2', 'I3', 'I4', 'I5', 'I6'];
const PULSE_INPUTS = ['IMP1', 'IMP2', 'IMP3', 'IMP4', 'IMP5', 'IMP6', 'IMP7', 'IMP8', 'IMP9'];
const PRESSURE_CHANNELS = ['PD1', 'PD2', 'PD3', 'PD4', 'PD5', 'PD6'];
const TEMPERATURE_CHANNELS = ['PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6', 'PT7', 'PT8', 'PT9'];
const FLOW_CHANNELS = ['PR1', 'PR2', 'PR3', 'PR4', 'PR5', 'PR6', 'PR7', 'PR8', 'PR9'];

const ALARM_COUNT = 32;

const BLOCKS = [
    { start: 0x0000, count: 0x54 },
    { start: 0x00a0, count: 0x33 },
    { start: 0x00d3, count: 0x60 },
    { start: 0x016f, count: 0x15 },
    { start: 0x4000, count: 0x28 },
    { start: 0x8000, count: 0x3e },
    { start: 0x805e, count: 0x2c },
    { start: 0xc000, count: 0x6c },
    { start: 0xc06c, count: 0x24 },
    // 0xC0BA-0xC0BD, 0xC0D0-0xC0D5 and 0xC0E8-0xC0ED (not in the register
    // list) answer "illegal data address".
    { start: 0xc0ae, count: 0x08 },
    ...HEAT_SYSTEMS.map((ts, j) => ({ start: 0xc0be + j * 0x18, count: 0x0c })),
    ...HEAT_SYSTEMS.map((ts, j) => ({ start: 0xc106 + j * 0x60, count: 0x60 })),
    ...HEAT_SYSTEM_PIPES.map((pipe, k) => ({ start: 0xc234 + k * 0x3c, count: 0x0c })),
    { start: 0xc4f6, count: 0x0c },
    { start: 0xc69a, count: 0x26 },
];

// Register layout: [path, address, type]. Types: 'u16', 'u32', 'f32',
// 'lf' (long+float).
const REGISTERS = [
    ['summerTime', 0x0000, 'u16'],
    ['weekday', 0x0001, 'u16'],
    ['primaryErrors', 0x0016, 'u16'],
    ['mode', 0x0044, 'u16'],
    ['requestsTotal', 0x4000, 'u16'],
    ['requestsOwn', 0x4001, 'u16'],
    ['requestsCrcErrors', 0x4002, 'u16'],
    ['requestsTransit', 0x4003, 'u16'],
    ...Array.from({ length: 12 }, (_, i) => [`collectiveAnalysisStatus.${i}`, 0x4007 + i, 'u16']),
    ['settingsChecksum', 0x4025, 'u16'],
    ['sensorSettingsChecksum', 0x4026, 'u16'],
    ['baseChecksum', 0x4027, 'u16'],
    ['deviceClock', 0x8000, 'u32'],
    ['serialNumber', 0x8002, 'u32'],
    ['totalChecksum', 0x8088, 'u32'],
    ['WSum', 0xc0ae, 'lf'],
    ['MSum', 0xc0b2, 'lf'],
    ['tnv', 0xc6be, 'f32'],
    ...OUTPUTS.flatMap((name, i) => [
        [`${name}.errors`, 0x0002 + i, 'u16'],
        [`${name}.state`, 0x000b + i, 'u16'],
        [`${name}.F`, 0xc000 + i * 2, 'f32'],
    ]),
    ...R_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0017 + i, 'u16'],
        [`${name}.R`, 0xc012 + i * 2, 'f32'],
    ]),
    ...I_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x001d + i, 'u16'],
        [`${name}.I`, 0xc01e + i * 2, 'f32'],
    ]),
    ...PULSE_INPUTS.flatMap((name, i) => [
        [`${name}.state`, 0x0023 + i, 'u16'],
        [`${name}.N`, 0x8004 + i * 2, 'u32'],
        [`${name}.F`, 0xc02a + i * 2, 'f32'],
    ]),
    ['IMP1.relayEvent', 0x4004, 'u16'],
    ...PRESSURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x002c + i, 'u16'],
        [`${name}.P`, 0xc03c + i * 2, 'f32'],
    ]),
    ...TEMPERATURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0032 + i, 'u16'],
        [`${name}.t`, 0xc048 + i * 2, 'f32'],
    ]),
    ...FLOW_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x003b + i, 'u16'],
        [`${name}.Q`, 0xc05a + i * 2, 'f32'],
        [`${name}.V`, 0xc06c + i * 4, 'lf'],
    ]),
    ...HEAT_SYSTEMS.flatMap((name, j) => [
        [`${name}.scheme`, 0x0045 + j, 'u16'],
        [`${name}.heatAlgorithm`, 0x00a0 + j, 'u16'],
        [`${name}.gvsAlgorithm`, 0x00a3 + j, 'u16'],
        [`${name}.pipeCount`, 0x00a6 + j, 'u16'],
        [`${name}.calculationsHour`, 0x00cd + j * 2, 'u16'],
        [`${name}.averagingsHour`, 0x00ce + j * 2, 'u16'],
        ...Array.from({ length: ALARM_COUNT }, (_, n) => [`${name}.alarmMinutesHour.${n}`, 0x00d3 + j * ALARM_COUNT + n, 'u16']),
        [`${name}.workTimeHour`, 0x016f + j * 5, 'u16'],
        [`${name}.downtimePowerHour`, 0x0170 + j * 5, 'u16'],
        [`${name}.downtimeSensorsHour`, 0x0171 + j * 5, 'u16'],
        [`${name}.downtimeAlarmsHour`, 0x0172 + j * 5, 'u16'],
        [`${name}.downtimeModeHour`, 0x0173 + j * 5, 'u16'],
        [`${name}.initialized`, 0x017e + j, 'u16'],
        [`${name}.pipeCount4`, 0x0181 + j, 'u16'],
        [`${name}.workTime`, 0x8016 + j * 0x0e, 'u32'],
        [`${name}.downtime`, 0x8018 + j * 0x0e, 'u32'],
        [`${name}.downtimePower`, 0x801a + j * 0x0e, 'u32'],
        [`${name}.downtimeSensors`, 0x801c + j * 0x0e, 'u32'],
        [`${name}.downtimeAlarms`, 0x801e + j * 0x0e, 'u32'],
        [`${name}.downtimeMode`, 0x8020 + j * 0x0e, 'u32'],
        [`${name}.alarmFlagsHour`, 0x805e + j * 2, 'u32'],
        // A float, although it sits among the 4-byte integers.
        [`${name}.hxv`, 0x8064 + j * 2, 'f32'],
        [`${name}.alarmFlags`, 0x806a + j * 2, 'u32'],
        [`${name}.W`, 0xc0be + j * 0x18, 'lf'],
        [`${name}.Wgv`, 0xc0c2 + j * 0x18, 'lf'],
        [`${name}.M`, 0xc0c6 + j * 0x18, 'lf'],
        [`${name}.txv`, 0xc4f6 + j * 2, 'f32'],
        [`${name}.Pxv`, 0xc4fc + j * 2, 'f32'],
        [`${name}.WHour`, 0xc69a + j * 6, 'f32'],
        [`${name}.WgvHour`, 0xc69c + j * 6, 'f32'],
        [`${name}.MHour`, 0xc69e + j * 6, 'f32'],
        [`${name}.E`, 0xc6ac + j * 6, 'f32'],
        [`${name}.Egv`, 0xc6ae + j * 6, 'f32'],
        [`${name}.G`, 0xc6b0 + j * 6, 'f32'],
    ]),
    ...HEAT_SYSTEM_PIPES.flatMap((name, k) => [
        [`${name}.status`, 0x0048 + k, 'u16'],
        [`${name}.statusHour`, 0x00a9 + k * 3, 'u16'],
        [`${name}.t`, 0xc10c + k * 0x18, 'f32'],
        [`${name}.P`, 0xc10e + k * 0x18, 'f32'],
        [`${name}.Q`, 0xc110 + k * 0x18, 'f32'],
        [`${name}.G`, 0xc112 + k * 0x18, 'f32'],
        [`${name}.h`, 0xc114 + k * 0x18, 'f32'],
        [`${name}.rho`, 0xc116 + k * 0x18, 'f32'],
        [`${name}.E`, 0xc118 + k * 0x18, 'f32'],
        [`${name}.W`, 0xc234 + k * 0x3c, 'lf'],
        [`${name}.M`, 0xc238 + k * 0x3c, 'lf'],
        [`${name}.V`, 0xc23c + k * 0x3c, 'lf'],
    ]),
];

class Vzljot024ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot024Client: device exception ${code} on ${what}`);
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

// Numeric keys make arrays: 'TS1.alarmMinutesHour.3' -> TS1.alarmMinutesHour[3].
function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    keys.slice(0, -1).forEach((key, i) => {
        node = node[key] = node[key] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    });
    node[keys[keys.length - 1]] = value;
}

class Vzljot024Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Modbus address of the calculator (1-247).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=2000] - Wait for a valid reply to one request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.responseTimeoutMs=45000] - Overall timeout for a full read() call.
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
        stepTimeoutMs = 2000,
        retries = 2,
        responseTimeoutMs = 45000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('Vzljot024Client: "host" is required');
        if (!port && !createSocket) throw new Error('Vzljot024Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot024Client: "address" must be 1-247');
        }

        this.host = host;
        this.port = port;
        this.createSocket = createSocket || (() => new net.Socket());
        this.address = address;
        this.serialNumber = serialNumber;
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

    // Opens the socket and returns { reportId, readRegisters, close }.
    // reportId() resolves with the data bytes of the function 0x11 reply;
    // readRegisters({ start, count }) with the register bytes. Both reject
    // with Vzljot024ExceptionError on an exception reply, or with an Error
    // when no valid reply came within stepTimeoutMs.
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
                        settle('reject', new Vzljot024ExceptionError(fn, start, exception[2]));
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
                        `Vzljot024Client: no valid reply to ${what}`)), this.stepTimeoutMs),
                };
                if (this.trace) this.trace('>', frame);
                socket.write(frame);
            });

            // Repeats a request that got no valid reply or a "busy"
            // exception; any other exception is the device's answer.
            const requestWithRetries = async (bytes, start, dataLength) => {
                for (let attempt = 0; ; attempt++) {
                    try {
                        const data = await request(bytes, start, dataLength);
                        await new Promise((r) => setTimeout(r, this.stepDelayMs));
                        return data;
                    } catch (err) {
                        const retryable = !(err instanceof Vzljot024ExceptionError) || err.code === EXCEPTION_BUSY;
                        if (!retryable || closedError || attempt >= this.retries) throw err;
                        await new Promise((r) => setTimeout(r, this.stepDelayMs));
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
            socket.on('close', () => onClosed(new Error('Vzljot024Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null),
                    readRegisters: ({ start, count }) => requestWithRetries(
                        [FUNCTION_READ_INPUT, start >> 8, start & 0xff, count >> 8, count & 0xff], start, count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot024Client: connection closed');
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
        if (!bytes) throw new Error(`Vzljot024Client: register 0x${address.toString(16)} was not read`);
        switch (type) {
            case 'u16': return bytes.readUInt16BE(0);
            case 'u32': return bytes.readUInt32BE(0);
            case 'f32': return roundFloat(bytes.readFloatBE(0));
            case 'lf': {
                const fraction = bytes.readFloatBE(4);
                if (!Number.isFinite(fraction)) return null;
                return Number((bytes.readInt32BE(0) + fraction).toFixed(3));
            }
            default: throw new Error(`Vzljot024Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, results = {}) {
        for (const [path, address, type] of REGISTERS) {
            setPath(results, path, Vzljot024Client._decode(registers, address, type));
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
        return results;
    }

    async _readSession(connection, results) {
        // "Vzljot <device> XX.XXXXXX", zero-terminated, then the register
        // counts and the request size limit.
        const id = await connection.reportId();
        const end = id.indexOf(0);
        results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();

        Vzljot024Client.decodeRegisters(await this._readBlocks(connection), results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot024Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block of input registers in one session.
     * Resolves with (device units: m3/h, m3, °C, MPa, Ω, mA, Hz, Gcal,
     * Gcal/h, t, t/h, Mcal/t, kg/m3, seconds and minutes):
     *
     *   version, serialNumber, deviceTime (epoch ms), summerTime, weekday,
     *   mode, primaryErrors, requestsTotal, requestsOwn, requestsCrcErrors,
     *   requestsTransit, collectiveAnalysisStatus[12], settingsChecksum,
     *   sensorSettingsChecksum, baseChecksum, totalChecksum, WSum, MSum, tnv
     *   output0..output8: { errors, state, F }
     *   R1..R6: { state, R }    I1..I6: { state, I }
     *   IMP1..IMP9: { state, N, F } (IMP1 also relayEvent)
     *   PD1..PD6: { state, P }  PT1..PT9: { state, t }
     *   PR1..PR9: { state, Q, V }
     *   TS1..TS3: { scheme, heatAlgorithm, gvsAlgorithm, pipeCount,
     *               pipeCount4, initialized, calculationsHour,
     *               averagingsHour, alarmMinutesHour[32], workTime,
     *               downtime, downtimePower, downtimeSensors,
     *               downtimeAlarms, downtimeMode (s), workTimeHour,
     *               downtimePowerHour, downtimeSensorsHour,
     *               downtimeAlarmsHour, downtimeModeHour (min),
     *               alarmFlags, alarmFlagsHour, W, Wgv, M (totals), WHour,
     *               WgvHour, MHour, E, Egv, G, txv, Pxv, hxv,
     *               TR1..TR4: { status, statusHour, t, P, Q, G, h, rho, E,
     *                           W, M, V } }
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
                    reject(new Error('Vzljot024Client: timed out'));
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

module.exports = { Vzljot024Client, Vzljot024ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot024-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot024Client({
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
