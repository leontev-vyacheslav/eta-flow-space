'use strict';
/**
 * Bars02Gateway
 *
 * TCP server for БАРС-02 GPRS/Ethernet units (АО «ПромСервис», САДКО). A
 * БАРС-02 is a TCP *client*: it connects to its dispatch server on power-up
 * and keeps the connection open; the server sends requests over it. The
 * protocol is not published by the vendor; it is the one the old ETA engine
 * speaks (see .docs/bars02/bars02-notes.md):
 *
 *   modem → server   identifier, cp1251 text ("Зарипова_5", "033626")
 *   server → modem   #Y$                       connection confirmed
 *   server → modem   ~~~^^^~~~                 command mode; reply #Y;<csq>$ (signal 0-31), or
 *                                              #Y$ (old firmware; any modem leaving the
 *                                              transparent channel); also the keep-alive
 *   server → modem   #W;P<p>;<baud>\t<s>\t<par>$  meter port; reply #Y$ (p 0 RS-232,
 *                                              1 RS-232 with power, 2 RS-485; s 0 one stop
 *                                              bit, 1 two; par 0 none, 1 even, 2 odd)
 *   server → modem   #S$                       transparent channel to that port, no reply
 *   server → modem   ~~~^^^~~~                 back to command mode after the meter session
 *   read-only queries in command mode: #R;T;$ clock, #R;CA0$ configuration
 *   block 0, #R;E$ event (НС) list.
 *
 * createSocket() returns a Bars02Channel: an object with the part of the
 * net.Socket interface the meter readers use (connect, write, destroy and
 * the 'data' / 'error' / 'close' events). connect() waits for the modem's
 * turn, puts it into command mode, selects the meter port and opens the
 * transparent channel; destroy() sends the escape and frees the modem; the
 * modem's TCP connection stays open. A reader therefore runs unchanged
 * through a БАРС-02 when it is given createSocket:
 *
 *   const gateway = new Bars02Gateway({ port: 2910 });
 *   await gateway.start();
 *   const client = new Vkt7Client({
 *       address: 1,
 *       createSocket: () => gateway.createSocket({ identifier: '011276', port: 'rs232-powered', baudRate: 9600 }),
 *   });
 *   const results = await client.read();
 *
 * Work on one modem is serialized (keep-alive, queries, meter sessions), so
 * several meters behind one modem are read one after another, each on its
 * own line (e.g. a ВКТ-7 on RS-232 and an РМ-5 on RS-485). Old-firmware units
 * (3.0.1, the old system's «Bars02_Old») get no port selection — pass
 * selectPort: false — and stay on the line their configuration sets.
 *
 * GPRS is slow: a command takes 1-2 s, and a meter reply 1-8 s (a ВКТ-7
 * data reply came 7.5 s after its request on 2026-10-26). Give the readers
 * step timeouts of 15 s or so when they run through a БАРС-02.
 *
 * Events: 'modem' (identified, { identifier, remote }), 'modem-closed',
 * 'unsolicited' (a #W...$ frame the modem pushed by itself), 'log' (text).
 */

const net = require('net');
const { EventEmitter } = require('events');

const ESCAPE = '~~~^^^~~~';
const PORT_CODES = { rs232: 0, 'rs232-powered': 1, rs485: 2 };
const PARITY_CODES = { none: 0, even: 1, odd: 2 };

const cp1251 = (() => {
    try {
        return new TextDecoder('windows-1251');
    } catch (err) {
        return null; // Node built without full ICU: identifiers decode as latin1
    }
})();
const decodeText = (bytes) => (cp1251 ? cp1251.decode(bytes) : Buffer.from(bytes).toString('latin1'));
const printable = (text) => text.replace(/[\x00-\x1f]/g, (c) => (c === '\r' ? '\\r' : c === '\n' ? '\\n' : c === '\t' ? '\\t' : `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`));

// Builds the port selection command: #W;P<p>;<baud>\t<stop>\t<parity>$
function buildSelectPort({ port = 'rs232', baudRate = 9600, parity = 'none', stopBits = 1 } = {}) {
    const p = typeof port === 'number' ? port : PORT_CODES[port];
    const par = typeof parity === 'number' ? parity : PARITY_CODES[parity];
    if (p === undefined) throw new Error(`Bars02Gateway: unknown port "${port}"`);
    if (par === undefined) throw new Error(`Bars02Gateway: unknown parity "${parity}"`);
    return `#W;P${p};${baudRate}\t${stopBits === 2 ? 1 : 0}\t${par}$`;
}

