'use strict';
/**
 * Ek270Iec61107Client
 *
 * TCP client for the EK270 gas volume corrector's IEC 61107-2001 programming
 * mode. Byte sequences and command list taken directly from the working
 * device driver (EnergyTechAudit.PowerAccounting.DeviceReader.Ek270).
 *
 * read() returns the values of ADDRESSES raw, keyed by their IEC 61107
 * address (manual ЛГТИ.407229.170 РЭ, .docs/ek270): the volume counters,
 * flow rates, pressure, temperature, correction factor, identity, the
 * statuses (lists of active message numbers) and the remaining battery
 * life. The Node-RED mapping (collect-device-state) gives them their
 * meaning. Every parameter is a separate request (~0.4 s each), and the
 * corrector runs on batteries that drain faster with frequent reading, so
 * the list is kept short on purpose.
 *
 * Sequence per read():
 *   1. StartSession:        2f 3f 21 0d 0a                    "/?!\r\n"
 *      -> device replies with ID, e.g. "/Els6EK270\r\n"
 *   2. SetBaudRate (ACK):   06 30 36 31 0d 0a                 <ACK>061<CR><LF>
 *      -> requests programming mode. Device replies with a password-challenge
 *         frame containing "P0(1234567)" (not answered with a password — see
 *         the unlock step below, which is how the real driver handles it).
 *   3. UnlockConsumerLevel: SOH W1 STX "4:171.0(0)" ETX BCC
 *      -> device replies with a plain <ACK> (0x06)
 *   4. Each parameter:      SOH R1 STX "<address>()" ETX BCC
 *      -> device replies:   STX "<address>(<value>)" ETX BCC
 *         The echoed address can carry an archive prefix and a different
 *         value index: "2:302.0" -> "7-2:302.2", "1:400.0" -> "1:400.2".
 *
 * CRC/BCC: XOR of all bytes from right after SOH/STX through ETX inclusive.
 *
 * Shared line: the corrector can be polled by another master on the same
 * serial line (seen on 94.180.248.157:5021: archive reads, its own handshake,
 * NAKs that make the corrector repeat its last reply). The gateway forwards
 * all of that traffic to this socket. So a reply is accepted only when it is
 * a complete STX..ETX frame with a valid BCC whose echoed address matches the
 * request; any other frame is skipped. A parameter that gets no valid reply
 * within stepTimeoutMs is requested again (retries times), and if it still
 * gets none the whole read() fails — a shifted value is never returned.
 *
 * Parity: the source driver has a `_useEvenParity` flag that sets/strips a
 * parity bit on every byte of these framed (SOH/STX/ETX) commands specifically.
 * If the corrector's serial settings (Инт2) are configured for 7E1 rather than
 * 8N1, pass evenParity: true — try false first, since the plain Mode-C
 * exchange (steps 1-2) works fine without it.
 *
 * Usage:
 *   const client = new Ek270Iec61107Client({ host: '94.180.248.157', port: 5021 });
 *   const results = await client.read();
 *
 * Through a GPRS modem that connects to us (БАРС-02, ETA GSM; see ./gprs-modem-gateway.js),
 * createSocket replaces host and port:
 *   const client = new Ek270Iec61107Client({
 *       createSocket: () => gateway.createSocket({ identifier: '0458', port: 'rs485', baudRate: 9600 }),
 *   });
 *
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself. When several devices (Mercury230,
 * EK270, Взлет026, Modicon, ...) sit behind the same TCP-serial gateway
 * (e.g. one Wiznet WIZ108SR bridging one shared RS-485 bus), the CALLER is
 * responsible for wrapping read() in the shared withConnectionLock() from
 * ./connection-lock — see the Node-RED subflow, which does exactly that.
 */

const net = require('net');

const SOH = 0x01, STX = 0x02, ETX = 0x03, ACK = 0x06, CR = 0x0d, LF = 0x0a;

// IEC 61107 addresses read by default, exactly as sent by the working driver
// (Functions.cs) plus the status and battery values; the meaning of each one
// (manual ЛГТИ.407229.170 РЭ, lists 1.5.x) is given by the Node-RED mapping.
const ADDRESSES = [
    '1:180.0', // serial number
    '1:400.0', // clock
    '5:310.0', // correction factor
    '2:310.0', // standard flow rate
    '4:310.0', // working flow rate
    '7:310.0', // pressure
    '6:310_1.0', // temperature
    '2:300.0', // standard volume
    '4:300.0', // working volume
    '2:301.0', // disturbance standard volume
    '2:302.0', // total standard volume
    '4:301.0', // disturbance working volume
    '4:302.0', // total working volume
    '2:190.0', // firmware
    '2:141.0', // reporting hour
    '4:150.0', // archive interval
    '1:100.0', // current general status
    '1:101.0', // general status register
    '2:100.0', // system status
    '2:404.0', // remaining battery life, months
];

