'use strict';
// Stands in for the old system's ETA GSM device reader for a few minutes,
// read-only: listens on a port, takes every ETA GSM modem that connects
// (.docs/eta-gsm/eta-gsm-notes.md), records its hello byte for byte, reads
// its state and settings in band (Modbus at its own address after >= 1.1 s
// of silence) and reads the target meters whose line already matches the
// modem's current speed and format, with the project's readers over the
// transparent link. Never writes to a modem: no settings, no reboot.
//
//   node .tools/device-probes/eta_gsm_session.js --listen 2784 [--host ADDR] [--minutes N]
//       [--targets FILE] [--concurrency N] [--trace]
//
// --targets: JSON list [{ "identifier": "0013", "meter": "vkt7" | "km5" | "tv7" |
//   "vzljot024" | "vzljot026" | "vzljot034" | "vzljot042" | "vzljot043" | "vzljot025", "address": 1,
//   "baudRate": 9600, "parity": "none", "stopBits": 1, "wakeUpBytes": 2 }]
//
// JSON lines on stdout (hello, status, settings, keep-alive, meter, summary);
// bytes on stderr with --trace. PIN and APN password are masked.

const fs = require('fs');
const net = require('net');
const path = require('path');
const { EventEmitter } = require('events');

const repo = path.resolve(__dirname, '../..');
const readers = path.join(repo, 'flow-space-nodered-a/src/device-readers');
const CLIENTS = {
    vkt7: () => require(path.join(readers, 'vkt7-client.js')).Vkt7Client,
    km5: () => require(path.join(readers, 'km5-client.js')).Km5Client,
    tv7: () => require(path.join(readers, 'tv7-client.js')).Tv7Client,
    vzljot024: () => require(path.join(readers, 'vzljot024-client.js')).Vzljot024Client,
    vzljot026: () => require(path.join(readers, 'vzljot026-client.js')).Vzljot026Client,
    vzljot034: () => require(path.join(readers, 'vzljot034-client.js')).Vzljot034Client,
    vzljot042: () => require(path.join(readers, 'vzljot042-client.js')).Vzljot042Client,
    vzljot043: () => require(path.join(readers, 'vzljot043-client.js')).Vzljot043Client,
    vzljot025: () => require(path.join(readers, 'vzljot025-client.js')).Vzljot025Client,
};

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const listenPort = Number(option('--listen'));
if (!listenPort) {
    console.error('usage: node eta_gsm_session.js --listen PORT [--host ADDR] [--minutes N] [--targets FILE] [--concurrency N] [--trace]');
    process.exit(2);
}
const minutes = Number(option('--minutes', 20));
const concurrency = Number(option('--concurrency', 30));
const tracing = args.includes('--trace');
const targets = new Map(); // identifier -> [target]
if (option('--targets')) {
    for (const t of JSON.parse(fs.readFileSync(option('--targets'), 'utf8'))) {
        targets.set(t.identifier, [...(targets.get(t.identifier) || []), t]);
    }
}

