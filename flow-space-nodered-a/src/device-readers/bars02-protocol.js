'use strict';
/**
 * БАРС-02 for the GPRS modem gateway (./gprs-modem-gateway.js)
 *
 * БАРС-02 GPRS/Ethernet units (АО «ПромСервис», САДКО) connect to their
 * dispatch server and keep the connection open. The protocol is the vendor's
 * "Протокол обмена с контроллером БАРС"
 * (.docs/bars02/bars02-protocol-2015-05-20.pdf), as the old ETA engine speaks
 * it (see .docs/bars02/bars02-notes.md):
 *
 *   modem → server   identifier, cp1251 text without a line break ("Зарипова_5", "033626")
 *   server → modem   #Y$                       connection confirmed
 *   server → modem   ~~~^^^~~~                 command mode; reply #Y;<csq>$ (signal 0-31), or
 *                                              #Y$ (old firmware; any unit leaving the
 *                                              transparent channel); also the keep-alive
 *   server → modem   #W;P<p>;<baud>\t<s>\t<par>$  meter port; reply #Y$ (p 0 RS-232,
 *                                              1 RS-232 with power, 2 RS-485; s 0 one stop
 *                                              bit, 1 two; par 0 none, 1 even, 2 odd); #N$
 *                                              while the other server holds the line
 *   server → modem   #S$                       transparent channel to that port, no reply
 *   server → modem   ~~~^^^~~~                 back to command mode after the meter session
 *   modem → server   #W;E;<records>$           events (НС) it pushes; acknowledged with #Y$
 *                                              (per channel, so the old system keeps its own)
 *   read-only queries in command mode: #R;T;$ clock, #R;CA0$ configuration
 *   block 0, #R;E$ event list.
 *
 * Old-firmware units (3.0.1, the old system's «Bars02_Old») get no port
 * selection — channel option selectPort: false — and stay on the line their
 * configuration sets.
 *
 * GPRS is slow: a command takes 1-2 s, and a meter reply 1-8 s (a ВКТ-7
 * data reply came 7.5 s after its request on 2026-10-26).
 */

const { decodeText, printable, sleep } = require('./gprs-modem-gateway.js');

const ESCAPE = '~~~^^^~~~';
const PORT_CODES = { rs232: 0, 'rs232-powered': 1, rs485: 2 };
const PARITY_CODES = { none: 0, even: 1, odd: 2 };
const OPEN_DELAY_MS = 300; // pause after #S$ before the meter session starts
const ESCAPE_GUARD_MS = 500; // silence before the escape that ends a meter session

// Builds the port selection command: #W;P<p>;<baud>\t<stop>\t<parity>$
function buildSelectPort({ port = 'rs232', baudRate = 9600, parity = 'none', stopBits = 1 } = {}) {
    const p = typeof port === 'number' ? port : PORT_CODES[port];
    const par = typeof parity === 'number' ? parity : PARITY_CODES[parity];
    if (p === undefined) throw new Error(`БАРС-02: unknown port "${port}"`);
    if (par === undefined) throw new Error(`БАРС-02: unknown parity "${parity}"`);
    return `#W;P${p};${baudRate}\t${stopBits === 2 ? 1 : 0}\t${par}$`;
}

// The hello is the identifier alone: no line break (ETA GSM sends lines).
function detect(bytes) {
    return !bytes.includes(0x0d) && !bytes.includes(0x0a);
}

// 0x1F padding is dropped, as the old engine does.
function parseHello(bytes) {
    return { identifier: decodeText(bytes).replace(/[\x00-\x1f]/g, '').trim() };
}

async function accept(modem) {
    modem.state.mode = 'command';
    modem.send('#Y$');
}

// Escape to command mode; resolves with the signal quality (0-31), or null
// when the unit answers a bare #Y$.
async function commandMode(modem, { attempts = 2, timeoutMs = 7000 } = {}) {
    for (let attempt = 1; ; attempt++) {
        try {
            const { result } = await modem.exchange(ESCAPE, (bytes) => {
                const m = /#Y(?:;(\d+))?\$/.exec(bytes.toString('latin1'));
                if (!m) return undefined;
                return m[1] === undefined ? null : Number(m[1]);
            }, { timeoutMs });
            modem.state.mode = 'command';
            if (result !== null) modem.signalQuality = result;
            return result;
        } catch (err) {
            if (attempt >= attempts || modem.closed) throw err;
        }
    }
}

// A command in command mode; resolves with the reply text (#Y...$ or #N$).
// Over GPRS a reply takes 1-5 s (the old engine waited 5.5 s).
async function command(modem, request, { timeoutMs = 10000 } = {}) {
    const { bytes } = await modem.exchange(request, (b) => {
        const text = b.toString('latin1');
        const start = text.search(/#[YN]/);
        if (start < 0) return undefined;
        return text.indexOf('$', start) >= 0 ? true : undefined;
    }, { timeoutMs });
    const text = decodeText(bytes);
    return text.slice(text.search(/#[YN]/), text.lastIndexOf('$') + 1);
}

async function open(modem, options) {
    await commandMode(modem);
    if (options.selectPort !== false) {
        const reply = await command(modem, buildSelectPort(options));
        if (!reply.startsWith('#Y')) throw new Error(`${modem.label}: port selection refused (${printable(reply)})`);
    }
    modem.send('#S$');
    modem.state.mode = 'transparent';
    await sleep(OPEN_DELAY_MS);
}

async function close(modem) {
    if (modem.state.mode !== 'transparent') return;
    await sleep(ESCAPE_GUARD_MS);
    try {
        await commandMode(modem);
    } catch (err) {
        modem.state.mode = 'command';
        throw new Error(`no reply to the escape after the meter session: ${err.message}`);
    }
}

async function keepAlive(modem) {
    await commandMode(modem, { attempts: 1 });
}

/**
 * A read-only command after the escape, e.g. '#R;T;$', '#R;CA0$', '#R;E$'
 * (null: the escape only). Resolves with { signalQuality, reply }.
 */
async function query(modem, request, { timeoutMs = 10000 } = {}) {
    const signalQuality = await commandMode(modem);
    const reply = request ? await command(modem, request, { timeoutMs }) : null;
    return { signalQuality, reply };
}

// Frames the unit pushes by itself while nobody waits for a reply: events
// (#W;E;...$) are acknowledged, as the vendor's protocol requires, or the
// unit repeats them every 30 s.
function onIdleData(modem) {
    const text = modem.buffer.toString('latin1');
    const start = text.indexOf('#W');
    const end = start >= 0 ? text.indexOf('$', start) : -1;
    if (end < 0) {
        if (modem.buffer.length > 4096) modem.buffer = modem.buffer.subarray(-1024);
        return;
    }
    const frame = decodeText(modem.buffer.subarray(start, end + 1));
    modem.buffer = modem.buffer.subarray(end + 1);
    if (frame.startsWith('#W;E;')) modem.send('#Y$');
    modem.gateway.emit('unsolicited', { identifier: modem.identifier, frame });
}

module.exports = {
    name: 'bars02',
    label: 'БАРС-02',
    keepAliveDropAfter: 2,
    detect,
    parseHello,
    accept,
    open,
    close,
    keepAlive,
    query,
    onIdleData,
    buildSelectPort,
};
