'use strict';
// A pretend GPRS modem, for testing the gateway without a real one: connects
// to a dispatch server like a БАРС-02 or an ETA GSM modem and relays the
// transparent channel to a real meter behind a TCP-serial gateway, so a
// reader runs end to end on real replies.
//
//   node .tools/device-probes/gprs_modem_emulator.js SERVER_HOST SERVER_PORT --id IDENT [--modem bars02|eta-gsm]
//       [--meter HOST:PORT] [--csq N] [--trace]
//       ETA GSM only: [--line "9600 8N1"] [--revision 100|101] [--serial 0|1|2] [--reply-delay MS] [--no-in-band]
//
// БАРС-02 (default): sends its identifier, answers the command protocol the
// old ETA engine uses (escape, port selection, clock, configuration, event
// list; .docs/bars02/bars02-notes.md; the configuration text is made up) and
// relays after #S$ until the escape.
//
// ETA GSM: sends "<id>\r\nCSQ: <csq>,0\r\n254\r\n" and is transparent from
// then on, except for Modbus frames to address 254 (functions 03, 04, 0x10;
// at most 20 registers) that come after at least 1 s of silence: those it
// answers itself (after --reply-delay, default 300 ms) from its settings and
// status registers (.docs/eta-gsm/eta-gsm-notes.md; text byte-swapped
// within each word, as on the real modems) and writes change the settings.
// Such a frame without the silence goes to the meter, as on a real modem.
// --no-in-band: a modem that never answers in band (like 2002-2009 on port
// 2784): every frame goes to the meter.
// The speed and format only change the registers, not the relay.

const net = require('net');

const args = process.argv.slice(2);
const [serverHost, serverPort] = args;
const option = (name, fallback) => {
    const i = args.indexOf(name);
    return i < 0 ? fallback : args[i + 1];
};
const identifier = option('--id', 'EMULATOR');
const modemType = option('--modem', 'bars02');
const meter = option('--meter');
const csq = Number(option('--csq', 21));
const tracing = args.includes('--trace');
if (!serverHost || !serverPort || !['bars02', 'eta-gsm'].includes(modemType)) {
    console.error('usage: node gprs_modem_emulator.js SERVER_HOST SERVER_PORT --id IDENT [--modem bars02|eta-gsm] [--meter HOST:PORT] [--csq N] [--trace]');
    process.exit(2);
}

const log = (...items) => console.error(new Date().toISOString().slice(11, 23), ...items);
const show = (bytes) => JSON.stringify(Buffer.from(bytes).toString('latin1'));
const hex = (bytes) => Buffer.from(bytes).toString('hex').replace(/(..)/g, '$1 ').trim();
const pad = (n, size = 2) => String(n).padStart(size, '0');

// The meter behind the modem: one TCP connection to its gateway, opened on
// demand; bytes written while it connects are queued.
let meterSocket = null;
let meterQueue = [];
let meterIdleTimer = null;
let onMeterData = () => {};
function toMeter(chunk) {
    if (!meter) {
        log('no --meter: bytes for the meter dropped');
        return;
    }
    if (tracing) log('meter >', hex(chunk));
    if (!meterSocket) {
        const [host, port] = meter.split(':');
        meterSocket = net.connect(Number(port), host, () => {
            for (const queued of meterQueue) meterSocket.write(queued);
            meterQueue = [];
        });
        meterSocket.on('data', (data) => {
            if (tracing) log('meter <', hex(data));
            onMeterData(data);
        });
        meterSocket.on('error', (err) => log(`meter: ${err.message}`));
        meterSocket.on('close', () => {
            meterSocket = null;
        });
    }
    if (meterSocket.connecting) meterQueue.push(chunk);
    else meterSocket.write(chunk);
}
function closeMeter() {
    if (meterSocket) meterSocket.destroy();
    meterSocket = null;
    meterQueue = [];
}

const server = net.connect(Number(serverPort), serverHost, () => {
    log(`connected to ${serverHost}:${serverPort} as ${modemType} ${identifier}`);
    if (modemType === 'eta-gsm') server.write(Buffer.from(`${identifier}\r\nCSQ: ${csq},0\r\n254\r\n`, 'latin1'));
    else server.write(Buffer.from(identifier, 'latin1'));
});
const reply = (bytes) => {
    if (tracing) log('>>', typeof bytes === 'string' ? show(bytes) : hex(bytes));
    server.write(typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : bytes);
};
server.on('error', (err) => log(`server: ${err.message}`));
server.on('close', () => {
    log('server closed the connection');
    closeMeter();
    process.exit(0);
});

if (modemType === 'bars02') runBars02();
else runEtaGsm();

