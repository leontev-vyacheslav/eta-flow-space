'use strict';
/**
 * Km5Client
 *
 * TCP client for the TBN Energoservis KM-5 heat meter, connected through a
 * transparent TCP-serial modem (e.g. Maestro) to its 2-wire RS-485 port.
 * Implements "Протокол обмена между ПК и КМ-5" (TBN, 05-11-2009, and the
 * v1N edition of 17-09-2019, which keeps the same commands):
 *
 *   request  16 bytes: network number (4) | command (1) | data (9) | KS1 KS2
 *   reply    32 bytes for commands < 64, 72 bytes for commands >= 64
 *            (8 for command 48): network number | command | data | KS1 KS2
 *
 * The network number is the factory number in BCD, least significant byte
 * first: 418200 -> 00 82 41 00. KS1 is the XOR and KS2 the sum modulo 256
 * of all bytes before KS1. A request with a bad checksum gets no reply.
 * An error reply has the expected length with an error code in place of
 * the command: 0xF1 "resource busy" (repeat the request), 0xEF bad
 * parameter, 0xF0 bad command, 0xFB-0xFF PPS/RTC/EEPROM errors.
 *
 * read() returns every current value the read commands below offer, raw,
 * in the device's units, named after the protocol (Cyrillic letters
 * transliterated). Which pipe is the supply or the return is decided by the
 * Node-RED mapping (collect-device-state). Archives are not read.
 *
 * Commands used by read():
 *    9  firmware version, 5 ASCII characters ("02.33"), then the max stack
 *       byte and the 4-character type ("KM  ")
 *    8  status bytes 1-8 (table 3): hot-water mode, empty-pipe flags,
 *       hardware error flags, manual hot-water mode, flag bytes 5-8
 *  123  current values, IEEE754 float LE from data byte 1: G1, G2, G3 t/h,
 *       t1, t2, tx, ta °C, P1, P2, P3 atm, W Gcal/h, t2 PPS, tx PPS,
 *       t inside the device °C, W2 Gcal/h, t hot water °C, then the
 *       second-cycle counter byte
 *   94  current values: G1, G2, G3 m3/h, P3 atm (as in 123), t2 PPS,
 *       t3 PPS °C, flow speed v m/s, P4 atm
 *   95  clock and totals: date/time (EE, day, month, year, model, hour,
 *       minute, second; BCD), then floats M1, M2 t, Vi, V1, V2 m3,
 *       Q Gcal, operation time h; firmware v1N_2.33-201 and later add the
 *       time counters Tw, Tmin, Tmax, Tdt, Tf, Tep, Tpt1 h (older firmware
 *       sends zeros there, returned as null)
 *
 * Values from the second-flow unit (PPS: t2pps, txpps, t2p, t3p) are
 * meaningless when no PPS is connected; the mapping ignores them then.
 *
 * (The protocol tables number data bytes from 2 for these commands; the
 * floats really start right after the command byte, checked against the
 * device display on firmware 2.33.)
 *
 * A reply is accepted only when its length, checksums, network number and
 * command match the request. Anything else fails the whole read() — a
 * value is never stored under the wrong field (see the EK270 shared-line
 * incident).
 *
 * Serial settings of the modem: 9600 baud, 8 data bits, no parity, 1 stop
 * bit. The Maestro modem may drop the first request after a connect; the
 * request is repeated.
 *
 * Usage:
 *   const client = new Km5Client({ host: '178.205.241.58', port: 5011, address: 418200 });
 *   const results = await client.read();
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself — the caller wraps read() in
 * withConnectionLock() from ./with-connection-lock.js, as the Node-RED
 * subflow does.
 */

const net = require('net');

const REQUEST_LENGTH = 16;

const COMMAND_VERSION = 9;
const COMMAND_STATUS = 8;
const COMMAND_CURRENT = 123;
const COMMAND_CURRENT_VOLUME = 94;
const COMMAND_TOTALS = 95;

const ERROR_BUSY = 0xf1;
const ERROR_CODES = {
    0xef: 'bad command parameter',
    0xf0: 'bad command',
    0xf1: 'resource busy',
    0xfb: 'PPS read error',
    0xfc: 'RTC read error',
    0xfd: 'RTC write error',
    0xfe: 'EEPROM read error',
    0xff: 'EEPROM write error',
};

