'use strict';
/**
 * Logika protocol layer
 *
 * Connection and framing shared by the readers of the НПФ «Логика» heat
 * calculators, ./spt941-client.js and ./spt943-client.js. Both families
 * speak one of two protocol generations over RS-232 (8N1, LSB first):
 *
 * Old protocol ("Связь с внешними устройствами": СПТ943 2008, СПТ941
 * мод. 941.10/11 2005; .docs/spt943, .docs/spt941) — the original СПТ943
 * (943.1 and 943.2 before firmware 2.0.0.3.00) and the СПТ941.10/11:
 *
 *   start sequence  ≥ 16 × 0xFF, then ≥ 1000 ms of silence
 *   request  0x10 NT КЗ b1 b2 b3 b4 КС 0x16           (9 bytes)
 *   reply    0x10 NT КЗ data КС 0x16                    (data 1-68 bytes)
 *   error    0x10 NT 0x21 code КС 0x16
 *
 *   NT = network number (0-99; 255 = any device), КЗ = request code,
 *   КС = bitwise NOT of the low byte of the sum of NT, КЗ and the data.
 *   0x3F session (reply: device code 2 bytes + version byte VX),
 *   0x52 read RAM (address low, high, count 1-64),
 *   0x45 read FLASH (page low, high, pages 1-64; one 64-byte frame per
 *   page). Numbers are little-endian; floats are Logika's own 4-byte
 *   format: mantissa low, middle, high (sign in its top bit, no hidden
 *   one), then the binary exponent (bias 127; 0 = zero).
 *
 * М4 ("Магистральный протокол М4. Руководство программиста" РАЖГ.00293-33,
 * .docs/spt941) — the СПТ941.20 and the СПТ943.1 with firmware 2.0.0.3.00
 * and later:
 *
 *   frame  0x10 NT 0x90 ID ATR DL_low DL_high body CRC_high CRC_low
 *   body   FNC data: 0x3F session, 0x72 read parameters, 0x21 error
 *
 *   ID is copied into the reply; CRC-16 CCITT (polynomial 0x1021, start
 *   0) over everything after 0x10 — appended high byte first, so the CRC
 *   of a whole valid frame is 0. A read request lists the parameters as
 *   PNUM elements (0x4A, length 3, channel, number low, high), up to 32
 *   per request; the reply lists their values as tagged elements (ASN.1
 *   style: tag, length, data): IEEE floats, MIXED (int32 + float),
 *   unsigned/signed integers, flag sets, time, date, text (cp1251), octet
 *   strings, NULL. Values are little-endian.
 *
 * Every session starts the same way: the start sequence, the pause, and
 * the old-format session request, which both generations answer in the
 * old format. The device code and VX in that reply tell the model and the
 * protocol (СПТ943: 0x54 0x2B, VX < 0x0A old, 0x0A-0x1F М4; СПТ941.10/11
 * and 941.20: 0x92 0x29, VX < 0x80 old, ≥ 0x80 М4). An М4 device then
 * gets the session request again as an М4 frame (as the old ETA engine
 * does).
 *
 * A reply is accepted only when it is complete, its checksum/CRC is valid,
 * it comes from the requested network number with the requested code (and
 * for М4 the request's ID), and it has exactly the expected length; an
 * echo of the request is skipped. Line noise and frames of another master
 * are skipped too. A request without a valid reply (or with error 0x00,
 * "bad request structure", which a request damaged on the line gets) is
 * repeated; other error replies fail it. A session request that gets no
 * reply is repeated with the start sequence. An old-format reply names
 * neither the address read nor the request: after a repeat the line is
 * left to settle (a late reply to the first attempt would look like the
 * reply to the next request of the same code and length), and the
 * readers give such neighbouring requests different lengths.
 *
 * A device with a password (PW) and КИ ≠ 0 accepts only RC5-encrypted
 * exchange (error 0x04 to the session request); that is not supported.
 */

const net = require('net');

const SOH = 0x10;
const END = 0x16;
const START_BYTE = 0xff;
const FRM_M4 = 0x90;

const CODE_SESSION = 0x3f;
const CODE_ERROR = 0x21;
const CODE_READ_FLASH = 0x45;
const CODE_READ_RAM = 0x52;
const FNC_READ_PARAMS = 0x72;

