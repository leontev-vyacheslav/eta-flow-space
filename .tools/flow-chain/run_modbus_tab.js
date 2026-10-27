'use strict';
// Runs a Node-RED tab's Modbus-node chain offline: the converter functions wired from each modbus-read /
// modbus-getter node, the join, and the tab's collect-device-state, fed with register words read live by
// .tools/device-probes/modbus_rtu_dump.js. Prints the device state collect-device-state would store.
// Nothing is sent anywhere: storeDeviceStateToCacheAsync is replaced by a stub that records the call.
//
//   node .tools/flow-chain/run_modbus_tab.js TAB_LABEL WORDS.json [--mapping FILE.js] [--schema DATA-SCHEMA.json]
//
// TAB_LABEL   label of the tab in flow-space/flows.json (e.g. gagarin-boiler-room)
// WORDS.json  output of modbus_rtu_dump.js ("words": {"0x0001": "00ff", ...}); registers it lacks read as 0
// --mapping   run this file as collect-device-state instead of the one in flows.json (to test a new mapping)
// --schema    validate the state with this data schema (ajv from flow-space-ui/node_modules)

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const option = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args.splice(i, 2)[1];
};
const mappingFile = option('--mapping');
const schemaFile = option('--schema');
const [tabLabel, wordsFile] = args;
if (!tabLabel || !wordsFile) {
    console.error('usage: node run_modbus_tab.js TAB_LABEL WORDS.json [--mapping FILE.js] [--schema DATA-SCHEMA.json]');
    process.exit(2);
}

const flows = JSON.parse(fs.readFileSync(path.join(root, 'flow-space/flows.json'), 'utf8'));
const byId = new Map(flows.map((n) => [n.id, n]));
const tab = flows.find((n) => n.type === 'tab' && n.label === tabLabel);
if (!tab) throw new Error(`no tab labelled ${tabLabel}`);
const onTab = flows.filter((n) => n.z === tab.id);
const join = onTab.find((n) => n.type === 'join');
const collect = onTab.find((n) => n.type === 'function' && n.name === 'collect-device-state');
if (!join || !collect) throw new Error('the tab needs a join node and a collect-device-state function');

const dump = JSON.parse(fs.readFileSync(wordsFile, 'utf8'));
const words = new Map(Object.entries(dump.words).map(([address, value]) => [parseInt(address, 16), parseInt(value, 16)]));
const missing = [];
const read = (start, count) => Array.from({ length: count }, (_, i) => {
    if (!words.has(start + i)) missing.push(start + i);
    return words.get(start + i) ?? 0;
});

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const context = new Map();
const stored = [];
const fakeGlobal = {
    get: (key) => (key === 'helpers'
        ? { storeDeviceStateToCacheAsync: async (...call) => stored.push(call) }
        : context.get(key)),
    set: (key, value) => context.set(key, value),
};
const runFunction = (node, msg) => new AsyncFunction('msg', 'global', 'flow', 'node', 'env', 'context', node.func)(
    msg, fakeGlobal, fakeGlobal, { path: `${tab.id}/${node.id}`, id: node.id, warn: console.warn, error: console.error },
    { get: () => undefined }, fakeGlobal,
);

(async () => {
    // converters: function nodes wired from a Modbus node whose output reaches the join
    const merged = {};
    const modbusNodes = onTab.filter((n) => n.type === 'modbus-read' || n.type === 'modbus-getter')
        .sort((a, b) => Number(a.adr) - Number(b.adr));
    for (const modbus of modbusNodes) {
        const data = read(Number(modbus.adr), Number(modbus.quantity));
        const buffer = Buffer.alloc(data.length * 2);
        data.forEach((word, i) => buffer.writeUInt16BE(word, i * 2));
        for (const [output, targets] of modbus.wires.entries()) {
            for (const target of targets.map((id) => byId.get(id))) {
                if (target?.type !== 'function' || !target.wires.flat().includes(join.id)) continue;
                const result = await runFunction(target, { payload: output === 0 ? data : { data, buffer } });
                if (result?.payload && typeof result.payload === 'object') Object.assign(merged, result.payload);
            }
        }
    }

    const mapping = mappingFile ? { ...collect, func: fs.readFileSync(mappingFile, 'utf8') } : collect;
    const out = await runFunction(mapping, { payload: merged });
    const state = out?.deviceState ?? out?.payload;
    console.log(JSON.stringify({ storedAs: stored.map(([, code, , flowUid]) => ({ code, flowUid })), state }, null, 2));
    if (missing.length) console.error(`registers not in ${path.basename(wordsFile)} (read as 0): ${missing.length}`);

    if (schemaFile) {
        const Ajv2020 = require(path.join(root, 'flow-space-ui/node_modules/ajv/dist/2020')).default;
        const validate = new Ajv2020({ strict: false, allErrors: true }).compile(JSON.parse(fs.readFileSync(schemaFile, 'utf8')));
        // as the web API serves a stored state: it adds isConnected (device-state.service.ts)
        const valid = validate({ isConnected: true, ...state });
        console.error(valid ? 'schema: valid' : `schema: INVALID\n${validate.errors.map((e) => `  ${e.instancePath} ${e.message}`).join('\n')}`);
        process.exitCode = valid ? 0 : 1;
    }
})();
