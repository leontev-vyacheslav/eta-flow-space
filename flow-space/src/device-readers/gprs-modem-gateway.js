'use strict';
/**
 * GprsModemGateway
 *
 * One TCP listener for the GPRS modems that connect to us instead of waiting
 * for a connection, whatever their make. Each make is a protocol module:
 * БАРС-02 (./bars02-protocol.js) and the company's own ETA GSM modem
 * (./eta-gsm-protocol.js). The first bytes a modem sends tell them apart:
 *
 *   ETA GSM   "<identifier>\r\nCSQ: <rssi>,<ber>\r\n<Modbus address>\r\n", no reply expected
 *   БАРС-02   "<identifier>" in cp1251, no line break; it waits for #Y$
 *
 * A hello no protocol recognizes, or an identifier that is not plain text
 * (letters, digits, space, _ . - № ( )), closes the connection without a
 * byte written to it. Identified modems sit in a pool by identifier; a new
 * connection with the same identifier replaces the old one.
 *
 * createSocket() returns a ModemChannel: the part of the net.Socket
 * interface the meter readers use (connect, write, destroy and the 'data' /
 * 'error' / 'close' events). connect() waits for the modem's turn, lets the
 * modem's protocol prepare the meter line (БАРС-02: command mode, port
 * selection, #S$; ETA GSM: speed and format set in band when they differ)
 * and opens the transparent channel; destroy() lets the protocol end the
 * session (БАРС-02: escape) and frees the modem. The modem's TCP connection
 * stays open. A reader therefore runs unchanged through any modem:
 *
 *   const gateway = new GprsModemGateway({ port: 2910, protocols: [etaGsm, bars02] });
 *   await gateway.start();
 *   const client = new Vkt7Client({
 *       address: 1,
 *       stepTimeoutMs: 15000,
 *       createSocket: () => gateway.createSocket({ identifier: '0458', port: 'rs485', baudRate: 9600 }),
 *   });
 *   const results = await client.read();
 *
 * Work on one modem is serialized (keep-alive, queries, meter sessions), so
 * the meters behind one modem are read one after another, each on its own
 * line. Idle modems get the protocol's keep-alive every keepAliveMs.
 *
 * A protocol module provides: name, label, detect(helloBytes),
 * parseHello(helloBytes) -> { identifier, signalQuality?, ... },
 * accept(modem, hello), open(modem, channelOptions), close(modem),
 * keepAlive(modem), keepAliveDropAfter (missed keep-alives that drop the
 * modem), query(modem, request, options), onIdleData(modem) (bytes outside
 * any exchange or meter session).
 *
 * Events: 'modem' ({ identifier, type, remote }), 'modem-closed',
 * 'unsolicited' ({ identifier, frame }), 'log' (text).
 */

const net = require('net');
const { EventEmitter } = require('events');

const cp1251 = (() => {
    try {
        return new TextDecoder('windows-1251');
    } catch (err) {
        return null; // Node built without full ICU: identifiers decode as latin1
    }
})();
const decodeText = (bytes) => (cp1251 ? cp1251.decode(bytes) : Buffer.from(bytes).toString('latin1'));
const printable = (text) => text.replace(/[\x00-\x1f]/g, (c) => (c === '\r' ? '\\r' : c === '\n' ? '\\n' : c === '\t' ? '\\t' : `\\x${c.charCodeAt(0).toString(16).padStart(2, '0')}`));
const hex = (bytes) => [...bytes].map((b) => b.toString(16).padStart(2, '0')).join(' ');
const describe = (request) => (typeof request === 'string' ? printable(request) : hex(request));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const IDENTIFIER = /^[0-9A-Za-zА-Яа-яЁё _.\-№()]{1,127}$/;

class ModemChannel extends EventEmitter {
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
        return this.modem.send(data, { meter: true });
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

class GprsModem {
    constructor(gateway, socket) {
        this.gateway = gateway;
        this.socket = socket;
        this.protocol = null;
        this.identifier = null;
        this.state = {}; // the protocol's own state (mode, Modbus address, line...)
        this.remote = `${socket.remoteAddress}:${socket.remotePort}`;
        this.connectedAt = Date.now();
        this.lastActivity = Date.now();
        this.signalQuality = null;
        this.keepAliveFailures = 0;
        this.channel = null;
        this.busy = false;
        this.queue = Promise.resolve();
        this.buffer = Buffer.alloc(0);
        this.waiter = null;
        this.closed = false;
    }

    get label() {
        return `${this.protocol ? this.protocol.label : 'GPRS modem'} ${this.identifier || this.remote}`;
    }

    send(bytes, { meter = false } = {}) {
        const data = typeof bytes === 'string' ? Buffer.from(bytes, 'latin1') : Buffer.from(bytes);
        this.lastActivity = Date.now();
        if (this.gateway.trace) this.gateway.trace(this.identifier || this.remote, meter ? '>' : '>>', data);
        return this.socket.write(data);
    }