const FLASH_PAGE_SIZE = 64;
const M4_MAX_PARAMS = 32;

const ERROR_BAD_STRUCTURE = 0x00;
const ERROR_BAD_PARAMS = 0x02;
const ERROR_CODES = {
    0x00: 'bad request structure',
    0x01: 'write protected',
    0x02: 'invalid request parameters',
    0x03: 'no data',
    0x04: 'only encrypted exchange (password set)',
    0x05: 'bad request format for encrypted exchange',
};

// М4 tags.
const TAG = {
    OCTET_STRING: 0x04,
    NULL: 0x05,
    ASCII_STRING: 0x16,
    SEQUENCE: 0x30,
    INT_U: 0x41,
    INT_S: 0x42,
    FLOAT: 0x43,
    MIXED: 0x44,
    OPERATIVE: 0x45,
    TIME: 0x47,
    DATE: 0x48,
    ARCHDATE: 0x49,
    PNUM: 0x4a,
    FLAGS: 0x4b,
    ERR: 0x55,
};

const cp1251 = (() => {
    try {
        return new TextDecoder('windows-1251');
    } catch (err) {
        return null; // Node built without full ICU: texts decode as latin1
    }
})();
const decodeText = (bytes) => (cp1251 ? cp1251.decode(bytes) : Buffer.from(bytes).toString('latin1'));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A float32 carries ~7 significant digits; more would be noise.
const roundFloat = (value) => (Number.isFinite(value) ? Number(value.toPrecision(7)) : null);

function checksum(bytes) {
    let sum = 0;
    for (const b of bytes) sum = (sum + b) & 0xff;
    return ~sum & 0xff;
}

