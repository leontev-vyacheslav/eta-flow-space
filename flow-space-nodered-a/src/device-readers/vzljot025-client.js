'use strict';
/**
 * Vzljot025Client
 *
 * TCP client for the Vzljot TSRV-025 heat calculator ("Взлет ТСРВ",
 * исполнение ТСРВ-025, sold as ВЗЛЕТ ТСР-М / ТСР-025), connected through a
 * transparent TCP-serial gateway or a GPRS modem to its RS-485 port. Plain
 * Modbus RTU, function 0x04 read input registers, 0x03 read holding
 * registers (identity, units and the channel values the meter keeps there)
 * and 0x11 report slave id, CRC16 0xA001 low byte first; register map from
 * "Список ModBus-регистров. Тепловычислитель «ВЗЛЕТ ТСРВ», исполнение
 * ТСРВ-025" (.docs/vzljot025), data types from "Протокол MODBUS. Стандарт
 * данных" (.docs/vzljot026).
 *
 * The ТСРВ-025 serves one calculated heat system (ТС) of up to six pipes
 * (ТР1-ТР6, "расчетные данные") fed by six flow (ПР1-ПР6), six temperature
 * (ПТ1-ПТ6) and six pressure (ПД1-ПД6) channels, three more pulse inputs
 * (ЛОГ1, ЛОГ2, 8), three relay inputs (СИГНАЛИЗАЦИЯ 1-3), cold water (хв),
 * eight universal and two current outputs. Its totals W1-W3, M1-M3, V1-V3
 * and powers E1-E3, G1-G3 are, by the manual (part I §7.4.4.3): 1 the
 * heating circuit, 2 hot water, 3 the calculated system as a whole; the
 * formulas behind them are settings.
 *
 * read() returns every current value, raw, in the device's units, grouped
 * and named after the register list (Cyrillic transliterated): channels
 * PR1-PR6, PT1-PT6, PD1-PD6, LOG1, LOG2, IN8, SIG1-SIG3, pipes TR1-TR6, the
 * heat system TS, cold water XV, the outputs, the device-wide values. The
 * float names give two units, e.g. "Объемный расход (м³/мин), м³/ч": the
 * register's own and the display unit; the values stay as the register
 * holds them and `units` returns the display-unit settings (holding
 * 0x00FF-0x0106: heat 0 Гкал / 1 ГДж / 2 МВт·ч, mass 0 т / 1 кг, volume
 * 0 м3 / 1 л, pressure 0 МПа / 1 кгс/см2 / 2 бар / 3 кПа, mass flow 0 т/ч /
 * 1 кг/ч, flow 0 м3/ч / 1 л/мин, power 0 Гкал/ч / 1 ГДж/ч / 2 МВт, pulse
 * constant 0 имп/м3 / 1 имп/л). Which pipe is the supply or the return is
 * decided by the Node-RED mapping (collect-device-state).
 *
 * Not read: settings (holding registers other than identity and units),
 * archives and archive pointers (input 0x4034-0x4043, 0x810C-0x811F),
 * hourly averages and increments (0x4031-0x4033, 0xC116-0xC121,
 * 0xC146-0xC181), service-mode copies (0xC0FC-0xC107, 0xC12E-0xC145),
 * request counters and memory sizes (0x4000-0x4007), the sensor-to-pipe
 * assignments (0x804A, 0x806E, 0x812E), the orifice and gas constants
 * (0xC182-0xC19C), the registers marked "не для ModBus" (0x8006, 0x8008).
 *
 * Registers (one block each, never splitting a 4-byte value; the list's
 * unlisted gaps are left out):
 *   input    0x0000  summer time, weekday, universal output errors and
 *                    faults, current output statuses (one value each)
 *   input    0x0020  ПИ errors, input and channel states of ПТ, ПД, ПР and
 *                    the pulse inputs, relay events, mode (winter/summer),
 *                    pipe measurement statuses, scheme change in progress
 *   input    0x4008  software checksum
 *   input    0x4010  relay events and relay / pulse bit fields of the inputs
 *   input    0x8000  clock, power-off time, time without power
 *   input    0x8020  pulse counts, channel volumes (pulse flowmeters)
 *   input    0x8056  channel volumes (flowmeters on current inputs)
 *   input    0x807A  cold-water volume Vхв
 *   input    0x8080  ТС times Тнар, Тпр, Тпит, Тот, Тнс, Треж; W1-W3 and
 *                    M1-M3 in working mode; current and hourly fault / НС
 *                    flag sets, ТС state, НС action times
 *   input    0x80DC  pipe masses and volumes in working mode
 *   input    0x8120  aggregate analysis status, V1-V3 in working mode
 *   input    0xC000  universal outputs: frequencies, pulse accumulators
 *   input    0xC080  tхв, hхв, Pхв, Qхв; pipes: volume flow, mass flow,
 *                    power, density, enthalpy, the temperatures and
 *                    pressures used for density and for enthalpy
 *   input    0xC108  outdoor air temperature, E1-E3, G1-G3
 *   holding  0x00FF  display units (see above)
 *   holding  0x8006  serial numbers of the calculator and of its measuring
 *                    unit (ПИ), MAC and IP settings (not returned), device
 *                    identifier, production and verification dates
 *   holding  0xC1A4  channel flows (pulse flowmeters) m3/h, frequencies Hz
 *   holding  0xC1EC  channel temperatures °C, resistances Ω
 *   holding  0xC24C  channel pressures and pressure differences MPa,
 *                    flows (flowmeters on current inputs) m3/h, currents mA
 *
 * Encoding (data standard): input/holding 0x0000 one byte per register,
 * 0x4000 two bytes, 0x8000 four (high word first), 0xC000 big-endian
 * floats. A "long+float" total is an integer register pair plus a float
 * register pair holding its fraction, in the same unit; the reader adds
 * them (signed for the heat system, unsigned for channels and pipes). The
 * clock is the local wall-clock time counted in seconds from 1970-01-01 (no
 * time zone).
 *
 * Found on the live meters (2026-10-30, "VZLJOT 76.90.01.55": 1401768,
 * 1400791, 1400399 behind ETA GSM modems on RS-485 4800 8N1, address 1;
 * .tools/device-probes/vzljot025-session-2026-10-30.jsonl): every block
 * below reads on all three; a block over 0x80B8-0x80C3 gets "illegal data
 * address". The pipe registers hold the volume flow in m3/min, the mass
 * flow in t/min and the power in Гкал/min (the first unit of their names;
 * G / Gv is the density), while the heat system's E1-E3, G1-G3 are per
 * hour; the ТС times (Тнар, Тпр, Тпит, Тот, Тнс, Треж, the НС times) count
 * seconds (Тнар 169064040 s = 46962 h on 1401768, the list says h); W1 is
 * the heat the old dispatch system shows. The serial number of the
 * measuring unit (ПИ) is its own (1167198 on 1400791) or the calculator's
 * (1401768); the device identifier and production date read 0, the
 * verification date is a clock value (2015-06-08 on all three). The
 * clock of 1401768 is about 3 h 17 min fast. A read through an ETA GSM
 * modem takes 90-210 s, the in-band line change included; 1701605 (modem
 * 0408, 9600) did not answer at all.
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
 *   const client = new Vzljot025Client({ host: '10.0.0.10', port: 5010, address: 1, serialNumber: 1401768 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Vzljot025Client({
 *       address: 1,
 *       createSocket: () => gateway.createSocket({ identifier: '0191', port: 'rs485', baudRate: 4800 }),
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
// Exception code 1: illegal function; 6: slave device busy.
const EXCEPTION_ILLEGAL_FUNCTION = 1;
const EXCEPTION_BUSY = 6;

const FLOWS = ['PR1', 'PR2', 'PR3', 'PR4', 'PR5', 'PR6'];
const TEMPERATURES = ['PT1', 'PT2', 'PT3', 'PT4', 'PT5', 'PT6'];
const PRESSURES = ['PD1', 'PD2', 'PD3', 'PD4', 'PD5', 'PD6'];
// Pulse inputs 7-9 of the list: ЛОГ1, ЛОГ2 and "8".
const EXTRA_INPUTS = ['LOG1', 'LOG2', 'IN8'];
const SIGNALS = ['SIG1', 'SIG2', 'SIG3'];
const PIPES = ['TR1', 'TR2', 'TR3', 'TR4', 'TR5', 'TR6'];
const UNIVERSAL_OUTPUTS = 8;
const CURRENT_OUTPUTS = 2;

// Every block read on three meters (see the header). The registers between
// 0x80B8 and 0x80C3 (placeholders, the last processing and archiving times)
// are skipped: a block over them gets "illegal data address".
const BLOCKS = [
    { fn: FUNCTION_READ_INPUT, start: 0x0000, count: 0x14 },
    { fn: FUNCTION_READ_INPUT, start: 0x0020, count: 0x33 },
    { fn: FUNCTION_READ_INPUT, start: 0x4008, count: 0x01 },
    { fn: FUNCTION_READ_INPUT, start: 0x4010, count: 0x15 },
    { fn: FUNCTION_READ_INPUT, start: 0x8000, count: 0x06 },
    { fn: FUNCTION_READ_INPUT, start: 0x8020, count: 0x2a },
    { fn: FUNCTION_READ_INPUT, start: 0x8056, count: 0x18 },
    { fn: FUNCTION_READ_INPUT, start: 0x807a, count: 0x04 },
    { fn: FUNCTION_READ_INPUT, start: 0x8080, count: 0x38 },
    { fn: FUNCTION_READ_INPUT, start: 0x80ba, count: 0x04 },
    { fn: FUNCTION_READ_INPUT, start: 0x80c4, count: 0x0c },
    { fn: FUNCTION_READ_INPUT, start: 0x80dc, count: 0x30 },
    { fn: FUNCTION_READ_INPUT, start: 0x8120, count: 0x0e },
    { fn: FUNCTION_READ_INPUT, start: 0xc000, count: 0x30 },
    { fn: FUNCTION_READ_INPUT, start: 0xc080, count: 0x7c },
    { fn: FUNCTION_READ_INPUT, start: 0xc108, count: 0x0e },
    { fn: FUNCTION_READ_HOLDING, start: 0x00ff, count: 0x08 },
    { fn: FUNCTION_READ_HOLDING, start: 0x8006, count: 0x04 },
    { fn: FUNCTION_READ_HOLDING, start: 0x8012, count: 0x06 },
    { fn: FUNCTION_READ_HOLDING, start: 0xc1a4, count: 0x18 },
    { fn: FUNCTION_READ_HOLDING, start: 0xc1ec, count: 0x18 },
    { fn: FUNCTION_READ_HOLDING, start: 0xc24c, count: 0x30 },
];

// Register layout: [path, address, type]. Types: 'u16', 'u32', 'f32'
// (input registers), 'lf' (u32 integer part + float fraction), 'slf' (s32
// integer part + float fraction), 'h16', 'h32', 'hf32' (holding registers).
const REGISTERS = [
    ['summerTime', 0x0000, 'u16'],
    ['weekday', 0x0001, 'u16'],
    ['piErrors', 0x0020, 'u16'],
    ['mode', 0x004b, 'u16'],
    ['schemeChanging', 0x0052, 'u16'],
    ['softwareChecksum', 0x4008, 'u16'],
    ['deviceClock', 0x8000, 'u32'],
    ['powerOffClock', 0x8002, 'u32'],
    ['noPowerTime', 0x8004, 'u32'],
    ['tnv', 0xc108, 'f32'],
    ['serialNumber', 0x8006, 'h32'],
    ['serialNumberPI', 0x8008, 'h32'],
    ['deviceId', 0x8012, 'h32'],
    ['productionDate', 0x8014, 'h32'],
    ['verificationDate', 0x8016, 'h32'],
    ['units.heat', 0x00ff, 'h16'],
    ['units.mass', 0x0100, 'h16'],
    ['units.volume', 0x0101, 'h16'],
    ['units.pressure', 0x0102, 'h16'],
    ['units.massFlow', 0x0103, 'h16'],
    ['units.volumeFlow', 0x0104, 'h16'],
    ['units.power', 0x0105, 'h16'],
    ['units.pulseConstant', 0x0106, 'h16'],
    ...Array.from({ length: UNIVERSAL_OUTPUTS }, (_, i) => [
        [`universalOutputs.${i}.errors`, 0x0002 + i, 'u16'],
        [`universalOutputs.${i}.faulty`, 0x000a + i, 'u16'],
        [`universalOutputs.${i}.F`, 0xc000 + i * 2, 'f32'],
        [`universalOutputs.${i}.accumulator`, 0xc010 + i * 2, 'f32'],
        // The list names the 0xC020 block "Текущая частота генерации" too.
        [`universalOutputs.${i}.F2`, 0xc020 + i * 2, 'f32'],
    ]).flat(),
    ...Array.from({ length: CURRENT_OUTPUTS }, (_, i) => [`currentOutputs.${i}.status`, 0x0012 + i, 'u16']),
    ...FLOWS.flatMap((name, i) => [
        [`${name}.inputState`, 0x002d + i, 'u16'],
        [`${name}.channelState`, 0x0036 + i, 'u16'],
        [`${name}.event`, 0x4010 + i, 'u16'],
        [`${name}.relayBits`, 0x4019 + i, 'u16'],
        [`${name}.pulseBits`, 0x401f + i, 'u16'],
        [`${name}.pulses`, 0x8020 + i * 2, 'u32'],
        [`${name}.V`, 0x8032 + i * 4, 'lf'],
        [`${name}.VCurrent`, 0x8056 + i * 4, 'lf'],
        [`${name}.Gv`, 0xc1a4 + i * 2, 'hf32'],
        [`${name}.F`, 0xc1b0 + i * 2, 'hf32'],
        [`${name}.GvCurrent`, 0xc264 + i * 2, 'hf32'],
    ]),
    ...EXTRA_INPUTS.flatMap((name, i) => [
        [`${name}.inputState`, 0x0033 + i, 'u16'],
        [`${name}.event`, 0x4016 + i, 'u16'],
        [`${name}.pulses`, 0x802c + i * 2, 'u32'],
    ]),
    ...SIGNALS.map((name, i) => [`${name}.event`, 0x0048 + i, 'u16']),
    ...TEMPERATURES.flatMap((name, i) => [
        [`${name}.inputState`, 0x0021 + i, 'u16'],
        [`${name}.channelState`, 0x003c + i, 'u16'],
        [`${name}.t`, 0xc1ec + i * 2, 'hf32'],
        [`${name}.R`, 0xc1f8 + i * 2, 'hf32'],
    ]),
    ...PRESSURES.flatMap((name, i) => [
        [`${name}.inputState`, 0x0027 + i, 'u16'],
        [`${name}.channelState`, 0x0042 + i, 'u16'],
        [`${name}.P`, 0xc24c + i * 2, 'hf32'],
        [`${name}.dP`, 0xc258 + i * 2, 'hf32'],
        [`${name}.I`, 0xc270 + i * 2, 'hf32'],
    ]),
    ...PIPES.flatMap((name, i) => [
        [`${name}.status`, 0x004c + i, 'u16'],
        [`${name}.M`, 0x80dc + i * 4, 'lf'],
        [`${name}.V`, 0x80f4 + i * 4, 'lf'],
        // Volume flow m3/min, mass flow t/min, power Гкал/min (the list's
        // "(м³/мин), м³/ч" etc.: the register unit first, see the header).
        [`${name}.Gv`, 0xc090 + i * 2, 'f32'],
        [`${name}.G`, 0xc09c + i * 2, 'f32'],
        [`${name}.E`, 0xc0a8 + i * 2, 'f32'],
        [`${name}.rho`, 0xc0b4 + i * 2, 'f32'],
        [`${name}.h`, 0xc0c0 + i * 2, 'f32'],
        // The temperature and pressure used for the density and for the enthalpy.
        [`${name}.tRho`, 0xc0cc + i * 4, 'f32'],
        [`${name}.tH`, 0xc0ce + i * 4, 'f32'],
        [`${name}.PRho`, 0xc0e4 + i * 4, 'f32'],
        [`${name}.PH`, 0xc0e6 + i * 4, 'f32'],
    ]),
    ['TS.Tnar', 0x8080, 'u32'],
    ['TS.Tpr', 0x8082, 'u32'],
    ['TS.Tpit', 0x8084, 'u32'],
    ['TS.Tot', 0x8086, 'u32'],
    ['TS.Tns', 0x8088, 'u32'],
    ['TS.Trezh', 0x808a, 'u32'],
    ...[1, 2, 3].flatMap((n, j) => [
        [`TS.W${n}`, 0x808c + j * 4, 'slf'],
        [`TS.M${n}`, 0x8098 + j * 4, 'slf'],
        [`TS.V${n}`, 0x8122 + j * 4, 'slf'],
        [`TS.E${n}`, 0xc10a + j * 2, 'f32'],
        [`TS.G${n}`, 0xc110 + j * 2, 'f32'],
    ]),
    ['TS.faultFlags.0', 0x80a4, 'u32'],
    ['TS.faultFlags.1', 0x80a6, 'u32'],
    ['TS.faultFlags.2', 0x80a8, 'u32'],
    ['TS.alarmFlags.0', 0x80aa, 'u32'],
    ['TS.alarmFlags.1', 0x80ac, 'u32'],
    ['TS.alarmFlags.2', 0x80ae, 'u32'],
    ['TS.state', 0x80b0, 'u32'],
    ['TS.hourStatus', 0x80b2, 'u32'],
    ['TS.hourFaultFlags.0', 0x80b4, 'u32'],
    ['TS.hourFaultFlags.1', 0x80b6, 'u32'],
    ['TS.hourAlarmFlags.0', 0x80ba, 'u32'],
    ['TS.hourAlarmFlags.1', 0x80bc, 'u32'],
    // ВРЕМЯ ДЕЙСТВ. НС1, НС4, G1нп, G1вп, G3нп, G3вп.
    ['TS.alarmTimes.NS1', 0x80c4, 'u32'],
    ['TS.alarmTimes.NS4', 0x80c6, 'u32'],
    ['TS.alarmTimes.G1np', 0x80c8, 'u32'],
    ['TS.alarmTimes.G1vp', 0x80ca, 'u32'],
    ['TS.alarmTimes.G3np', 0x80cc, 'u32'],
    ['TS.alarmTimes.G3vp', 0x80ce, 'u32'],
    ['TS.analysisStatus', 0x8120, 'u32'],
    // tхв (0), tхв дог (1), tхв (2): measured, contract and the remote
    // value the holding register 0xC280 sets; the same for Pхв.
    ['XV.t', 0xc080, 'f32'],
    ['XV.tContract', 0xc082, 'f32'],
    ['XV.tRemote', 0xc084, 'f32'],
    ['XV.h', 0xc086, 'f32'],
    ['XV.P', 0xc088, 'f32'],
    ['XV.PContract', 0xc08a, 'f32'],
    ['XV.PRemote', 0xc08c, 'f32'],
    ['XV.Q', 0xc08e, 'f32'],
    ['XV.V', 0x807a, 'lf'],
];

const FUNCTION_OF_TYPE = { h16: FUNCTION_READ_HOLDING, h32: FUNCTION_READ_HOLDING, hf32: FUNCTION_READ_HOLDING };

class Vzljot025ExceptionError extends Error {
    constructor(fn, start, code) {
        const what = fn === FUNCTION_REPORT_ID ? 'report slave id' : `reading register 0x${start.toString(16)}`;
        super(`Vzljot025Client: device exception ${code} on ${what}`);
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

// Local wall-clock seconds from 1970 -> epoch ms of that local time; null for 0.
function localTime(seconds) {
    if (!seconds) return null;
    const clock = new Date(seconds * 1000);
    return new Date(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate(),
        clock.getUTCHours(), clock.getUTCMinutes(), clock.getUTCSeconds()).getTime();
}

// Numeric keys make arrays: 'TS.faultFlags.1' -> TS.faultFlags[1].
function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    keys.slice(0, -1).forEach((key, i) => {
        node = node[key] = node[key] || (/^\d+$/.test(keys[i + 1]) ? [] : {});
    });
    node[keys[keys.length - 1]] = value;
}

class Vzljot025Client {
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
        if (!host && !createSocket) throw new Error('Vzljot025Client: "host" is required');
        if (!port && !createSocket) throw new Error('Vzljot025Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Vzljot025Client: "address" must be 1-247');
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
    // readBlock({ fn, start, count }) with the register bytes. Both reject
    // with Vzljot025ExceptionError on an exception reply, or with an Error
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
                        settle('reject', new Vzljot025ExceptionError(fn, start, exception[2]));
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
                        `Vzljot025Client: no valid reply to ${what}`)), this.stepTimeoutMs),
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
                        const retryable = !(err instanceof Vzljot025ExceptionError) || err.code === EXCEPTION_BUSY;
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
            socket.on('close', () => onClosed(new Error('Vzljot025Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // The first request after a connect may get lost.
                    reportId: () => requestWithRetries([FUNCTION_REPORT_ID], null, null, this.retries + 1),
                    readBlock: ({ fn, start, count }) => requestWithRetries(
                        [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], start, count * 2),
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Vzljot025Client: connection closed');
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
            const data = await connection.readBlock(block);
            for (let i = 0; i < block.count; i++) {
                registers.set(`${block.fn}:${block.start + i}`, data.subarray(i * 2));
            }
        }
        return registers;
    }

    static _decode(registers, address, type) {
        const fn = FUNCTION_OF_TYPE[type] || FUNCTION_READ_INPUT;
        const value = registers.get(`${fn}:${address}`);
        if (value === undefined) throw new Error(`Vzljot025Client: register 0x${address.toString(16)} was not read`);
        switch (type) {
            case 'u16':
            case 'h16': return value.readUInt16BE(0);
            case 'u32':
            case 'h32': return value.readUInt32BE(0);
            case 'f32':
            case 'hf32': return roundFloat(value.readFloatBE(0));
            case 'lf':
            case 'slf': {
                const fraction = value.readFloatBE(4);
                if (!Number.isFinite(fraction)) return null;
                const integer = type === 'lf' ? value.readUInt32BE(0) : value.readInt32BE(0);
                return Number((integer + fraction).toFixed(3));
            }
            default: throw new Error(`Vzljot025Client: unknown type ${type}`);
        }
    }

    // Decodes the registers of every block into the results object.
    static decodeRegisters(registers, results = {}) {
        for (const [path, address, type] of REGISTERS) {
            setPath(results, path, Vzljot025Client._decode(registers, address, type));
        }
        results.deviceTime = localTime(results.deviceClock);
        results.powerOffTime = localTime(results.powerOffClock);
        results.productionDate = localTime(results.productionDate);
        results.verificationDate = localTime(results.verificationDate);
        delete results.deviceClock;
        delete results.powerOffClock;
        return results;
    }

    async _readSession(connection, results) {
        // "Vzljot <device> XX.XXXXXX", zero-terminated (data standard §6);
        // a meter without function 0x11 answers "illegal function".
        try {
            const id = await connection.reportId();
            const end = id.indexOf(0);
            results.version = id.subarray(0, end < 0 ? id.length : end).toString('latin1').trim();
        } catch (err) {
            if (!(err instanceof Vzljot025ExceptionError) || err.code !== EXCEPTION_ILLEGAL_FUNCTION) throw err;
            results.version = null;
        }

        Vzljot025Client.decodeRegisters(await this._readBlocks(connection), results);
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Vzljot025Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    /**
     * Reads the version and every block in one session. Resolves with
     * (the register's own units, see `units` and the header):
     *
     *   version, serialNumber, serialNumberPI, deviceId, productionDate,
     *   verificationDate, deviceTime, powerOffTime (epoch ms or null),
     *   noPowerTime (s),
     *   summerTime, weekday, mode, piErrors, schemeChanging,
     *   softwareChecksum, tnv (outdoor air °C), units { heat, mass, volume,
     *   pressure, massFlow, volumeFlow, power, pulseConstant },
     *   universalOutputs[8] { errors, faulty, F, accumulator, F2 },
     *   currentOutputs[2] { status }
     *   PR1..PR6: { inputState, channelState, event, relayBits, pulseBits,
     *               pulses, V, VCurrent (m3), Gv, GvCurrent (m3/h), F (Hz) }
     *   LOG1, LOG2, IN8: { inputState, event, pulses }; SIG1..SIG3: { event }
     *   PT1..PT6: { inputState, channelState, t (°C), R (Ω) }
     *   PD1..PD6: { inputState, channelState, P, dP (MPa), I (mA) }
     *   TR1..TR6: { status, M (t), V (m3), Gv (m3/min), G (t/min),
     *               E (Гкал/min), rho (kg/m3), h (Мкал/т),
     *               tRho, tH (°C), PRho, PH (MPa) }
     *   TS: { W1..W3 (Гкал), M1..M3 (t), V1..V3 (m3), E1..E3 (Гкал/ч),
     *         G1..G3 (t/h), Tnar, Tpr, Tpit, Tot, Tns, Trezh (s), faultFlags[3],
     *         alarmFlags[3], state, hourStatus, hourFaultFlags[2],
     *         hourAlarmFlags[2], alarmTimes { NS1, NS4, G1np, G1vp, G3np,
     *         G3vp (s) }, analysisStatus }
     *   XV: { t, tContract, tRemote (°C), h (Мкал/т), P, PContract, PRemote
     *         (MPa), Q (m3/h), V (m3) }
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
                    reject(new Error('Vzljot025Client: timed out'));
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

module.exports = { Vzljot025Client, Vzljot025ExceptionError, BLOCKS, REGISTERS };

// Run directly for a quick standalone test (prints every frame):
//   node vzljot025-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Vzljot025Client({
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