    // Runs fn after everything queued before it on this modem.
    enqueue(fn) {
        const run = async () => {
            if (this.closed) throw new Error(`${this.label}: connection closed`);
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
        if (this.channel && this.channel.open) {
            if (this.gateway.trace) this.gateway.trace(this.identifier, '<', chunk);
            this.channel.emit('data', chunk);
            return;
        }
        if (this.gateway.trace) this.gateway.trace(this.identifier || this.remote, '<<', chunk);
        this.buffer = Buffer.concat([this.buffer, chunk]);
        if (this.waiter) this.waiter.check();
        else if (this.protocol) this.protocol.onIdleData(this);
    }

    // Sends `request` (string, bytes, or null: only wait) and resolves with
    // { result, bytes } once `match(buffer)` returns something other than
    // undefined and the line has been quiet for quietMs; rejects after
    // timeoutMs. Bytes from before the request are dropped.
    exchange(request, match, { timeoutMs = 7000, quietMs = 200 } = {}) {
        return new Promise((resolve, reject) => {
            if (this.closed) {
                reject(new Error(`${this.label}: connection closed`));
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
            const settle = () => {
                const result = match(this.buffer);
                if (result !== undefined) done(resolve, { result, bytes: Buffer.from(this.buffer) });
                return result !== undefined;
            };
            const timer = setTimeout(() => {
                // A complete reply that came within the last quietMs still counts.
                if (!settle()) {
                    done(reject, new Error(`${this.label}: no reply to ${request ? describe(request) : 'the wait'} (got "${printable(decodeText(this.buffer)).slice(0, 120)}")`));
                }
            }, timeoutMs);
            this.waiter = {
                check: () => {
                    clearTimeout(quietTimer);
                    if (match(this.buffer) === undefined) return;
                    quietTimer = setTimeout(settle, quietMs);
                },
                fail: (err) => done(reject, err),
            };
            if (request) this.send(request);
        });
    }

    close(reason) {
        if (this.closed) return;
        this.closed = true;
        if (this.waiter) this.waiter.fail(new Error(`${this.label}: ${reason}`));
        if (this.channel) this.channel.destroy(new Error(`${this.label}: ${reason}`));
        this.socket.destroy();
    }
}

class GprsModemGateway extends EventEmitter {
    /**
     * @param {Object} options
     * @param {number} options.port - TCP port to listen on.
     * @param {Object[]} options.protocols - Protocol modules, tried in this order on a hello.
     * @param {string} [options.host] - Local address (default: all).
     * @param {number} [options.keepAliveMs=45000] - Idle time after which a modem gets its protocol's keep-alive (the old engine's pace).
     * @param {number} [options.helloTimeoutMs=30000] - A connection that sends nothing is closed.
     * @param {number} [options.helloQuietMs=1000] - Silence that ends the hello.
     * @param {boolean} [options.lineChanges=true] - Whether a protocol may change a modem's line (ETA GSM: speed and format, not saved).
     * @param {number} [options.waitForModemMs=0] - How long connect() waits for a modem that is not connected.
     * @param {(who: string, direction: string, bytes: Buffer) => void} [options.trace] - '>>'/'<<' modem bytes, '>'/'<' meter bytes.
     */
    constructor({
        port,
        protocols,
        host,
        keepAliveMs = 45000,
        helloTimeoutMs = 30000,
        helloQuietMs = 1000,
        lineChanges = true,
        waitForModemMs = 0,
        trace = null,
    } = {}) {
        super();
        if (!port) throw new Error('GprsModemGateway: "port" is required');
        if (!protocols || !protocols.length) throw new Error('GprsModemGateway: "protocols" are required');
        this.port = port;
        this.protocols = protocols;
        this.host = host;
        this.keepAliveMs = keepAliveMs;
        this.helloTimeoutMs = helloTimeoutMs;
        this.helloQuietMs = helloQuietMs;
        this.lineChanges = lineChanges;
        this.waitForModemMs = waitForModemMs;
        this.trace = trace;
        this.pool = new Map(); // identifier -> GprsModem
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
            type: m.protocol.name,
            remote: m.remote,
            connectedAt: m.connectedAt,
            lastActivity: m.lastActivity,
            signalQuality: m.signalQuality,
            busy: m.busy,
        }));
    }

    createSocket(options) {
        if (!options || !options.identifier) throw new Error('GprsModemGateway: "identifier" is required');
        return new ModemChannel(this, options);
    }

    /**
     * A protocol-specific query on a connected modem, e.g. БАРС-02 '#R;CA0$',
     * ETA GSM 'status'; see the protocol module.
     */
    query(identifier, request, options) {
        const modem = this.pool.get(identifier);
        if (!modem) return Promise.reject(new Error(`GPRS modem ${identifier} is not connected`));
        return modem.enqueue(() => modem.protocol.query(modem, request, options));
    }

