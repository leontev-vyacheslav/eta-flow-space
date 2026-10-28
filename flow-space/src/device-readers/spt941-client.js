'use strict';
/**
 * Spt941Client
 *
 * TCP client for the НПФ «Логика» СПТ941 heat calculator (one heat system),
 * connected through a transparent TCP-serial gateway or a GPRS modem to its
 * RS-232 port. The framing and the two protocol generations are in
 * ./logika-protocol.js:
 *
 *   - СПТ941 мод. 941.10, 941.11 (device code 0x92 0x29, VX < 0x80):
 *     "Тепловычислители СПТ941 (мод. 941.10, 941.11). Связь с внешними
 *     устройствами" (2005, .docs/spt941) — memory dumps of RAM and FLASH;
 *   - СПТ941 мод. 941.20 (0x92 0x29, VX ≥ 0x80): the М4 protocol with the
 *     parameter numbers of "Тепловычислители СПТ941 (мод. 941.20).
 *     Интерфейс связи" РАЖГ.421412.031 Д7 (.docs/spt941).
 *
 * The original СПТ941 (device code 0x54 0x29, fixed 2400 baud, "Связь
 * СПТ941 с внешними устройствами" 2000) has another memory map and is not
 * read: read() fails with a message saying so.
 *
 * read() returns every current value, raw, in the device's units (941.10/11:
 * ЕИ; 941.20: ЕИ/P pressure, ЕИ/Q heat), named after the documents
 * (Cyrillic transliterated: Gм → Gm, tх → tx, Pх → Px, Qг → Qg, Ти → Ti,
 * Тн → Tn, Тш → Tsh, СТ1-16 → ST1-16, НС → NS, ДС → DS, СП → SP, ЕИ → EI,
 * ИД → ID), in the same shape for both models; what a model does not offer
 * is null. Which pipe is the supply or the return is decided by the
 * Node-RED mapping (collect-device-state). Not read: archives, the other
 * settings.
 *
 * СПТ941.10/11, one request each (RAM: address, bytes; FLASH: page, pages):
 *   FLASH 8       setting ЕИ (0x0200; 16 bytes per parameter, its value as
 *                 ASCII text in bytes 4-11)
 *   RAM 0x00F3+13 clock (year-2000, month, day, hour, minute, second) and
 *                 the status register at 0x00FF (DST: bit 0 counting, 2 key
 *                 ЗАЩИТА, 3 discrete input, 4 external power, 7 battery
 *                 low)
 *   FLASH 17      setting ИД (0x0440)
 *   RAM 0x0200+28 НС00-23 flag bytes (little-endian assumed, like every
 *                 other number; НС00 = battery low, compare DST bit 7),
 *                 СП, then G1 G2 G3 t1 t2 dt floats
 *   totals        RAM 0x0520+32: the increments since the last hour (V1 V2
 *                 V3 M1 M2 M3 Q Ти floats); FLASH 265+2: the counters at the
 *                 last hour (0x424A, 8 bytes each: int32 integer part,
 *                 float fraction); then the increments again: when Ти went
 *                 down meanwhile, the hour was booked into FLASH between the
 *                 reads and FLASH is read again. Total = integer + fraction
 *                 + increment.
 *   RAM 0x0600+20 results of the input tests: F0-F2, R0-R1 floats (Hz, Ω),
 *                 named after their connectors X4-X8
 *
 * СПТ941.20 (М4), channel 0, 32 parameters per request:
 *   1024 Т, 1025 Д (clock), 1026 СП, 1027-1043 G1 G2 G3 Gм1 Gм2 Gм3 t1 t2
 *   dt t3 tх t4 P1 P2 P3 Pх P4, 1044 ДС, 1045 НС; totals 2048-2055 V1 V2 V3
 *   M1 M2 M3 Q Qг (int + float), 2056-2074 Ти Тн Тш СТ1-СТ16 (h); settings
 *   1 ЕИ/P, 2 ЕИ/Q, 58 ИД; 8192-8200 input tests X5 X7 X9 (Hz) X6 X8 X10
 *   (mA) X12 X13 X14 (Ω); 8224 device information (model, version,
 *   checksum), 8227 key ЗАЩИТА, 8228 discrete input DI1, 8229 discrete
 *   output DO1, 8233 external power, 8256 serial number, 8259 discrete
 *   input DI2
 *
 * The serial number is 8256 on the 941.20; the 941.10/11 has only ИД, which
 * is normally set to the serial number.
 *
 * Found on a live meter (2026-10-28: СПТ941.10/11 36809, VX 2, NT 1, behind
 * an old-firmware БАРС-02 without port selection; 9 requests and ~40 s a
 * session over GPRS, none repeated in 5 sessions): ИД is the serial number;
 * the input tests are live (X7 and X8 are the resistances of t1 and t2).
 * Its НС list was empty, so the НС byte order is not confirmed on this
 * model (the СПТ943's are little-endian). The 941.20 (М4) is not checked
 * live yet.
 *
 * Usage:
 *   const client = new Spt941Client({ host: '10.128.4.3', port: 5010, address: 1, serialNumber: 36809 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Spt941Client({
 *       address: 1,
 *       stepTimeoutMs: 15000,
 *       createSocket: () => gateway.createSocket({ identifier: 'Ленина_171', port: 'rs232-powered', baudRate: 9600 }),
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

const DEVICE_CODE = [0x92, 0x29];
const ORIGINAL_DEVICE_CODE = [0x54, 0x29];
const M4_FIRST_VX = 0x80;

const CURRENT = ['G1', 'G2', 'G3', 'Gm1', 'Gm2', 'Gm3', 't1', 't2', 'dt', 't3', 'tx', 't4', 'P1', 'P2', 'P3', 'Px', 'P4'];
const MIXED_TOTALS = ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Qg'];
const TIME_TOTALS = ['Ti', 'Tn', 'Tsh', ...Array.from({ length: 16 }, (_, i) => `ST${i + 1}`)];
// Input tests: the 941.10/11 connectors X4-X8, the 941.20 parameters 8192-8200.
const OLD_INPUTS = ['X4', 'X5', 'X6', 'X7', 'X8'];
const M4_INPUTS = ['X5', 'X7', 'X9', 'X6', 'X8', 'X10', 'X12', 'X13', 'X14'];
const INPUTS = [...new Set([...OLD_INPUTS, ...M4_INPUTS])].sort((a, b) => a.slice(1) - b.slice(1));

// СПТ941.10/11: RAM and FLASH addresses.
const OLD = {
    EI: 0x0200,
    ID: 0x0440,
    clock: { start: 0x00f3, count: 13 },
    current: { start: 0x0200, count: 28 },
    currentFloats: ['G1', 'G2', 'G3', 't1', 't2', 'dt'],
    increments: { start: 0x0520, count: 32 },
    counters: { start: 0x424a, page: 265, pages: 2 },
    totals: ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Ti'],
    inputs: { start: 0x0600, count: 20 },
};

// СПТ941.20 (М4): [path, parameter number], all on channel 0.
const M4_PARAMS = [
    ['T', 1024],
    ['D', 1025],
    ['SP', 1026],
    ...CURRENT.map((name, k) => [name, 1027 + k]),
    ['DS', 1044],
    ['NS', 1045],
    ...[...MIXED_TOTALS, ...TIME_TOTALS].map((name, k) => [name, 2048 + k]),
    ['EIP', 1],
    ['EIQ', 2],
    ['ID', 58],
    ...M4_INPUTS.map((name, k) => [`inputs.${name}`, 8192 + k]),
    ['version', 8224],
    ['protectionKey', 8227],
    ['DI1', 8228],
    ['DO1', 8229],
    ['externalPower', 8233],
    ['serialNumber', 8256],
    ['DI2', 8259],
];

class Spt941Client {
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
        if (!host && !createSocket) throw new Error('Spt941Client: "host" is required');
        if (!port && !createSocket) throw new Error('Spt941Client: "port" is required');
        if (!Number.isInteger(address) || !(address <= 99 || address === 255) || address < 0) {
            throw new Error('Spt941Client: "address" must be the network number NT (0-99 or 255)');
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
            version: null, serialNumber: null, ID: null, EI: null, EIP: null, EIQ: null, deviceTime: null,
            DST: null, protectionKey: null, DI1: null, DI2: null, DO1: null, externalPower: null,
            SP: null, NS: null, DS: null,
        });
        for (const name of [...CURRENT, ...MIXED_TOTALS, ...TIME_TOTALS]) results[name] = null;
        results.inputs = Object.fromEntries(INPUTS.map((name) => [name, null]));
    }

    _checkSerialNumber(results, what) {
        if (this.serialNumber !== null && results.serialNumber !== this.serialNumber) {
            throw new Error(`Spt941Client: ${what} ${results.serialNumber ?? results.ID} is not the serial number ${this.serialNumber}`);
        }
    }

    // Counters at the last hour (FLASH) plus the increments since (RAM).
    static async _readOldTotals(connection) {
        const { increments, counters, totals } = OLD;
        const readIncrements = async () => {
            const ram = await connection.readRam(increments.start, increments.count);
            return totals.map((_, i) => readLogikaFloat(ram, i * 4));
        };
        const readCounters = () => connection.readFlash(counters.page, counters.pages);
        const ti = totals.indexOf('Ti');

        const before = await readIncrements();
        let flash = await readCounters();
        const after = await readIncrements();
        if (after[ti] !== null && before[ti] !== null && after[ti] < before[ti]) flash = await readCounters();

        const base = counters.start - counters.page * FLASH_PAGE_SIZE;
        return Object.fromEntries(totals.map((name, i) => {
            const offset = base + i * 8;
            const fraction = readLogikaFloat(flash, offset + 4);
            if (fraction === null || after[i] === null) return [name, null];
            return [name, Number((flash.readInt32LE(offset) + fraction + after[i]).toFixed(3))];
        }));
    }

    async _readOld(connection, results) {
        const setting = async (address) => {
            const page = Math.floor(address / FLASH_PAGE_SIZE);
            return settingValue(await connection.readFlash(page, 1), address - page * FLASH_PAGE_SIZE);
        };
        results.EI = await setting(OLD.EI);

        const clock = await connection.readRam(OLD.clock.start, OLD.clock.count);
        results.deviceTime = localTime(2000 + clock[0], clock[1], clock[2], clock[3], clock[4], clock[5]);
        results.DST = clock[OLD.clock.count - 1];

        results.ID = await setting(OLD.ID);
        results.serialNumber = typeof results.ID === 'number' ? results.ID : null;
        this._checkSerialNumber(results, 'ИД');

        const current = await connection.readRam(OLD.current.start, OLD.current.count);
        results.NS = flagNumbers(current.subarray(0, 3));
        results.SP = current[3];
        OLD.currentFloats.forEach((name, i) => { results[name] = readLogikaFloat(current, 4 + i * 4); });

        Object.assign(results, await Spt941Client._readOldTotals(connection));

        const inputs = await connection.readRam(OLD.inputs.start, OLD.inputs.count);
        OLD_INPUTS.forEach((name, i) => { results.inputs[name] = readLogikaFloat(inputs, i * 4); });
    }

    async _readM4(connection, results) {
        const session = await connection.m4Session();
        if (session.device[0] !== DEVICE_CODE[0] || session.device[1] !== DEVICE_CODE[1]) {
            throw new Error(`Spt941Client: М4 session reply from device ${hex(session.device)}`);
        }
        const values = await connection.readParams(M4_PARAMS.map(([, number]) => [0, number]));
        const raw = {};
        M4_PARAMS.forEach(([path, number], i) => { raw[path] = number < 1024 ? numberOrText(values[i]) : values[i]; });
        for (const [path, value] of Object.entries(raw)) {
            if (path.startsWith('inputs.')) results.inputs[path.slice(7)] = value;
            else if (path !== 'T' && path !== 'D') results[path] = value;
        }
        const { T: time, D: date } = raw;
        results.deviceTime = time && date
            ? localTime(date.year, date.month, date.day, time.hour, time.minute, time.second) : null;
        this._checkSerialNumber(results, 'serial number');
    }

    async _readSession(connection, results) {
        const session = await connection.session();
        const [low, high] = session.device;
        if (low === ORIGINAL_DEVICE_CODE[0] && high === ORIGINAL_DEVICE_CODE[1]) {
            throw new Error('Spt941Client: the original СПТ941 (device code 54 29) is not supported');
        }
        if (low !== DEVICE_CODE[0] || high !== DEVICE_CODE[1]) {
            throw new Error(`Spt941Client: device code ${hex(session.device)} is not a СПТ941.10/11/20 (92 29)`
                + (low === 0x54 && high === 0x2b ? ': a СПТ943' : ''));
        }
        results.VX = session.VX;
        results.protocol = session.VX >= M4_FIRST_VX ? 'M4' : 'old';
        results.model = results.protocol === 'M4' ? '941.20' : '941.10/11';
        Spt941Client._emptyResults(results);
        if (results.protocol === 'M4') await this._readM4(connection, results);
        else await this._readOld(connection, results);
    }

    /**
     * Reads the identity, clock, flags, current values and totals in one
     * session. Resolves with (device units, null for what the model does
     * not offer or a value that is no number):
     *
     *   model '941.10/11' | '941.20', protocol 'old' | 'M4', VX (session
     *   version byte), version (М4 device information text), serialNumber,
     *   ID, EI (941.10/11), EIP, EIQ (941.20), deviceTime (epoch ms, local
     *   wall clock), DST (941.10/11 status register), protectionKey, DI1,
     *   DI2, DO1, externalPower (941.20: 0/1),
     *   SP, NS, DS (lists of active numbers), G1 G2 G3 m3/h, Gm1 Gm2 Gm3 t/h,
     *   t1 t2 dt t3 tx t4 °C, P1 P2 P3 Px P4, V1 V2 V3 m3, M1 M2 M3 t, Q Qg,
     *   Ti Tn Tsh ST1-ST16 h,
     *   inputs { X4-X14: input tests, Hz / mA / Ω }, timestamp
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

module.exports = { Spt941Client, M4_PARAMS, OLD };

if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const client = new Spt941Client({
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
