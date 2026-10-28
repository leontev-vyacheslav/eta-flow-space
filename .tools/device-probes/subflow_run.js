'use strict';
// Runs a reader subflow's code from flow-space/flows.json the way Node-RED
// would: its On Start, then its function with one input message, with env
// (the subflow's defaults, then the given values) and the functionGlobalContext
// readers of flow-space/settings.js. Prints what the node sends or reports.
//
//   node .tools/device-probes/subflow_run.js "<subflow name>" ['<env json>'] [--emulator METER_HOST:METER_PORT]
//       [--modem bars02|eta-gsm] [--line "4800 8N2"]
//
// --emulator reads through the GPRS modem gateway: it sets GPRS_MODEM_ID,
// listens on a free local port and lets gprs_modem_emulator.js (a БАРС-02 by
// default, --modem eta-gsm for an ETA GSM; --line: the ETA GSM's line before
// the read) relay the transparent channel to the meter at METER_HOST:METER_PORT.
//
// Examples:
//   node .tools/device-probes/subflow_run.js "VKT7 Client"
//   node .tools/device-probes/subflow_run.js "KM5 Client" '{"HOST":"78.138.147.158","PORT":"5010","ADDRESS":"413498"}' --emulator 78.138.147.158:5010

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repo = path.resolve(__dirname, '../..');
const flowSpace = path.join(repo, 'flow-space');
const args = process.argv.slice(2);
const emulatorAt = args.indexOf('--emulator');
const meter = emulatorAt >= 0 ? args.splice(emulatorAt, 2)[1] : null;
const takeOption = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? null : args.splice(i, 2)[1];
};
const modemType = takeOption('--modem') || 'bars02';
const modemLine = takeOption('--line');
const [subflowName, envJson] = args;
if (!subflowName) {
    console.error('usage: node subflow_run.js "<subflow name>" [\'<env json>\'] [--emulator METER_HOST:METER_PORT]');
    process.exit(2);
}

const values = envJson ? JSON.parse(envJson) : {};
if (meter) {
    process.env.GPRS_LISTEN_PORT = String(29000 + Math.floor(Math.random() * 900));
    values.GPRS_MODEM_ID = values.GPRS_MODEM_ID || 'TEST';
}

// The readers settings.js puts on functionGlobalContext.
const settings = fs.readFileSync(path.join(flowSpace, 'settings.js'), 'utf8');
const globals = {};
for (const [, name, file] of settings.matchAll(/^\s*(\w+): require\('(\.\/src\/device-readers\/[\w.-]+)'\)/gm)) {
    globals[name] = require(path.join(flowSpace, file));
}

const flows = JSON.parse(fs.readFileSync(path.join(flowSpace, 'flows.json'), 'utf8'));
const subflow = flows.find((n) => n.type === 'subflow' && n.name === subflowName);
if (!subflow) {
    console.error(`no subflow "${subflowName}"`);
    process.exit(2);
}
const fn = flows.find((n) => n.z === subflow.id && n.type === 'function');
const defaults = Object.fromEntries(subflow.env.map((e) => [e.name, e.value]));
const env = { get: (key) => (key in values ? values[key] : defaults[key]) };
const global = { get: (key) => globals[key] };
const started = Date.now();
const seconds = () => (Date.now() - started) / 1000;
const node = {
    send: (msg) => {
        const flat = JSON.stringify(msg.payload);
        console.log(`SENT after ${seconds()} s: ${Object.keys(msg.payload).length} top-level fields, ${flat.length} bytes: ${flat.slice(0, 200)}…`);
        finish(0);
    },
    status: (status) => console.log(`status ${JSON.stringify(status)}`),
    error: (err) => {
        console.log(`node.error after ${seconds()} s: ${err}`);
        finish(1);
    },
    warn: (text) => console.log(`node.warn ${text}`),
    log: (text) => console.log(`node.log ${text}`),
};

let emulator = null;
function finish(code) {
    if (emulator) emulator.kill();
    process.exit(code);
}

(async () => {
    new Function('env', 'global', 'node', fn.initialize || '')(env, global, node);
    if (meter) {
        await globals.gprsModems.start();
        emulator = spawn(process.execPath, [path.join(__dirname, 'gprs_modem_emulator.js'), '127.0.0.1', process.env.GPRS_LISTEN_PORT,
            '--id', values.GPRS_MODEM_ID, '--modem', modemType, '--meter', meter, ...(modemLine ? ['--line', modemLine] : [])], { stdio: 'ignore' });
        while (!globals.gprsModems.modems().some((m) => m.identifier === values.GPRS_MODEM_ID)) {
            await new Promise((r) => setTimeout(r, 200));
        }
        console.log(`modem ${values.GPRS_MODEM_ID} connected to :${process.env.GPRS_LISTEN_PORT}, relaying to ${meter}`);
    }
    new Function('msg', 'env', 'global', 'node', fn.func)({ payload: Date.now() }, env, global, node);
})().catch((err) => {
    console.error(err);
    finish(1);
});
