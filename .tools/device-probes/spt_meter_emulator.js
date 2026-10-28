#!/usr/bin/env node
'use strict';
// A pretend НПФ «Логика» СПТ94x heat calculator behind a transparent
// TCP-serial gateway: listens on PORT and answers like the meter on its
// RS-232 line, for testing spt941-client.js / spt943-client.js without a
// live meter (also through the GPRS gateway: gprs_modem_emulator.js --meter
// 127.0.0.1:PORT, or reader_via_emulator.js against this port).
//
//   node spt_meter_emulator.js PORT [--model 943|943.1|941.10|941.20|941] [--address NT]
//        [--serial N] [--echo] [--lose N] [--reply-delay MS] [--book-hour-after N]
//        [--refuse PN,...] [--trace]
//
//   --model             943 (original, old protocol, VX 3), 943.1 (М4, VX 0x0A),
//                       941.10 (old protocol, VX 2), 941.20 (М4, VX 0x80), 941 (the
//                       original СПТ941, device code 54 29: session reply only)
//   --address           network number NT (default 1)
//   --echo              echo every received byte first (an RS-485 style line)
//   --lose N            ignore every Nth request (no reply)
//   --reply-delay MS    answer after MS (a slow GPRS link)
//   --book-hour-after N after the Nth request, book the RAM increments of the
//                       totals into the FLASH counters and zero them (the hour
//                       change; the readers must read FLASH again)
//   --refuse PN,...     М4 parameter numbers the device does not know: a read
//                       naming one gets error 0x02
//
// Prints the values it serves as JSON ("expected", in the readers' field
// names) on stdout at start; frames on stderr with --trace. Follows the
// documents as the readers do (logika-protocol.js header): start sequence
// ≥ 16 × 0xFF, a session request at least 1 s later (an earlier one is
// ignored), then RAM/FLASH reads or М4 frames.

const net = require('net');

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : fallback;
};
const listenPort = Number(args[0]);
if (!listenPort) {
    console.error('usage: node spt_meter_emulator.js PORT [--model 943|943.1|941.10|941.20|941] [--address NT] [--serial N] [--echo] [--lose N] [--reply-delay MS] [--book-hour-after N] [--refuse PN,...] [--trace]');
    process.exit(2);
}
const model = option('--model', '943');
const NT = Number(option('--address', 1));
const serial = Number(option('--serial', model.startsWith('943') ? 43464 : 36809));
const echo = args.includes('--echo');
const lose = Number(option('--lose', 0));
const replyDelay = Number(option('--reply-delay', 0));
const bookHourAfter = Number(option('--book-hour-after', 0));
const refused = new Set((option('--refuse', '') || '').split(',').filter(Boolean).map(Number));
const traceOn = args.includes('--trace');
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const trace = (dir, bytes) => { if (traceOn) console.error(dir, hex(bytes)); };

// name: the readers' `model` field.
const MODELS = {
    943: { device: [0x54, 0x2b], VX: 0x03, name: '943' },
    943.1: { device: [0x54, 0x2b], VX: 0x0a, name: '943' },
    '941.10': { device: [0x92, 0x29], VX: 0x02, name: '941.10/11' },
    '941.20': { device: [0x92, 0x29], VX: 0x80, name: '941.20' },
    941: { device: [0x54, 0x29], VX: 0x02, name: '941' },
};
if (!MODELS[model]) throw new Error(`unknown model ${model}`);
const { device, VX } = MODELS[model];

// Windows-1251 for the М4 texts (А-я, Ё, ё; the rest as latin1).
const cp1251 = (text) => Buffer.from([...text].map((c) => {
    const code = c.charCodeAt(0);
    if (code >= 0x410 && code <= 0x44f) return code - 0x410 + 0xc0;
    if (c === 'Ё') return 0xa8;
    if (c === 'ё') return 0xb8;
    return code & 0xff;
}));

