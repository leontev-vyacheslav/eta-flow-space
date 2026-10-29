'use strict';
// Read-only dump of Modbus RTU registers through a transparent TCP-serial
// gateway (Moxa NPort, WIZ108SR...), for the first contact with a meter
// before (and while) its reader is written. No dependencies, so it also runs
// from stdin inside the Node-RED container:
//
//   docker exec -i eta-flow-space node - HOST PORT [options] < .tools/device-probes/modbus_rtu_dump.js
//   node .tools/device-probes/modbus_rtu_dump.js HOST PORT [options]
//
// Options:
//   --address N         Modbus address (default 1)
//   --find-address A-B  try function 0x11 on every address of the range first, use the first that answers
//   --function N        3 (holding), 4 (input, default), or 1/2 (coils/discrete inputs: bits; no scan)
//   --blocks FILE       read the BLOCKS exported by a reader module (e.g. /data/src/device-readers/vzljot024-client.js)
//   --range START-END   extra range, hex or decimal, END inclusive; repeatable
//   --max N             split ranges into requests of at most N registers (default 100; even from 0x8000 up)
//   --listen MS         listen without sending first, to see another master on the line (default 3000)
//   --delay MS          pause after every reply (default 150)
//   --timeout MS        wait for one reply (default 2000)
//   --trace             print every frame to stderr
//
// A request that fails (exception or no valid reply) is retried once, then
// scanned register by register (pairs from 0x8000 up, groups of four when a
// pair answers exception 3/4), so the output names every hole. Replies are
// accepted only from the requested address and function with a valid CRC and
// the exact length; anything else on the line is counted as foreign.
// Prints JSON to stdout: identity, timings, holes and the register words.

const net = require('net');

const args = process.argv.slice(2);
const host = args.shift();
const port = Number(args.shift());
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const parseNumber = (text) => (/^0x/i.test(text) ? parseInt(text, 16) : Number(text));
const ranges = [];
args.forEach((arg, i) => {
    if (arg !== '--range') return;
    const [start, end] = args[i + 1].split('-').map(parseNumber);
    ranges.push({ start, count: end - start + 1 });
});
if (option('--blocks')) ranges.push(...require(option('--blocks')).BLOCKS);
const fn = Number(option('--function', 4));
const maxCount = Number(option('--max', 100));
const delayMs = Number(option('--delay', 150));
const timeoutMs = Number(option('--timeout', 2000));
const trace = args.includes('--trace');

if (!host || !port) {
    console.error('usage: node modbus_rtu_dump.js HOST PORT [--address N] [--blocks FILE] [--range START-END] ...');
    process.exit(2);
}

