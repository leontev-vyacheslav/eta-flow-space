'use strict';
// Stands in for a dispatch server for GPRS modems (БАРС-02, ETA GSM; was
// bars02_session.js) for a few minutes, with the project's gateway
// (flow-space/src/device-readers/gprs-modem-gateway.js): takes every modem
// that connects, asks each one read-only questions (БАРС-02: --query; ETA
// GSM: its status) and reads the meters given as targets through the modem,
// with the project's own readers. Used on the old system's server while its
// device reader for that port is stopped, so the modems that connect there
// come to us instead.
//
//   node .tools/device-probes/gprs_session.js --listen 2907 [options]
//
// Options:
//   --host ADDR        local address to listen on (default: all)
//   --protocols LIST   modem types to accept, comma-separated: bars02 (default), eta-gsm
//   --concurrency N    meter reads at a time over all modems (default 30)
//   --no-line-changes  ETA GSM: never set a modem's speed/format; a meter on another line fails
//   --minutes N        stop after N minutes (default 15)
//   --query LIST       read-only questions to every modem, comma-separated:
//                      clock (#R;T;$), config (#R;CA0$), events (#R;E$, not
//                      acknowledged, so the modem keeps its list); default clock,config
//   --targets FILE     JSON list of meters to read, several per modem allowed:
//                      [{ "identifier": "011276", "meter": "vkt7", "address": 1,
//                         "port": "rs232-powered", "baudRate": 9600, "parity": "none",
//                         "stopBits": 1, "wakeUpBytes": 2, "stepTimeoutMs": 15000,
//                         "responseTimeoutMs": 240000 },
//                       { "identifier": "Строителей_15", "meter": "km5", "address": 319147 }]
//                      meter "vkt7" (default line rs232-powered 9600 8N1), "km5"
//                      (КМ-5 and РМ-5, address = factory number, default line rs485
//                      9600 8N1), "tv7" (rs232-powered 9600 8N1), "vzljot024",
//                      "vzljot026", "vzljot034", "vzljot042", "vzljot043" (rs485) or "spt941",
//                      "spt943" (Логика; address = NT, default 1, may be 0;
//                      "serialNumber" checks ИД / the serial number;
//                      rs232-powered 9600 8N1); timeouts as shown
//                      (GPRS replies take up to ~8 s); "retries" overrides the
//                      reader's; "selectPort": false for old-firmware units (the old
//                      engine never sends them #W;P...); Cyrillic identifiers belong here
//   --vkt7 ID@ADDRESS, --km5 ID@ADDRESS, --tv7 ID@ADDRESS  a target with the default line; repeatable
//   --every MIN        read the targets again every MIN minutes (default: once per connection)
//   --trace            print every byte exchanged to stderr
//
// Never writes the configuration or the clock. Writes what the gateway does
// in normal work: the БАРС-02 event acknowledgement, and an ETA GSM's speed
// and format (not saved) when a target meter's line differs.
// Prints JSON lines to stdout (connections, replies, meter readings, a
// summary at the end).

const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '../..');
const readers = path.join(repo, 'flow-space/src/device-readers');
const { GprsModemGateway } = require(path.join(readers, 'gprs-modem-gateway.js'));
const PROTOCOLS = { 'bars02': require(path.join(readers, 'bars02-protocol.js')), 'eta-gsm': require(path.join(readers, 'eta-gsm-protocol.js')) };
const { Vkt7Client } = require(path.join(readers, 'vkt7-client.js'));
const { Km5Client } = require(path.join(readers, 'km5-client.js'));
const { Tv7Client } = require(path.join(readers, 'tv7-client.js'));
const readerClass = (file, name) => require(path.join(readers, file))[name];

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const listenPort = Number(option('--listen'));
if (!listenPort) {
    console.error('usage: node gprs_session.js --listen PORT [--host ADDR] [--protocols bars02,eta-gsm] [--minutes N] [--query clock,config,events] [--targets FILE] [--vkt7|--km5|--tv7 ID@ADDRESS] [--every MIN] [--concurrency N] [--no-line-changes] [--trace]');
    process.exit(2);
}
const minutes = Number(option('--minutes', 15));
const queries = option('--query', 'clock,config').split(',').filter(Boolean);
const everyMinutes = Number(option('--every', 0));
const tracing = args.includes('--trace');
const protocols = option('--protocols', 'bars02').split(',').map((name) => PROTOCOLS[name.trim()]);
if (protocols.some((p) => !p)) throw new Error(`--protocols: bars02, eta-gsm`);
const concurrency = Number(option('--concurrency', 30));