// ---- encoding -------------------------------------------------------------
const checksum = (bytes) => ~bytes.reduce((s, b) => (s + b) & 0xff, 0) & 0xff;
function crc16(bytes) {
    let crc = 0;
    for (const b of bytes) {
        crc ^= b << 8;
        for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
    return crc;
}
function logikaFloat(value) {
    const f = Buffer.alloc(4);
    f.writeFloatLE(value);
    const bits = f.readUInt32LE(0);
    if (value === 0) return Buffer.alloc(4);
    const sign = bits >>> 31, exponent = (bits >>> 23) & 0xff, mantissa = bits & 0x7fffff;
    return Buffer.from([mantissa & 0xff, (mantissa >> 8) & 0xff, ((mantissa >> 16) & 0x7f) | (sign << 7), exponent]);
}
const f32 = (value) => { const b = Buffer.alloc(4); b.writeFloatLE(value); return Number(b.readFloatLE(0).toPrecision(7)); };
function setting(text) {
    const b = Buffer.alloc(16);
    b.write(String(text).padEnd(8, ' '), 4, 'latin1');
    return b;
}

// ---- the meter's values ---------------------------------------------------
const CURRENT_943 = ['G1', 'G2', 'G3', 'P1', 'P2', 't1', 't2', 'dt', 't3', 'tx', 'tv'];
const TOTALS_OLD_943 = ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Ti', 'Qg'];
const TV = {
    TV1: { G1: 12.34, G2: 11.9, G3: 0, P1: 5.12, P2: 3.95, t1: 72.5, t2: 48.25, dt: 24.25, t3: 0, tx: 5, tv: 21.5 },
    TV2: { G1: 2.5, G2: 0.75, G3: 0, P1: 4.4, P2: 4.1, t1: 58.75, t2: 37.5, dt: 21.25, t3: 0, tx: 5, tv: 21.5 },
};
// Totals: [integer part, fraction, increment since the hour].
const TOTALS = {
    TV1: { V1: [123456, 0.75, 1.25], V2: [120001, 0.5, 1.125], V3: [0, 0, 0], M1: [121001, 0.25, 1.5], M2: [118002, 0.125, 1.0625],
        M3: [2999, 0.5, 0.4375], Q: [8765, 0.375, 0.0625], Ti: [65432, 0.5, 0.25], Qg: [12, 0.25, 0] },
    TV2: { V1: [23456, 0.25, 0.5], V2: [7001, 0.75, 0.125], V3: [0, 0, 0], M1: [22001, 0.5, 0.5], M2: [7002, 0.25, 0.125],
        M3: [14999, 0.25, 0.375], Q: [1765, 0.125, 0.03125], Ti: [65431, 0.25, 0.25], Qg: [1500, 0.5, 0.03125] },
};
const totalOf = ([integer, fraction, increment]) => Number((integer + fraction + increment).toFixed(3));
const INPUT_VALUES = Array.from({ length: 16 }, (_, i) => (i < 6 ? 10 + i : i < 10 ? 4 + i : 100 + i * 0.5));

const ram = Buffer.alloc(0x0800);
const flash = Buffer.alloc(1024 * 64);
const expected = { model: MODELS[model].name, serialNumber: serial, ID: serial };

function bookHour(tvTotals, ramStart, flashStart, names) {
    names.forEach((name, i) => {
        const t = tvTotals[name];
        const sum = t[0] + t[1] + t[2];
        t[0] = Math.floor(sum);
        t[1] = sum - t[0];
        t[2] = 0;
        flash.writeInt32LE(t[0], flashStart + i * 8);
        logikaFloat(t[1]).copy(flash, flashStart + i * 8 + 4);
        logikaFloat(0).copy(ram, ramStart + i * 4);
    });
}

function setupOld943() {
    setting(0).copy(flash, 0x0200);
    setting(serial).copy(flash, 0x0270);
    setting(1).copy(flash, 0x0520);
    setting(4).copy(flash, 0x0840);
    ram[0x00bb] = 0b00000001; // НС00 battery low
    ram.writeUInt16LE(1 << (10 - 8), 0x00bc); // ТВ1 НС10
    ram.writeUInt16LE(1 << (19 - 8), 0x00be); // ТВ2 НС19
    ram[0x00ff] = 0b10010011;
    expected.EI = 0;
    expected.DST = 0b10010011;
    expected.common = { NS: [0] };
    expected.TV1 = { SP: 1, NS: [10] };
    expected.TV2 = { SP: 4, NS: [19] };
    for (const [tv, ramCurrent, ramIncrements, flashCounters] of [['TV1', 0x0204, 0x0520, 0x424a], ['TV2', 0x0234, 0x0568, 0x677b]]) {
        CURRENT_943.forEach((name, i) => {
            logikaFloat(TV[tv][name]).copy(ram, ramCurrent + i * 4);
            expected[tv][name] = f32(TV[tv][name]);
        });
        TOTALS_OLD_943.forEach((name, i) => {
            const t = TOTALS[tv][name];
            logikaFloat(t[2]).copy(ram, ramIncrements + i * 4);
            flash.writeInt32LE(t[0], flashCounters + i * 8);
            logikaFloat(t[1]).copy(flash, flashCounters + i * 8 + 4);
            expected[tv][name] = totalOf(t);
        });
    }
    expected.inputs = {};
    INPUT_VALUES.forEach((v, i) => { logikaFloat(v).copy(ram, 0x0600 + i * 4); expected.inputs[`X${i + 5}`] = f32(v); });
}

const TOTALS_OLD_941 = ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Ti'];
function setupOld941() {
    setting(1).copy(flash, 0x0200);
    setting(serial).copy(flash, 0x0440);
    ram[0x0200] = 0b00000001; // НС00
    ram[0x0201] = 0b00000100; // НС10
    ram[0x0203] = 3;
    ram[0x00ff] = 0b10000001;
    Object.assign(expected, { EI: 1, DST: 0b10000001, NS: [0, 10], SP: 3 });
    ['G1', 'G2', 'G3', 't1', 't2', 'dt'].forEach((name, i) => {
        logikaFloat(TV.TV1[name]).copy(ram, 0x0204 + i * 4);
        expected[name] = f32(TV.TV1[name]);
    });
    TOTALS_OLD_941.forEach((name, i) => {
        const t = TOTALS.TV1[name];
        logikaFloat(t[2]).copy(ram, 0x0520 + i * 4);
        flash.writeInt32LE(t[0], 0x424a + i * 8);
        logikaFloat(t[1]).copy(flash, 0x424a + i * 8 + 4);
        expected[name] = totalOf(t);
    });
    expected.inputs = {};
    ['X4', 'X5', 'X6', 'X7', 'X8'].forEach((name, i) => { logikaFloat(INPUT_VALUES[i]).copy(ram, 0x0600 + i * 4); expected.inputs[name] = f32(INPUT_VALUES[i]); });
}

function writeClock() {
    const now = new Date();
    Buffer.from([now.getFullYear() - 2000, now.getMonth() + 1, now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds()])
        .copy(ram, 0x00f3);
}

// М4 values: `${channel}:${number}` -> [tag, data bytes].
const params = new Map();
const m4 = {
    float: (v) => { const b = Buffer.alloc(4); b.writeFloatLE(v); return [0x43, b]; },
    mixed: ([integer, fraction, increment]) => {
        const b = Buffer.alloc(8);
        const sum = integer + fraction + increment;
        b.writeInt32LE(Math.floor(sum), 0);
        b.writeFloatLE(sum - Math.floor(sum), 4);
        return [0x44, b];
    },
    intU: (v) => { const b = Buffer.alloc(4); b.writeUInt32LE(v); let n = 4; while (n > 1 && b[n - 1] === 0) n--; return [0x41, b.subarray(0, n)]; },
    flags: (numbers, size) => { const b = Buffer.alloc(size); numbers.forEach((n) => { b[n >> 3] |= 1 << (n & 7); }); return [0x4b, b]; },
    text: (t) => [0x16, cp1251(t)],
    setting: (t) => [0x16, cp1251(String(t))],
};
function setParam(channel, number, value) { params.set(`${channel}:${number}`, value); }
function m4Clock() {
    const now = new Date();
    setParam(0, 1024, [0x47, Buffer.from([0, now.getSeconds(), now.getMinutes(), now.getHours()])]);
    setParam(0, 1025, [0x48, Buffer.from([now.getDate(), now.getMonth() + 1, now.getFullYear() - 2000, (now.getDay() + 6) % 7])]);
}

function setup943M4() {
    Object.assign(expected, { EI: 1, version: 'СПТ943 v2.0.0.3', protectionKey: 1, DI: 0, DO1: 0, externalPower: 1 });
    setParam(0, 0, m4.setting(1));
    setParam(0, 7, m4.setting(serial));
    setParam(0, 8224, m4.text('СПТ943 v2.0.0.3'));
    setParam(0, 8227, m4.intU(1));
    setParam(0, 8228, m4.intU(0));
    setParam(0, 8229, m4.intU(0));
    setParam(0, 8232, m4.intU(1));
    setParam(0, 8256, m4.intU(serial));
    setParam(0, 1026, m4.float(5));
    setParam(0, 1027, m4.float(21.5));
    setParam(0, 1028, m4.flags([0], 1));
    setParam(0, 1029, m4.flags([], 1));
    setParam(0, 2048, m4.mixed([10530, 0.5, 0.09375]));
    expected.common = { tx: 5, tv: 21.5, NS: [0], DS: [], Q: totalOf([10530, 0.5, 0.09375]) };
    const timeTotals = { Ti: 65432.75, Tmin: 1.5, Tmax: 0, Tdt: 12.25, Tep: 0.5, Tf: 0, Tn: 100.25, Tsh: 65332.5 };
    ['TV1', 'TV2'].forEach((tv, i) => {
        const ch = i + 1;
        expected[tv] = { SP: i ? 4 : 1, NS: i ? [19] : [10], DS: [] };
        setParam(ch, 1024, m4.intU(expected[tv].SP));
        CURRENT_943.forEach((name, k) => { setParam(ch, 1025 + k, m4.float(TV[tv][name])); expected[tv][name] = f32(TV[tv][name]); });
        setParam(ch, 1036, m4.flags(expected[tv].NS, 3));
        setParam(ch, 1037, m4.flags([], 2));
        ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Qg'].forEach((name, k) => {
            setParam(ch, 2048 + k, m4.mixed(TOTALS[tv][name]));
            expected[tv][name] = totalOf(TOTALS[tv][name]);
        });
        Object.entries(timeTotals).forEach(([name, v], k) => { setParam(ch, 2056 + k, m4.float(v + i)); expected[tv][name] = f32(v + i); });
    });
    expected.inputs = {};
    INPUT_VALUES.forEach((v, k) => { setParam(0, 8192 + k, m4.float(v)); expected.inputs[`X${k + 5}`] = f32(v); });
}