function crc16(bytes) {
    let crc = 0xffff;
    for (const b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
    return crc;
}
const crcOk = (frame) => crc16(frame.subarray(0, frame.length - 2)) === frame.readUInt16LE(frame.length - 2);
const withCrc = (body) => {
    const crc = crc16(body);
    return Buffer.concat([body, Buffer.from([crc & 0xff, crc >> 8])]);
};
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const hex4 = (n) => `0x${n.toString(16).padStart(4, '0')}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const socket = net.connect(port, host);
let buffer = Buffer.alloc(0);
let pending = null;
let foreignBytes = 0;
let listening = true;

socket.on('data', (chunk) => {
    if (trace) console.error('<', hex(chunk));
    if (listening) {
        foreignBytes += chunk.length;
        return;
    }
    buffer = Buffer.concat([buffer, chunk]);
    check();
});
socket.on('error', (err) => {
    console.error('socket error:', err.message);
    process.exit(1);
});

function check() {
    if (!pending) return;
    const { frame, address, dataLength } = pending;
    if (buffer.length >= frame.length && buffer.subarray(0, frame.length).equals(frame)) {
        buffer = buffer.subarray(frame.length);
    }
    for (let at = 0; at + 5 <= buffer.length; at++) {
        if (buffer[at] !== address) continue;
        const exception = buffer.subarray(at, at + 5);
        if (exception[1] === (frame[1] | 0x80) && crcOk(exception)) return done({ exception: exception[2] });
        if (buffer[at + 1] !== frame[1]) continue;
        const count = buffer[at + 2];
        if (dataLength !== null && count !== dataLength) continue;
        const reply = buffer.subarray(at, at + 5 + count);
        if (reply.length === 5 + count && crcOk(reply)) return done({ data: Buffer.from(reply.subarray(3, 3 + count)) });
    }
    return null;
}

function done(result) {
    const current = pending;
    pending = null;
    clearTimeout(current.timer);
    current.resolve(result);
}

// Resolves with { data } | { exception } | { timeout }, never rejects.
function request(address, body, dataLength, waitMs = timeoutMs) {
    return new Promise((resolve) => {
        const frame = withCrc(Buffer.from([address, ...body]));
        buffer = Buffer.alloc(0);
        pending = { frame, address, dataLength, resolve, timer: setTimeout(() => done({ timeout: true }), waitMs) };
        if (trace) console.error('>', hex(frame));
        socket.write(frame);
    }).then(async (result) => {
        await sleep(delayMs);
        return result;
    });
}

// Bit replies are taken at any length: the Взлёт ТСРВ-023 sends count / 8 + 1
// bytes, one too many when the count is a multiple of 8.
const readsBits = fn === 1 || fn === 2;
const readRegisters = (address, start, count) => request(address,
    [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], readsBits ? null : count * 2);
const describe = (result) => (result.timeout ? 'no reply' : `exception ${result.exception}`);

// A slow device may still answer the first attempt after the repeat was
// sent (Взлёт ТСРВ-034: replies after 1-4 s): wait out that late reply, so it
// is dropped instead of being taken for the next request's reply.
async function readWithRetry(address, start, count) {
    const first = await readRegisters(address, start, count);
    if (first.data || first.exception === 2) return first;
    const second = await readRegisters(address, start, count);
    await sleep(timeoutMs);
    return second;
}

async function main() {
    await new Promise((resolve) => socket.once('connect', resolve));
    const output = { host, port, function: fn, startedAt: new Date().toString() };

    await sleep(Number(option('--listen', 3000)));
    listening = false;
    output.foreignBytesWhileListening = foreignBytes;

    let address = Number(option('--address', 1));
    if (option('--find-address')) {
        const [from, to] = option('--find-address').split('-').map(Number);
        address = null;
        for (let a = from; a <= to && address === null; a++) {
            const result = await request(a, [0x11], null, 600);
            if (!result.timeout) address = a;
        }
        if (address === null) {
            output.error = `no address in ${option('--find-address')} answered function 0x11`;
            console.log(JSON.stringify(output, null, 2));
            socket.destroy();
            return;
        }
    }
    output.address = address;

    // The first request after a connect is often lost (Maestro modems).
    let id = await request(address, [0x11], null);
    if (id.timeout) {
        id = await request(address, [0x11], null);
        await sleep(timeoutMs);
    }
    output.reportId = id.data
        ? { hex: hex(id.data), text: id.data.toString('latin1').replace(/[^\x20-\x7e]+/g, ' ').trim() }
        : { error: describe(id) };

    // From 0x8000 up the values take two registers, and some meters (ТСРВ-043)
    // refuse a request that splits one: split there on an even count.
    const requests = [];
    for (const range of ranges) {
        const step = !readsBits && range.start >= 0x8000 ? maxCount - (maxCount % 2) : maxCount;
        for (let start = range.start; start < range.start + range.count; start += step) {
            requests.push({ start, count: Math.min(step, range.start + range.count - start) });
        }
    }

    output.blocks = [];
    output.holes = [];
    output.words = {};
    // Bits (functions 1, 2) go out as the numbers of the set bits.
    if (readsBits) output.setBits = [];
    const keep = (start, data, count) => {
        if (readsBits) {
            for (let i = 0; i < count; i++) if (data[i >> 3] & (1 << (i & 7))) output.setBits.push(start + i);
            return;
        }
        for (let i = 0; i < data.length / 2; i++) output.words[hex4(start + i)] = data.readUInt16BE(i * 2).toString(16).padStart(4, '0');
    };
    const started = Date.now();
    for (const { start, count } of requests) {
        const t0 = Date.now();
        const result = await readWithRetry(address, start, count);
        output.blocks.push({ start: hex4(start), count, ms: Date.now() - t0, result: result.data ? 'ok' : describe(result) });
        if (result.data) {
            keep(start, result.data, count);
            continue;
        }
        if (readsBits) continue;
        // Scan the failed block: single registers below 0x8000, pairs above.
        const unit = start >= 0x8000 ? 2 : 1;
        for (let at = start; at < start + count; at += unit) {
            const one = await readWithRetry(address, at, unit);
            if (one.data) {
                keep(at, one.data);
                continue;
            }
            // A pair of a long+float total may need its whole group of four
            // (the groups are not 4-aligned: WΣ of the ТСРВ-024М is 0xC0AE).
            if (unit === 2 && (one.exception === 3 || one.exception === 4)) {
                const forward = await readWithRetry(address, at, 4);
                if (forward.data) {
                    keep(at, forward.data);
                    at += 2;
                    continue;
                }
                const back = await readWithRetry(address, at - 2, 4);
                if (back.data) {
                    keep(at - 2, back.data);
                    continue;
                }
            }
            output.holes.push({ address: hex4(at), count: unit, result: describe(one) });
        }
    }
    output.registersRead = Object.keys(output.words).length;
    output.totalMs = Date.now() - started;
    console.log(JSON.stringify(output, null, 2));
    socket.destroy();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