// The readers the session can run, with the line the old dispatch system
// sets for them.
const METERS = {
    vkt7: { Client: Vkt7Client, line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address, wakeUpBytes: t.wakeUpBytes ?? 2 }) },
    km5: { Client: Km5Client, line: { port: 'rs485' }, options: (t) => ({ address: t.address, acceptLostAddress: t.acceptLostAddress ?? true }) },
    tv7: { Client: Tv7Client, line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address || 1 }) },
    vzljot024: { Client: readerClass('vzljot024-client.js', 'Vzljot024Client'), line: { port: 'rs485' }, options: (t) => ({ address: t.address || 1 }) },
    vzljot026: { Client: readerClass('vzljot026-client.js', 'Vzljot026Client'), line: { port: 'rs485' }, options: (t) => ({ address: t.address || 1 }) },
    vzljot034: { Client: readerClass('vzljot034-client.js', 'Vzljot034Client'), line: { port: 'rs485' }, options: (t) => ({ address: t.address || 1 }) },
    vzljot042: { Client: readerClass('vzljot042-client.js', 'Vzljot042Client'), line: { port: 'rs485' }, options: (t) => ({ address: t.address || 1 }) },
    vzljot043: { Client: readerClass('vzljot043-client.js', 'Vzljot043Client'), line: { port: 'rs485' }, options: (t) => ({ address: t.address || 1 }) },
    spt941: { Client: readerClass('spt941-client.js', 'Spt941Client'), line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address ?? 1, serialNumber: t.serialNumber ?? null }) },
    spt943: { Client: readerClass('spt943-client.js', 'Spt943Client'), line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address ?? 1, serialNumber: t.serialNumber ?? null }) },
};
const TARGET_DEFAULTS = { baudRate: 9600, parity: 'none', stopBits: 1, stepTimeoutMs: 15000, responseTimeoutMs: 240000 };
const targets = new Map(); // identifier -> [target]
const addTarget = (t) => {
    const meter = t.meter || 'vkt7';
    if (!METERS[meter]) throw new Error(`unknown meter "${meter}"`);
    targets.set(t.identifier, [...(targets.get(t.identifier) || []), { ...TARGET_DEFAULTS, ...METERS[meter].line, ...t, meter }]);
};
const targetsFile = option('--targets');
if (targetsFile) JSON.parse(fs.readFileSync(targetsFile, 'utf8')).forEach(addTarget);
args.forEach((arg, i) => {
    if (!['--vkt7', '--km5', '--tv7'].includes(arg)) return;
    const [identifier, address] = args[i + 1].split('@');
    addTarget({ identifier, meter: arg.slice(2), address: Number(address) || 0 });
});

const QUERIES = { clock: '#R;T;$', config: '#R;CA0$', events: '#R;E$' };
const out = (event, data = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), event, ...data }));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const ascii = (bytes) => [...bytes].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');

const gateway = new GprsModemGateway({
    protocols,
    lineChanges: !args.includes('--no-line-changes'),
    port: listenPort,
    host: option('--host'),
    trace: tracing ? (who, direction, bytes) => console.error(`${new Date().toISOString().slice(11, 23)} ${who} ${direction} ${hex(bytes)} | ${ascii(bytes)}`) : null,
});

const seen = new Map(); // identifier -> { remote, connections, signalQuality, reads, failures }