function setup941M4() {
    const current = { SP: 2, G1: 3.5, G2: 3.25, G3: 0, Gm1: 3.45, Gm2: 3.2, Gm3: 0, t1: 65.5, t2: 41.25, dt: 24.25, t3: 0, tx: 5,
        t4: 0, P1: 5.5, P2: 4.25, P3: 0, Px: 0, P4: 0 };
    Object.assign(expected, { EIP: 1, EIQ: 0, version: 'СПТ941.20 v1.0', protectionKey: 1, DI1: 0, DO1: 0, externalPower: 0, DI2: 1,
        NS: [0, 3], DS: [1] });
    setParam(0, 1026, m4.intU(current.SP));
    expected.SP = current.SP;
    Object.entries(current).slice(1).forEach(([name, v], k) => { setParam(0, 1027 + k, m4.float(v)); expected[name] = f32(v); });
    setParam(0, 1044, m4.flags(expected.DS, 2));
    setParam(0, 1045, m4.flags(expected.NS, 4));
    ['V1', 'V2', 'V3', 'M1', 'M2', 'M3', 'Q', 'Qg'].forEach((name, k) => {
        setParam(0, 2048 + k, m4.mixed(TOTALS.TV1[name]));
        expected[name] = totalOf(TOTALS.TV1[name]);
    });
    ['Ti', 'Tn', 'Tsh', ...Array.from({ length: 16 }, (_, i) => `ST${i + 1}`)].forEach((name, k) => {
        setParam(0, 2056 + k, m4.float(1000 + k * 0.25));
        expected[name] = f32(1000 + k * 0.25);
    });
    setParam(0, 1, m4.setting(1));
    setParam(0, 2, m4.setting(0));
    setParam(0, 58, m4.setting(serial));
    expected.ID = serial;
    expected.inputs = {};
    ['X5', 'X7', 'X9', 'X6', 'X8', 'X10', 'X12', 'X13', 'X14'].forEach((name, k) => {
        setParam(0, 8192 + k, m4.float(INPUT_VALUES[k]));
        expected.inputs[name] = f32(INPUT_VALUES[k]);
    });
    setParam(0, 8224, m4.text(expected.version));
    setParam(0, 8227, m4.intU(1));
    setParam(0, 8228, m4.intU(0));
    setParam(0, 8229, m4.intU(0));
    setParam(0, 8233, m4.intU(0));
    setParam(0, 8256, m4.intU(serial));
    setParam(0, 8259, m4.intU(1));
}

