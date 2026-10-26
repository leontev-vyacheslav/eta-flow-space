'use strict';
// A pretend БАРС-02, for testing the gateway without a real unit: connects to
// a dispatch server, sends its identifier, answers the command protocol the
// old ETA engine uses (escape, port selection, clock, configuration, event
// list) and in transparent mode relays the bytes to a real meter behind a
// TCP-serial gateway, so a reader runs end to end on real replies.
//
//   node .tools/device-probes/bars02_emulator.js SERVER_HOST SERVER_PORT --id IDENT [--meter HOST:PORT] [--csq N] [--trace]
//
// The replies follow .docs/bars02/bars02-notes.md; the configuration text is
// made up (the real key layout of #R;CA0$ is not known yet).

const net = require('net');

const args = process.argv.slice(2);
const [serverHost, serverPort] = args;
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const identifier = option('--id', 'EMULATOR');
const meter = option('--meter');
const csq = Number(option('--csq', 21));
const tracing = args.includes('--trace');
if (!serverHost || !serverPort) {
    console.error('usage: node bars02_emulator.js SERVER_HOST SERVER_PORT --id IDENT [--meter HOST:PORT] [--csq N] [--trace]');
    process.exit(2);
}

const ESCAPE = '~~~^^^~~~';
const log = (...items) => console.error(new Date().toISOString().slice(11, 23), ...items);
const show = (bytes) => JSON.stringify(Buffer.from(bytes).toString('latin1'));
const pad = (n, size = 2) => String(n).padStart(size, '0');

let mode = 'wait-confirm'; // 'wait-confirm' | 'command' | 'transparent'
let text = '';
let meterSocket = null;
let meterQueue = [];

const server = net.connect(Number(serverPort), serverHost, () => {
    log(`connected to ${serverHost}:${serverPort}, identifier ${identifier}`);
    server.write(Buffer.from(identifier, 'latin1'));
});

const reply = (s) => {
    if (tracing) log('>>', show(s));
    server.write(Buffer.from(s, 'latin1'));
};

function openMeter() {
    if (!meter) {
        log('transparent mode without --meter: bytes are dropped');
        return;
    }
    const [host, port] = meter.split(':');
    meterSocket = net.connect(Number(port), host, () => {
        log(`meter ${meter} connected`);
        for (const chunk of meterQueue) meterSocket.write(chunk);
        meterQueue = [];
    });
    meterSocket.on('data', (chunk) => {
        if (tracing) log('meter <', chunk.toString('hex'));
        if (mode === 'transparent') server.write(chunk);
    });
    meterSocket.on('error', (err) => log(`meter: ${err.message}`));
    meterSocket.on('close', () => {
        meterSocket = null;
    });
}

function closeMeter() {
    if (meterSocket) meterSocket.destroy();
    meterSocket = null;
    meterQueue = [];
}

function command(frame) {
    const now = new Date();
    if (frame === '#Y$') return; // acknowledgement from the server
    if (frame.startsWith('#W;P')) return reply('#Y$');
    if (frame === '#S$') {
        mode = 'transparent';
        openMeter();
        return;
    }
    if (frame === '#R;T;$') {
        return reply(`#Y;${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}$`);
    }
    if (frame === '#R;CA0$') return reply(`#Y;CSV=5.0.1\r\nCI=${identifier}\r\nCSI0=${serverHost}\r\nCSP0=${serverPort}\r\nCSI1=0.0.0.0\r\nCSP1=0\r\n$`);
    if (frame === '#R;E$') return reply('#Y;21-05-2020-08-39\t100\r\n21-05-2020-08-55\t  1\r\n$');
    reply('#N$');
}

server.on('data', (chunk) => {
    const s = chunk.toString('latin1');
    if (mode === 'transparent') {
        const at = s.indexOf(ESCAPE);
        if (at < 0) {
            if (tracing) log('meter >', chunk.toString('hex'));
            if (meterSocket && meterSocket.connecting) meterQueue.push(chunk);
            else if (meterSocket) meterSocket.write(chunk);
            return;
        }
        // A real modem answers the escape out of the transparent channel with a bare #Y$.
        closeMeter();
        mode = 'command';
        text = s.slice(at + ESCAPE.length);
        reply('#Y$');
    } else {
        text += s;
    }
    if (tracing) log('<<', show(text));
    if (mode === 'wait-confirm') {
        if (!text.includes('#Y$')) return;
        log('confirmed by the server');
        mode = 'command';
        text = text.slice(text.indexOf('#Y$') + 3);
    }
    for (;;) {
        if (text.startsWith(ESCAPE)) {
            text = text.slice(ESCAPE.length);
            reply(`#Y;${csq}$`);
            continue;
        }
        const start = text.indexOf('#');
        const end = start >= 0 ? text.indexOf('$', start) : -1;
        const escapeAt = text.indexOf(ESCAPE);
        if (escapeAt >= 0 && (start < 0 || escapeAt < start)) {
            text = text.slice(escapeAt);
            continue;
        }
        if (end < 0) break;
        const frame = text.slice(start, end + 1);
        text = text.slice(end + 1);
        command(frame);
        if (mode === 'transparent') {
            if (text) server.emit('data', Buffer.from(text, 'latin1'));
            text = '';
            break;
        }
    }
});
server.on('error', (err) => log(`server: ${err.message}`));
server.on('close', () => {
    log('server closed the connection');
    closeMeter();
    process.exit(0);
});