class Bars02Channel extends EventEmitter {
    constructor(gateway, options) {
        super();
        this.gateway = gateway;
        this.options = options;
        this.modem = null;
        this.open = false;
        this.closed = false;
        this._finish = null;
    }

    // Same signature as net.Socket#connect; host and port are ignored.
    connect(port, host, callback) {
        if (typeof callback === 'function') this.once('connect', callback);
        this.gateway._openChannel(this).catch((err) => this._fail(err));
        return this;
    }

    write(data) {
        if (!this.open || !this.modem) return false;
        this.modem._traceOut(data, true);
        return this.modem.socket.write(data);
    }

    destroy(err) {
        if (this.closed) return this;
        this.closed = true;
        this.open = false;
        if (this._finish) this._finish();
        if (err && this.listenerCount('error')) this.emit('error', err);
        this.emit('close');
        return this;
    }

    end() {
        return this.destroy();
    }

    setNoDelay() {
        return this;
    }

    setKeepAlive() {
        return this;
    }

    setTimeout() {
        return this;
    }

    _fail(err) {
        this.destroy(err);
    }
}

class Bars02Modem {
    constructor(gateway, socket) {
        this.gateway = gateway;
        this.socket = socket;
        this.identifier = null;
        this.remote = `${socket.remoteAddress}:${socket.remotePort}`;
        this.connectedAt = Date.now();
        this.lastActivity = Date.now();
        this.signalQuality = null;
        this.keepAliveFailures = 0;
        this.mode = 'identify'; // 'identify' | 'command' | 'transparent'
        this.channel = null;
        this.busy = false;
        this.queue = Promise.resolve();
        this.buffer = Buffer.alloc(0);
        this.waiter = null;
        this.closed = false;
    }

    _traceOut(bytes, meter = false) {
        this.lastActivity = Date.now();
        if (this.gateway.trace) this.gateway.trace(this.identifier || this.remote, meter ? '>' : '>>', Buffer.from(bytes));
    }

    // Runs fn after everything queued before it on this modem.
    enqueue(fn) {
        const run = async () => {
            if (this.closed) throw new Error(`БАРС-02 ${this.identifier}: connection closed`);
            this.busy = true;
            try {
                return await fn();
            } finally {
                this.busy = false;
            }
        };
        const next = this.queue.catch(() => {}).then(run);
        this.queue = next.catch(() => {});
        return next;
    }

    onData(chunk) {
        this.lastActivity = Date.now();
        if (this.mode === 'transparent' && this.channel && this.channel.open) {
            if (this.gateway.trace) this.gateway.trace(this.identifier, '<', chunk);
            this.channel.emit('data', chunk);
            return;
        }
        if (this.gateway.trace) this.gateway.trace(this.identifier || this.remote, '<<', chunk);
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (this.waiter) this.waiter.check();
        else this._takeUnsolicited();
    }

    // Frames the modem pushes by itself (#W...$) while nobody waits for a reply.
    _takeUnsolicited() {
        const text = this.buffer.toString('latin1');
        const start = text.indexOf('#W');
        const end = start >= 0 ? text.indexOf('$', start) : -1;
        if (end < 0) return;
        const frame = decodeText(this.buffer.subarray(start, end + 1));
        this.buffer = this.buffer.subarray(end + 1);
        this.gateway.emit('unsolicited', { identifier: this.identifier, frame });
    }