const DATE_TIME_MARKER = 0xee;

// Reply offset of the first data byte (right after the command).
const DATA_OFFSET = 5;

// Current values (command 123): name -> index of the float. GM: mass flow
// rate, t/h.
const CURRENT_FLOATS = {
    GM1: 0,
    GM2: 1,
    GM3: 2,
    t1: 3,
    t2: 4,
    tx: 5,
    ta: 6,
    P1: 7,
    P2: 8,
    P3: 9,
    W: 10,
    t2pps: 11,
    txpps: 12,
    tin: 13,
    W2: 14,
    tgvs: 15,
};
// Byte after the 16 floats: second-cycle counter; its high bit says the
// PPS values may not be processed yet.
const CYCLE_COUNTER_OFFSET = 16 * 4;

// Current values (command 94): name -> index of the float. GV: volume flow
// rate, m3/h. Float 3 is P3 again (as in command 123).
const CURRENT_VOLUME_FLOATS = {
    GV1: 0,
    GV2: 1,
    GV3: 2,
    t2p: 4,
    t3p: 5,
    v: 6,
    P4: 7,
};

// Totals (command 95), after the 8 date/time bytes: name -> index of the float.
const TOTAL_FLOATS = {
    M1: 0,
    M2: 1,
    Vi: 2,
    V1: 3,
    V2: 4,
    Q: 5,
    Tr: 6,
};
// Time counters of firmware v1N_2.33-201 and later, after the totals.
const TIME_COUNTER_FLOATS = {
    Tw: 7,
    Tmin: 8,
    Tmax: 9,
    Tdt: 10,
    Tf: 11,
    Tep: 12,
    Tpt1: 13,
};

// Status bytes (command 8, table 3): name -> data byte index.
const STATUS_BYTES = {
    hotWaterMode: 0,
    emptyPipeFlags: 1,
    hardwareErrorFlags: 2,
    hotWaterModeSet: 3,
    flags5: 4,
    flags6: 5,
    flags7: 6,
    flags8: 7,
};

function replyLength(command) {
    if (command === 48) return 8;
    return command < 64 ? 32 : 72;
}

function fromBcd(byte) {
    const high = byte >> 4, low = byte & 0x0f;
    return high > 9 || low > 9 ? null : high * 10 + low;
}

// A float32 carries ~7 significant digits; more would be noise
// (51121.07 arrives as 51121.06640625).
function readFloat(data, offset) {
    const value = data.readFloatLE(offset);
    return Number.isFinite(value) ? Number(value.toPrecision(7)) : null;
}

class Km5ErrorReplyError extends Error {
    constructor(command, code) {
        super(`Km5Client: error reply 0x${code.toString(16)} (${ERROR_CODES[code]}) to command ${command}`);
        this.code = code;
    }
}

class Km5Client {
    /**
     * @param {object} options
     * @param {string} options.host - TCP-serial modem IP/hostname (e.g. Maestro).
     * @param {number} options.port - Modem TCP port.
     * @param {number} options.address - Network number of the meter (its factory number, e.g. 418200).
     * @param {number} [options.stepDelayMs=100] - Pause after a reply before the next request.
     * @param {number} [options.stepTimeoutMs=1500] - Wait for a valid reply to one request (the meter answers within 800 ms).
     * @param {number} [options.retries=3] - Extra requests after no valid reply or a "busy" reply.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
     * @param {(direction: string, bytes: Buffer) => void} [options.trace] - Called with every frame sent ('>') and received ('<').
     */
    constructor({
        host,
        port,
        address,
        stepDelayMs = 100,
        stepTimeoutMs = 1500,
        retries = 3,
        responseTimeoutMs = 30000,
        trace = null,
    } = {}) {
        if (!host) throw new Error('Km5Client: "host" is required');
        if (!port) throw new Error('Km5Client: "port" is required');
        if (!Number.isInteger(address) || address < 0 || address > 99999999) {
            throw new Error('Km5Client: "address" must be the factory number (up to 8 digits)');
        }

        this.host = host;
        this.port = port;
        this.address = address;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
        this.trace = trace;
    }