if (model === '943') setupOld943();
else if (model === '941.10') setupOld941();
else if (model === '943.1') setup943M4();
else if (model === '941.20') setup941M4();
for (const n of refused) for (const key of [...params.keys()]) if (key.endsWith(`:${n}`)) params.delete(key);
console.log(JSON.stringify({ expected }));

// ---- the line --------------------------------------------------------------
function shortReply(code, data) {
    const body = [NT, code, ...data];
    return Buffer.from([0x10, ...body, checksum(body), 0x16]);
}
function m4Reply(id, body) {
    const header = [NT, 0x90, id, 0, body.length & 0xff, body.length >> 8];
    const crc = crc16([...header, ...body]);
    return Buffer.from([0x10, ...header, ...body, crc >> 8, crc & 0xff]);
}

let requests = 0;
function handleShort(frame) {
    const [code, b1, b2, b3] = [frame[2], frame[3], frame[4], frame[5]];
    if (code === 0x3f) return [shortReply(0x3f, [...device, VX])];
    if (model === '941' || model.endsWith('.1') || model.endsWith('.20')) return [shortReply(0x21, [0x00])];
    if (code === 0x52) {
        if (b3 < 1 || b3 > 64) return [shortReply(0x21, [0x02])];
        writeClock();
        const start = b1 | (b2 << 8);
        return [shortReply(0x52, [...ram.subarray(start, start + b3)])];
    }
    if (code === 0x45) {
        const page = b1 | (b2 << 8);
        if (b3 < 1 || b3 > 64) return [shortReply(0x21, [0x02])];
        return Array.from({ length: b3 }, (_, k) => shortReply(0x45, [...flash.subarray((page + k) * 64, (page + k + 1) * 64)]));
    }
    return [shortReply(0x21, [0x00])];
}