// Addresses whose values stay strings — identifiers/version labels, not
// measurements ("1.60" must not become 1.6).
const STRING_ADDRESSES = new Set(['1:180', '2:190']);
const CLOCK_ADDRESS = '1:400';
// Status addresses answer with every active message number in its own
// brackets, e.g. "1:100.3(1)(13)(14)(16)"; they are returned as a list.
const LIST_ADDRESSES = new Set(['1:100', '1:101', '2:100']);

// Device identification line, e.g. "/Els6EK270\r\n" — "/" + 3-letter maker
// code + baud-rate digit. Does not match another master's "/?1!\r\n" request.
const IDENTIFICATION_PATTERN = /\/[A-Za-z]{3}\d[^\r\n]*\r\n/;

class Ek270Iec61107Client {
    /**
     * @param {object} options
     * @param {string} options.host - Corrector's IP/hostname (GPRS gateway, e.g. МТЭК).
     * @param {number} options.port - TCP port (e.g. 5021).
     * @param {boolean} [options.evenParity=false] - Set/strip even parity on framed commands.
     * @param {number} [options.stepDelayMs=300] - Pause between handshake steps.
     * @param {number} [options.stepTimeoutMs=5000] - Wait for a valid reply to one parameter request.
     * @param {number} [options.retries=1] - Extra requests for a parameter that got no valid reply.
     * @param {number} [options.responseTimeoutMs=30000] - Overall timeout for a full read() call.
     * @param {string[]} [options.addresses] - IEC 61107 addresses to read (default: ADDRESSES).
     * @param {() => net.Socket} [options.createSocket] - Socket factory (default: a new net.Socket); a GPRS modem channel
     *     from the gateway (GprsModemGateway#createSocket) makes host and port unnecessary.
     */
    constructor({ host, port, createSocket = null, evenParity = false, stepDelayMs = 300, stepTimeoutMs = 5000, retries = 1, responseTimeoutMs = 30000, addresses = ADDRESSES } = {}) {
        if (!host && !createSocket) throw new Error('Ek270Iec61107Client: "host" is required');
        if (!port && !createSocket) throw new Error('Ek270Iec61107Client: "port" is required');

        this.host = host;
        this.port = port;
        this.createSocket = createSocket || (() => new net.Socket());
        this.evenParity = evenParity;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
        this.addresses = addresses;
    }

    static get ADDRESSES() {
        return ADDRESSES;
    }

    _xorBcc(bytes) {
        let bcc = 0;
        for (const b of bytes) bcc ^= b;
        return bcc;
    }

    // Sets 7-bit-plus-even-parity on each data byte (mirrors the driver's SetParity()).
    _applyEvenParity(buffer) {
        if (!this.evenParity) return buffer;
        const out = Buffer.alloc(buffer.length);
        for (let i = 0; i < buffer.length; i++) {
            const b = buffer[i] & 0x7f;
            let ones = 0;
            for (let bit = 0; bit < 7; bit++) if (b & (1 << bit)) ones++;
            out[i] = (ones % 2 === 0) ? b : (b | 0x80);
        }
        return out;
    }

    // Strips the parity bit before decoding (mirrors the driver's RemoveParity()).
    _removeParity(buffer) {
        if (!this.evenParity) return buffer;
        const out = Buffer.alloc(buffer.length);
        for (let i = 0; i < buffer.length; i++) out[i] = buffer[i] & 0x7f;
        return out;
    }

    // SOH <cmd><type> STX <body> ETX BCC
    _buildFrame(cmdChar, body) {
        const payload = Buffer.from(`${cmdChar}1${String.fromCharCode(STX)}${body}${String.fromCharCode(ETX)}`, 'ascii');
        const bcc = this._xorBcc(payload);
        const frame = Buffer.concat([Buffer.from([SOH]), payload, Buffer.from([bcc])]);
        return this._applyEvenParity(frame);
    }

    _readCommand(address) {
        return this._buildFrame('R', `${address}()`);
    }

    _writeCommand(address, value) {
        return this._buildFrame('W', `${address}(${value})`);
    }

