'use strict';
/**
 * Tv7Client
 *
 * TCP client for the Termotronic TV7 heat calculator, connected through a
 * transparent TCP-serial modem (e.g. Wiznet in TCP server mode) to its
 * RS-232 / RS-485 port. Implements "Описание протокола обмена
 * тепловычислителя «ТВ7» с системой верхнего уровня" (Termotronic,
 * edition 7.09): plain Modbus RTU, function 0x03 read holding registers,
 * CRC16 0xA001 low byte first.
 *
 * read() returns every current value the protocol offers ("Информация об
 * устройстве", "Текущие итоговые значения", "Текущие мгновенные
 * значения"), raw, in the units the device sends, named after the protocol
 * tables (Cyrillic letters transliterated). Which pipe is the supply or the
 * return is decided by the Node-RED mapping (collect-device-state).
 *
 * Registers (addresses of firmware < 2.20; firmware >= 2.20 serves them
 * too, converting its own structures, so one map fits all; it then has
 * only 2 heat inputs and 6 pipes):
 *
 *      0  device info
 *   3412  current totals: date/time, pipe V/M (8 registers per pipe),
 *         heat input dM..Ttнеиспр. (23 registers per input from 3463),
 *         then device-wide values up to Qсум at 3529
 *   3540  current instant values: date/time, pipe t/P/Gо/Gм/Ф/h
 *         (2 registers per pipe per value), heat input Фтв/hx, ДП,
 *         НС bitmasks, events, heat input tx/Px/dt/tнв, active database
 *
 * Pipes are numbered per heat input as in the protocol (models 01, 03, 04,
 * 04.1): Nтр 0-2 are input1 pipe1-pipe3, Nтр 3-5 are input2 pipe1-pipe3.
 *
 * Byte order: a register goes high byte first, and a value longer than one
 * register goes low word first (a float 0xB3B2B1B0 arrives as B1 B0 B3 B2).
 * Values are always in SI units, whatever the device displays: m3, t, MPa,
 * GJ, GJ/t (1 Gcal = 4.1868 GJ, 1 MPa = 10.1972 kgf/cm²). A value that is
 * not in the measurement scheme reads NaN, which is returned as null.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and function, and it carries exactly the requested
 * number of registers. The device type and, when given, the serial number
 * are checked too. Anything else fails the whole read() — a value is never
 * stored under the wrong field (see the EK270 shared-line incident).
 *
 * Serial settings of the modem: 1200-9600 baud (COM1) or up to 115200
 * (COM2) as set in the calculator, 8 data bits, no parity, 1 stop bit. The
 * calculator ends a frame on 7.8 ms of silence at 9600 baud and above, so
 * the modem must send a request in one piece.
 *
 * Usage:
 *   const client = new Tv7Client({ host: '178.207.154.38', port: 5011, address: 1, serialNumber: 19072584 });
 *   const results = await client.read();
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const FUNCTION_READ = 0x03;
const EXCEPTION_BIT = 0x80;

const DEVICE_TYPE_TV7 = 0x1702;

// Exception code 6: "request cannot be processed now, repeat it later".
const EXCEPTION_BUSY = 6;

const INFO = { start: 0, count: 7 };
const TOTALS = { start: 3412, count: 121 };
const INSTANT = { start: 3540, count: 110 };

const HEAT_INPUTS = 2;
const PIPES_PER_INPUT = 3;

// Current totals.
const TOTALS_PIPE = 3415; // + Nтр * 8
const TOTALS_PIPE_SIZE = 8;
const TOTALS_INPUT = 3463; // + Nтв * 23
const TOTALS_INPUT_SIZE = 23;
const TOTALS_DP = 3509;
const TOTALS_NETWORK_TIME = 3513;
const TOTALS_DISPLAY_TIME = 3515;
const TOTALS_NO_POWER_TIME = 3517;
const TOTALS_INPUT_CONFIG = 3519; // + Nтв * 2
const TOTALS_EVENTS = 3523;
const TOTALS_KSN = 3524;
const TOTALS_INPUT_USE = 3525; // + Nтв
const TOTALS_USE_QSUM = 3527;
const TOTALS_QSUM = 3529;

// Current instant values: per pipe value -> first register (+ Nтр * 2).
const INSTANT_PIPE = { t: 3543, P: 3555, Go: 3567, Gm: 3579, F: 3591, h: 3603 };
// Per heat input value -> first register (+ Nтв * 2).
const INSTANT_INPUT = { Ftv: 3615, hx: 3619, tx: 3633, Px: 3637, dt: 3641, tnv: 3645 };
const INSTANT_DP = 3623;
const INSTANT_PIPE_NS = 3625; // unsigned char[6], one byte per pipe
const INSTANT_INPUT_NS = 3628; // + Nтв
const INSTANT_DP_NS = 3630;
const INSTANT_EVENTS = 3631;
const INSTANT_ACTIVE_DB = 3649;

class Tv7ExceptionError extends Error {
    constructor(start, code) {
        super(`Tv7Client: device exception ${code} on reading register ${start}`);
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

// Register values of a block: bytes(address, words) -> Buffer in natural
// big-endian order (the low-word-first words reversed).
class RegisterBlock {
    constructor(start, data) {
        this.start = start;
        this.data = data;
    }

    bytes(address, words) {
        const offset = (address - this.start) * 2;
        if (offset < 0 || offset + words * 2 > this.data.length) {
            throw new Error(`Tv7Client: register ${address} is outside the block read from ${this.start}`);
        }
        const out = Buffer.alloc(words * 2);
        for (let i = 0; i < words; i++) {
            this.data.copy(out, (words - 1 - i) * 2, offset + i * 2, offset + i * 2 + 2);
        }
        return out;
    }

    u16(address) {
        return this.bytes(address, 1).readUInt16BE(0);
    }

    // Bits 0-7 of a bit-field register.
    low(address) {
        return this.u16(address) & 0xff;
    }

    // Bits 8-15 of a bit-field register.
    high(address) {
        return this.u16(address) >> 8;
    }

    u32(address) {
        return this.bytes(address, 2).readUInt32BE(0);
    }

    // A float32 carries ~7 significant digits; more would be noise.
    float(address) {
        const value = this.bytes(address, 2).readFloatBE(0);
        return Number.isFinite(value) ? Number(value.toPrecision(7)) : null;
    }

    double(address) {
        const value = this.bytes(address, 4).readDoubleBE(0);
        return Number.isFinite(value) ? value : null;
    }

    // Local wall-clock time (no TZ in the protocol); null when not a valid date.
    dateTime(address) {
        const dayMonth = this.u16(address), yearHour = this.u16(address + 1), minuteSecond = this.u16(address + 2);
        const day = dayMonth & 0xff, month = dayMonth >> 8;
        const year = 2000 + (yearHour & 0xff), hour = yearHour >> 8;
        const minute = minuteSecond & 0xff, second = minuteSecond >> 8;
        if (hour > 23 || minute > 59 || second > 59) return null;
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date.getDate() === day && date.getMonth() === month - 1 ? date.getTime() : null;
    }
}

const version = (word) => `${word >> 8}.${String(word & 0xff).padStart(2, '0')}`;

class Tv7Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial modem IP/hostname (e.g. Wiznet).
     * @param {number} options.port - Modem TCP port.
     * @param {number} [options.address=1] - Network address of the calculator (1-255).
     * @param {number} [options.serialNumber] - Factory number; read() fails when the device reports another one.
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=2000] - Wait for a valid reply to one request (the device answers within 500 ms).
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
        if (!host) throw new Error('Tv7Client: "host" is required');
        if (!port) throw new Error('Tv7Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 255) {
            throw new Error('Tv7Client: "address" must be 1-255');
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
        const bytes = Buffer.from([this.address, FUNCTION_READ, start >> 8, start & 0xff, count >> 8, count & 0xff]);
        const crc = crc16(bytes);
        return Buffer.concat([bytes, Buffer.from([crc & 0xff, crc >> 8])]);
    }

    // Opens the socket and returns { readRegisters, close }.
    // readRegisters({ start, count }) resolves with a RegisterBlock; rejects
    // with Tv7ExceptionError on an exception reply, or with an Error when no
    // valid reply came within stepTimeoutMs.
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
            // anything before it (an echo of the request, line noise).
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
                    if (exception[1] === (FUNCTION_READ | EXCEPTION_BIT) && crcOk(exception)) {
                        settle('reject', new Tv7ExceptionError(start, exception[2]));
                        return;
                    }
                    if (at + length > buffer.length) continue;
                    const reply = buffer.subarray(at, at + length);
                    if (reply[1] === FUNCTION_READ && reply[2] === count * 2 && crcOk(reply)) {
                        settle('resolve', new RegisterBlock(start, Buffer.from(reply.subarray(3, 3 + count * 2))));
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
                        `Tv7Client: no valid reply to reading register ${start}`)), this.stepTimeoutMs),
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
            socket.on('close', () => onClosed(new Error('Tv7Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Repeats a request that got no valid reply or a "busy"
                    // exception; any other exception is the device's answer.
                    readRegisters: async ({ start, count }) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const block = await request(start, count);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return block;
                            } catch (err) {
                                const retryable = !(err instanceof Tv7ExceptionError) || err.code === EXCEPTION_BUSY;
                                if (!retryable || closedError || attempt >= this.retries) throw err;
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                            }
                        }
                    },
                    // destroy() instead of end(): the modem never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Tv7Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // "Информация об устройстве".
    _readInfo(info, results) {
        const type = info.u16(0);
        if (type !== DEVICE_TYPE_TV7) {
            throw new Error(`Tv7Client: device type 0x${type.toString(16)} is not a TV7`);
        }
        const serialNumber = info.u32(5);
        if (this.serialNumber !== null && serialNumber !== this.serialNumber) {
            throw new Error(`Tv7Client: serial number ${serialNumber} is not ${this.serialNumber}`);
        }
        const hardware = info.u16(2);
        // Model "М" when the hardware version is 5.00 or newer.
        const models = { 0: '01', 2: '03', 3: '04', 4: '04.1', 5: '05' };
        const model = models[info.low(4)];
        results.firmware = version(info.u16(1));
        results.hardware = version(hardware);
        results.softwareChecksum = info.u16(3);
        results.model = model ? model + (hardware >= 0x0500 && model !== '05' ? 'М' : '') : String(info.low(4));
        results.serialNumber = serialNumber;
    }

    _readInstant(instant, results) {
        results.deviceTime = instant.dateTime(INSTANT.start);
        for (let n = 0; n < HEAT_INPUTS; n++) {
            const input = results[`input${n + 1}`];
            for (let k = 0; k < PIPES_PER_INPUT; k++) {
                const pipeNumber = n * PIPES_PER_INPUT + k;
                const pipe = input[`pipe${k + 1}`];
                for (const [name, base] of Object.entries(INSTANT_PIPE)) {
                    pipe[name] = instant.float(base + pipeNumber * 2);
                }
                // НС по трубе: bit 0 t<min, 1 t>max, 2 t sensor fault,
                // 3 P<min, 4 P>max, 5 V<min, 6 V>max, 7 flow meter fault or
                // no power. Byte k of the array is the low byte of a register
                // for an even k.
                const nsRegister = INSTANT_PIPE_NS + (pipeNumber >> 1);
                pipe.NS = pipeNumber % 2 === 0 ? instant.low(nsRegister) : instant.high(nsRegister);
            }
            for (const [name, base] of Object.entries(INSTANT_INPUT)) {
                input[name] = instant.float(base + n * 2);
            }
            // НС по ТВ: bit 0 dt, 1 dM, 2 Qтв, 3 tх<min, 4 tх>max,
            // 5 tх sensor fault, 6 tнв<min, 7 tнв>max, 8 tнв sensor fault,
            // 9 Q12, 10 Qг, 11 Px<min, 12 Px>max.
            input.NS = instant.u16(INSTANT_INPUT_NS + n);
        }
        results.DPrate = instant.float(INSTANT_DP);
        // НС по ДП: bit 0 ДП<min, 1 ДП>max.
        results.NSDP = instant.low(INSTANT_DP_NS);
        // Признаки событий: bit 0 Д, 1 Откл.пит., 2 LB, 3 Restart, 4 УР,
        // 5 BR, 6 Перевод часов, 7 LCD, 8 Key, 9 Mdb, 10 AL, 11 ИН, 12 К,
        // 13 SD, 14 USB, 15 ДПС.
        results.events = instant.u16(INSTANT_EVENTS);
        // 0 БД1, 1 БД2.
        results.activeDb = instant.u16(INSTANT_ACTIVE_DB) & 1;
    }

    _readTotals(totals, results) {
        results.totalsTime = totals.dateTime(TOTALS.start);
        for (let n = 0; n < HEAT_INPUTS; n++) {
            const input = results[`input${n + 1}`];
            for (let k = 0; k < PIPES_PER_INPUT; k++) {
                const base = TOTALS_PIPE + (n * PIPES_PER_INPUT + k) * TOTALS_PIPE_SIZE;
                const pipe = input[`pipe${k + 1}`];
                pipe.V = totals.double(base);
                pipe.M = totals.double(base + 4);
            }
            const base = TOTALS_INPUT + n * TOTALS_INPUT_SIZE;
            input.dM = totals.double(base);
            input.Qtv = totals.double(base + 4);
            input.Q12 = totals.double(base + 8);
            input.Qg = totals.double(base + 12);
            input.VNR = totals.u16(base + 16);
            input.VOS = totals.u16(base + 17);
            input.TVmin = totals.u16(base + 18);
            input.TVmax = totals.u16(base + 19);
            input.Tdt = totals.u16(base + 20);
            input.Tbezpit = totals.u16(base + 21);
            input.Ttneispr = totals.u16(base + 22);
            // Configuration parameters of the heat input.
            const config = TOTALS_INPUT_CONFIG + n * 2;
            input.SI = totals.high(config);
            input.KT3 = totals.low(config + 1);
            input.FRT = totals.high(config + 1);
            input.ispTx = totals.low(TOTALS_INPUT_USE + n);
            input.ispTnv = totals.high(TOTALS_INPUT_USE + n);
        }
        results.DP = totals.double(TOTALS_DP);
        results.networkTime = totals.u32(TOTALS_NETWORK_TIME);
        results.displayTime = totals.u32(TOTALS_DISPLAY_TIME);
        results.noPowerTime = totals.u32(TOTALS_NO_POWER_TIME);
        results.KSN = totals.u16(TOTALS_KSN);
        // Bits 0-1 ТВ1, 2-3 ТВ2.
        results.ispQsum = totals.u16(TOTALS_USE_QSUM);
        results.Qsum = totals.double(TOTALS_QSUM);
        results.totalsEvents = totals.u16(TOTALS_EVENTS);
    }

    async _readSession(connection, results) {
        this._readInfo(await connection.readRegisters(INFO), results);
        for (let n = 1; n <= HEAT_INPUTS; n++) {
            results[`input${n}`] = {};
            for (let k = 1; k <= PIPES_PER_INPUT; k++) results[`input${n}`][`pipe${k}`] = {};
        }
        this._readInstant(await connection.readRegisters(INSTANT), results);
        this._readTotals(await connection.readRegisters(TOTALS), results);
    }

    /**
     * Reads the device info, current instant values and current totals in
     * one session. Resolves with (SI units, null when not in the scheme):
     *
     *   firmware, hardware, model (strings), softwareChecksum, serialNumber
     *   deviceTime    clock of the instant values (epoch ms, or null)
     *   totalsTime    clock of the totals (epoch ms, or null)
     *   input1, input2 (тепловой ввод 1-2), each with
     *     pipe1..pipe3 (трубы 1-3 of this input), each with
     *       t °C, P MPa, Go m3/h, Gm t/h, F (Ф) GJ/h, h GJ/t,
     *       V m3, M t (totals), NS (НС по трубе bitmask)
     *     Ftv (Фтв) GJ/h, hx GJ/t, tx °C, Px MPa, dt °C, tnv (tнв) °C,
     *     NS (НС по ТВ bitmask),
     *     dM t, Qtv (Qтв), Q12, Qg (Qг) GJ, VNR (ВНР), VOS (ВОС), TVmin,
     *     TVmax, Tdt, Tbezpit (Tбез.пит.), Ttneispr (Ttнеиспр.) h,
     *     SI, KT3, FRT, ispTx (Исп. tx), ispTnv (Исп. tнв) settings
     *   DPrate        additional input, instant (m3/h or kW)
     *   DP            additional input, total (m3 or kWh)
     *   NSDP          НС по ДП bitmask
     *   events        Признаки событий bitmask (instant values)
     *   totalsEvents  Признаки событий bitmask (totals)
     *   activeDb      0 БД1, 1 БД2
     *   networkTime, displayTime, noPowerTime  min
     *   KSN (КСН), ispQsum (Исп.Qсум), Qsum (Qсум) GJ
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
                    reject(new Error('Tv7Client: timed out'));
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

module.exports = { Tv7Client, Tv7ExceptionError };

// Run directly for a quick standalone test (prints every frame):
//   node tv7-client.js <host> <port> [address] [serial number]
if (require.main === module) {
    const [, , host, port, address = '1', serialNumber] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Tv7Client({
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