function handleM4(frame) {
    const id = frame[3];
    const body = frame.subarray(7, frame.length - 2);
    if (body[0] === 0x3f) return [m4Reply(id, [0x3f, ...device, VX])];
    if (body[0] !== 0x72 || !params.size) return [m4Reply(id, [0x21, 0x00])];
    m4Clock();
    const out = [0x72];
    for (let i = 1; i < body.length; i += 5) {
        if (body[i] !== 0x4a || body[i + 1] !== 3) return [m4Reply(id, [0x21, 0x00])];
        const value = params.get(`${body[i + 2]}:${body[i + 3] | (body[i + 4] << 8)}`);
        if (!value) return [m4Reply(id, [0x21, 0x02])];
        out.push(value[0], value[1].length, ...value[1]);
        if (value[0] === 0x16) out.push(0x45, 1, 0); // settings carry their Operative flag
    }
    return [m4Reply(id, out)];
}

net.createServer((socket) => {
    console.error(`connection from ${socket.remoteAddress}:${socket.remotePort}`);
    let buffer = Buffer.alloc(0);
    let lastStartAt = 0, ffRun = 0, inSession = false;
    const reply = (frames) => {
        const send = () => frames.forEach((f) => { trace('<', f); socket.write(f); });
        replyDelay ? setTimeout(send, replyDelay) : send();
    };
    socket.on('data', (chunk) => {
        if (echo) socket.write(chunk);
        for (const byte of chunk) {
            if (byte === 0xff && buffer.length === 0) {
                if (++ffRun >= 16) { lastStartAt = Date.now(); inSession = false; }
                continue;
            }
            ffRun = 0;
            buffer = Buffer.concat([buffer, Buffer.from([byte])]);
            if (buffer[0] !== 0x10) { buffer = Buffer.alloc(0); continue; }
            let frame = null;
            if (buffer.length >= 3 && buffer[2] === 0x90) {
                if (buffer.length >= 7 && buffer.length === 9 + buffer.readUInt16LE(5)) frame = buffer;
            } else if (buffer.length === 9) {
                frame = buffer;
            }
            if (!frame) continue;
            buffer = Buffer.alloc(0);
            trace('>', frame);
            const isM4 = frame[2] === 0x90;
            const ok = isM4 ? crc16(frame.subarray(1)) === 0 : frame[8] === 0x16 && frame[7] === checksum(frame.subarray(1, 7));
            if (!ok || (frame[1] !== NT && frame[1] !== 0xff)) continue;
            const isSession = isM4 ? frame[7] === 0x3f : frame[2] === 0x3f;
            if (isSession && !isM4) {
                if (Date.now() - lastStartAt < 900) { console.error('session request too soon after the start sequence: ignored'); continue; }
                inSession = true;
            }
            if (!inSession) continue;
            requests++;
            if (lose && requests % lose === 0) { console.error(`request ${requests} lost`); continue; }
            reply(isM4 ? handleM4(frame) : handleShort(frame));
            if (bookHourAfter && requests === bookHourAfter) {
                console.error(`request ${requests}: hour booked into FLASH`);
                if (model === '943') {
                    bookHour(TOTALS.TV1, 0x0520, 0x424a, TOTALS_OLD_943);
                    bookHour(TOTALS.TV2, 0x0568, 0x677b, TOTALS_OLD_943);
                } else if (model === '941.10') {
                    bookHour(TOTALS.TV1, 0x0520, 0x424a, TOTALS_OLD_941);
                }
            }
        }
    });
    socket.on('error', () => {});
    socket.on('close', () => console.error('connection closed'));
}).listen(listenPort, () => console.error(`СПТ${model} emulator (NT ${NT}, serial ${serial}) on port ${listenPort}`));
