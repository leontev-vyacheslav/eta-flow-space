'use strict';
/**
 * ETA GSM for the GPRS modem gateway (./gprs-modem-gateway.js)
 *
 * The company's own GPRS modem (ООО «ИЦ ЭНЕРГОТЕХАУДИТ», «GPRS-модем
 * S800Based», .docs/eta-gsm/eta-gsm-manual-re-165-001-160517-2018.pdf; notes
 * and the 2026-10-28 field run in .docs/eta-gsm/eta-gsm-notes.md) connects to
 * its server, sends three lines and is then transparent to its serial port:
 *
 *   modem → server   <identifier>\r\nCSQ: <rssi>,<ber>\r\n<Modbus address, 254>\r\n
 *                    (no reply expected; no command mode, no escape)
 *
 * The modem itself is controlled in band: a Modbus RTU frame to its own
 * address (functions 03, 04, 06, 0x10, at most 20 registers) after at least
 * 1 s of silence is taken as a command, answered by the modem, and the meter
 * bus is ignored meanwhile. Register addresses are byte offsets into its
 * settings, N registers read 2N bytes; numbers are big-endian (the baud
 * rate low word first), text is byte-swapped within each word. Used here:
 *
 *   holding 0x0006      modBusId (the keep-alive reads it, as the old engine does)
 *   holding 0x00CC-D3   selectSerial (0 RS-232, 1 RS-485, 2 both), baud rate (2 registers),
 *                       data format (8N1 0x06, 8N2 0x0E, 8E1 0x26, 8E2 0x2E, 8O1 0x36, 8O2 0x3E)
 *   input   0x0002      local IP (char[16]); 0x0012 signal "rssi,ber" (char[6]); 0x0018 revision
 *
 * Before a meter session the speed and format are set to the meter's line
 * when they differ (the old engine does the same before every poll for the
 * modems it marks "needs reconfiguring"); they are not saved, so the modem's
 * daily reboot restores its own. Firmware other than revision 101 needs
 * 2.5 s before such a write and 20 s (speed) or 5 s (format) after it. The
 * RS-232/RS-485 choice (selectSerial) is the installer's and is never
 * changed. The gateway option lineChanges: false turns writing off: a read
 * whose line differs then fails.
 *
 * Over GPRS an in-band reply takes up to 15-17 s, so the wait is 25 s. A
 * modem that misses keep-alives stays connected, like in the old engine.
 */

const { decodeText, sleep } = require('./gprs-modem-gateway.js');

const DEFAULT_ADDRESS = 254;
const SILENCE_MS = 1100;
const REPLY_TIMEOUT_MS = 25000;
const NEW_FIRMWARE = 101;
const PAUSE_BEFORE_WRITE_MS = 2500;
const PAUSE_AFTER_SPEED_MS = 20000;
const PAUSE_AFTER_FORMAT_MS = 5000;

const HOLDING_MODBUS_ID = 0x0006;
const HOLDING_LINE = 0x00cc; // selectSerial, baud rate (2), data format
const HOLDING_BAUD_RATE = 0x00ce;
const HOLDING_DATA_FORMAT = 0x00d2;
const INPUT_LOCAL_IP = 0x0002;
const INPUT_SIGNAL = 0x0012;
const INPUT_REVISION = 0x0018;

const FORMAT_CODES = { none: { 1: 0x06, 2: 0x0e }, even: { 1: 0x26, 2: 0x2e }, odd: { 1: 0x36, 2: 0x3e } };
const FORMAT_NAMES = { 0x06: '8N1', 0x0e: '8N2', 0x26: '8E1', 0x2e: '8E2', 0x36: '8O1', 0x3e: '8O2', 0x04: '7N1', 0x24: '7E1' };
const SERIALS = ['RS-232', 'RS-485', 'RS-232 + RS-485'];

function crc16(bytes) {
    let crc = 0xffff;
    for (const b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
    }
    return crc;
}
const crcOk = (frame) => frame.length >= 4 && crc16(frame.subarray(0, frame.length - 2)) === frame.readUInt16LE(frame.length - 2);
const withCrc = (bytes) => {
    const crc = crc16(bytes);
    return Buffer.from([...bytes, crc & 0xff, crc >>> 8]);
};

