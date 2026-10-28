'use strict';
/**
 * Vzljot042Client
 *
 * TCP client for the Vzljot TSRV-042 heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-042, sold as ВЗЛЕТ ТСР-М), connected through a
 * transparent TCP-serial gateway (Maestro modem) to its RS-485 port. Plain
 * Modbus RTU, function 0x04 read input registers and 0x11 report slave id,
 * CRC16 0xA001 low byte first; register map from "Список ModBus-регистров
 * (Тепловычислитель ТСРВ-042)" (.docs/vzljot042; the list for firmware
 * 66.00.2X.XX differs), data types from "Протокол MODBUS. Стандарт данных"
 * (.docs/vzljot026).
 *
 * read() returns every current value of the input registers, raw, in the
 * device's units, grouped and named after the register list (Cyrillic
 * names transliterated): pressure channels ДАТЧИК ДАВЛЕНИЯ ПД1-ПД4
 * (PD1-PD4), temperature channels ДАТЧИК ТЕМПЕР. ПТ1-ПТ4, tхв, tнв (PT1-PT4,
 * PTxv, PTnv), flow channels ПР1-ПР7 (PR1-PR7), relay inputs СИГНАЛИЗАЦИЯ
 * 1-3 (SIG1-SIG3), the cold-water channel ХВ (XV), the make-up channel КП
 * (KP), the electricity channel (EL) and the heat systems ТС1-ТС2 (TS1,
 * TS2), each with heating CO (co) and hot water ГВС (gvs) totals. Heat is
 * Q (Gcal) and power E (Gcal/h), mass flow G and volume flow Gv/Go, as the
 * register list names them. Which channel is the supply or the return is
 * decided by the Node-RED mapping (collect-device-state).
 *
 * The values "used in the calculation" (t, P: contract values replace a
 * failed sensor) and the "real" ones (tReal, PReal, GvReal, GReal: what the
 * sensor measures) are both read. The real temperatures and pressures also
 * exist as integers (0x4036-0x403F); their float copies are read instead.
 *
 * Not read: settings (holding registers, and the power-control types at
 * input 0x001D-0x0023), archives and archive pointers (0x4055, 0x82A4-
 * 0x82C1), service-mode copies of the totals (0xC08A-0xC0A4).
 *
 * Registers (input registers; one per value at 0x0000 and 0x4000, two per
 * 4-byte integer at 0x8000 and per float at 0xC000, four per "long+float"
 * total):
 *   0x0000  summer time, weekday, mode, channel states, relay-input events,
 *           states of the ХВ, КП, tхв, Pхв and electricity channels
 *   0x4000  checksums; temperatures 0.01 °C and pressures 0.001 MPa used in
 *           the calculation; alarm flags and critical flags per heat
 *           system; outdoor temperature; tхв, Pхв
 *   0x8000  clock, serial number, operating time, failure flags
 *   0x802C  electricity kWh; heat-system totals Q, V, M (CO, ГВС, ТС); PR
 *           channel volumes and masses
 *   0x80A0  ХВ volume and mass
 *   0x80AA  totals accumulated in normal operation and under failures,
 *           alarm НС0-НС11 action times per heat system
 *   0x8128  calculation counter, heat accumulated in normal operation
 *   0x81D4  КП totals, heat per temperature channel ПТ1-ПТ4
 *   0x81FC  heat accumulated under each failure, downtime and failure times,
 *           empty-pipe times
 *   0x82C8  initialization and archive-clearing flags, leak totals
 *   0xC026  PR frequencies, volume and mass flows
 *   0xC050  R Ω, I mA, heat-system power and flows, ХВ enthalpy and flow,
 *           electric power, densities
 *   0xC0B0  ХВ R and I, enthalpies, КП and ХВ frequencies, real PR flows,
 *           average powers, mass per minute
 *   0xC118  real mass flows, temperatures and pressures; КП flows and power,
 *           power per temperature channel
 *   0xC148  КП density, enthalpy, temperature and pressure; battery
 *           voltage; leak flows and power; electricity frequency
 *
 * Encoding: big-endian, high register first. A "long+float" total is an
 * int32 (integer part) followed by a float (fraction); the value is their
 * sum. Integers in 0.01 °C and 0.001 MPa are divided down to °C and MPa.
 * The clock is the local wall-clock time counted in seconds from
 * 1970-01-01 (no time zone).
 *
 * Found on the live meter 1800180 ("VZLJOT 66.00.15.53", Maestro
 * 10.10.3.10:5010, address 1, 2026-10-25): unreadable ("illegal data
 * address", none of them in the register list) 0x0014-0x0019,
 * 0x4030-0x4033, 0x8010-0x8025, 0x8094-0x809F, 0x80A8-0x80A9,
 * 0x8132-0x8135, 0x81F0-0x81FB, 0x82C6-0x82C7, 0xC04A-0xC04F,
 * 0xC0AE-0xC0AF, 0xC0DE-0xC10F, 0xC142-0xC147 — the blocks stop at them; a
 * request of 112 registers works, 124 gets exception 3; a request takes
 * 0.2-0.45 s. Once a reply came back with its first bytes garbled
 * ("40 10 13" for "01 04 34 00", one byte short: the start of the reply
 * clipped on the line), three times in a row 0.1 s apart; hence the longer
 * pauses before a repeat. The "ч:мин" time counters count minutes (the
 * work time matches the old dispatch system in hours). The pressures used
 * in the calculation (P) are the real ones (PReal, gauge) plus 0.101 MPa.
 * The battery voltage (0xC150) is in 0.01 V, as the list says.
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
 *   const client = new Vzljot042Client({ host: '10.10.3.10', port: 5010, address: 1, serialNumber: 1800180 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Vzljot042Client({
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

const HEAT_SYSTEMS = ['TS1', 'TS2'];
const PRESSURE_CHANNELS = ['PD1', 'PD2', 'PD3', 'PD4'];
// ДАТЧИК ТЕМПЕР. ПТ1-ПТ4, tхв, tнв.
const TEMPERATURE_CHANNELS = ['PT1', 'PT2', 'PT3', 'PT4', 'PTxv', 'PTnv'];
const FLOW_CHANNELS = ['PR1', 'PR2', 'PR3', 'PR4', 'PR5', 'PR6', 'PR7'];
const RELAY_INPUTS = ['SIG1', 'SIG2', 'SIG3'];

const ALARM_COUNT = 12;
const EMPTY_PIPE_COUNT = 4;

// Each block stops at a range the meter answers with "illegal data
// address" (see the header).
const BLOCKS = [
    { start: 0x0000, count: 0x14 },
    { start: 0x001a, count: 0x16 },
    { start: 0x4000, count: 0x30 },
    { start: 0x4034, count: 0x21 },
    { start: 0x8000, count: 0x10 },
    { start: 0x802c, count: 0x68 },
    { start: 0x80a0, count: 0x08 },
    { start: 0x80aa, count: 0x70 },
    { start: 0x8128, count: 0x0a },
    { start: 0x8136, count: 0x08 },
    { start: 0x81d4, count: 0x1c },
    { start: 0x81fc, count: 0x64 },
    { start: 0x8260, count: 0x66 },
    { start: 0x82c8, count: 0x1a },
    { start: 0xc026, count: 0x24 },
    { start: 0xc050, count: 0x5e },
    { start: 0xc0b0, count: 0x2e },
    { start: 0xc118, count: 0x2a },
    { start: 0xc148, count: 0x18 },
];

// Register layout: [path, address, type, divisor]. Types: 'u16', 'i16',
// 'u32', 'f32', 'lf' (long+float); a divisor scales an integer down.
const REGISTERS = [
    ['summerTime', 0x0000, 'u16'],
    ['weekday', 0x0001, 'u16'],
    ['mode', 0x0002, 'u16'],
    ['softwareChecksum', 0x4000, 'u16'],
    ['baseChecksum', 0x400c, 'u16'],
    ['tnv', 0x4040, 'i16', 100],
    ['deviceClock', 0x8000, 'u32'],
    ['serialNumber', 0x8002, 'u32'],
    ['calculationCounter', 0x8128, 'u32'],
    ['initializing', 0x82c2, 'u32'],
    ['archiveClearing', 0x82c4, 'u32'],
    ['batteryVoltage', 0xc150, 'f32'],
    ...PRESSURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0003 + i, 'u16'],
        [`${name}.P`, 0x402b + i, 'u16', 1000],
        [`${name}.PReal`, 0xc12c + i * 2, 'f32'],
        [`${name}.I`, 0xc05c + i * 2, 'f32'],
    ]),
    ...TEMPERATURE_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x0007 + i, 'u16'],
        [`${name}.t`, 0x4025 + i, 'i16', 100],
        [`${name}.tReal`, 0xc120 + i * 2, 'f32'],
        [`${name}.R`, 0xc050 + i * 2, 'f32'],
    ]),
    ...TEMPERATURE_CHANNELS.slice(0, 4).flatMap((name, i) => [
        [`${name}.h`, 0xc0b4 + i * 2, 'f32'],
        [`${name}.E`, 0xc13a + i * 2, 'f32'],
        [`${name}.Q`, 0x81e0 + i * 4, 'lf'],
    ]),
    ...FLOW_CHANNELS.flatMap((name, i) => [
        [`${name}.state`, 0x000d + i, 'u16'],
        [`${name}.F`, 0xc026 + i * 2, 'f32'],
        [`${name}.Gv`, 0xc034 + i * 2, 'f32'],
        [`${name}.GvReal`, 0xc0c0 + i * 2, 'f32'],
        [`${name}.V`, 0x8068 + i * 4, 'lf'],
    ]),
    ...FLOW_CHANNELS.slice(0, 4).flatMap((name, i) => [
        [`${name}.G`, 0xc042 + i * 2, 'f32'],
        [`${name}.GReal`, 0xc118 + i * 2, 'f32'],
        [`${name}.rho`, 0xc0a6 + i * 2, 'f32'],
        [`${name}.M`, 0x8084 + i * 4, 'lf'],
        [`${name}.MMinute`, 0xc0d6 + i * 2, 'f32'],
    ]),
    ...RELAY_INPUTS.map((name, i) => [`${name}.event`, 0x001a + i, 'u16']),
    ['XV.flowState', 0x0024, 'u16'],
    ['XV.tState', 0x0026, 'u16'],
    ['XV.PState', 0x0027, 'u16'],
    ['XV.t', 0x4041, 'i16', 100],
    ['XV.tReal', 0x4042, 'i16', 100],
    ['XV.P', 0x4043, 'u16', 1000],
    ['XV.PReal', 0x4044, 'u16', 1000],
    ['XV.h', 0xc080, 'f32'],
    ['XV.Gv', 0xc086, 'f32'],
    ['XV.GvReal', 0xc084, 'f32'],
    ['XV.F', 0xc0be, 'f32'],
    ['XV.R', 0xc0b0, 'f32'],
    ['XV.I', 0xc0b2, 'f32'],
    ['XV.V', 0x80a0, 'lf'],
    ['XV.M', 0x80a4, 'lf'],
    ['KP.state', 0x0025, 'u16'],
    ['KP.G', 0xc134, 'f32'],
    ['KP.Gv', 0xc136, 'f32'],
    ['KP.GvReal', 0xc082, 'f32'],
    ['KP.E', 0xc138, 'f32'],
    ['KP.rho', 0xc148, 'f32'],
    ['KP.h', 0xc14a, 'f32'],
    ['KP.tCalc', 0xc14c, 'f32'],
    ['KP.PCalc', 0xc14e, 'f32'],
    ['KP.F', 0xc0bc, 'f32'],
    ['KP.V', 0x81d4, 'lf'],
    ['KP.M', 0x81d8, 'lf'],
    ['KP.Q', 0x81dc, 'lf'],
    ['EL.state', 0x002f, 'u16'],
    ['EL.W', 0x802c, 'lf'],
    ['EL.P', 0xc088, 'f32'],
    ['EL.F', 0xc15e, 'f32'],
    ...HEAT_SYSTEMS.flatMap((name, j) => [
        [`${name}.alarmFlags`, 0x4034 + j, 'u16'],
        [`${name}.criticalFlags`, 0x4053 + j, 'u16'],
        [`${name}.failureFlags`, 0x800c + j * 2, 'u32'],
        [`${name}.workTimeCo`, 0x8004 + j * 2, 'u32'],
        [`${name}.workTimeGvs`, 0x8008 + j * 2, 'u32'],
        [`${name}.Qco`, 0x8030 + j * 4, 'lf'],
        [`${name}.Qgvs`, 0x8038 + j * 4, 'lf'],
        [`${name}.Qts`, 0x8040 + j * 4, 'lf'],
        [`${name}.Vco`, 0x8048 + j * 4, 'lf'],
        [`${name}.Vgvs`, 0x8050 + j * 4, 'lf'],
        [`${name}.Mco`, 0x8058 + j * 4, 'lf'],
        [`${name}.Mgvs`, 0x8060 + j * 4, 'lf'],
        [`${name}.McoNormal`, 0x80aa + j * 4, 'lf'],
        [`${name}.McoFault`, 0x80b2 + j * 4, 'lf'],
        [`${name}.MgvsNormal`, 0x80ea + j * 4, 'lf'],
        [`${name}.MgvsFault`, 0x80f2 + j * 4, 'lf'],
        [`${name}.VcoNormal`, 0x80fa + j * 4, 'lf'],
        [`${name}.VcoFault`, 0x8102 + j * 4, 'lf'],
        [`${name}.VgvsNormal`, 0x810a + j * 4, 'lf'],
        [`${name}.VgvsFault`, 0x8112 + j * 4, 'lf'],
        [`${name}.QcoNormal`, 0x812a + j * 4, 'lf'],
        [`${name}.QgvsNormal`, 0x8136 + j * 4, 'lf'],
        [`${name}.QcoPower`, 0x81fc + j * 4, 'lf'],
        [`${name}.QcoFault`, 0x8204 + j * 4, 'lf'],
        [`${name}.QcoDt`, 0x820c + j * 4, 'lf'],
        [`${name}.QcoVp`, 0x8214 + j * 4, 'lf'],
        [`${name}.QcoNp`, 0x821c + j * 4, 'lf'],
        [`${name}.QcoNs1`, 0x8224 + j * 4, 'lf'],
        [`${name}.QcoNs2`, 0x822c + j * 4, 'lf'],
        [`${name}.QgvsPower`, 0x8234 + j * 4, 'lf'],
        [`${name}.QgvsFault`, 0x823c + j * 4, 'lf'],
        [`${name}.QgvsDt`, 0x8244 + j * 4, 'lf'],
        [`${name}.QgvsVp`, 0x824c + j * 4, 'lf'],
        [`${name}.QgvsNp`, 0x8254 + j * 4, 'lf'],
        [`${name}.TcoPower`, 0x825c + j * 2, 'u32'],
        [`${name}.TcoMode`, 0x8260 + j * 2, 'u32'],
        [`${name}.TcoFault`, 0x8264 + j * 2, 'u32'],
        [`${name}.TcoDt`, 0x8268 + j * 2, 'u32'],
        [`${name}.TcoVp`, 0x826c + j * 2, 'u32'],
        [`${name}.TcoNp`, 0x8270 + j * 2, 'u32'],
        [`${name}.TcoNs1`, 0x8274 + j * 2, 'u32'],
        [`${name}.TcoNs2`, 0x8278 + j * 2, 'u32'],
        [`${name}.TgvsPower`, 0x827c + j * 2, 'u32'],
        [`${name}.TgvsMode`, 0x8280 + j * 2, 'u32'],
        [`${name}.TgvsFault`, 0x8284 + j * 2, 'u32'],
        [`${name}.TgvsDt`, 0x8288 + j * 2, 'u32'],
        [`${name}.TgvsVp`, 0x828c + j * 2, 'u32'],
        [`${name}.TgvsNp`, 0x8290 + j * 2, 'u32'],
        ...Array.from({ length: EMPTY_PIPE_COUNT }, (_, p) => [`${name}.TcoEmptyPipe.${p}`, 0x8294 + p * 4 + j * 2, 'u32']),
        ...Array.from({ length: ALARM_COUNT }, (_, n) => [`${name}.alarmTime.${n}`, 0x80ba + j * ALARM_COUNT * 2 + n * 2, 'u32']),
        [`${name}.leak.V`, 0x82ca + j * 4, 'lf'],
        [`${name}.leak.M`, 0x82d2 + j * 4, 'lf'],
        [`${name}.leak.Q`, 0x82da + j * 4, 'lf'],
        [`${name}.leak.Gv`, 0xc152 + j * 2, 'f32'],
        [`${name}.leak.G`, 0xc156 + j * 2, 'f32'],
        [`${name}.leak.E`, 0xc15a + j * 2, 'f32'],
        [`${name}.Eco`, 0xc064 + j * 2, 'f32'],
        [`${name}.Egvs`, 0xc068 + j * 2, 'f32'],
        [`${name}.Ets`, 0xc06c + j * 2, 'f32'],
        [`${name}.Gco`, 0xc070 + j * 2, 'f32'],
        [`${name}.Ggvs`, 0xc074 + j * 2, 'f32'],
        [`${name}.Goco`, 0xc078 + j * 2, 'f32'],
        [`${name}.Gogvs`, 0xc07c + j * 2, 'f32'],
        [`${name}.EcoAverage`, 0xc0ce + j * 2, 'f32'],
        [`${name}.EgvsAverage`, 0xc0d2 + j * 2, 'f32'],
    ]),
];

class Vzljot042ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot042Client: device exception ${code} on ${what}`);
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

class Vzljot042Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Modbus address of the calculator (1-247).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=2000] - Wait for a valid reply to one request.
     * @param {number} [options.retries=2] - Extra requests after no valid reply or a "busy" exception.
     * @param {number} [options.retryDelayMs=1000] - Pause before the first extra request; doubles for the next.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
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
        stepTimeoutMs = 2000,
        retries = 2,
        retryDelayMs = 1000,
        responseTimeoutMs = 30000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('Vzljot042Client: "host" is required');
        if (!port && !createSocket) throw new Error('Vzljot042Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot042Client: "address" must be 1-247');
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
    // readRegisters({ start, count }) with the register bytes. Both reject
    // with Vzljot042ExceptionError on an exception reply, or with an Error
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
                        settle('reject', new Vzljot042ExceptionError(fn, start, exception[2]));
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
                        `Vzljot042Client: no valid reply to ${what}`)), this.stepTimeoutMs),
                };
                if (this.trace) this.trace('>', frame);
                socket.write(frame);
            });

            // Repeats a request that got no valid reply or a "busy"
            // exception; any other exception is the device's answer. The
            // pause before a repeat grows (1 s, 2 s): a garbled reply came
            // back the same three times when repeated after 0.1 s.
            const requestWithRetries = async (bytes, start, dataLength) => {
                for (let attempt = 0; ; attempt++) {
                    try {
                        const data = await request(bytes, start, dataLength);
                        await new Promise((r) => setTimeout(r, this.stepDelayMs));
                        return data;
                    } catch (err) {
                        const retryable = !(err instanceof Vzljot042ExceptionError) || err.code === EXCEPTION_BUSY;
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
            socket.on('close', () => onClosed(new Error('Vzljot042Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null),
                    readRegisters: ({ start, count }) => requestWithRetries(
                        [FUNCTION_READ_INPUT, start >> 8, start & 0xff, count >> 8, count & 0xff], start, count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot042Client: connection closed');
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

    static _decode(registers, address, type, divisor) {
        const bytes = registers.get(address);
        if (!bytes) throw new Error(`Vzljot042Client: register 0x${address.toString(16)} was not read`);
        switch (type) {
            case 'u16': return divisor ? bytes.readUInt16BE(0) / divisor : bytes.readUInt16BE(0);
            case 'i16': return divisor ? bytes.readInt16BE(0) / divisor : bytes.readInt16BE(0);
            case 'u32': return bytes.readUInt32BE(0);
            case 'f32': return roundFloat(bytes.readFloatBE(0));
            case 'lf': {
                const fraction = bytes.readFloatBE(4);
                if (!Number.isFinite(fraction)) return null;
                return Number((bytes.readInt32BE(0) + fraction).toFixed(3));
            }
            default: throw new Error(`Vzljot042Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, results = {}) {
        for (const [path, address, type, divisor] of REGISTERS) {
            setPath(results, path, Vzljot042Client._decode(registers, address, type, divisor));
        }
        // Local wall-clock seconds from 1970 -> epoch ms of that local time.
        const clock = new Date(results.deviceClock * 1000);
        results.deviceTime = new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
            clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
        delete results.deviceClock;
        return results;
    }

    async _readSession(connection, results) {
        // "VZLJOT XX.XX.XX.XX", zero-terminated.
        const id = await connection.reportId();
        const end = id.indexOf(0);
        results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();

        Vzljot042Client.decodeRegisters(await this._readBlocks(connection), results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot042Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block of input registers in one session.
     * Resolves with (device units: MPa, °C, Ω, mA, Hz, m3/h, t/h, m3, t,
     * Gcal, Gcal/h, Mcal/t, kg/m3, kWh, kW; time counters in minutes;
     * batteryVoltage in 0.01 V):
     *
     *   version, serialNumber, deviceTime (epoch ms), summerTime, weekday,
     *   mode, softwareChecksum, baseChecksum, calculationCounter,
     *   initializing, archiveClearing, batteryVoltage, tnv
     *   PD1..PD4: { state, P, PReal, I }
     *   PT1..PT4: { state, t, tReal, R, h, E, Q }   PTxv, PTnv: { state, t, tReal, R }
     *   PR1..PR7: { state, F, Gv, GvReal, V } (PR1..PR4 also G, GReal, rho, M, MMinute)
     *   SIG1..SIG3: { event }
     *   XV: { flowState, tState, PState, t, tReal, P, PReal, h, Gv, GvReal, F, R, I, V, M }
     *   KP: { state, G, Gv, GvReal, E, rho, h, tCalc, PCalc, F, V, M, Q }
     *   EL: { state, W, P, F }
     *   TS1, TS2: { alarmFlags, criticalFlags, failureFlags, workTimeCo,
     *               workTimeGvs, Qco, Qgvs, Qts, Vco, Vgvs, Mco, Mgvs (totals),
     *               McoNormal, McoFault, MgvsNormal, MgvsFault, VcoNormal,
     *               VcoFault, VgvsNormal, VgvsFault, QcoNormal, QgvsNormal,
     *               QcoPower, QcoFault, QcoDt, QcoVp, QcoNp, QcoNs1, QcoNs2,
     *               QgvsPower, QgvsFault, QgvsDt, QgvsVp, QgvsNp, TcoPower,
     *               TcoMode, TcoFault, TcoDt, TcoVp, TcoNp, TcoNs1, TcoNs2,
     *               TgvsPower, TgvsMode, TgvsFault, TgvsDt, TgvsVp, TgvsNp,
     *               TcoEmptyPipe[4], alarmTime[12],
     *               leak: { V, M, Q, Gv, G, E },
     *               Eco, Egvs, Ets, Gco, Ggvs, Goco, Gogvs, EcoAverage,
     *               EgvsAverage }
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
                    reject(new Error('Vzljot042Client: timed out'));
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

module.exports = { Vzljot042Client, Vzljot042ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot042-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot042Client({
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
