'use strict';
/**
 * Mercury230Client
 *
 * TCP client for the Incotex "Меркурий 230" three-phase electricity meter,
 * connected through a transparent TCP-serial gateway to its RS-485 port.
 * Implements "Описание системы команд приборов учета электроэнергии
 * Меркурий 150, 203.2TD, 204, 208, 230, 231, 234, 236, 238, 350" (Incotex,
 * 30.08.2024): request = address | request code | parameters | CRC16
 * (0xA001, low byte first); reply = address | data | CRC16. A reply with
 * one data byte is an exchange status: 0 OK, 1 bad command or parameter,
 * 2 internal error, 3 access level too low, 4 clock already corrected,
 * 5 channel not open.
 *
 * read() returns every current value the meter offers, raw, named after
 * the protocol. The Node-RED mapping (collect-device-state) gives them
 * their meaning.
 *
 * Requests used by read():
 *   01h  open the channel (access level, 6-byte password; these meters
 *        expect the digits as binary values 01..09, not ASCII, so
 *        "111111" is sent as 01 01 01 01 01 01)
 *   08h 00h  serial number (4 bytes, each byte two decimal digits) and
 *            manufacture date (day, month, year)
 *   08h 03h  firmware version (3 bytes)
 *   08h 0Ah  status word (6 bytes, appendix A)
 *   08h 12h  meter variant (6 or 12 bytes, 4.4.16), returned as hex
 *   04h 00h  clock: BCD seconds, minutes, hours, weekday, day, month,
 *            year, winter flag
 *   08h 16h A0h  fast read of the auxiliary parameters (4.4.1 note 3):
 *            P, Q, S (sum, phases 1-3), U1-U3, angles between phase
 *            voltages, I1-I3, cos φ (sum, phases 1-3), frequency; newer
 *            firmware adds voltage distortion coefficients, the temperature
 *            and line voltages (null when the reply is shorter)
 *   05h 00h N  energy since reset A+, A-, R+, R- for the tariff sum (N=0)
 *            and tariffs 1-4
 *   05h 60h 00h  forward active energy A+ per phase
 *   02h  close the channel
 *
 * Value encoding: a 3-byte auxiliary value is sent as 1st, 3rd, 2nd byte
 * (1st = most significant); bit 7 of the 1st byte is the direction of
 * active power, bit 6 the direction of reactive power (1 = reverse). P and
 * cos φ carry the active direction as their sign, Q the reactive one. A
 * 4-byte energy value is sent as 2nd, 1st, 4th, 3rd byte; FFFFFFFF marks a
 * kind of energy the meter does not count (null). Units: W, var, VA, V, A,
 * degrees, Hz, °C, kWh, kvarh.
 *
 * A reply is accepted only when its CRC is valid, it comes from the
 * requested address and it has the length the request expects (or is a
 * status reply). Anything else fails the whole read() — a value is never
 * stored under the wrong meter (see the EK270 shared-line incident).
 *
 * Usage:
 *   const client = new Mercury230Client({ host: '94.180.248.157', port: 5012, address: 96 });
 *   const results = await client.read();
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const REQUEST_OPEN = 0x01;
const REQUEST_CLOSE = 0x02;
const REQUEST_TIME = 0x04;
const REQUEST_ENERGY = 0x05;
const REQUEST_PARAMETER = 0x08;

const PARAMETER_SERIAL = 0x00;
const PARAMETER_VERSION = 0x03;
const PARAMETER_STATUS = 0x0a;
const PARAMETER_VARIANT = 0x12;
const PARAMETER_AUX = 0x16;
const BWRI_FAST_READ = 0xa0;

const ENERGY_SINCE_RESET = 0x00;
const ENERGY_PHASES = 0x60;

const STATUS_CODES = {
    1: 'bad command or parameter',
    2: 'internal error',
    3: 'access level too low',
    4: 'clock already corrected',
    5: 'channel not open',
};

// Fast-read auxiliary parameters: [name, kind, divisor] in reply order.
// kind: 'P' signed by the active direction bit, 'Q' signed by the
// reactive one, 'u' unsigned.
const AUX_VALUES = [
    ['Psum', 'P', 100], ['P1', 'P', 100], ['P2', 'P', 100], ['P3', 'P', 100],
    ['Qsum', 'Q', 100], ['Q1', 'Q', 100], ['Q2', 'Q', 100], ['Q3', 'Q', 100],
    ['Ssum', 'u', 100], ['S1', 'u', 100], ['S2', 'u', 100], ['S3', 'u', 100],
    ['U1', 'u', 100], ['U2', 'u', 100], ['U3', 'u', 100],
    ['Fab', 'u', 100], ['Fac', 'u', 100], ['Fbc', 'u', 100],
    ['I1', 'u', 1000], ['I2', 'u', 1000], ['I3', 'u', 1000],
    ['cosFsum', 'P', 1000], ['cosF1', 'P', 1000], ['cosF2', 'P', 1000], ['cosF3', 'P', 1000],
    ['Hz', 'u', 100],
];
const AUX_BASIC_LENGTH = AUX_VALUES.length * 3; // 78
// Optional tail of newer firmware: distortion coefficients (2 bytes per
// phase, low byte first), temperature (2 bytes), line voltages (3 x 3).
const AUX_EXTENDED_LENGTH = AUX_BASIC_LENGTH + 6 + 2 + 9;

const ENERGY_KINDS = ['Aplus', 'Aminus', 'Rplus', 'Rminus'];
const TARIFFS = { sum: 0, T1: 1, T2: 2, T3: 3, T4: 4 };

function crc16(bytes) {
    let crc = 0xffff;
    for (const b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
    return crc;
}

function crcOk(frame) {
    return frame.length >= 3 && crc16(frame.subarray(0, frame.length - 2)) === frame.readUInt16LE(frame.length - 2);
}

const fromBcd = (byte) => (byte >> 4) * 10 + (byte & 0x0f);
const round = (value, digits) => Number(value.toFixed(digits));

// 3-byte auxiliary value sent as 1st, 3rd, 2nd byte; direction bits 7/6.
function decodeAux(data, offset, kind, divisor) {
    const b1 = data[offset], b3 = data[offset + 1], b2 = data[offset + 2];
    const magnitude = ((b1 & 0x3f) << 16) | (b2 << 8) | b3;
    const reverse = kind === 'P' ? b1 & 0x80 : kind === 'Q' ? b1 & 0x40 : 0;
    const value = magnitude / divisor;
    return round(reverse ? -value : value, Math.log10(divisor));
}

// 4-byte energy value sent as 2nd, 1st, 4th, 3rd byte; FFFFFFFF = not counted.
function decodeEnergy(data, offset) {
    const [b2, b1, b4, b3] = data.subarray(offset, offset + 4);
    if (b1 === 0xff && b2 === 0xff && b3 === 0xff && b4 === 0xff) return null;
    return round((((b1 << 24) >>> 0) + (b2 << 16) + (b3 << 8) + b4) / 1000, 3);
}

class Mercury230StatusError extends Error {
    constructor(request, code) {
        super(`Mercury230Client: status ${code} (${STATUS_CODES[code] || 'unknown'}) on request 0x${request.toString(16)}`);
        this.code = code;
    }
}

class Mercury230Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial gateway IP/hostname.
     * @param {number} options.port - Gateway TCP port.
     * @param {number} options.address - Network address of the meter (1-247).
     * @param {string} [options.password='111111'] - Channel password (6 characters).
     * @param {boolean} [options.asciiPassword=false] - Send the password as ASCII characters instead of digit values.
     * @param {number} [options.accessLevel=1] - 1 consumer, 2 owner.
     * @param {number} [options.stepDelayMs=50] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=1500] - Wait for a valid reply to one request.
     * @param {number} [options.retries=2] - Extra requests after a request got no valid reply.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     */
    constructor({
        host,
        port,
        address,
        password = '111111',
        asciiPassword = false,
        accessLevel = 1,
        stepDelayMs = 50,
        stepTimeoutMs = 1500,
        retries = 2,
        responseTimeoutMs = 30000,
        trace = null,
    } = {}) {
        if (!host) throw new Error('Mercury230Client: "host" is required');
        if (!port) throw new Error('Mercury230Client: "port" is required');
        if (!Number.isInteger(address) || address < 1 || address > 247) {
            throw new Error('Mercury230Client: "address" must be 1-247');
        }
        if (typeof password !== 'string' || password.length !== 6
            || (!asciiPassword && !/^\d{6}$/.test(password))) {
            throw new Error('Mercury230Client: "password" must be 6 characters (6 digits unless asciiPassword)');
        }

        this.host = host;
        this.port = port;
        this.address = address;
        this.password = password;
        this.asciiPassword = asciiPassword;
        this.accessLevel = accessLevel;
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

    // Opens the socket and returns { request, close }. request(bytes,
    // dataLengths) resolves with the reply's data bytes when a reply of one
    // of the expected data lengths arrives; a 1-byte status reply resolves
    // with that byte for requests that expect it ([1]) and otherwise rejects
    // with Mercury230StatusError.
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

            // Looks for a frame from our address with a valid CRC and an
            // expected length; skips anything before it (an echo of the
            // request, another master's traffic on a shared line).
            const check = () => {
                if (!pending) return;
                const { frame, dataLengths } = pending;
                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                const lengths = [...new Set([...dataLengths, 1])].sort((a, b) => b - a);
                for (let at = 0; at < buffer.length; at++) {
                    if (buffer[at] !== this.address) continue;
                    for (const dataLength of lengths) {
                        const reply = buffer.subarray(at, at + dataLength + 3);
                        if (reply.length !== dataLength + 3 || !crcOk(reply)) continue;
                        const data = Buffer.from(reply.subarray(1, -2));
                        if (dataLength === 1 && !dataLengths.includes(1)) {
                            settle('reject', new Mercury230StatusError(frame[1], data[0]));
                        } else {
                            settle('resolve', data);
                        }
                        return;
                    }
                }
            };

            const request = (bytes, dataLengths) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const frame = this.buildRequest(bytes);
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    dataLengths,
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `Mercury230Client: no valid reply to request 0x${bytes[0].toString(16)}`)), this.stepTimeoutMs),
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
            socket.on('close', () => onClosed(new Error('Mercury230Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Repeats a request that got no valid reply; a status
                    // reply is the meter's answer and is not repeated.
                    request: async (bytes, dataLengths) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const data = await request(bytes, dataLengths);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return data;
                            } catch (err) {
                                if (err instanceof Mercury230StatusError || closedError || attempt >= this.retries) throw err;
                            }
                        }
                    },
                    // destroy() instead of end(): the gateway never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Mercury230Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    async _openChannel(connection) {
        const password = this.asciiPassword
            ? [...Buffer.from(this.password, 'latin1')]
            : [...this.password].map(Number);
        const [status] = await connection.request([REQUEST_OPEN, this.accessLevel, ...password], [1]);
        if (status !== 0) throw new Mercury230StatusError(REQUEST_OPEN, status);
    }

    async _readSession(connection, results) {
        await this._openChannel(connection);

        const serial = await connection.request([REQUEST_PARAMETER, PARAMETER_SERIAL], [7]);
        results.serialNumber = [...serial.subarray(0, 4)].map((b) => String(b).padStart(2, '0')).join('');
        results.manufactureDate = `20${String(serial[6]).padStart(2, '0')}-${String(serial[5]).padStart(2, '0')}-${String(serial[4]).padStart(2, '0')}`;

        const version = await connection.request([REQUEST_PARAMETER, PARAMETER_VERSION], [3]);
        results.firmware = [...version].join('.');

        const status = await connection.request([REQUEST_PARAMETER, PARAMETER_STATUS], [6]);
        results.statusWord = status.toString('hex');

        const variant = await connection.request([REQUEST_PARAMETER, PARAMETER_VARIANT], [6, 12]);
        results.variant = variant.toString('hex');

        const time = await connection.request([REQUEST_TIME, 0x00], [8]);
        const [second, minute, hour, , day, month, year] = [...time.subarray(0, 7)].map(fromBcd);
        const date = new Date(2000 + year, month - 1, day, hour, minute, second);
        results.deviceTime = date.getDate() === day && date.getMonth() === month - 1 ? date.getTime() : null;
        results.winterTime = time[7] === 1;

        const aux = await connection.request([REQUEST_PARAMETER, PARAMETER_AUX, BWRI_FAST_READ],
            [AUX_EXTENDED_LENGTH, AUX_BASIC_LENGTH]);
        AUX_VALUES.forEach(([name, kind, divisor], i) => {
            results[name] = decodeAux(aux, i * 3, kind, divisor);
        });
        const extended = aux.length >= AUX_EXTENDED_LENGTH;
        let offset = AUX_BASIC_LENGTH;
        for (const name of ['KU1', 'KU2', 'KU3']) {
            results[name] = extended ? round(aux.readUInt16LE(offset) / 100, 2) : null;
            offset += 2;
        }
        results.T = extended ? aux.readInt16BE(offset) : null;
        offset += 2;
        for (const name of ['U12', 'U23', 'U13']) {
            results[name] = extended ? decodeAux(aux, offset, 'u', 100) : null;
            offset += 3;
        }

        results.energy = {};
        for (const [name, tariff] of Object.entries(TARIFFS)) {
            const data = await connection.request([REQUEST_ENERGY, ENERGY_SINCE_RESET, tariff], [16]);
            results.energy[name] = Object.fromEntries(ENERGY_KINDS.map((kind, i) => [kind, decodeEnergy(data, i * 4)]));
        }
        const phases = await connection.request([REQUEST_ENERGY, ENERGY_PHASES, 0x00], [12]);
        results.energy.phases = {
            Aplus1: decodeEnergy(phases, 0),
            Aplus2: decodeEnergy(phases, 4),
            Aplus3: decodeEnergy(phases, 8),
        };

        await connection.request([REQUEST_CLOSE], [1]);
    }

    /**
     * Reads the identity, status, clock, auxiliary parameters and energy
     * registers in one session. Resolves with:
     *
     *   serialNumber, manufactureDate ('YYYY-MM-DD'), firmware ('2.3.5'),
     *   statusWord, variant (hex strings), deviceTime (epoch ms), winterTime
     *   Psum, P1..P3 W, Qsum, Q1..Q3 var (signed by direction),
     *   Ssum, S1..S3 VA, U1..U3 V, Fab, Fac, Fbc degrees, I1..I3 A,
     *   cosFsum, cosF1..cosF3 (signed by the active direction), Hz,
     *   KU1..KU3 %, T °C, U12, U23, U13 V (null on firmware without them)
     *   energy.sum / energy.T1..T4: { Aplus, Aminus, Rplus, Rminus } kWh,
     *     kvarh since reset (null for a kind the meter does not count)
     *   energy.phases: { Aplus1, Aplus2, Aplus3 } kWh
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
                    reject(new Error('Mercury230Client: timed out'));
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

module.exports = { Mercury230Client, Mercury230StatusError };

// Run directly for a quick standalone test (prints every frame):
//   node mercury230-client.js <host> <port> <address> [password]
if (require.main === module) {
    const [, , host, port, address, password] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Mercury230Client({
        host,
        port: Number(port),
        address: Number(address),
        ...(password ? { password } : {}),
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