    // 418200 -> [0x00, 0x82, 0x41, 0x00]
    static addressBytes(address) {
        const digits = String(address).padStart(8, '0');
        const bytes = [];
        for (let i = 6; i >= 0; i -= 2) bytes.push(parseInt(digits.slice(i, i + 2), 16));
        return bytes;
    }

    // [XOR, sum modulo 256] of all bytes.
    static checksums(bytes) {
        let xor = 0, sum = 0;
        for (const b of bytes) {
            xor ^= b;
            sum = (sum + b) & 0xff;
        }
        return [xor, sum];
    }

    static _checksumsOk(frame) {
        const [xor, sum] = Km5Client.checksums(frame.subarray(0, frame.length - 2));
        return frame[frame.length - 2] === xor && frame[frame.length - 1] === sum;
    }

    buildRequest(command, data = []) {
        const bytes = [...Km5Client.addressBytes(this.address), command, ...data];
        while (bytes.length < REQUEST_LENGTH - 2) bytes.push(0);
        return Buffer.from([...bytes, ...Km5Client.checksums(bytes)]);
    }

    // Opens the socket and returns { request, close }. request(frame)
    // resolves with the whole reply; rejects with Km5ErrorReplyError on an
    // error reply, or with an Error when no valid reply came within
    // stepTimeoutMs.
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

