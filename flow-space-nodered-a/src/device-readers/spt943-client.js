'use strict';
/**
 * Spt943Client
 *
 * TCP client for the НПФ «Логика» СПТ943 heat calculator (one common
 * channel ОБЩ and two heat inputs ТВ1, ТВ2), connected through a
 * transparent TCP-serial gateway or a GPRS modem to its RS-232 port. The
 * framing and the two protocol generations are in ./logika-protocol.js:
 *
 *   - the original СПТ943 (VX < 0x0A in the session reply): "Тепловычислители
 *     СПТ 943. Связь с внешними устройствами" (2008, .docs/spt943) — memory
 *     dumps of RAM and FLASH;
 *   - the СПТ943.1 with firmware 2.0.0.3.00 and later (VX 0x0A-0x1F): the М4
 *     protocol with the parameter numbers of "Тепловычислители СПТ943 (мод.
 *     943.1 с версией ПО 2.0.0.3.00 и выше). Интерфейс связи" РАЖГ.421412.019-01
 *     Д7 (.docs/spt943).
 *
 * read() returns every current value, raw, in the device's units (set by
 * ЕИ: 0 = Gcal, kgf/cm2; 1 = GJ, MPa; 2 = MWh, bar), named after the
 * documents (Cyrillic transliterated: tв → tv, Qг → Qg, Ти → Ti, Тэп →
 * Tep, Тф → Tf, Тн → Tn, Тш → Tsh, НС → NS, ДС → DS, СП → SP, ЕИ → EI,
 * ИД → ID), in the same shape for both generations; what one of them does
 * not offer is null. Which pipe is the supply or the return is decided by
 * the Node-RED mapping (collect-device-state). Not read: archives, the
 * other settings.
 *
 * Original СПТ943, one request each (RAM: address, bytes; FLASH: page,
 * pages):
 *   FLASH 8+2     settings ЕИ (0x0200) and ИД (0x0270); 16 bytes per
 *                 parameter, its value as ASCII text in bytes 4-11
 *   FLASH 20, 33  settings СП of ТВ1 (0x0520) and ТВ2 (0x0840)
 *   RAM 0x00F3+13 clock (year-2000, month, day, hour, minute, second) and
 *                 the status register at 0x00FF (DST: bit 0/1 ТВ1/ТВ2
 *                 counting, 2 key ЗАЩИТА, 3 discrete input, 4 external
 *                 power, 7 battery low)
 *   RAM 0x00BB+5  НС flag bytes: ОБЩ НС00-07, ТВ1 НС08-23, ТВ2 НС08-23
 *                 (little-endian, like every other number)
 *   RAM 0x0204+44, 0x0234+45  ТВ1, ТВ2: G1 G2 G3 P1 P2 t1 t2 dt t3 tх tв
 *                 (ТВ2 one byte longer, so that a late reply to the ТВ1
 *                 request can never pass for the ТВ2 one)
 *   totals        RAM 0x0520+36 / 0x0568+37: the increments since the last
 *                 hour (V1 V2 V3 M1 M2 M3 Q Ти Qг floats); FLASH 265+2 /
 *                 413+3: the counters at the last hour (0x424A / 0x677B,
 *                 8 bytes each: int32 integer part, float fraction); then
 *                 the increments again: when Ти went down meanwhile, the
 *                 hour was booked into FLASH between the reads and FLASH
 *                 is read again. Total = integer + fraction + increment.
 *   RAM 0x0600+64 results of the input tests: F0-F5, I0-I3, R0-R5 floats
 *                 (Hz, mA, Ω), named after their connectors X5-X20
 *
 * СПТ943.1 (М4), parameters [channel, number], 32 per request:
 *   ОБЩ  1024 Т, 1025 Д (clock), 1026 tх, 1027 tв, 1028 НС, 1029 ДС,
 *        2048 Q; settings 0 ЕИ, 7 ИД; 8224 device information (model,
 *        version, checksum), 8227 key ЗАЩИТА, 8228 discrete input DI,
 *        8229 discrete output DO1, 8232 external power, 8256 serial number;
 *        8192-8207 input tests X5-X20
 *   ТВ1, ТВ2  1024 СП, 1025-1035 G1 G2 G3 P1 P2 t1 t2 dt t3 tх tв,
 *        1036 НС, 1037 ДС; totals 2048-2063 V1 V2 V3 M1 M2 M3 Q Qг (int +
 *        float) and Ти Tmin Tmax Tdt Тэп Тф Тн Тш (h)
 *
 * The serial number is 8256 on М4; the original СПТ943 has only ИД, which
 * is normally set to the serial number.
 *
 * Found on the live meters (2026-10-28: five original СПТ943, VX 2 and 3,
 * NT 1, behind БАРС-02 units on rs232-powered 9600 8N1; 15 requests and
 * 65-70 s a session, the reply starting ~4 s after a request over GPRS,
 * none repeated in 25 sessions): ИД is the serial number on all of them;
 * the НС bytes are little-endian (ТВ1 НС08/09 with P1/P2 at -4, НС12 with
 * t3 at -242 °C); the input tests are live outside the ТСТ menu (X15 and
 * X17 are the resistances of t1 and t2); an input without a sensor gives
 * the device's own value for it (t -242 or -239 °C at 0 Ω, P -2.5 or -4
 * without current), which the mapping leaves out. The СПТ943.1 (М4) is not
 * checked live yet.
 *
 * Usage:
 *   const client = new Spt943Client({ host: '10.128.4.3', port: 5010, address: 1, serialNumber: 43464 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Spt943Client({
 *       address: 1,
 *       stepTimeoutMs: 15000,
 *       createSocket: () => gateway.createSocket({ identifier: 'Зарипова_21', port: 'rs232-powered', baudRate: 9600 }),
 *   });
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const {
    readSession, readLogikaFloat, flagNumbers, numberOrText, settingValue, localTime, FLASH_PAGE_SIZE, hex,
} = require('./logika-protocol.js');

const DEVICE_CODE = [0x54, 0x2b];
const M4_FIRST_VX = 0x0a;
const HEAT_INPUTS = ['TV1', 'TV2'];

const CURRENT = ['G1', 'G2', 'G3', 'P1', 'P2', 't1', 't2', 'dt', 't3', 'tx', 'tv'];
const MIXED_TOTALS = ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Qg'];
const TIME_TOTALS = ['Ti', 'Tmin', 'Tmax', 'Tdt', 'Tep', 'Tf', 'Tn', 'Tsh'];
const INPUTS = Array.from({ length: 16 }, (_, i) => `X${i + 5}`);

// Original СПТ943: RAM and FLASH addresses.
const OLD = {
    settingsPages: { page: 8, pages: 2 },
    EI: 0x0200,
    ID: 0x0270,
    SP: { TV1: 0x0520, TV2: 0x0840 },
    clock: { start: 0x00f3, count: 13 },
    NS: { start: 0x00bb, count: 5 },
    current: { TV1: { start: 0x0204, count: 44 }, TV2: { start: 0x0234, count: 45 } },
    increments: { TV1: { start: 0x0520, count: 36 }, TV2: { start: 0x0568, count: 37 } },
    counters: { TV1: { start: 0x424a, page: 265, pages: 2 }, TV2: { start: 0x677b, page: 413, pages: 3 } },
    totals: ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Ti', 'Qg'],
    inputs: { start: 0x0600, count: 64 },
};

// СПТ943.1 (М4): [path, channel, parameter number].
const M4_PARAMS = [
    ['T', 0, 1024],
    ['D', 0, 1025],
    ['common.tx', 0, 1026],
    ['common.tv', 0, 1027],
    ['common.NS', 0, 1028],
    ['common.DS', 0, 1029],
    ['common.Q', 0, 2048],
    ['EI', 0, 0],
    ['ID', 0, 7],
    ['version', 0, 8224],
    ['protectionKey', 0, 8227],
    ['DI', 0, 8228],
    ['DO1', 0, 8229],
    ['externalPower', 0, 8232],
    ['serialNumber', 0, 8256],
    ...HEAT_INPUTS.flatMap((tv, i) => [
        [`${tv}.SP`, i + 1, 1024],
        ...CURRENT.map((name, k) => [`${tv}.${name}`, i + 1, 1025 + k]),
        [`${tv}.NS`, i + 1, 1036],
        [`${tv}.DS`, i + 1, 1037],
        ...[...MIXED_TOTALS, ...TIME_TOTALS].map((name, k) => [`${tv}.${name}`, i + 1, 2048 + k]),
    ]),
    ...INPUTS.map((name, k) => [`inputs.${name}`, 0, 8192 + k]),
];

function setPath(target, path, value) {
    const keys = path.split('.');
    let node = target;
    for (const key of keys.slice(0, -1)) node = node[key] = node[key] || {};
    node[keys[keys.length - 1]] = value;
}

class Spt943Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} [options.address=1] - Network number NT (0-99; 255 = whichever device answers).
     * @param {number} [options.serialNumber] - Serial number; read() fails when the device reports another one.
     * @param {number} [options.startSequenceBytes=16] - Bytes 0xFF that open the session.
     * @param {number} [options.startPauseMs=1200] - Silence after them before the session request (≥ 1000 ms).
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=3000] - Wait for a valid reply to one request (the device answers within 2.5 s).
     * @param {number} [options.retries=2] - Extra requests after no valid reply.
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
        startSequenceBytes = 16,
        startPauseMs = 1200,
        stepDelayMs = 100,
        stepTimeoutMs = 3000,
        retries = 2,
        responseTimeoutMs = 60000,
        trace = null,
    } = {}) {
        if (!host && !createSocket) throw new Error('Spt943Client: "host" is required');
        if (!port && !createSocket) throw new Error('Spt943Client: "port" is required');
        if (!Number.isInteger(address) || !(address <= 99 || address === 255) || address < 0) {
            throw new Error('Spt943Client: "address" must be the network number NT (0-99 or 255)');
        }
        this.host = host;
        this.port = port;
        this.createSocket = createSocket;
        this.address = address;
        this.serialNumber = serialNumber;
        this.startSequenceBytes = startSequenceBytes;
        this.startPauseMs = startPauseMs;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;
    }

    static _emptyResults(results) {
        Object.assign(results, {
            version: null, serialNumber: null, ID: null, EI: null, deviceTime: null,
            DST: null, protectionKey: null, DI: null, DO1: null, externalPower: null,
            common: { tx: null, tv: null, NS: null, DS: null, Q: null },
        });
        for (const tv of HEAT_INPUTS) {
            results[tv] = { SP: null, NS: null, DS: null };
            for (const name of [...CURRENT, ...MIXED_TOTALS, ...TIME_TOTALS]) results[tv][name] = null;
        }
        results.inputs = Object.fromEntries(INPUTS.map((name) => [name, null]));
    }

    // Counters at the last hour (FLASH) plus the increments since (RAM).
    static async _readOldTotals(connection, tv) {
        const increments = OLD.increments[tv], counters = OLD.counters[tv];
        const readIncrements = async () => {
            const ram = await connection.readRam(increments.start, increments.count);
            return OLD.totals.map((_, i) => readLogikaFloat(ram, i * 4));
        };
        const readCounters = () => connection.readFlash(counters.page, counters.pages);
        const ti = OLD.totals.indexOf('Ti');

        const before = await readIncrements();
        let flash = await readCounters();
        const after = await readIncrements();
        if (after[ti] !== null && before[ti] !== null && after[ti] < before[ti]) flash = await readCounters();

        const base = counters.start - counters.page * FLASH_PAGE_SIZE;
        return Object.fromEntries(OLD.totals.map((name, i) => {
            const offset = base + i * 8;
            const fraction = readLogikaFloat(flash, offset + 4);
            if (fraction === null || after[i] === null) return [name, null];
            return [name, Number((flash.readInt32LE(offset) + fraction + after[i]).toFixed(3))];
        }));
    }

    async _readOld(connection, results) {
        const settings = await connection.readFlash(OLD.settingsPages.page, OLD.settingsPages.pages);
        const settingsBase = OLD.settingsPages.page * FLASH_PAGE_SIZE;
        results.EI = settingValue(settings, OLD.EI - settingsBase);
        results.ID = settingValue(settings, OLD.ID - settingsBase);
        results.serialNumber = typeof results.ID === 'number' ? results.ID : null;
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Spt943Client: ИД ${results.ID} is not the serial number ${this.serialNumber}`);
        }
        for (const tv of HEAT_INPUTS) {
            const page = Math.floor(OLD.SP[tv] / FLASH_PAGE_SIZE);
            const flash = await connection.readFlash(page, 1);
            results[tv].SP = settingValue(flash, OLD.SP[tv] - page * FLASH_PAGE_SIZE);
        }

        const clock = await connection.readRam(OLD.clock.start, OLD.clock.count);
        results.deviceTime = localTime(2000 + clock[0], clock[1], clock[2], clock[3], clock[4], clock[5]);
        results.DST = clock[OLD.clock.count - 1];

        const ns = await connection.readRam(OLD.NS.start, OLD.NS.count);
        results.common.NS = flagNumbers(ns.subarray(0, 1));
        results.TV1.NS = flagNumbers(ns.subarray(1, 3), 8);
        results.TV2.NS = flagNumbers(ns.subarray(3, 5), 8);

        for (const tv of HEAT_INPUTS) {
            const ram = await connection.readRam(OLD.current[tv].start, OLD.current[tv].count);
            CURRENT.forEach((name, i) => { results[tv][name] = readLogikaFloat(ram, i * 4); });
        }
        for (const tv of HEAT_INPUTS) Object.assign(results[tv], await Spt943Client._readOldTotals(connection, tv));

        const inputs = await connection.readRam(OLD.inputs.start, OLD.inputs.count);
        INPUTS.forEach((name, i) => { results.inputs[name] = readLogikaFloat(inputs, i * 4); });
    }

    async _readM4(connection, results) {
        const session = await connection.m4Session();
        if (session.device[0] !== DEVICE_CODE[0] || session.device[1] !== DEVICE_CODE[1]) {
            throw new Error(`Spt943Client: М4 session reply from device ${hex(session.device)}`);
        }
        const values = await connection.readParams(M4_PARAMS.map(([, channel, number]) => [channel, number]));
        const raw = {};
        M4_PARAMS.forEach(([path, , number], i) => { raw[path] = number < 1024 ? numberOrText(values[i]) : values[i]; });
        for (const [path, value] of Object.entries(raw)) if (path !== 'T' && path !== 'D') setPath(results, path, value);
        const { T: time, D: date } = raw;
        results.deviceTime = time && date
            ? localTime(date.year, date.month, date.day, time.hour, time.minute, time.second) : null;
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Spt943Client: serial number ${results.serialNumber} is not ${this.serialNumber}`);
        }
    }

    async _readSession(connection, results) {
        const session = await connection.session();
        if (session.device[0] !== DEVICE_CODE[0] || session.device[1] !== DEVICE_CODE[1]) {
            throw new Error(`Spt943Client: device code ${hex(session.device)} is not a СПТ943 (54 2b)`
                + (session.device[0] === 0x92 && session.device[1] === 0x29 ? ': a СПТ941.10/11/20' : ''));
        }
        results.model = '943';
        results.VX = session.VX;
        results.protocol = session.VX >= M4_FIRST_VX ? 'M4' : 'old';
        Spt943Client._emptyResults(results);
        if (results.protocol === 'M4') await this._readM4(connection, results);
        else await this._readOld(connection, results);
    }

    /**
     * Reads the identity, clock, flags, current values and totals in one
     * session. Resolves with (device units, null for what the device's
     * protocol generation does not offer or a value that is no number):
     *
     *   model '943', protocol 'old' | 'M4', VX (session version byte),
     *   version (М4 device information text), serialNumber, ID, EI,
     *   deviceTime (epoch ms, local wall clock), DST (old: status register),
     *   protectionKey, DI, DO1, externalPower (М4: 0/1),
     *   common { tx, tv °C, NS, DS (lists of active numbers), Q },
     *   TV1, TV2 { SP, G1 G2 G3 m3/h, P1 P2, t1 t2 dt t3 tx tv °C, NS, DS,
     *     V1 V2 V3 m3, M1 M2 M3 t, Q Qg, Ti Tmin Tmax Tdt Tep Tf Tn Tsh h },
     *   inputs { X5-X20: input tests, Hz / mA / Ω }, timestamp
     *
     * Rejects on connection/protocol failure; the Error carries a
     * `.partialResults` property with whatever was read before it.
     *
     * @returns {Promise<object>}
     */
    read() {
        return readSession(this, (connection, results) => this._readSession(connection, results));
    }
}

module.exports = { Spt943Client, M4_PARAMS, OLD };

if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const client = new Spt943Client({
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
            console.error('Partial results:', JSON.stringify(err.partialResults));
            process.exit(1);
        });
}
