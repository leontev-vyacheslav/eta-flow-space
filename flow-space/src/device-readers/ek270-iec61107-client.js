'use strict';
/**
 * Ek270Iec61107Client
 *
 * TCP client for the EK270 gas volume corrector's IEC 61107-2001 programming
 * mode. Byte sequences and command list taken directly from the working
 * device driver (EnergyTechAudit.PowerAccounting.DeviceReader.Ek270).
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
 * Channel sharing: this class is transport-only and does NOT serialize
 * access to a shared host:port itself. When several devices (Mercury230,
 * EK270, Взлет026, Modicon, ...) sit behind the same TCP-serial gateway
 * (e.g. one Wiznet WIZ108SR bridging one shared RS-485 bus), the CALLER is
 * responsible for wrapping read() in the shared withConnectionLock() from
 * ./connection-lock — see the Node-RED subflow, which does exactly that.
 */

const net = require('net');

const SOH = 0x01, STX = 0x02, ETX = 0x03, ACK = 0x06, CR = 0x0d, LF = 0x0a;

// name -> IEC 61107 address, exactly as sent by the working driver (Functions.cs)
const PARAMETERS = {
    factoryNumber: '1:180.0',
    deviceTime: '1:400.0',
    correctionCoefficient: '5:310.0',
    standardVolumeFlow: '2:310.0',
    workVolumeFlow: '4:310.0',
    pressure: '7:310.0',
    temperature: '6:310_1.0',
    standardVolume: '2:300.0',
    workVolume: '4:300.0',
    disturbanceStandardVolume: '2:301.0',
    fullStandardVolume: '2:302.0',
    disturbanceWorkVolume: '4:301.0',
    fullWorkVolume: '4:302.0',
    firmware: '2:190.0',
    reportingHour: '2:141.0',
    archiveInterval: '4:150.0',
};

// Fields that stay strings — identifiers/version labels, not measurements.
const STRING_FIELDS = new Set(['factoryNumber', 'firmware']);

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
     */
    constructor({ host, port, evenParity = false, stepDelayMs = 300, stepTimeoutMs = 5000, retries = 1, responseTimeoutMs = 30000 } = {}) {
        if (!host) throw new Error('Ek270Iec61107Client: "host" is required');
        if (!port) throw new Error('Ek270Iec61107Client: "port" is required');

        this.host = host;
        this.port = port;
        this.evenParity = evenParity;
        this.stepDelayMs = stepDelayMs;
        this.stepTimeoutMs = stepTimeoutMs;
        this.retries = retries;
        this.responseTimeoutMs = responseTimeoutMs;
    }

    static get PARAMETERS() {
        return PARAMETERS;
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
    // as a value. Always returns the raw string; typing happens in
    // _finalizeResults().
    _parseDataFrame(frame) {
        if (frame[0] !== STX) return null;
        const match = frame.toString('latin1').match(/^\x02([^(]*)\(([^)]*)\)/);
        if (!match) return null;
        return { address: match[1], value: match[2].split('*')[0] };
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

    // Converts raw string results into properly typed values per the ek270
    // JSON schema, and adds timestamp to match its "state" fields.
    _finalizeResults(rawResults) {
        const out = {};
        for (const [name, raw] of Object.entries(rawResults)) {
            if (raw === null || raw === undefined) {
                out[name] = null;
            } else if (STRING_FIELDS.has(name)) {
                out[name] = raw;
            } else if (name === 'deviceTime') {
                out[name] = this._parseDeviceTime(raw);
            } else {
                const num = parseFloat(raw);
                out[name] = Number.isNaN(num) ? null : num;
            }
        }
        out.timestamp = Date.now();
        return out;
    }

    /**
     * Reads all parameters from the EK270 over TCP, in one session.
     * Resolves with values typed per the ek270 JSON schema: numeric
     * measurements as `number`, factoryNumber/firmware as `string`,
     * deviceTime as epoch ms `integer`, plus timestamp.
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
            const socket = new net.Socket();
            let buffer = Buffer.alloc(0);
            let step = 'start';
            const paramEntries = Object.entries(PARAMETERS);
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
                            results[name] = reply.value;
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

// Run directly for a quick standalone test:
//   node Ek270Iec61107Client.js <host> <port>
if (require.main === module) {
    const [, , host, port] = process.argv;
    const client = new Ek270Iec61107Client({
        host: host || '94.180.248.157',
        port: Number(port) || 5021,
    });

    client.read()
        .then((results) => console.log(JSON.stringify(results, null, 2)))
        .catch((err) => {
            console.error('Error:', err.message);
            console.error('Partial results:', err.partialResults);
            process.exit(1);
        });
}