    // Cuts the first complete frame (SOH/STX ... ETX BCC) off `buffer`,
    // dropping any bytes before it (stray ACK/NAK, wake-up zeros, ...).
    // Returns { frame, bccOk, rest }; frame is null while none is complete.
    _takeFrame(buffer) {
        const start = buffer.findIndex((b) => b === SOH || b === STX);
        if (start === -1) return { frame: null, bccOk: false, rest: Buffer.alloc(0) };

        const etx = buffer.indexOf(ETX, start);
        if (etx === -1 || etx + 1 >= buffer.length) {
            return { frame: null, bccOk: false, rest: buffer.subarray(start) };
        }

        const frame = buffer.subarray(start, etx + 2);
        const bccOk = this._xorBcc(frame.subarray(1, frame.length - 1)) === frame[frame.length - 1];
        return { frame, bccOk, rest: buffer.subarray(etx + 2) };
    }

    // Splits a data frame STX "<address>(<value>)" ETX BCC into the echoed
    // address and the value, dropping any unit suffix (device sends
    // "value*unit", e.g. "260.63*м3" — units are legacy-encoded and not
    // needed here). Only STX frames are replies: an SOH frame is a request
    // (possibly another master's "R1 2:302.0(0)") and must never be taken
    // as a value. Returns the raw string of the first bracket group as
    // `value` and of every group as `values` (status addresses list one
    // message number per group); typing happens in _finalizeResults().
    _parseDataFrame(frame) {
        if (frame[0] !== STX) return null;
        const text = frame.toString('latin1');
        const match = text.match(/^\x02([^(]*)((?:\([^)]*\))+)/);
        if (!match) return null;
        const values = [...match[2].matchAll(/\(([^)]*)\)/g)].map((group) => group[1].split('*')[0]);
        return { address: match[1], value: values[0], values };
    }

    // "7-2:302.2" -> "2:302", "6:310_1.0" -> "6:310_1": compares a request
    // address with the echoed one, ignoring the archive prefix and value index.
    _coreAddress(address) {
        const match = String(address).match(/^(?:\d+-)?(\d+:[0-9A-Za-z_]+)\.\d+$/);
        return match ? match[1] : address;
    }

    // Device clock, sent as "YYYY-MM-DD,HH:mm:ss" — converted to epoch ms so
    // it's consistent with `timestamp` (poll time). Interpreted as the
    // device's local wall-clock time (no TZ in the protocol), same convention
    // as the Node process's own local time.
    _parseDeviceTime(raw) {
        const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2}),(\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        const [, y, mo, d, h, mi, s] = m.map(Number);
        return new Date(y, mo - 1, d, h, mi, s).getTime();
    }

    // Types the raw string results, keyed by core address ("2:302"): the
    // clock as epoch ms, identifiers as strings, everything else as a number
    // (null when it is not one); adds timestamp.
    _finalizeResults(rawResults) {
        const out = {};
        for (const [address, raw] of Object.entries(rawResults)) {
            if (raw === null || raw === undefined) {
                out[address] = null;
            } else if (STRING_ADDRESSES.has(address)) {
                out[address] = raw;
            } else if (address === CLOCK_ADDRESS) {
                out[address] = this._parseDeviceTime(raw);
            } else if (LIST_ADDRESSES.has(address)) {
                out[address] = raw.filter((v) => v.trim() !== '').map(Number).filter((n) => !Number.isNaN(n));
            } else {
                const num = parseFloat(raw);
                out[address] = Number.isNaN(num) ? null : num;
            }
        }
        out.timestamp = Date.now();
        return out;
    }

    /**
     * Reads every address of `addresses` from the EK270 over TCP, in one
     * session. Resolves with the raw values keyed by core address ("2:302",
     * "6:310_1"): numbers, the serial number 1:180 and firmware 2:190 as
     * strings, the clock 1:400 as epoch ms, the status addresses 1:100,
     * 1:101, 2:100 as lists of active message numbers, plus timestamp. Their meaning
     * (standard volume, pressure, status...) is given by the Node-RED
     * mapping (collect-device-state).
     *
     * Every value comes from a reply whose BCC is valid and whose echoed
     * address matches the request; frames from another master on the line
     * are skipped. Rejects when a parameter gets no such reply after
     * `retries` repeated requests, or on connection/protocol failure; the
     * rejected Error carries a `.partialResults` property with whatever was
     * read before the failure (typed and finalized the same way), so a
     * caller that wants "best effort" data on failure can still access it.
     *
     * Does not serialize access to a shared host:port — see the class doc
     * comment above if this device shares a gateway with others.
     *
     * @returns {Promise<Record<string, number|string|boolean|null>>}
     */
    read() {
        return new Promise((resolve, reject) => {
            const socket = this.createSocket();
            let buffer = Buffer.alloc(0);
            let step = 'start';
            const paramEntries = this.addresses.map((address) => [this._coreAddress(address), address]);
            let paramIndex = 0;
            let attempt = 0;
            let stepTimer = null;
            let finished = false;
            const results = {};

            const stop = () => {
                finished = true;
                clearTimeout(overallTimeout);
                clearTimeout(stepTimer);
            };

            const fail = (err) => {
                if (finished) return;
                stop();
                socket.destroy();
                err.partialResults = this._finalizeResults(results);
                reject(err);
            };

            const overallTimeout = setTimeout(() => {
                fail(new Error(`Ek270Iec61107Client: timed out waiting on step "${step}"`));
            }, this.responseTimeoutMs);

            // Anything still buffered when a request goes out belongs to an
            // earlier exchange (or to another master), so it is dropped.
            const send = (frame) => {
                if (finished) return;
                buffer = Buffer.alloc(0);
                socket.write(frame);
            };

            const later = (fn) => setTimeout(() => { if (!finished) fn(); }, this.stepDelayMs);

            const takeFrame = () => {
                const { frame, bccOk, rest } = this._takeFrame(buffer);
                buffer = rest;
                return frame ? { frame, bccOk } : null;
            };

            const requestParam = () => {
                const [, address] = paramEntries[paramIndex];
                send(this._readCommand(address));
                clearTimeout(stepTimer);
                stepTimer = setTimeout(onStepTimeout, this.stepTimeoutMs);
            };

            const onStepTimeout = () => {
                const [name, address] = paramEntries[paramIndex];
                if (attempt < this.retries) {
                    attempt += 1;
                    requestParam();
                    return;
                }
                fail(new Error(`Ek270Iec61107Client: no valid reply for "${name}" (${address})`));
            };

            const nextParam = () => {
                clearTimeout(stepTimer);
                attempt = 0;
                if (paramIndex >= paramEntries.length) {
                    stop();
                    // Every reply is in; destroy instead of end(), since the
                    // gateway never closes its side and a half-open socket
                    // would linger after each poll.
                    socket.destroy();
                    resolve(this._finalizeResults(results));
                    return;
                }
                later(requestParam);
            };

            socket.connect(this.port, this.host, () => {
                send(Buffer.from('/?!\r\n', 'ascii'));
            });

            socket.on('data', (chunk) => {
                if (finished) return;
                buffer = Buffer.concat([buffer, this._removeParity(chunk)]);

                if (step === 'start') {
                    if (!IDENTIFICATION_PATTERN.test(buffer.toString('latin1'))) return;
                    step = 'setBaudRate';
                    later(() => send(Buffer.from([ACK, 0x30, 0x36, 0x31, CR, LF]))); // <ACK>061
                    return;
                }

                // Password-challenge frame from the device (contains "P0(1234567)").
                // Not answered — the real driver unlocks via a direct write instead.
                // Just wait for a complete, valid frame before moving on.
                if (step === 'setBaudRate') {
                    let got;
                    while ((got = takeFrame())) {
                        if (got.bccOk && got.frame.toString('latin1').includes('P0')) {
                            step = 'unlock';
                            later(() => send(this._writeCommand('4:171.0', '0')));
                            return;
                        }
                    }
                    return;
                }

                if (step === 'unlock' && buffer.includes(ACK)) {
                    step = 'read';
                    nextParam();
                    return;
                }

                if (step === 'read') {
                    const [name, address] = paramEntries[paramIndex];
                    let got;
                    while ((got = takeFrame())) {
                        const reply = got.bccOk ? this._parseDataFrame(got.frame) : null;
                        if (reply && this._coreAddress(reply.address) === this._coreAddress(address)) {
                            results[name] = LIST_ADDRESSES.has(name) ? reply.values : reply.value;
                            paramIndex += 1;
                            nextParam();
                            return;
                        }
                        // Foreign frame: a repeat of an earlier reply, another
                        // master's request or reply, or a corrupted frame — skipped.
                    }
                }
            });

            socket.on('error', (err) => fail(err));
            socket.on('close', () => fail(new Error(`Ek270Iec61107Client: connection closed on step "${step}"`)));
        });
    }
}

module.exports = { Ek270Iec61107Client };

// Run directly for a quick standalone test (optionally with other addresses):
//   node ek270-iec61107-client.js <host> <port> [address,address,...]
if (require.main === module) {
    const [, , host, port, addresses] = process.argv;
    const client = new Ek270Iec61107Client({
        host: host || '94.180.248.157',
        port: Number(port) || 5021,
        ...(addresses ? { addresses: addresses.split(',') } : {}),
    });

    client.read()
        .then((results) => console.log(JSON.stringify(results, null, 2)))
        .catch((err) => {
            console.error('Error:', err.message);
            console.error('Partial results:', err.partialResults);
            process.exit(1);
        });
}