const out = (event, data = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), event, ...data }));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const ascii = (bytes) => [...bytes].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
const trace = (who, direction, bytes) => {
    if (tracing) console.error(`${new Date().toISOString().slice(11, 23)} ${who} ${direction} ${hex(bytes)} | ${ascii(bytes)}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cp1251 = new TextDecoder('windows-1251');

function crc16(bytes) {
    let crc = 0xffff;
    for (const b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
    return crc;
}
const withCrc = (bytes) => {
    const crc = crc16(bytes);
    return Buffer.from([...bytes, crc & 0xff, crc >>> 8]);
};

// Data formats (register 0x00D2) for 8 data bits.
const FORMATS = { 0x06: '8N1', 0x0e: '8N2', 0x26: '8E1', 0x2e: '8E2', 0x36: '8O1', 0x3e: '8O2', 0x04: '7N1', 0x24: '7E1' };
const formatOf = (t) => `8${{ none: 'N', even: 'E', odd: 'O' }[t.parity || 'none']}${t.stopBits || 1}`;

// Text in the modem's registers comes byte-swapped within each 16-bit word
// ("91.144.143.40" reads as "19.141.434.04"; seen on the modems of port 2784,
// revision 100, 2026-10-28), numbers come big-endian.
function swappedText(raw) {
    const bytes = Buffer.from(raw);
    for (let i = 0; i + 1 < bytes.length; i += 2) [bytes[i], bytes[i + 1]] = [bytes[i + 1], bytes[i]];
    const end = bytes.indexOf(0);
    return cp1251.decode(end < 0 ? bytes : bytes.subarray(0, end));
}

// The settings structure (function 03), byte offsets as in the manual.
const SETTINGS_SIZE = 0xe6;
const SETTINGS_CHUNK = 20; // registers per request, the modem's limit
function parseSettings(b) {
    const u16 = (o) => b.readUInt16BE(o);
    const str = (o, n) => swappedText(b.subarray(o, o + n));
    return {
        isSetting: u16(0x00), debug: u16(0x02), modemMode: u16(0x04), modBusId: u16(0x06), myId: str(0x08, 64),
        pin: u16(0x48) ? '***' : 0, apn: str(0x4a, 32), login: str(0x6a, 20), password: str(0x7e, 20) ? '***' : '',
        listenPort: u16(0x92), servCount: u16(0x94),
        servers: [[str(0x96, 16), u16(0xa6)], [str(0xa8, 16), u16(0xb8)], [str(0xba, 16), u16(0xca)]],
        selectSerial: u16(0xcc), baudRate: u16(0xce) | (u16(0xd0) << 16), dataFormat: u16(0xd2), format: FORMATS[u16(0xd2)] || null,
        nmRetry: u16(0xd4), waitTm: u16(0xd6), sendSz: u16(0xd8), rxMode: u16(0xda), rxSize: u16(0xdc), rxTimer: u16(0xde),
        checkPeriod: u16(0xe0), timeForReconnect: u16(0xe2), rebootTime: u16(0xe4),
    };
}
const maskSettings = (b) => {
    const copy = Buffer.from(b);
    copy.fill(0, 0x48, 0x4a); // pin
    copy.fill(0, 0x7e, 0x92); // APN password
    return copy;
};

class Channel extends EventEmitter {
    constructor(modem) {
        super();
        this.modem = modem;
        this.open = false;
        this.closed = false;
    }

    connect(port, host, callback) {
        if (typeof callback === 'function') this.once('connect', callback);
        setImmediate(() => {
            if (this.closed) return;
            this.open = true;
            this.modem.channel = this;
            this.emit('connect');
        });
        return this;
    }

    write(data) {
        if (!this.open) return false;
        this.modem.touch();
        trace(this.modem.id, '>', data);
        return this.modem.socket.write(data);
    }

    destroy(err) {
        if (this.closed) return this;
        this.closed = true;
        this.open = false;
        if (this.modem.channel === this) this.modem.channel = null;
        if (err && this.listenerCount('error')) this.emit('error', err);
        this.emit('close');
        return this;
    }
}

class EtaModem {
    constructor(socket) {
        this.socket = socket;
        this.remote = `${socket.remoteAddress}:${socket.remotePort}`;
        this.id = this.remote;
        this.address = 254;
        this.buffer = Buffer.alloc(0);
        this.lastActivity = Date.now();
        this.channel = null;
        this.waiter = null;
        this.queue = Promise.resolve();
        this.closed = false;
        this.settings = null;
        this.stray = 0;
    }

    touch() {
        this.lastActivity = Date.now();
    }

    run(fn) {
        const next = this.queue.catch(() => {}).then(() => {
            if (this.closed) throw new Error(`${this.id}: connection closed`);
            return fn();
        });
        this.queue = next.catch(() => {});
        return next;
    }

    onData(chunk) {
        this.touch();
        trace(this.id, '<', chunk);
        if (this.channel) {
            this.channel.emit('data', chunk);
            return;
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (this.waiter) this.waiter();
        else this.stray += chunk.length;
    }

    // Waits for bytes until match(buffer) returns a value, or rejects after timeoutMs.
    expect(match, timeoutMs) {
        return new Promise((resolve, reject) => {
            const check = () => {
                const result = match(this.buffer);
                if (result === undefined) return;
                clearTimeout(timer);
                this.waiter = null;
                resolve(result);
            };
            const timer = setTimeout(() => {
                this.waiter = null;
                reject(new Error(`${this.id}: no reply (got ${hex(this.buffer).slice(0, 120)})`));
            }, timeoutMs);
            this.waiter = check;
            check();
        });
    }

    // One in-band Modbus read (function 3 or 4) at the modem's own address,
    // after at least 1.1 s of silence on the link. Over GPRS a reply can take
    // 15-17 s (port 2784, 2026-10-28), so wait 25 s.
    async modbusRead(fn, start, count, { timeoutMs = 25000 } = {}) {
        while (Date.now() - this.lastActivity < 1100) await sleep(1100 - (Date.now() - this.lastActivity));
        const frame = withCrc([this.address, fn, start >> 8, start & 0xff, count >> 8, count & 0xff]);
        this.buffer = Buffer.alloc(0);
        this.touch();
        trace(this.id, '>>', frame);
        this.socket.write(frame);
        return this.expect((b) => {
            for (let at = 0; at + 5 <= b.length; at++) {
                if (b[at] !== this.address) continue;
                if (b[at + 1] === (fn | 0x80) && at + 5 <= b.length && crc16(b.subarray(at, at + 3)) === b.readUInt16LE(at + 3)) {
                    throw new Error(`${this.id}: exception ${b[at + 2]} on ${fn}/${start.toString(16)}`);
                }
                const length = 5 + b[at + 2];
                if (b[at + 1] !== fn || b[at + 2] !== count * 2 || at + length > b.length) continue;
                const reply = b.subarray(at, at + length);
                if (crc16(reply.subarray(0, length - 2)) === reply.readUInt16LE(length - 2)) return Buffer.from(reply.subarray(3, length - 2));
            }
            return undefined;
        }, timeoutMs);
    }

    close(reason) {
        if (this.closed) return;
        this.closed = true;
        if (this.channel) this.channel.destroy(new Error(`${this.id}: ${reason}`));
        this.socket.destroy();
    }
}

const modems = new Map(); // identifier -> EtaModem
const seen = new Map(); // identifier -> summary
let running = 0;
const slots = [];
const slot = async () => {
    while (running >= concurrency) await new Promise((r) => slots.push(r));
    running++;
};
const release = () => {
    running--;
    const next = slots.shift();
    if (next) next();
};

async function readHello(modem) {
    // Up to three lines (identifier, CSQ, Modbus address), or 3 s of quiet.
    let quietSince = Date.now();
    let last = 0;
    const started = Date.now();
    while (Date.now() - started < 15000) {
        await sleep(100);
        if (modem.buffer.length !== last) {
            last = modem.buffer.length;
            quietSince = Date.now();
        }
        const lines = modem.buffer.toString('latin1').split(/[\r\n]+/).filter(Boolean);
        if (lines.length >= 3 && /[\r\n]$/.test(modem.buffer.toString('latin1'))) break;
        if (last && Date.now() - quietSince > 3000) break;
    }
    const raw = Buffer.from(modem.buffer);
    modem.buffer = Buffer.alloc(0);
    const lines = cp1251.decode(raw).split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const csq = lines.find((l) => /^CSQ:/.test(l));
    const address = lines.find((l, i) => i > 0 && /^\d{1,3}$/.test(l));
    return { raw, lines, identifier: lines[0], csq: csq || null, address: address ? Number(address) : null };
}

async function readMeter(modem, target) {
    const meterSettings = modem.settings;
    const wanted = formatOf(target);
    if (meterSettings && (meterSettings.baudRate !== target.baudRate || meterSettings.format !== wanted)) {
        out('meter-skipped', { identifier: modem.id, meter: target.meter, address: target.address,
            reason: `modem line ${meterSettings.baudRate} ${meterSettings.format}, meter ${target.baudRate} ${wanted} (run 2)` });
        return;
    }
    await slot();
    const started = Date.now();
    try {
        const Client = CLIENTS[target.meter]();
        const results = await modem.run(async () => {
            await sleep(500);
            const client = new Client({
                address: target.address,
                ...(target.meter === 'vkt7' ? { wakeUpBytes: target.wakeUpBytes ?? 2 } : {}),
                ...(target.meter === 'km5' ? { acceptLostAddress: true } : {}),
                stepTimeoutMs: 15000,
                responseTimeoutMs: 240000,
                createSocket: () => new Channel(modem),
                trace: tracing ? (d, bytes) => trace(`${modem.id} ${target.meter}`, d, bytes) : null,
            });
            return client.read();
        });
        seen.get(modem.id).reads++;
        out('meter', { identifier: modem.id, meter: target.meter, address: target.address, seconds: (Date.now() - started) / 1000, results });
    } catch (err) {
        seen.get(modem.id).failures++;
        out('meter-failed', { identifier: modem.id, meter: target.meter, address: target.address, seconds: (Date.now() - started) / 1000, error: err.message });
    } finally {
        release();
    }
}

async function onConnection(socket) {
    const modem = new EtaModem(socket);
    socket.setKeepAlive(true, 60000);
    socket.on('data', (chunk) => modem.onData(chunk));
    socket.on('error', () => {});
    socket.on('close', () => {
        modem.close('closed');
        if (modems.get(modem.id) === modem) {
            modems.delete(modem.id);
            out('modem-closed', { identifier: modem.id });
        }
    });
    const hello = await readHello(modem);
    out('hello', { remote: modem.remote, identifier: hello.identifier, csq: hello.csq, address: hello.address, lines: hello.lines, hex: hex(hello.raw) });
    if (!hello.identifier) {
        modem.close('no hello');
        return;
    }
    modem.id = hello.identifier;
    if (hello.address) modem.address = hello.address;
    const previous = modems.get(modem.id);
    if (previous) previous.close('replaced');
    modems.set(modem.id, modem);
    const entry = seen.get(modem.id) || { remote: modem.remote, connections: 0, reads: 0, failures: 0, target: targets.has(modem.id) };
    entry.connections++;
    seen.set(modem.id, entry);

    try {
        await modem.run(async () => {
            const status = {};
            for (const [name, start, count] of [['revision', 0x18, 1], ['signal', 0x12, 3], ['localIp', 0x02, 8]]) {
                try {
                    const data = await modem.modbusRead(4, start, count);
                    status[name] = name === 'revision' ? data.readUInt16BE(0) : swappedText(data);
                } catch (err) {
                    status[name] = `error: ${err.message}`;
                }
            }
            out('status', { identifier: modem.id, ...status });
            const chunks = [];
            for (let start = 0; start < SETTINGS_SIZE; start += SETTINGS_CHUNK * 2) {
                const count = Math.min(SETTINGS_CHUNK, (SETTINGS_SIZE - start) / 2);
                chunks.push(await modem.modbusRead(3, start, count).catch(() => modem.modbusRead(3, start, count)));
            }
            const bytes = Buffer.concat(chunks);
            modem.settings = parseSettings(bytes);
            out('settings', { identifier: modem.id, settings: modem.settings, hex: hex(maskSettings(bytes)) });
        });
    } catch (err) {
        out('settings-failed', { identifier: modem.id, error: err.message });
    }
    for (const target of targets.get(modem.id) || []) await readMeter(modem, target);
}

// Keep-alive: read register 0x0006 of idle modems every 45 s, as the old
// engine does. Like the old engine, a modem that does not answer stays
// connected; only a socket error drops it (some answer no in-band read).
setInterval(() => {
    for (const modem of modems.values()) {
        if (modem.channel || Date.now() - modem.lastActivity < 45000) continue;
        modem.run(() => modem.modbusRead(3, 0x06, 1)).then(() => {
            modem.keepAliveFailures = 0;
        }).catch((err) => {
            modem.keepAliveFailures = (modem.keepAliveFailures || 0) + 1;
            out('keep-alive-failed', { identifier: modem.id, failures: modem.keepAliveFailures, error: err.message });
        });
    }
}, 15000);

const server = net.createServer((socket) => onConnection(socket).catch((err) => out('error', { error: err.message })));
server.on('error', (err) => {
    out('listen-failed', { error: err.message });
    process.exit(1);
});
server.listen(listenPort, option('--host'), () => {
    out('listening', { port: listenPort, host: option('--host') || '*', minutes, targets: targets.size });
    setTimeout(finish, minutes * 60000);
});

function finish() {
    out('summary', {
        modems: seen.size,
        stillConnected: modems.size,
        reads: [...seen.values()].reduce((s, e) => s + e.reads, 0),
        failures: [...seen.values()].reduce((s, e) => s + e.failures, 0),
        targetsSeen: [...targets.keys()].filter((id) => seen.has(id)).length,
        targets: targets.size,
    });
    for (const modem of modems.values()) modem.close('session over');
    server.close();
    setTimeout(() => process.exit(0), 500);
}
process.on('SIGINT', finish);
process.on('SIGTERM', finish);