let running = 0;
const waiting = [];
async function readMeter(target) {
    while (running >= concurrency) await new Promise((r) => waiting.push(r));
    running++;
    try {
        await readMeterNow(target);
    } finally {
        running--;
        if (waiting.length) waiting.shift()();
    }
}

async function readMeterNow(target) {
    const started = Date.now();
    const { identifier, meter, address } = target;
    try {
        const { Client, options } = METERS[meter];
        const client = new Client({
            ...options(target),
            stepTimeoutMs: target.stepTimeoutMs,
            responseTimeoutMs: target.responseTimeoutMs,
            ...(target.retries !== undefined ? { retries: target.retries } : {}),
            createSocket: () => gateway.createSocket(target),
            trace: tracing ? (direction, bytes) => console.error(`${new Date().toISOString().slice(11, 23)} ${identifier} ${meter} ${direction} ${hex(bytes)}`) : null,
        });
        const results = await client.read();
        seen.get(identifier).reads++;
        out('meter', { identifier, meter, address, seconds: (Date.now() - started) / 1000, results });
    } catch (err) {
        seen.get(identifier).failures++;
        out('meter-failed', { identifier, meter, address, seconds: (Date.now() - started) / 1000, error: err.message, partialResults: err.partialResults });
    }
}

// The meters of one modem, one after another (the gateway would queue them anyway).
async function readMeters(identifier) {
    for (const target of targets.get(identifier) || []) await readMeter(target);
}
const repeats = new Map(); // identifier -> interval timer

async function onModem({ identifier, type, remote }) {
    const entry = seen.get(identifier) || { remote, connections: 0, signalQuality: null, reads: 0, failures: 0, replies: {} };
    entry.remote = remote;
    entry.connections++;
    seen.set(identifier, entry);
    out('modem', { identifier, type, remote, target: targets.has(identifier) });
    if (type === 'eta-gsm') {
        try {
            const status = await gateway.query(identifier, 'status');
            entry.signalQuality = status.signal;
            out('status', { identifier, ...status });
        } catch (err) {
            out('query-failed', { identifier, error: err.message });
        }
    } else try {
        const { signalQuality } = await gateway.query(identifier, null);
        entry.signalQuality = signalQuality;
        out('signal', { identifier, signalQuality });
        for (const name of queries) {
            const { reply } = await gateway.query(identifier, QUERIES[name]);
            entry.replies[name] = reply;
            out('reply', { identifier, query: name, reply });
        }
    } catch (err) {
        out('query-failed', { identifier, error: err.message });
    }
    if (!targets.has(identifier)) return;
    await readMeters(identifier);
    if (everyMinutes > 0 && !repeats.has(identifier)) {
        repeats.set(identifier, setInterval(() => {
            if (gateway.pool.has(identifier)) readMeters(identifier);
        }, everyMinutes * 60000));
    }
}

gateway.on('modem', (m) => onModem(m));
gateway.on('modem-closed', (m) => out('modem-closed', m));
gateway.on('unsolicited', (m) => out('unsolicited', m));
gateway.on('log', (text) => out('log', { text }));

let stopping = false;
async function finish() {
    if (stopping) return;
    stopping = true;
    out('summary', {
        modems: [...seen.entries()].map(([identifier, e]) => ({ identifier, ...e, replies: undefined })),
        stillConnected: gateway.modems().map((m) => m.identifier),
        targetsNotSeen: [...targets.keys()].filter((id) => !seen.has(id)),
    });
    await gateway.stop();
    process.exit(0);
}
process.on('SIGINT', finish);
process.on('SIGTERM', finish);

gateway.start()
    .then(() => {
        out('listening', { port: listenPort, host: option('--host') || '*', minutes, queries, targets: [...targets.keys()] });
        setTimeout(finish, minutes * 60000);
    })
    .catch((err) => {
        out('listen-failed', { error: err.message });
        process.exit(1);
    });