            // Looks for a reply of the expected length that starts with the
            // network number and has valid checksums; skips anything before
            // it (an echo of the request, line noise).
            const check = () => {
                if (!pending) return;
                const { frame, length } = pending;
                const address = frame.subarray(0, 4), command = frame[4];

                if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
                    buffer = buffer.subarray(frame.length);
                }
                for (let start = 0; start + length <= buffer.length; start++) {
                    const reply = buffer.subarray(start, start + length);
                    if (!reply.subarray(0, 4).equals(address) || !Km5Client._checksumsOk(reply)) continue;
                    if (reply[4] === command) {
                        settle('resolve', reply);
                    } else if (ERROR_CODES[reply[4]]) {
                        settle('reject', new Km5ErrorReplyError(command, reply[4]));
                    } else {
                        continue;
                    }
                    return;
                }
            };

            const request = (frame) => new Promise((res, rej) => {
                if (closedError) {
                    rej(closedError);
                    return;
                }
                const command = frame[4];
                buffer = Buffer.alloc(0);
                pending = {
                    frame,
                    length: replyLength(command),
                    resolve: res,
                    reject: rej,
                    timer: setTimeout(() => settle('reject', new Error(
                        `Km5Client: no valid reply to command ${command}`)), this.stepTimeoutMs),
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
            socket.on('close', () => onClosed(new Error('Km5Client: connection closed')));

            socket.connect(this.port, this.host, () => {
                resolve({
                    // Repeats a request that got no valid reply or a "busy"
                    // reply; any other error reply is the device's answer.
                    request: async (frame) => {
                        for (let attempt = 0; ; attempt++) {
                            try {
                                const reply = await request(frame);
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                                return reply;
                            } catch (err) {
                                const retryable = !(err instanceof Km5ErrorReplyError) || err.code === ERROR_BUSY;
                                if (!retryable || closedError || attempt >= this.retries) throw err;
                                await new Promise((r) => setTimeout(r, this.stepDelayMs));
                            }
                        }
                    },
                    // destroy() instead of end(): the modem never closes
                    // its side, so a half-open socket would linger.
                    close: () => {
                        closedError = closedError || new Error('Km5Client: connection closed');
                        socket.destroy();
                    },
                });
            });
        });
    }

    // Local wall-clock time from the BCD date/time block (no TZ in the
    // protocol); null when the block is not a valid date.
    static _parseDateTime(bytes) {
        if (bytes[0] !== DATE_TIME_MARKER) return null;
        const [day, month, year] = [bytes[1], bytes[2], bytes[3]].map(fromBcd);
        const [hour, minute, second] = [bytes[5], bytes[6], bytes[7]].map(fromBcd);
        if ([day, month, year, hour, minute, second].includes(null)) return null;
        const date = new Date(2000 + year, month - 1, day, hour, minute, second);
        return date.getDate() === day && date.getMonth() === month - 1 ? date.getTime() : null;
    }

    async _readSession(connection, results) {
        const version = await connection.request(this.buildRequest(COMMAND_VERSION));
        results.firmware = version.subarray(DATA_OFFSET, DATA_OFFSET + 5).toString('latin1');
        results.type = version.subarray(DATA_OFFSET + 6, DATA_OFFSET + 10).toString('latin1').trim();

        const status = await connection.request(this.buildRequest(COMMAND_STATUS));
        for (const [name, index] of Object.entries(STATUS_BYTES)) {
            results[name] = status[DATA_OFFSET + index];
        }

        const current = await connection.request(this.buildRequest(COMMAND_CURRENT));
        for (const [name, index] of Object.entries(CURRENT_FLOATS)) {
            results[name] = readFloat(current, DATA_OFFSET + index * 4);
        }
        results.cycleCounter = current[DATA_OFFSET + CYCLE_COUNTER_OFFSET];

        const currentVolume = await connection.request(this.buildRequest(COMMAND_CURRENT_VOLUME));
        for (const [name, index] of Object.entries(CURRENT_VOLUME_FLOATS)) {
            results[name] = readFloat(currentVolume, DATA_OFFSET + index * 4);
        }

        const totals = await connection.request(this.buildRequest(COMMAND_TOTALS));
        results.deviceTime = Km5Client._parseDateTime(totals.subarray(DATA_OFFSET, DATA_OFFSET + 8));
        results.model = fromBcd(totals[DATA_OFFSET + 4]);
        for (const [name, index] of Object.entries(TOTAL_FLOATS)) {
            results[name] = readFloat(totals, DATA_OFFSET + 8 + index * 4);
        }
        // Older firmware sends zeros for the time counters; a running meter
        // that supports them has a normal operation time Tw above zero.
        const counters = Object.entries(TIME_COUNTER_FLOATS)
            .map(([name, index]) => [name, readFloat(totals, DATA_OFFSET + 8 + index * 4)]);
        const supported = counters.find(([name]) => name === 'Tw')[1] > 0;
        for (const [name, value] of counters) results[name] = supported ? value : null;
    }

    /**
     * Reads the firmware, status bytes, current values, totals and clock in
     * one session. Resolves with (device units, null for a value that is
     * not a finite number):
     *
     *   firmware, type (strings), model (0 = КМ-5-1 ... 5 = КМ-5-6)
     *   hotWaterMode, emptyPipeFlags, hardwareErrorFlags, hotWaterModeSet,
     *   flags5..flags8   status bytes 1-8 (command 8, table 3)
     *   GM1, GM2, GM3 t/h, GV1, GV2, GV3 m3/h, t1, t2, tx, ta, tin, tgvs °C,
     *   P1, P2, P3, P4 atm, W, W2 Gcal/h, v m/s,
     *   t2pps, txpps, t2p, t3p °C (PPS), cycleCounter
     *   M1, M2 t, Vi, V1, V2 m3, Q Gcal, Tr h (totals)
     *   Tw, Tmin, Tmax, Tdt, Tf, Tep, Tpt1 h (null on older firmware)
     *   deviceTime (epoch ms, or null), timestamp
     *
     * Rejects on connection/protocol failure; the Error carries a
     * `.partialResults` property with whatever was read before it.
     *
     * @returns {Promise<Record<string, number|string|null>>}
     */
    async read() {
        const results = {};
        let connection = null;
        let overallTimer = null;
        try {
            connection = await this._connect();
            const timeout = new Promise((_, reject) => {
                overallTimer = setTimeout(() => {
                    reject(new Error('Km5Client: timed out'));
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

module.exports = { Km5Client, Km5ErrorReplyError };

// Run directly for a quick standalone test (prints every frame):
//   node km5-client.js <host> <port> <factory number>
if (require.main === module) {
    const [, , host, port, address] = process.argv;
    const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
    const client = new Km5Client({
        host,
        port: Number(port),
        address: Number(address),
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
