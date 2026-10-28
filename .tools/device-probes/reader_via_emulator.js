'use strict';
// Reads a meter twice with one of the project's readers: directly (host:port,
// as through a Moxa or Wiznet) and through the БАРС-02 gateway, with
// bars02_emulator.js relaying the transparent channel to the same meter.
// Prints both durations and the fields that differ, so a reader's GPRS path
// (createSocket) can be checked without a real modem.
//
//   node .tools/device-probes/reader_via_emulator.js READER HOST PORT [OPTIONS_JSON] [--trace]
//
//   READER        file name in flow-space/src/device-readers, e.g. irvis-client.js
//   OPTIONS_JSON  reader options besides the transport, e.g. '{"address":104}'
//
// Fields that change between two reads (clocks, flow rates, temperatures)
// differ; identities (serial number, firmware, model) and the set of fields
// must not.

const path = require('path');
const { spawn } = require('child_process');

const repo = path.resolve(__dirname, '../..');
const readers = path.join(repo, 'flow-space/src/device-readers');
const { Bars02Gateway } = require(path.join(readers, 'bars02-gateway.js'));

const [readerFile, host, port, optionsJson] = process.argv.slice(2).filter((a) => a !== '--trace');
const tracing = process.argv.includes('--trace');
if (!readerFile || !host || !port) {
    console.error('usage: node reader_via_emulator.js READER HOST PORT [OPTIONS_JSON] [--trace]');
    process.exit(2);
}
const module_ = require(path.join(readers, readerFile));
const Client = Object.values(module_).find((value) => typeof value === 'function' && /Client$/.test(value.name));
const options = optionsJson ? JSON.parse(optionsJson) : {};
const listenPort = 29000 + Math.floor(Math.random() * 900);

// Flattens nested results to "a.b.c" keys for the comparison.
const flatten = (value, prefix = '', out = {}) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const [key, inner] of Object.entries(value)) flatten(inner, prefix ? `${prefix}.${key}` : key, out);
    } else {
        out[prefix] = value;
    }
    return out;
};

const timed = async (label, client) => {
    const started = Date.now();
    try {
        const results = await client.read();
        console.log(`${label}: OK in ${(Date.now() - started) / 1000} s`);
        return flatten(results);
    } catch (err) {
        console.log(`${label}: FAILED in ${(Date.now() - started) / 1000} s: ${err.message}`);
        return null;
    }
};

(async () => {
    const direct = await timed('direct', new Client({ host, port: Number(port), ...options }));

    const gateway = new Bars02Gateway({ port: listenPort, host: '127.0.0.1' });
    await gateway.start();
    const connected = new Promise((resolve) => gateway.once('modem', resolve));
    const emulator = spawn(process.execPath, [path.join(__dirname, 'bars02_emulator.js'), '127.0.0.1', String(listenPort),
        '--id', 'TEST', '--meter', `${host}:${port}`, ...(tracing ? ['--trace'] : [])], { stdio: ['ignore', 'ignore', tracing ? 'inherit' : 'ignore'] });
    await connected;
    const viaGateway = await timed('via БАРС-02 gateway', new Client({
        ...options,
        stepTimeoutMs: Math.max(options.stepTimeoutMs || 0, 5000),
        createSocket: () => gateway.createSocket({ identifier: 'TEST', port: 'rs485', baudRate: 9600 }),
    }));
    emulator.kill();
    await gateway.stop();

    if (direct && viaGateway) {
        const keys = new Set([...Object.keys(direct), ...Object.keys(viaGateway)]);
        const onlyOne = [...keys].filter((k) => !(k in direct) || !(k in viaGateway));
        const differ = [...keys].filter((k) => k in direct && k in viaGateway && JSON.stringify(direct[k]) !== JSON.stringify(viaGateway[k]));
        console.log(`fields: ${keys.size}; missing in one of the reads: ${onlyOne.length ? onlyOne.join(', ') : 'none'}`);
        console.log(`differing values (${differ.length}): ${differ.slice(0, 12).map((k) => `${k} ${JSON.stringify(direct[k])} → ${JSON.stringify(viaGateway[k])}`).join('; ')}${differ.length > 12 ? ' …' : ''}`);
    }
    process.exit(direct && viaGateway ? 0 : 1);
})().catch((err) => {
    console.error(err);
    process.exit(1);
});
