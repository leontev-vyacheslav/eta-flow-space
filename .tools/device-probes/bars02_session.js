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
//   --targets FILE     JSON list of meters to read:
//                      [{ "identifier": "011276", "meter": "vkt7", "address": 1,
//                         "port": "rs232-powered", "baudRate": 9600, "parity": "none",
//                         "stopBits": 1, "wakeUpBytes": 2, "stepTimeoutMs": 15000,
//                         "responseTimeoutMs": 240000 }]
//                      (defaults as shown: GPRS replies take up to ~8 s; Cyrillic
//                      identifiers belong here)
//   --vkt7 ID@ADDRESS  a ВКТ-7 target with the default port settings; repeatable
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
const { Bars02Gateway } = require(path.join(readers, 'bars02-gateway.js'));
const { Vkt7Client } = require(path.join(readers, 'vkt7-client.js'));

const args = process.argv.slice(2);
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const listenPort = Number(option('--listen'));
if (!listenPort) {
    console.error('usage: node bars02_session.js --listen PORT [--host ADDR] [--minutes N] [--query clock,config,events] [--targets FILE] [--vkt7 ID@ADDRESS] [--every MIN] [--trace]');
    process.exit(2);
}
const minutes = Number(option('--minutes', 15));
const queries = option('--query', 'clock,config').split(',').filter(Boolean);
const everyMinutes = Number(option('--every', 0));
const tracing = args.includes('--trace');

const TARGET_DEFAULTS = {
    meter: 'vkt7', port: 'rs232-powered', baudRate: 9600, parity: 'none', stopBits: 1, wakeUpBytes: 2,
    stepTimeoutMs: 15000, responseTimeoutMs: 240000,
};
const targets = new Map();
const targetsFile = option('--targets');
if (targetsFile) {
    for (const t of JSON.parse(fs.readFileSync(targetsFile, 'utf8'))) targets.set(t.identifier, { ...TARGET_DEFAULTS, ...t });
}
args.forEach((arg, i) => {
    if (arg !== '--vkt7') return;
    const [identifier, address] = args[i + 1].split('@');
    targets.set(identifier, { ...TARGET_DEFAULTS, identifier, address: Number(address) || 0 });
});

const QUERIES = { clock: '#R;T;$', config: '#R;CA0$', events: '#R;E$' };
const out = (event, data = {}) => console.log(JSON.stringify({ time: new Date().toISOString(), event, ...data }));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const ascii = (bytes) => [...bytes].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');

const gateway = new Bars02Gateway({
    port: listenPort,
    host: option('--host'),
    trace: tracing ? (who, direction, bytes) => console.error(`${new Date().toISOString().slice(11, 23)} ${who} ${direction} ${hex(bytes)} | ${ascii(bytes)}`) : null,
});

const seen = new Map(); // identifier -> { remote, connections, signalQuality, reads, failures }

async function readMeter(target) {
    const started = Date.now();
    try {
        if (target.meter !== 'vkt7') throw new Error(`unknown meter "${target.meter}"`);
        const client = new Vkt7Client({
            address: target.address,
            wakeUpBytes: target.wakeUpBytes,
            stepTimeoutMs: target.stepTimeoutMs,
            responseTimeoutMs: target.responseTimeoutMs,
            createSocket: () => gateway.createSocket(target),
            trace: tracing ? (direction, bytes) => console.error(`${new Date().toISOString().slice(11, 23)} ${target.identifier} vkt7 ${direction} ${hex(bytes)}`) : null,
        });
        const results = await client.read();
        seen.get(target.identifier).reads++;
        out('meter', { identifier: target.identifier, meter: target.meter, seconds: (Date.now() - started) / 1000, results });
    } catch (err) {
        seen.get(target.identifier).failures++;
        out('meter-failed', { identifier: target.identifier, meter: target.meter, seconds: (Date.now() - started) / 1000, error: err.message, partialResults: err.partialResults });
    }
}

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
    const target = targets.get(identifier);
    if (target) {
        await readMeter(target);
        if (everyMinutes > 0) {
            const timer = setInterval(() => {
                if (!gateway.pool.has(identifier)) clearInterval(timer);
                else readMeter(target);
            }, everyMinutes * 60000);
        }
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
