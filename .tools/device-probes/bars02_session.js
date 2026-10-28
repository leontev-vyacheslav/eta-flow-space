'use strict';
// Stands in for a dispatch server for БАРС-02 units for a few minutes: listens
// on a port, confirms every modem that connects, asks each one read-only
// questions and reads the meters given as targets through the modem, with
// the project's own readers (flow-space/src/device-readers). Used on the old
// system's server while its device reader for that port is stopped, so the
// modems that connect there come to us instead.
//
//   node .tools/device-probes/bars02_session.js --listen 2907 [options]
//
// Options:
//   --host ADDR        local address to listen on (default: all)
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
//                      9600 8N1) or "tv7" (rs232-powered 9600 8N1); timeouts as shown
//                      (GPRS replies take up to ~8 s); "retries" overrides the
//                      reader's; "selectPort": false for old-firmware units (the old
//                      engine never sends them #W;P...); Cyrillic identifiers belong here
//   --vkt7 ID@ADDRESS, --km5 ID@ADDRESS, --tv7 ID@ADDRESS  a target with the default line; repeatable
//   --every MIN        read the targets again every MIN minutes (default: once per connection)
//   --trace            print every byte exchanged to stderr
//
// Never writes the configuration, the clock or the event acknowledgement.
// Prints JSON lines to stdout (connections, replies, meter readings, a
// summary at the end).

const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '../..');
const readers = path.join(repo, 'flow-space/src/device-readers');
const { GprsModemGateway } = require(path.join(readers, 'gprs-modem-gateway.js'));
const bars02 = require(path.join(readers, 'bars02-protocol.js'));
const { Vkt7Client } = require(path.join(readers, 'vkt7-client.js'));
const { Km5Client } = require(path.join(readers, 'km5-client.js'));
const { Tv7Client } = require(path.join(readers, 'tv7-client.js'));

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const listenPort = Number(option('--listen'));
if (!listenPort) {
    console.error('usage: node bars02_session.js --listen PORT [--host ADDR] [--minutes N] [--query clock,config,events] [--targets FILE] [--vkt7|--km5|--tv7 ID@ADDRESS] [--every MIN] [--trace]');
    process.exit(2);
}
const minutes = Number(option('--minutes', 15));
const queries = option('--query', 'clock,config').split(',').filter(Boolean);
const everyMinutes = Number(option('--every', 0));
const tracing = args.includes('--trace');

// The readers the session can run, with the line the old dispatch system
// sets for them.
const METERS = {
    vkt7: { Client: Vkt7Client, line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address, wakeUpBytes: t.wakeUpBytes ?? 2 }) },
    km5: { Client: Km5Client, line: { port: 'rs485' }, options: (t) => ({ address: t.address, acceptLostAddress: t.acceptLostAddress ?? true }) },
    tv7: { Client: Tv7Client, line: { port: 'rs232-powered' }, options: (t) => ({ address: t.address || 1 }) },
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
    protocols: [bars02],
    port: listenPort,
    host: option('--host'),
    trace: tracing ? (who, direction, bytes) => console.error(`${new Date().toISOString().slice(11, 23)} ${who} ${direction} ${hex(bytes)} | ${ascii(bytes)}`) : null,
});

const seen = new Map(); // identifier -> { remote, connections, signalQuality, reads, failures }

async function readMeter(target) {
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

async function onModem({ identifier, remote }) {
    const entry = seen.get(identifier) || { remote, connections: 0, signalQuality: null, reads: 0, failures: 0, replies: {} };
    entry.remote = remote;
    entry.connections++;
    seen.set(identifier, entry);
    out('modem', { identifier, remote, target: targets.has(identifier) });
    try {
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