function swappedText(raw) {
    const bytes = Buffer.from(raw);
    for (let i = 0; i + 1 < bytes.length; i += 2) [bytes[i], bytes[i + 1]] = [bytes[i + 1], bytes[i]];
    const end = bytes.indexOf(0);
    return decodeText(end < 0 ? bytes : bytes.subarray(0, end));
}

function detect(bytes) {
    return /CSQ:/.test(bytes.toString('latin1'));
}

function parseHello(bytes) {
    const lines = decodeText(bytes).split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const csq = lines.map((l) => /^CSQ:\s*(\d+)\s*,\s*(\d+)/.exec(l)).find(Boolean);
    const address = lines.slice(1).find((l) => /^\d{1,3}$/.test(l));
    return {
        identifier: lines[0],
        signalQuality: csq ? Number(csq[1]) : null,
        address: address ? Number(address) : DEFAULT_ADDRESS,
    };
}

async function accept(modem, hello) {
    modem.state.address = hello.address;
}

// Finds the modem's reply to `fn` in buffer: { data } or { exception }.
function matchReply(buffer, address, fn, expect) {
    for (let at = 0; at + 5 <= buffer.length; at++) {
        if (buffer[at] !== address) continue;
        if (buffer[at + 1] === (fn | 0x80) && crcOk(buffer.subarray(at, at + 5))) return { exception: buffer[at + 2] };
        if (buffer[at + 1] !== fn) continue;
        if (expect.dataBytes !== undefined) {
            const length = 5 + expect.dataBytes;
            if (buffer[at + 2] === expect.dataBytes && at + length <= buffer.length && crcOk(buffer.subarray(at, at + length))) {
                return { data: Buffer.from(buffer.subarray(at + 3, at + length - 2)) };
            }
        } else if (at + 8 <= buffer.length && buffer.subarray(at + 2, at + 6).equals(expect.echo) && crcOk(buffer.subarray(at, at + 8))) {
            return { data: Buffer.alloc(0) };
        }
    }
    return undefined;
}

// One in-band Modbus exchange with the modem, after SILENCE_MS of silence.
async function modbus(modem, body, expect, { timeoutMs = REPLY_TIMEOUT_MS } = {}) {
    for (let quiet = Date.now() - modem.lastActivity; quiet < SILENCE_MS; quiet = Date.now() - modem.lastActivity) {
        await sleep(SILENCE_MS - quiet);
    }
    const address = modem.state.address;
    const { result } = await modem.exchange(withCrc([address, ...body]), (b) => matchReply(b, address, body[0], expect), { timeoutMs, quietMs: 0 });
    if (result.exception !== undefined) {
        throw new Error(`${modem.label}: exception ${result.exception} to function ${body[0]} at 0x${((body[1] << 8) | body[2]).toString(16)}`);
    }
    return result.data;
}

const readRegisters = (modem, fn, start, count) => modbus(modem, [fn, start >> 8, start & 0xff, count >> 8, count & 0xff], { dataBytes: count * 2 });

function writeRegisters(modem, start, words) {
    const echo = Buffer.from([start >> 8, start & 0xff, 0, words.length]);
    const data = words.flatMap((w) => [(w >> 8) & 0xff, w & 0xff]);
    return modbus(modem, [0x10, ...echo, words.length * 2, ...data], { echo });
}

async function readLine(modem) {
    const data = await readRegisters(modem, 3, HOLDING_LINE, 4);
    modem.state.line = {
        selectSerial: data.readUInt16BE(0),
        baudRate: data.readUInt16BE(2) | (data.readUInt16BE(4) << 16),
        dataFormat: data.readUInt16BE(6),
    };
    return modem.state.line;
}

async function revision(modem) {
    if (modem.state.revision === undefined) modem.state.revision = (await readRegisters(modem, 4, INPUT_REVISION, 1)).readUInt16BE(0);
    return modem.state.revision;
}