    // Sends `request` (may be null: only wait) and resolves with the decoded
    // reply text once `match(textLatin1)` returns a value and the line has
    // been quiet for quietMs; rejects after timeoutMs.
    exchange(request, match, { timeoutMs = 7000, quietMs = 200 } = {}) {
        return new Promise((resolve, reject) => {
            if (this.closed) {
                reject(new Error(`БАРС-02 ${this.identifier}: connection closed`));
                return;
            }
            this.buffer = Buffer.alloc(0);
            let quietTimer = null;
            const done = (fn, value) => {
                clearTimeout(timer);
                clearTimeout(quietTimer);
                this.waiter = null;
                fn(value);
            };
            const timer = setTimeout(() => {
                // A complete reply that came within the last quietMs still counts.
                const result = match(this.buffer.toString('latin1'));
                if (result !== undefined) done(resolve, { result, text: decodeText(this.buffer) });
                else done(reject, new Error(`БАРС-02 ${this.identifier}: no reply to ${request ? printable(request) : 'the wait'} (got "${printable(decodeText(this.buffer))}")`));
            }, timeoutMs);
            this.waiter = {
                check: () => {
                    clearTimeout(quietTimer);
                    if (match(this.buffer.toString('latin1')) === undefined) return;
                    quietTimer = setTimeout(() => {
                        const result = match(this.buffer.toString('latin1'));
                        if (result !== undefined) done(resolve, { result, text: decodeText(this.buffer) });
                    }, quietMs);
                },
                fail: (err) => done(reject, err),
            };
            if (request) {
                this._traceOut(request);
                this.socket.write(Buffer.from(request, 'latin1'));
            }
        });
    }

    // Escape to command mode; resolves with the signal quality (0-31), or
    // null when the modem answers a bare #Y$ (firmware without it, and any
    // modem leaving the transparent channel).
    async commandMode({ attempts = 2, timeoutMs = 7000 } = {}) {
        for (let attempt = 1; ; attempt++) {
            try {
                const { result } = await this.exchange(ESCAPE, (text) => {
                    const m = /#Y(?:;(\d+))?\$/.exec(text);
                    if (!m) return undefined;
                    return m[1] === undefined ? null : Number(m[1]);
                }, { timeoutMs });
                this.mode = 'command';
                if (result !== null) this.signalQuality = result;
                return result;
            } catch (err) {
                if (attempt >= attempts || this.closed) throw err;
            }
        }
    }