function crc16(bytes) {
    let crc = 0;
    for (const b of bytes) {
        crc ^= b << 8;
        for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc;
}

// Logika's float: [mantissa low, middle, sign|high, exponent].
function readLogikaFloat(bytes, offset) {
    const exponent = bytes[offset + 3];
    if (exponent === 0) return 0;
    if (exponent === 0xff) return null;
    const mantissa = ((bytes[offset + 2] & 0x7f) << 16) | (bytes[offset + 1] << 8) | bytes[offset];
    const value = (1 + mantissa / 0x800000) * 2 ** (exponent - 127);
    return roundFloat(bytes[offset + 2] & 0x80 ? -value : value);
}

// Set bits of a little-endian flag assembly as numbers (bit 0 of the first
// byte = 0), each plus `first`.
function flagNumbers(bytes, first = 0) {
    const numbers = [];
    bytes.forEach((byte, i) => {
        for (let bit = 0; bit < 8; bit++) if (byte & (1 << bit)) numbers.push(first + i * 8 + bit);
    });
    return numbers;
}

// Settings travel as text in both generations; a number when they read as
// one.
const numberOrText = (text) => (typeof text === 'string' && /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text);

// Old-protocol settings value (FLASH, 16 bytes per parameter): bytes 4-11
// are its ASCII text.
function settingValue(bytes, offset) {
    return numberOrText(bytes.subarray(offset + 4, offset + 12).toString('latin1').replace(/\0/g, ' ').trim());
}

// Local wall-clock time (the device keeps no time zone) as epoch ms, or
// null when the fields are no valid date.
function localTime(year, month, day, hour, minute, second) {
    const date = new Date(year, month - 1, day, hour, minute, second);
    const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
        && date.getHours() === hour && date.getMinutes() === minute && date.getSeconds() === second;
    return valid ? date.getTime() : null;
}

class LogikaErrorReplyError extends Error {
    constructor(what, code) {
        super(`Logika: error reply 0x${code.toString(16).padStart(2, '0')} (${ERROR_CODES[code] || 'unknown'}) to ${what}`);
        this.code = code;
    }
}

function shortFrame(nt, code, data) {
    const body = [nt, code, ...data];
    return Buffer.from([SOH, ...body, checksum(body), END]);
}

function m4Frame(nt, id, body) {
    const header = [nt, FRM_M4, id, 0x00, body.length & 0xff, body.length >> 8];
    const crc = crc16([...header, ...body]);
    return Buffer.from([SOH, ...header, ...body, crc >> 8, crc & 0xff]);
}

// Finds `frames` consecutive old-format replies with `dataLength` data
// bytes (or one error reply) in the buffer: { data } (the data of all
// frames joined), { error }, or null (not yet).
function matchShort(buffer, nt, code, dataLength, frames) {
    const length = dataLength + 5;
    const ntOk = (b) => nt === 0xff || b === nt;
    const valid = (s, len) => buffer[s] === SOH && ntOk(buffer[s + 1]) && buffer[s + len - 1] === END
        && buffer[s + len - 2] === checksum(buffer.subarray(s + 1, s + len - 2));
    const found = [];
    for (let s = 0; s < buffer.length;) {
        if (found.length === 0 && s + 6 <= buffer.length && buffer[s + 2] === CODE_ERROR && valid(s, 6)) {
            return { error: buffer[s + 3] };
        }
        if (s + length <= buffer.length && buffer[s + 2] === code && valid(s, length)) {
            found.push(buffer.subarray(s + 3, s + 3 + dataLength));
            if (found.length === frames) return { data: Buffer.concat(found) };
            s += length;
            continue;
        }
        s++;
    }
    return null;
}

// Finds the М4 reply to the request with this ID: { body }, { error } or
// null (not yet). The request's own echo is skipped.
function matchM4(buffer, nt, id, request) {
    for (let s = 0; s + 7 <= buffer.length; s++) {
        if (buffer[s] !== SOH || buffer[s + 2] !== FRM_M4 || buffer[s + 3] !== id) continue;
        if (nt !== 0xff && buffer[s + 1] !== nt) continue;
        const total = 9 + buffer.readUInt16LE(s + 5);
        if (s + total > buffer.length) continue;
        const frame = buffer.subarray(s, s + total);
        if (frame.equals(request) || crc16(frame.subarray(1)) !== 0) continue;
        const body = frame.subarray(7, total - 2);
        if (body[0] === CODE_ERROR && body.length === 2) return { error: body[1] };
        if (body[0] === request[7]) return { body };
    }
    return null;
}

// М4 element length: one byte below 0x80, else 0x80 | N and N bytes
// (most significant first). Returns [length, size of the length field].
function readLength(bytes, offset) {
    const first = bytes[offset];
    if (first === undefined) throw new Error('Logika: М4 reply ends inside an element');
    if (!(first & 0x80)) return [first, 1];
    const n = first & 0x7f;
    if (n === 0 || n > 4 || offset + 1 + n > bytes.length) throw new Error('Logika: bad М4 element length');
    let length = 0;
    for (let i = 1; i <= n; i++) length = length * 256 + bytes[offset + i];
    return [length, 1 + n];
}

// One М4 value: numbers, flag lists, { hour, minute, second } for TIME,
// { day, month, year, weekday } for DATE, text, hex for octet strings,
// null for NULL / ERR.
function decodeM4Value(tag, data) {
    switch (tag) {
        case TAG.NULL:
        case TAG.ERR:
            return null;
        case TAG.FLOAT:
            return data.length === 4 ? roundFloat(data.readFloatLE(0)) : null;
        case TAG.MIXED: {
            if (data.length !== 8) return null;
            const fraction = data.readFloatLE(4);
            return Number.isFinite(fraction) ? Number((data.readInt32LE(0) + fraction).toFixed(3)) : null;
        }
        case TAG.INT_U:
            return data.length === 0 ? 0 : data.length <= 6 ? data.readUIntLE(0, data.length) : hex(data);
        case TAG.INT_S:
            return data.length === 0 ? 0 : data.length <= 6 ? data.readIntLE(0, data.length) : hex(data);
        case TAG.FLAGS:
            return flagNumbers(data);
        case TAG.TIME:
            return data.length === 4 ? { hour: data[3], minute: data[2], second: data[1] } : null;
        case TAG.DATE:
            return data.length === 4 ? { day: data[0], month: data[1], year: 2000 + data[2], weekday: data[3] } : null;
        case TAG.ASCII_STRING:
            return decodeText(data).replace(/\0+$/, '').trim();
        default:
            return hex(data);
    }
}

// Values of an М4 read reply body (after FNC), the Operative flags of
// settings dropped.
function parseM4Values(body) {
    const values = [];
    for (let i = 1; i < body.length;) {
        const tag = body[i];
        const [length, size] = readLength(body, i + 1);
        const start = i + 1 + size;
        if (start + length > body.length) throw new Error('Logika: М4 reply ends inside an element');
        if (tag === TAG.PNUM) throw new Error('Logika: М4 reply carries parameter numbers (an echo?)');
        if (tag !== TAG.OPERATIVE) values.push(decodeM4Value(tag, body.subarray(start, start + length)));
        i = start + length;
    }
    return values;
}

/**
 * Opens the socket and resolves with:
 *   session()            start sequence, pause, old-format session request
 *                        → { device: [code low, code high], VX }
 *   readRam(address, n)  → Buffer of n bytes (n ≤ 64)
 *   readFlash(page, k)   → Buffer of k pages × 64 bytes
 *   m4Session()          М4 session request → { device, VX }
 *   readParams(list)     М4 values of [channel, number] pairs, in order;
 *                        when the device refuses a set ("invalid request
 *                        parameters"), each is asked alone and a refused
 *                        one is null
 *   close()
 *
 * @param {object} options - host, port, createSocket, address (NT), stepTimeoutMs, stepDelayMs, retries,
 *     startSequenceBytes, startPauseMs, trace, name (for messages)
 */
function connect(options) {
    const { address: nt, stepTimeoutMs, stepDelayMs, retries, startSequenceBytes, startPauseMs, trace, name } = options;
    return new Promise((resolve, reject) => {
        const socket = options.createSocket();
        let buffer = Buffer.alloc(0);
        let pending = null;
        let closedError = null;
        let nextId = Math.floor(Math.random() * 256);

        const settle = (fn, value) => {
            const current = pending;
            if (!current) return;
            pending = null;
            clearTimeout(current.timer);
            fn === 'resolve' ? current.resolve(value) : current.reject(value);
        };

        const check = () => {
            if (!pending) return;
            if (buffer.length >= pending.frame.length && buffer.subarray(0, pending.frame.length).equals(pending.frame)) {
                buffer = buffer.subarray(pending.frame.length);
            }
            const result = pending.match(buffer);
            if (!result) return;
            if ('error' in result) settle('reject', new LogikaErrorReplyError(pending.what, result.error));
            else settle('resolve', result);
        };

        const send = (bytes) => {
            if (trace) trace('>', bytes);
            socket.write(bytes);
        };

        const transact = (frame, match, what) => new Promise((res, rej) => {
            if (closedError) {
                rej(closedError);
                return;
            }
            buffer = Buffer.alloc(0);
            pending = {
                frame,
                match,
                what,
                resolve: res,
                reject: rej,
                timer: setTimeout(() => settle('reject', new Error(`${name}: no valid reply to ${what}`)), stepTimeoutMs),
            };
            send(frame);
        });

        // Repeats a request that got no valid reply or "bad request
        // structure"; any other error reply is the device's answer. Old-
        // format replies carry no ID: after a repeat that followed a
        // timeout, the late reply to the first attempt may still come, so
        // the line is left to settle for stepTimeoutMs (what arrives is
        // dropped with the buffer) before the next request.
        const withRetries = async (attemptOnce) => {
            let timedOut = false;
            for (let attempt = 0; ; attempt++) {
                try {
                    const result = await attemptOnce();
                    await sleep(timedOut ? stepTimeoutMs : stepDelayMs);
                    return result;
                } catch (err) {
                    const retryable = !(err instanceof LogikaErrorReplyError) || err.code === ERROR_BAD_STRUCTURE;
                    if (!retryable || closedError || attempt >= retries) throw err;
                    timedOut = timedOut || !(err instanceof LogikaErrorReplyError);
                    await sleep(stepDelayMs);
                }
            }
        };

        const short = (code, data, dataLength, frames, what) => withRetries(async () => {
            const frame = shortFrame(nt, code, data);
            return (await transact(frame, (b) => matchShort(b, nt, code, dataLength, frames), what)).data;
        });

        const m4 = (body, what) => withRetries(async () => {
            const id = nextId;
            nextId = (nextId + 1) & 0xff;
            const frame = m4Frame(nt, id, body);
            return (await transact(frame, (b) => matchM4(b, nt, id, frame), what)).body;
        });

        const m4Read = async (list) => {
            const body = [FNC_READ_PARAMS];
            for (const [channel, number] of list) body.push(TAG.PNUM, 3, channel, number & 0xff, number >> 8);
            const what = `М4 read of ${list.map(([c, n]) => `${c}:${n}`).join(' ')}`;
            const values = parseM4Values(await m4(body, what));
            if (values.length !== list.length) throw new Error(`${name}: ${values.length} values in the reply to ${what}`);
            return values;
        };

        const readParamsChunk = async (list) => {
            try {
                return await m4Read(list);
            } catch (err) {
                if (!(err instanceof LogikaErrorReplyError) || err.code !== ERROR_BAD_PARAMS) throw err;
                if (list.length === 1) return [null];
                const values = [];
                for (const param of list) values.push((await readParamsChunk([param]))[0]);
                return values;
            }
        };

        socket.on('data', (chunk) => {
            if (trace) trace('<', chunk);
            buffer = Buffer.concat([buffer, chunk]);
            check();
        });

        const onClosed = (err) => {
            if (!closedError) closedError = err;
            settle('reject', closedError);
            reject(closedError);
        };
        socket.on('error', (err) => onClosed(err));
        socket.on('close', () => onClosed(new Error(`${name}: connection closed`)));

        socket.connect(options.port, options.host, () => {
            resolve({
                session: () => withRetries(async () => {
                    send(Buffer.alloc(startSequenceBytes, START_BYTE));
                    await sleep(startPauseMs);
                    const frame = shortFrame(nt, CODE_SESSION, [0, 0, 0, 0]);
                    const { data } = await transact(frame, (b) => matchShort(b, nt, CODE_SESSION, 3, 1), 'the session request');
                    return { device: [data[0], data[1]], VX: data[2] };
                }),
                readRam: (start, count) => short(CODE_READ_RAM, [start & 0xff, start >> 8, count, 0], count, 1,
                    `RAM read 0x${start.toString(16)}+${count}`),
                readFlash: (page, pages) => short(CODE_READ_FLASH, [page & 0xff, page >> 8, pages, 0], FLASH_PAGE_SIZE, pages,
                    `FLASH read of page ${page}+${pages}`),
                m4Session: async () => {
                    const body = await m4([CODE_SESSION, 0, 0, 0, 0], 'the М4 session request');
                    if (body.length !== 4) throw new Error(`${name}: М4 session reply of ${body.length} bytes`);
                    return { device: [body[1], body[2]], VX: body[3] };
                },
                readParams: async (list) => {
                    const values = [];
                    for (let i = 0; i < list.length; i += M4_MAX_PARAMS) {
                        values.push(...await readParamsChunk(list.slice(i, i + M4_MAX_PARAMS)));
                    }
                    return values;
                },
                // destroy() instead of end(): gateways never close their
                // side, so a half-open socket would linger.
                close: () => {
                    closedError = closedError || new Error(`${name}: connection closed`);
                    socket.destroy();
                },
            });
        });
    });
}

/**
 * read() of a Logika client: one session with an overall timeout; rejects
 * with `.partialResults` holding whatever was read before the failure.
 */
async function readSession(client, readSessionFn) {
    const results = {};
    let connection = null;
    let overallTimer = null;
    const options = {
        ...client,
        createSocket: client.createSocket || (() => new net.Socket()),
        name: client.constructor.name,
    };
    try {
        connection = await connect(options);
        const timeout = new Promise((_, reject) => {
            overallTimer = setTimeout(() => {
                reject(new Error(`${options.name}: timed out`));
                connection.close();
            }, client.responseTimeoutMs);
        });
        await Promise.race([readSessionFn(connection, results), timeout]);
        return { ...results, timestamp: Date.now() };
    } catch (err) {
        err.partialResults = { ...results, timestamp: Date.now() };
        throw err;
    } finally {
        clearTimeout(overallTimer);
        if (connection) connection.close();
    }
}

module.exports = {
    connect,
    readSession,
    LogikaErrorReplyError,
    readLogikaFloat,
    flagNumbers,
    numberOrText,
    settingValue,
    localTime,
    roundFloat,
    checksum,
    crc16,
    shortFrame,
    m4Frame,
    parseM4Values,
    decodeM4Value,
    hex,
    TAG,
    FLASH_PAGE_SIZE,
    ERROR_CODES,
};