    _onConnection(socket) {
        const modem = new GprsModem(this, socket);
        socket.setKeepAlive(true, 60000);
        socket.on('data', (chunk) => modem.onData(chunk));
        socket.on('error', (err) => this.emit('log', `${modem.label}: ${err.message}`));
        socket.on('close', () => {
            modem.close('connection closed');
            if (modem.identifier && this.pool.get(modem.identifier) === modem) {
                this.pool.delete(modem.identifier);
                this.emit('modem-closed', { identifier: modem.identifier, type: modem.protocol.name, remote: modem.remote });
            }
        });
        this._hello(modem).catch((err) => {
            this.emit('log', `${modem.remote}: ${err.message}`);
            modem.close('not identified');
        });
    }

    async _hello(modem) {
        // The hello ends with helloQuietMs of silence; the match is taken
        // again then, so a hello that arrives in pieces is read whole.
        const { result: protocol, bytes } = await modem.exchange(null, (buffer) => {
            if (!buffer.length) return undefined;
            return this.protocols.find((p) => p.detect(buffer)) || null;
        }, { timeoutMs: this.helloTimeoutMs, quietMs: this.helloQuietMs });
        if (!protocol) throw new Error(`unknown hello "${printable(decodeText(bytes)).slice(0, 80)}"`);
        const hello = protocol.parseHello(bytes);
        if (!IDENTIFIER.test(hello.identifier || '')) throw new Error(`${protocol.label}: bad identifier "${printable(hello.identifier || '').slice(0, 80)}"`);
        modem.protocol = protocol;
        modem.identifier = hello.identifier;
        if (hello.signalQuality !== undefined) modem.signalQuality = hello.signalQuality;
        await protocol.accept(modem, hello);
        const previous = this.pool.get(modem.identifier);
        if (previous) {
            this.emit('log', `${modem.label}: replaces the connection from ${previous.remote}`);
            previous.close('replaced by a new connection');
        }
        this.pool.set(modem.identifier, modem);
        this.emit('modem', { identifier: modem.identifier, type: protocol.name, remote: modem.remote });
    }

    _keepAlive() {
        const now = Date.now();
        for (const modem of this.pool.values()) {
            if (modem.busy || modem.channel || now - modem.lastActivity < this.keepAliveMs) continue;
            modem.enqueue(() => modem.protocol.keepAlive(modem))
                .then(() => {
                    modem.keepAliveFailures = 0;
                })
                .catch((err) => {
                    modem.keepAliveFailures++;
                    this.emit('log', `keep-alive: ${err.message}`);
                    if (modem.keepAliveFailures >= modem.protocol.keepAliveDropAfter) modem.close('no reply to the keep-alive');
                });
        }
    }

    async _waitForModem(identifier) {
        const deadline = Date.now() + this.waitForModemMs;
        for (;;) {
            const modem = this.pool.get(identifier);
            if (modem) return modem;
            if (Date.now() >= deadline) throw new Error(`GPRS modem ${identifier} is not connected`);
            await sleep(500);
        }
    }

    async _openChannel(channel) {
        const modem = await this._waitForModem(channel.options.identifier);
        // One queued task per channel: it holds the modem until the channel
        // is destroyed, then lets the protocol end the session.
        modem.enqueue(async () => {
            let opened = false;
            try {
                if (channel.closed) return;
                await modem.protocol.open(modem, channel.options);
                opened = true;
                if (channel.closed) return;
                modem.channel = channel;
                channel.modem = modem;
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
                if (opened && !modem.closed) {
                    try {
                        await modem.protocol.close(modem);
                    } catch (err) {
                        this.emit('log', `${modem.label}: ${err.message}`);
                    }
                }
            }
        }).catch((err) => channel._fail(err));
    }
}

// "rs232-powered 9600 8N1" -> { port, baudRate, parity, stopBits }: the meter
// line (data bits are always 8). "none" -> leave the modem's line as it is
// configured (old-firmware БАРС-02 3.0.1).
function parseLineSettings(text) {
    if (/^\s*none\s*$/i.test(text || '')) return { selectPort: false };
    const m = /^\s*(rs232-powered|rs232|rs485)\s+(\d+)\s+8([NEO])([12])\s*$/i.exec(text || '');
    if (!m) throw new Error(`GPRS modem line "${text}" is not like "rs232-powered 9600 8N1" or "none"`);
    return {
        port: m[1].toLowerCase(),
        baudRate: Number(m[2]),
        parity: { N: 'none', E: 'even', O: 'odd' }[m[3].toUpperCase()],
        stopBits: Number(m[4]),
    };
}

module.exports = { GprsModemGateway, ModemChannel, parseLineSettings, decodeText, printable, hex, sleep };