function runBars02() {
    const ESCAPE = '~~~^^^~~~';
    let mode = 'wait-confirm'; // 'wait-confirm' | 'command' | 'transparent'
    let text = '';
    onMeterData = (data) => {
        if (mode === 'transparent') server.write(data);
    };

    function command(frame) {
        const now = new Date();
        if (frame === '#Y$') return; // acknowledgement from the server
        if (frame.startsWith('#W;P')) return reply('#Y$');
        if (frame === '#S$') {
            mode = 'transparent';
            return;
        }
        if (frame === '#R;T;$') {
            return reply(`#Y;${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}$`);
        }
        if (frame === '#R;CA0$') return reply(`#Y;CSV=5.0.1\r\nCBN=${identifier}\r\nCSI0=${serverHost}\r\nCSP0=${serverPort}\r\nCSI1=0.0.0.0\r\nCSP1=0\r\n$`);
        if (frame === '#R;E$') return reply('#Y;21-05-2020-08-39\t100\r\n21-05-2020-08-55\t  1\r\n$');
        reply('#N$');
    }

    server.on('data', (chunk) => {
        const s = chunk.toString('latin1');
        if (mode === 'transparent') {
            const at = s.indexOf(ESCAPE);
            if (at < 0) {
                toMeter(chunk);
                return;
            }
            // A real unit answers the escape out of the transparent channel with a bare #Y$.
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
}

function runEtaGsm() {
    const ADDRESS = 254;
    const replyDelayMs = Number(option('--reply-delay', 300));
    const [baud, format] = option('--line', '9600 8N1').split(/\s+/);
    const FORMATS = { '8N1': 0x06, '8N2': 0x0e, '8E1': 0x26, '8E2': 0x2e, '8O1': 0x36, '8O2': 0x3e };
    const crc16 = (bytes) => {
        let crc = 0xffff;
        for (const b of bytes) {
            crc ^= b;
            for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
        }
        return crc;
    };
    const withCrc = (bytes) => {
        const crc = crc16(bytes);
        return Buffer.from([...bytes, crc & 0xff, crc >>> 8]);
    };
    // Text is stored byte-swapped within each 16-bit word, as on the real modems.
    const putText = (buffer, offset, length, text) => {
        const bytes = Buffer.alloc(length);
        bytes.write(text, 'latin1');
        for (let i = 0; i + 1 < length; i += 2) [bytes[i], bytes[i + 1]] = [bytes[i + 1], bytes[i]];
        bytes.copy(buffer, offset);
    };
    const holding = Buffer.alloc(0xe6);
    holding.writeUInt16BE(1, 0x00);
    holding.writeUInt16BE(ADDRESS, 0x06);
    putText(holding, 0x08, 64, identifier);
    holding.writeUInt16BE(1234, 0x48);
    putText(holding, 0x4a, 32, 'm2m.gt.msk');
    putText(holding, 0x6a, 20, 'vpn@etech');
    putText(holding, 0x7e, 20, 'secret');
    holding.writeUInt16BE(5010, 0x92);
    holding.writeUInt16BE(1, 0x94);
    putText(holding, 0x96, 16, serverHost);
    holding.writeUInt16BE(Number(serverPort), 0xa6);
    holding.writeUInt16BE(Number(option('--serial', 2)), 0xcc);
    holding.writeUInt16BE(Number(baud) & 0xffff, 0xce);
    holding.writeUInt16BE(Number(baud) >>> 16, 0xd0);
    holding.writeUInt16BE(FORMATS[format], 0xd2);
    holding.writeUInt16BE(600, 0xe0);
    holding.writeUInt16BE(10, 0xe2);
    holding.writeUInt16BE(1440, 0xe4);
    const input = Buffer.alloc(0x1a);
    putText(input, 0x02, 16, '10.224.35.22');
    putText(input, 0x12, 6, `${csq},0`);
    input.writeUInt16BE(Number(option('--revision', 101)), 0x18);
    const lineNow = () => `${holding.readUInt16BE(0xce) | (holding.readUInt16BE(0xd0) << 16)} ${Object.keys(FORMATS).find((k) => FORMATS[k] === holding.readUInt16BE(0xd2))}`;

    let lastTraffic = Date.now();
    onMeterData = (data) => {
        lastTraffic = Date.now();
        server.write(data);
    };
    let meterIdle = null;

    // A whole in-band frame for us, or null.
    const answersInBand = !args.includes('--no-in-band');
    function inBand(chunk) {
        if (!answersInBand || chunk[0] !== ADDRESS || chunk.length < 8) return null;
        const fn = chunk[1];
        const length = fn === 0x10 ? 9 + chunk[6] : 8;
        if (![3, 4, 6, 0x10].includes(fn) || chunk.length !== length) return null;
        if (crc16(chunk.subarray(0, length - 2)) !== chunk.readUInt16LE(length - 2)) return null;
        return { fn, start: chunk.readUInt16BE(2), count: fn === 6 ? 1 : chunk.readUInt16BE(4), data: fn === 0x10 ? chunk.subarray(7, length - 2) : chunk.subarray(4, 6) };
    }

    server.on('data', (chunk) => {
        const silence = Date.now() - lastTraffic;
        lastTraffic = Date.now();
        const frame = inBand(chunk);
        if (frame && silence < 1000) log(`a frame to 254 after ${silence} ms of silence: sent to the meter`);
        if (!frame || silence < 1000) {
            toMeter(chunk);
            clearTimeout(meterIdle);
            meterIdle = setTimeout(closeMeter, 5000);
            return;
        }
        if (tracing) log('<< in band', hex(chunk));
        const { fn, start, count, data } = frame;
        let answer;
        if (fn === 3 || fn === 4) {
            const source = fn === 3 ? holding : input;
            if (count > 20 || start + count * 2 > source.length) answer = [ADDRESS, fn | 0x80, 2];
            else answer = [ADDRESS, fn, count * 2, ...source.subarray(start, start + count * 2)];
        } else if (fn === 0x10) {
            if (count > 20 || start + count * 2 > holding.length) answer = [ADDRESS, fn | 0x80, 2];
            else {
                data.copy(holding, start);
                answer = [ADDRESS, fn, ...chunk.subarray(2, 6)];
                log(`settings written at 0x${start.toString(16)}: line now ${lineNow()}`);
            }
        } else {
            answer = [ADDRESS, fn, ...chunk.subarray(2, 6)]; // command register: accepted, nothing done
        }
        setTimeout(() => {
            lastTraffic = Date.now();
            reply(withCrc(answer));
        }, replyDelayMs);
    });
}