const describeLine = (line) => `${line.baudRate} ${FORMAT_NAMES[line.dataFormat] || `format 0x${line.dataFormat.toString(16)}`}`;

// Sets the modem's speed and format to the meter's line when they differ.
async function ensureLine(modem, { port, baudRate, parity = 'none', stopBits = 1 }) {
    const dataFormat = (FORMAT_CODES[parity] || {})[stopBits];
    if (!baudRate || dataFormat === undefined) throw new Error(`${modem.label}: no ETA GSM data format for ${parity} parity, ${stopBits} stop bits`);
    const wanted = { baudRate, dataFormat };
    let line = modem.state.line || (await readLine(modem));
    if (!modem.state.serialChecked && port) {
        modem.state.serialChecked = true;
        const serial = line.selectSerial;
        if ((port === 'rs485' && serial === 0) || (port !== 'rs485' && serial === 1)) {
            modem.gateway.emit('log', `${modem.label}: the meter is on ${port}, the modem serves ${SERIALS[serial] || serial} (not changed)`);
        }
    }
    if (line.baudRate === baudRate && line.dataFormat === dataFormat) return;
    if (!modem.gateway.lineChanges) {
        throw new Error(`${modem.label}: the modem's line is ${describeLine(line)}, the meter's ${describeLine(wanted)}; line changes are off`);
    }
    const slow = (await revision(modem)) !== NEW_FIRMWARE;
    modem.state.line = null; // unknown until read back
    if (line.baudRate !== baudRate) {
        if (slow) await sleep(PAUSE_BEFORE_WRITE_MS);
        await writeRegisters(modem, HOLDING_BAUD_RATE, [baudRate & 0xffff, baudRate >>> 16]);
        if (slow) await sleep(PAUSE_AFTER_SPEED_MS);
    }
    if (line.dataFormat !== dataFormat) {
        if (slow) await sleep(PAUSE_BEFORE_WRITE_MS);
        await writeRegisters(modem, HOLDING_DATA_FORMAT, [dataFormat]);
        if (slow) await sleep(PAUSE_AFTER_FORMAT_MS);
    }
    line = await readLine(modem);
    if (line.baudRate !== baudRate || line.dataFormat !== dataFormat) {
        throw new Error(`${modem.label}: the line is still ${describeLine(line)} after setting ${describeLine(wanted)}`);
    }
    modem.gateway.emit('log', `${modem.label}: line set to ${describeLine(line)}`);
}

async function open(modem, options) {
    if (options.selectPort !== false && options.baudRate) await ensureLine(modem, options);
    modem.buffer = Buffer.alloc(0);
}

async function close(modem) {
    modem.buffer = Buffer.alloc(0);
}

async function keepAlive(modem) {
    const data = await readRegisters(modem, 3, HOLDING_MODBUS_ID, 1);
    if (data.readUInt16BE(0) !== modem.state.address) {
        modem.gateway.emit('log', `${modem.label}: keep-alive read Modbus address ${data.readUInt16BE(0)}`);
    }
}

/**
 * 'status' -> { revision, signal, localIp, line } read in band; 'line' -> the
 * line settings. Reads only.
 */
async function query(modem, request = 'status') {
    if (request === 'line') return readLine(modem);
    if (request !== 'status') throw new Error(`${modem.label}: unknown query "${request}"`);
    const status = { revision: await revision(modem) };
    status.signal = swappedText(await readRegisters(modem, 4, INPUT_SIGNAL, 3));
    status.localIp = swappedText(await readRegisters(modem, 4, INPUT_LOCAL_IP, 8));
    const line = await readLine(modem);
    status.line = { ...line, format: FORMAT_NAMES[line.dataFormat] || null, serial: SERIALS[line.selectSerial] || null };
    return status;
}

// Bytes from the meter bus outside a meter session are dropped.
function onIdleData(modem) {
    modem.buffer = Buffer.alloc(0);
}

module.exports = {
    name: 'eta-gsm',
    label: 'ETA GSM',
    keepAliveDropAfter: Infinity,
    detect,
    parseHello,
    accept,
    open,
    close,
    keepAlive,
    query,
    onIdleData,
    crc16,
    swappedText,
};