    // A command in command mode; resolves with the reply text (#Y...$ or #N$).
    // Over GPRS a reply takes 1-5 s (the old engine waited 5.5 s).
    command(request, { timeoutMs = 10000 } = {}) {
        return this.exchange(request, (text) => {
            const start = text.search(/#[YN]/);
            if (start < 0) return undefined;
            return text.indexOf('$', start) >= 0 ? true : undefined;
        }, { timeoutMs }).then(({ text }) => text.slice(text.search(/#[YN]/), text.lastIndexOf('$') + 1));
    }

    close(reason) {
        if (this.closed) return;
        this.closed = true;
        if (this.waiter) this.waiter.fail(new Error(`БАРС-02 ${this.identifier}: ${reason}`));
        if (this.channel) this.channel.destroy(new Error(`БАРС-02 ${this.identifier}: ${reason}`));
        this.socket.destroy();
    }
}

class Bars02Gateway extends EventEmitter {
    /**
     * @param {Object} options
     * @param {number} options.port - TCP port to listen on.
     * @param {string} [options.host] - Local address (default: all).
     * @param {(identifier: string, remote: string) => boolean} [options.accept] - Which identifiers to keep (default: all).
     * @param {number} [options.keepAliveMs=45000] - Escape sent to idle modems this often (the old engine's pace).
     * @param {number} [options.identifyTimeoutMs=30000] - A connection that sends no identifier is closed.
     * @param {number} [options.openDelayMs=300] - Pause after #S$ before the meter session starts.
     * @param {number} [options.escapeGuardMs=500] - Silence before the escape that ends a meter session.
     * @param {number} [options.waitForModemMs=0] - How long connect() waits for a modem that is not connected.
     * @param {(who: string, direction: string, bytes: Buffer) => void} [options.trace] - '>>'/'<<' command bytes, '>'/'<' meter bytes.
     */
    constructor({
        port,
        host,
        accept = () => true,
        keepAliveMs = 45000,
        identifyTimeoutMs = 30000,
        openDelayMs = 300,
        escapeGuardMs = 500,
        waitForModemMs = 0,
        trace = null,
    } = {}) {
        super();
        if (!port) throw new Error('Bars02Gateway: "port" is required');
        this.port = port;
        this.host = host;
        this.accept = accept;
        this.keepAliveMs = keepAliveMs;
        this.identifyTimeoutMs = identifyTimeoutMs;
        this.openDelayMs = openDelayMs;
        this.escapeGuardMs = escapeGuardMs;
        this.waitForModemMs = waitForModemMs;
        this.trace = trace;
        this.pool = new Map(); // identifier -> Bars02Modem
        this.server = null;
        this.keepAliveTimer = null;
    }

    start() {
        if (this.server) return Promise.resolve();
        this.server = net.createServer((socket) => this._onConnection(socket));
        this.keepAliveTimer = setInterval(() => this._keepAlive(), Math.min(this.keepAliveMs, 15000));
        return new Promise((resolve, reject) => {
            this.server.once('error', reject);
            this.server.listen(this.port, this.host, () => {
                this.server.off('error', reject);
                this.server.on('error', (err) => this.emit('log', `server error: ${err.message}`));
                this.emit('log', `listening on ${this.host || '*'}:${this.port}`);
                resolve();
            });
        });
    }

    stop() {
        clearInterval(this.keepAliveTimer);
        for (const modem of this.pool.values()) modem.close('gateway stopped');
        this.pool.clear();
        const server = this.server;
        this.server = null;
        return new Promise((resolve) => (server ? server.close(() => resolve()) : resolve()));
    }

    modems() {
        return [...this.pool.values()].map((m) => ({
            identifier: m.identifier,
            remote: m.remote,
            connectedAt: m.connectedAt,
            lastActivity: m.lastActivity,
            signalQuality: m.signalQuality,
            busy: m.busy,
            mode: m.mode,
        }));
    }

    createSocket(options) {
        if (!options || !options.identifier) throw new Error('Bars02Gateway: "identifier" is required');
        return new Bars02Channel(this, options);
    }

    /**
     * A read-only query in command mode (escape first), e.g. '#R;T;$',
     * '#R;CA0$', '#R;E$'. Resolves with { signalQuality, reply }.
     */
    query(identifier, request, { timeoutMs = 10000 } = {}) {
        const modem = this.pool.get(identifier);
        if (!modem) return Promise.reject(new Error(`БАРС-02 ${identifier} is not connected`));
        return modem.enqueue(async () => {
            const signalQuality = await modem.commandMode();
            const reply = request ? await modem.command(request, { timeoutMs }) : null;
            return { signalQuality, reply };
        });
    }

    _onConnection(socket) {
        const modem = new Bars02Modem(this, socket);
        socket.setKeepAlive(true, 60000);
        socket.on('data', (chunk) => modem.onData(chunk));
        socket.on('error', (err) => this.emit('log', `${modem.identifier || modem.remote}: ${err.message}`));
        socket.on('close', () => {
            modem.close('connection closed');
            if (modem.identifier && this.pool.get(modem.identifier) === modem) {
                this.pool.delete(modem.identifier);
                this.emit('modem-closed', { identifier: modem.identifier, remote: modem.remote });
            }
        });
        this._identify(modem).catch((err) => {
            this.emit('log', `${modem.remote}: ${err.message}`);
            modem.close('not identified');
        });
    }

    async _identify(modem) {
        // The identifier is the first thing the modem sends; 0x1F padding
        // and line ends are dropped (the old engine strips 0x1F).
        const { text } = await modem.exchange(null, (latin1) => (latin1.length ? true : undefined), {
            timeoutMs: this.identifyTimeoutMs,
            quietMs: 500,
        });
        const identifier = text.replace(/[\x00-\x1f]/g, '').trim();
        if (!identifier) throw new Error('empty identifier');
        if (!this.accept(identifier, modem.remote)) throw new Error(`identifier "${identifier}" not accepted`);
        modem.identifier = identifier;
        modem.mode = 'command';
        modem._traceOut('#Y$');
        modem.socket.write('#Y$');
        const previous = this.pool.get(identifier);
        if (previous) previous.close('replaced by a new connection');
        this.pool.set(identifier, modem);
        this.emit('modem', { identifier, remote: modem.remote });
    }

    _keepAlive() {
        const now = Date.now();
        for (const modem of this.pool.values()) {
            if (modem.busy || modem.mode !== 'command' || now - modem.lastActivity < this.keepAliveMs) continue;
            modem.enqueue(() => modem.commandMode({ attempts: 1 }))
                .then(() => {
                    modem.keepAliveFailures = 0;
                })
                .catch((err) => {
                    modem.keepAliveFailures++;
                    this.emit('log', `keep-alive: ${err.message}`);
                    if (modem.keepAliveFailures >= 2) modem.close('no reply to the keep-alive');
                });
        }
    }

    async _waitForModem(identifier) {
        const deadline = Date.now() + this.waitForModemMs;
        for (;;) {
            const modem = this.pool.get(identifier);
            if (modem) return modem;
            if (Date.now() >= deadline) throw new Error(`БАРС-02 ${identifier} is not connected`);
            await new Promise((r) => setTimeout(r, 500));
        }
    }

    async _openChannel(channel) {
        const { identifier, selectPort = true } = channel.options;
        const modem = await this._waitForModem(identifier);
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        // One queued task per channel: it holds the modem until the channel
        // is destroyed, then returns the modem to command mode.
        modem.enqueue(async () => {
            try {
                if (channel.closed) return;
                await modem.commandMode();
                if (selectPort) {
                    const reply = await modem.command(buildSelectPort(channel.options));
                    if (!reply.startsWith('#Y')) throw new Error(`БАРС-02 ${identifier}: port selection refused (${printable(reply)})`);
                }
                if (channel.closed) return;
                modem.channel = channel;
                channel.modem = modem;
                modem._traceOut('#S$');
                modem.socket.write('#S$');
                modem.mode = 'transparent';
                await sleep(this.openDelayMs);
                if (channel.closed) return;
                const closed = new Promise((resolve) => {
                    channel._finish = resolve;
                });
                channel.open = true;
                channel.emit('connect');
                await closed;
            } catch (err) {
                channel._fail(err);
            } finally {
                modem.channel = null;
                if (!modem.closed && modem.mode === 'transparent') {
                    try {
                        await sleep(this.escapeGuardMs);
                        await modem.commandMode();
                    } catch (err) {
                        this.emit('log', `${identifier}: no reply to the escape after the meter session: ${err.message}`);
                        modem.mode = 'command';
                    }
                }
            }
        }).catch((err) => channel._fail(err));
    }
}

// "rs232-powered 9600 8N1" -> { port, baudRate, parity, stopBits }: the meter
// line as the БАРС-02 should set it (data bits are always 8). "none" -> no
// port selection, for old-firmware units (3.0.1), which keep the line their
// configuration sets.
function parseLineSettings(text) {
    if (/^\s*none\s*$/i.test(text || '')) return { selectPort: false };
    const m = /^\s*(rs232-powered|rs232|rs485)\s+(\d+)\s+8([NEO])([12])\s*$/i.exec(text || '');
    if (!m) throw new Error(`Bars02Gateway: line settings "${text}" are not like "rs232-powered 9600 8N1" or "none"`);
    return {
        port: m[1].toLowerCase(),
        baudRate: Number(m[2]),
        parity: { N: 'none', E: 'even', O: 'odd' }[m[3].toUpperCase()],
        stopBits: Number(m[4]),
    };
}

// One gateway per listening port in the process (Node-RED: shared by every
// subflow instance and kept across deploys, so the modems stay connected).
// `ready` settles when the port is listening; a failed start is forgotten,
// so the next call tries again.
const gateways = new Map();

function getGateway(port, options = {}) {
    let gateway = gateways.get(port);
    if (gateway) return gateway;
    gateway = new Bars02Gateway({ ...options, port });
    const log = (text) => console.log(`[БАРС-02 :${port}] ${text}`);
    gateway.on('log', (text) => {
        if (!text.startsWith('keep-alive:')) log(text);
    });
    gateway.on('modem', ({ identifier, remote }) => log(`${identifier} connected from ${remote}`));
    gateway.on('modem-closed', ({ identifier }) => log(`${identifier} disconnected`));
    gateway.on('unsolicited', ({ identifier, frame }) => log(`${identifier} sent ${printable(frame)}`));
    gateway.ready = gateway.start().catch((err) => {
        gateways.delete(port);
        throw new Error(`БАРС-02 gateway cannot listen on ${port}: ${err.message}`);
    });
    gateway.ready.catch(() => {}); // reported to whoever awaits it
    gateways.set(port, gateway);
    return gateway;
}

module.exports = { Bars02Gateway, Bars02Channel, buildSelectPort, parseLineSettings, getGateway };
