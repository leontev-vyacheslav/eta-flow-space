'use strict';
/**
 * Vzljot043Client
 *
 * TCP client for the Vzljot TSRV-043 heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-043, sold as ВЗЛЕТ ТСР-М), connected through a
 * transparent TCP-serial gateway (Wiznet WIZ108SR) to its RS-485 port.
 * Plain Modbus RTU, function 0x04 read input registers, 0x03 read holding
 * registers (serial numbers and clock only), 0x02 read discrete inputs and
 * 0x11 report slave id, CRC16 0xA001 low byte first; register map from
 * "ТСРВ-043. Использование протокола Modbus. Версии ПО 76.30.04.05,
 * 76.30.05.xx" (.docs/vzljot043).
 *
 * read() returns every current value, raw, in the device's units, grouped
 * and named after the register list: temperatures 1-5 (ПТ1-ПТ5) as
 * PT1-PT5, pressures 1-4 (ПД1-ПД4) as PD1-PD4, flows 1-6 (ПР1-ПР6) as
 * PR1-PR6, the heat systems ТС1-ТС4 as TS1-TS4, cold water (хв) as XV, the
 * registered situations С1-С10 and the device-wide statuses. When input 5
 * (6) is set up as the flow direction of flow 2 (4), flows 2 and 5 (4 and
 * 6) are its forward and reverse parts 2п/2о (4п/4о) — still PR2/PR5
 * (PR4/PR6) here. Which channel is the supply or the return is decided by
 * the Node-RED mapping (collect-device-state).
 *
 * Not read: settings (holding registers other than the serial numbers and
 * the clock), archives, archive indexes and times, and the registers the
 * list marks "для отладки" (ports, input frequencies and flags, clock chip
 * registers, restart, request and display counters, processing durations,
 * pulse counts, ADC codes, the module identifier).
 *
 * Registers:
 *   input    0x0000  access mode, fault flags, measurement states and value
 *                    validity of temperatures, pressures, densities and
 *                    enthalpies, flows, heat-system flows and powers; clock
 *                    chip fault flags (one value per register)
 *   input    0x0059  season by dates and per heat system (76.30.05.00 and
 *                    later), heat-system calculation states (76.30.05.19
 *                    and later); "illegal data address" on older firmware
 *   input    0x4000  checksums of the software, calibration and settings;
 *                    previous processing interval and the seconds of no
 *                    power, heat-system errors, НС1-НС4 and С1-С10 in it;
 *                    memory fault flags, parameter error count
 *   input    0x8000  measurement counter, accumulation time s, totals
 *                    (integer part + float fraction): flow volumes l and
 *                    masses kg, heat-system masses kg and heat MJ; EEPROM
 *                    write errors
 *   input    0x80A6  heat-system normal operation and НС times s
 *   input    0xC000  R Ω, t measured and converted °C, I mA, P measured and
 *                    converted MPa, density t/m3, enthalpy kJ/kg, flow F
 *                    Hz, volume flow measured and converted m3/h, mass flow
 *                    t/h, heat-system mass flow t/h and power GJ/h
 *   holding  0x8000  serial numbers of the calculator and its sensors,
 *                    clock, object number
 *   discrete 0x0000  input, temperature and pressure errors and limits, no
 *                    external power, active level of inputs 5-6, heat-system
 *                    errors, НС1-НС4 of ТС1-ТС3, С1-С10
 *
 * Encoding: big-endian, high register first; discrete inputs low bit first.
 * A total is an integer register pair (unsigned for the flows, signed for
 * the heat systems) plus a float register pair holding its fraction, in the
 * same unit; the reader adds them. The clock is the local wall-clock time
 * counted in seconds from 1970-01-01 (no time zone).
 *
 * Found on the live meter 1500406 ("VZLJOT TSRV-043 76.30.04.05", WIZ108SR
 * 78.138.175.182:5011, address 1, 2026-10-29): every register of the list
 * reads; a request must not split a 4-byte value (exception 2), so blocks
 * start and end on value boundaries; 124 registers per request are fine; a
 * reply comes 0.2-1.4 s after the request, but now and then one never comes
 * (2 of 8 sessions lost the reply to the holding registers once; the
 * repeat was answered), so a session takes 6 s, or about 14 s with a repeat; the
 * 80 discrete inputs come in 10 bytes, as Modbus says; the sensors' serial
 * numbers read 0 (never entered). The old dispatch system polls the same
 * gateway (hourly): while it holds the line nothing is answered.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and it carries exactly the requested
 * number of registers (bytes for discrete inputs). Gateways forward every
 * frame on the line to every connected client, so frames of another master
 * are skipped. The serial number is checked when given. Anything else fails
 * the whole read() — a value is never stored under the wrong field (see the
 * EK270 shared-line incident).
 *
 * Usage:
 *   const client = new Vzljot043Client({ host: '78.138.175.182', port: 5011, address: 1, serialNumber: 1500406 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Vzljot043Client({
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

const FUNCTION_READ_DISCRETE = 0x02;
const FUNCTION_READ_HOLDING = 0x03;
const FUNCTION_READ_INPUT = 0x04;
const FUNCTION_REPORT_ID = 0x11;
const EXCEPTION_BIT = 0x80;
// Exception code 6: slave device busy.
const EXCEPTION_BUSY = 6;

const TEMPERATURES = ['PT1', 'PT2', 'PT3', 'PT4', 'PT5'];
const PRESSURES = ['PD1', 'PD2', 'PD3', 'PD4'];
const FLOWS = ['PR1', 'PR2', 'PR3', 'PR4', 'PR5', 'PR6'];
const HEAT_SYSTEMS = ['TS1', 'TS2', 'TS3', 'TS4'];
const ALARM_COUNT = 4;
const SITUATION_COUNT = 10;

// Firmware that has the season and calculation-state registers.
const SEASONS_FROM = [76, 30, 5, 0];
const CALCULATION_STATES_FROM = [76, 30, 5, 19];

// `from`: the first firmware version that has the block.
const BLOCKS = [
    { fn: FUNCTION_READ_INPUT, start: 0x0000, count: 0x48 },
    { fn: FUNCTION_READ_INPUT, start: 0x0059, count: 0x05, from: SEASONS_FROM },
    { fn: FUNCTION_READ_INPUT, start: 0x005e, count: 0x04, from: CALCULATION_STATES_FROM },
    { fn: FUNCTION_READ_INPUT, start: 0x4000, count: 0x28 },
    { fn: FUNCTION_READ_INPUT, start: 0x8000, count: 0x64 },
    { fn: FUNCTION_READ_INPUT, start: 0x80a6, count: 0x10 },
    { fn: FUNCTION_READ_INPUT, start: 0xc000, count: 0x7c },
    { fn: FUNCTION_READ_INPUT, start: 0xc07c, count: 0x22 },
    { fn: FUNCTION_READ_HOLDING, start: 0x8000, count: 0x26 },
    { fn: FUNCTION_READ_DISCRETE, start: 0x0000, count: 80 },
];

// Register layout: [path, address, type]. Types: 'u16', 'u32', 'f32',
// 'lf' (u32 integer part + float fraction), 'slf' (s32 integer part + float
// fraction), 'h32' (a u32 holding register), 'bit' (a discrete input).
const REGISTERS = [
    ['mode', 0x0000, 'u16'],
    ['faultFlags', 0x0001, 'u16'],
    ['clockChipFlags', 0x0047, 'u16'],
    ['seasonByDates', 0x0059, 'u16'],
    ['softwareChecksum', 0x4000, 'u16'],
    ['calibrationChecksum', 0x4001, 'u16'],
    ['settingsChecksum', 0x4002, 'u16'],
    ['processingInterval', 0x4004, 'u16'],
    ['noPowerTimeInterval', 0x4005, 'u16'],
    ...Array.from({ length: SITUATION_COUNT }, (_, n) => [`situationTimeInterval.${n}`, 0x4016 + n, 'u16']),
    ['memoryFaultFlags', 0x4026, 'u16'],
    ['paramErrorCount', 0x4027, 'u16'],
    ['measurementCounter', 0x8000, 'u32'],
    ['accumulationTime', 0x8002, 'u32'],
    ['eepromWriteErrors', 0x8062, 'u32'],
    ['serialNumber', 0x8000, 'h32'],
    ['deviceClock', 0x8004, 'h32'],
    ['objectNumber', 0x8006, 'h32'],
    ['noExternalPower', 0x0033, 'bit'],
    ...Array.from({ length: SITUATION_COUNT }, (_, n) => [`situations.${n}`, 0x0046 + n, 'bit']),
    ['XV.tValid', 0x000c, 'u16'],
    ['XV.PValid', 0x0016, 'u16'],
    ['XV.hValid', 0x001d, 'u16'],
    ['XV.t', 0xc01e, 'f32'],
    ['XV.P', 0xc042, 'f32'],
    ['XV.rho', 0xc050, 'f32'],
    ['XV.h', 0xc05c, 'f32'],
    ['PatmValid', 0x0017, 'u16'],
    ['Patm', 0xc044, 'f32'],
    ...TEMPERATURES.flatMap((name, i) => [
        [`${name}.state`, 0x0002 + i, 'u16'],
        [`${name}.tValid`, 0x0007 + i, 'u16'],
        // Validity of the enthalpy and the density.
        [`${name}.hValid`, 0x0018 + i, 'u16'],
        [`${name}.R`, 0xc000 + i * 2, 'f32'],
        [`${name}.tMeasured`, 0xc00a + i * 2, 'f32'],
        [`${name}.t`, 0xc014 + i * 2, 'f32'],
        [`${name}.rho`, 0xc046 + i * 2, 'f32'],
        [`${name}.h`, 0xc052 + i * 2, 'f32'],
        [`${name}.error`, 0x0018 + i, 'bit'],
        [`${name}.aboveUpper`, 0x001d + i, 'bit'],
        [`${name}.belowLower`, 0x0022 + i, 'bit'],
    ]),
    ...PRESSURES.flatMap((name, i) => [
        [`${name}.state`, 0x000e + i, 'u16'],
        [`${name}.PValid`, 0x0012 + i, 'u16'],
        [`${name}.I`, 0xc022 + i * 2, 'f32'],
        [`${name}.PMeasured`, 0xc02a + i * 2, 'f32'],
        [`${name}.P`, 0xc03a + i * 2, 'f32'],
        [`${name}.error`, 0x0027 + i, 'bit'],
        [`${name}.aboveUpper`, 0x002b + i, 'bit'],
        [`${name}.belowLower`, 0x002f + i, 'bit'],
    ]),
    ...FLOWS.flatMap((name, i) => [
        [`${name}.state`, 0x001e + i, 'u16'],
        // Bit 0: converted volume flow valid, bit 1: mass flow valid.
        [`${name}.valid`, 0x0024 + i, 'u16'],
        [`${name}.V`, 0x8004 + i * 4, 'lf'],
        [`${name}.M`, 0x801c + i * 4, 'lf'],
        [`${name}.F`, 0xc05e + i * 2, 'f32'],
        [`${name}.GvMeasured`, 0xc06a + i * 2, 'f32'],
        [`${name}.Gv`, 0xc076 + i * 2, 'f32'],
        [`${name}.G`, 0xc082 + i * 2, 'f32'],
        [`${name}.inputError`, 0x0000 + i, 'bit'],
        [`${name}.frequencyExceeded`, 0x0006 + i, 'bit'],
        [`${name}.aboveMax`, 0x000c + i, 'bit'],
        [`${name}.belowMin`, 0x0012 + i, 'bit'],
    ]),
    // Inputs 5 and 6 can be the flow direction signals of flows 2 and 4.
    ['PR5.activeLevel', 0x0034, 'bit'],
    ['PR6.activeLevel', 0x0035, 'bit'],
    ...HEAT_SYSTEMS.flatMap((name, j) => [
        // Bit 1: mass flow valid.
        [`${name}.GValid`, 0x002a + j, 'u16'],
        [`${name}.EValid`, 0x002e + j, 'u16'],
        [`${name}.season`, 0x005a + j, 'u16'],
        [`${name}.calculationState`, 0x005e + j, 'u16'],
        [`${name}.errorTimeInterval`, 0x4006 + j, 'u16'],
        [`${name}.M`, 0x8034 + j * 4, 'slf'],
        [`${name}.W`, 0x8044 + j * 4, 'slf'],
        [`${name}.workTime`, 0x80a6 + j * 4, 'u32'],
        [`${name}.alarmTime`, 0x80a8 + j * 4, 'u32'],
        [`${name}.G`, 0xc08e + j * 2, 'f32'],
        [`${name}.E`, 0xc096 + j * 2, 'f32'],
        [`${name}.error`, 0x0036 + j, 'bit'],
    ]),
    // НС1-НС4 exist for ТС1-ТС3 only.
    ...HEAT_SYSTEMS.slice(0, 3).flatMap((name, j) => Array.from({ length: ALARM_COUNT }, (_, n) => [
        [`${name}.alarmTimeInterval.${n}`, 0x400a + j * ALARM_COUNT + n, 'u16'],
        [`${name}.alarms.${n}`, 0x003a + j * ALARM_COUNT + n, 'bit'],
    ]).flat()),
    ...TEMPERATURES.map((name, i) => [`${name}.serialNumber`, 0x8008 + i * 2, 'h32']),
    ...PRESSURES.map((name, i) => [`${name}.serialNumber`, 0x8012 + i * 2, 'h32']),
    ...FLOWS.map((name, i) => [`${name}.serialNumber`, 0x801a + i * 2, 'h32']),
];

const FUNCTION_OF_TYPE = { h32: FUNCTION_READ_HOLDING, bit: FUNCTION_READ_DISCRETE };

class Vzljot043ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot043Client: device exception ${code} on ${what}`);
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

// "VZLJOT TSRV-043 76.30.04.05" -> [76, 30, 4, 5]; null when absent.
function parseFirmware(version) {
    const match = /(\d+)\.(\d+)\.(\d+)\.(\d+)/.exec(version || '');
    return match ? match.slice(1).map(Number) : null;
}

function firmwareAtLeast(firmware, from) {
    if (!firmware) return false;
    for (let i = 0; i < from.length; i++) {
        if (firmware[i] !== from[i]) return firmware[i] > from[i];
    }
    return true;
}

// Numeric keys make arrays: 'TS1.alarms.3' -> TS1.alarms[3].
function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    keys.slice(0, -1).forEach((key, i) => {
        node = node[key] = node[key] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    });
    node[keys[keys.length - 1]] = value;
}

class Vzljot043Client {
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
     * @param {number} [options.responseTimeoutMs=60000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     * @param {() => net.Socket} [options.createSocket] - Socket factory (default: a new net.Socket); a GPRS modem channel
     *     from the gateway (GprsModemGateway#createSocket) makes host and port unnecessary.
     */
    constructor({
        host,
        port,
        createSocket = null,
        address = 1,
        serialNumber = null,
        stepDelayMs = 100,
        stepTimeoutMs = 3000,
        retries = 2,
        retryDelayMs = 1000,
        responseTimeoutMs = 60000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('Vzljot043Client: "host" is required');
        if (!port && !createSocket) throw new Error('Vzljot043Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot043Client: "address" must be 1-247');
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

    // Opens the socket and returns { reportId, readBlock, close }.
    // reportId() resolves with the data bytes of the function 0x11 reply;
    // readBlock({ fn, start, count }) with the register bytes (the bit
    // bytes for discrete inputs). Both reject with Vzljot043ExceptionError on
    // an exception reply, or with an Error when no valid reply came within
    // stepTimeoutMs.
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
                        settle('reject', new Vzljot043ExceptionError(fn, start, exception[2]));
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
                        `Vzljot043Client: no valid reply to ${what}`)), this.stepTimeoutMs),
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
                        const retryable = !(err instanceof Vzljot043ExceptionError) || err.code === EXCEPTION_BUSY;
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
            socket.on('close', () => onClosed(new Error('Vzljot043Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // The first request after a connect may get lost.
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null, this.retries + 1),
                    readBlock: ({ fn, start, count }) => requestWithRetries(
                        [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], start,
                        fn === FUNCTION_READ_DISCRETE ? Math.ceil(count / 8) : count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot043Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // Reads every block the firmware has and returns '<fn>:<address>' ->
    // Buffer of that register's bytes, or the bit as 0/1 for a discrete
    // input (input and holding registers share addresses).
    async _readBlocks(connection, firmware) {
        const registers = new Map();
        for (const block of BLOCKS) {
            if (block.from && !firmwareAtLeast(firmware, block.from)) continue;
            const data = await connection.readBlock(block);
            for (let i = 0; i < block.count; i++) {
                const value = block.fn === FUNCTION_READ_DISCRETE ? (data[i >> 3] >> (i & 7)) & 1 : data.subarray(i * 2);
                registers.set(`${block.fn}:${block.start + i}`, value);
            }
        }
        return registers;
    }

    // A register of a block the firmware lacks decodes as null.
    static _decode(registers, address, type, firmware) {
        const fn = FUNCTION_OF_TYPE[type] || FUNCTION_READ_INPUT;
        const block = BLOCKS.find((b) => b.fn === fn && address >= b.start && address < b.start + b.count);
        if (block && block.from && !firmwareAtLeast(firmware, block.from)) return null;
        const value = registers.get(`${fn}:${address}`);
        if (value === undefined) throw new Error(`Vzljot043Client: register 0x${address.toString(16)} was not read`);
        switch (type) {
            case 'bit': return value === 1;
            case 'u16': return value.readUInt16BE(0);
            case 'u32':
            case 'h32': return value.readUInt32BE(0);
            case 'f32': return roundFloat(value.readFloatBE(0));
            case 'lf':
            case 'slf': {
                const fraction = value.readFloatBE(4);
                if (!Number.isFinite(fraction)) return null;
                const integer = type === 'lf' ? value.readUInt32BE(0) : value.readInt32BE(0);
                return Number((integer + fraction).toFixed(3));
            }
            default: throw new Error(`Vzljot043Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, firmware, results = {}) {
        for (const [path, address, type] of REGISTERS) {
            setPath(results, path, Vzljot043Client._decode(registers, address, type, firmware));
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
        return results;
    }

    async _readSession(connection, results) {
        // "VZLJOT TSRV-043 76.30.XX.XX", zero-terminated.
        const id = await connection.reportId();
        const end = id.indexOf(0);
        results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();
        const firmware = parseFirmware(results.version);

        Vzljot043Client.decodeRegisters(await this._readBlocks(connection, firmware), firmware, results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot043Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block in one session. Resolves with
     * (device units: Ω, °C, mA, MPa, t/m3, kJ/kg, Hz, m3/h, t/h, GJ/h, l,
     * kg, MJ; times in s):
     *
     *   version, serialNumber, objectNumber, deviceTime (epoch ms), mode,
     *   faultFlags, clockChipFlags, memoryFaultFlags, paramErrorCount,
     *   softwareChecksum, calibrationChecksum, settingsChecksum,
     *   processingInterval, noPowerTimeInterval, situationTimeInterval[10],
     *   measurementCounter, accumulationTime, eepromWriteErrors,
     *   seasonByDates (null before 76.30.05.00), noExternalPower,
     *   situations[10], Patm, PatmValid
     *   PT1..PT5: { state, tValid, hValid, R, tMeasured, t, rho, h, error,
     *               aboveUpper, belowLower, serialNumber }
     *   PD1..PD4: { state, PValid, I, PMeasured, P, error, aboveUpper,
     *               belowLower, serialNumber }
     *   PR1..PR6: { state, valid, V, M, F, GvMeasured, Gv, G, inputError,
     *               frequencyExceeded, aboveMax, belowMin, serialNumber }
     *               (PR5, PR6 also activeLevel)
     *   TS1..TS4: { GValid, EValid, season (null before 76.30.05.00),
     *               calculationState (null before 76.30.05.19),
     *               errorTimeInterval, M, W, workTime, alarmTime, G, E,
     *               error } (TS1..TS3 also alarmTimeInterval[4], alarms[4])
     *   XV: { tValid, PValid, hValid, t, P, rho, h }
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
                    reject(new Error('Vzljot043Client: timed out'));
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

module.exports = { Vzljot043Client, Vzljot043ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot043-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot043Client({
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
