'use strict';
/**
 * GPRS modems for the meter readers
 *
 * The one place the Node-RED reader subflows go through when a meter sits
 * behind a GPRS modem that connects to us instead of waiting for a
 * connection: БАРС-02 and the company's own ETA GSM modem, both on one
 * listener (./gprs-modem-gateway.js, which tells them apart by their hello).
 * A subflow sets GPRS_MODEM_ID to the identifier the modem sends on connect
 * and GPRS_LINE to the meter's line, then builds its reader with
 * readerOptions() in place of host and port:
 *
 *   const transport = GPRS_MODEM_ID
 *       ? await gprsModems.readerOptions({ identifier: GPRS_MODEM_ID, line: GPRS_LINE, responseTimeoutMs })
 *       : { host: HOST, port: PORT };
 *   const client = new Vkt7Client({ address: ADDRESS, ...transport });
 *
 * Every modem connects to one listener (LISTEN_PORT, 2910, published by
 * docker-compose; the office router forwards a public port to it), which
 * reads one meter per modem at a time. GPRS_LINE is
 * "<rs232 | rs232-powered | rs485> <baud> 8<N|E|O><1|2>", e.g. "rs485 9600
 * 8N1" (a БАРС-02 selects that port; an ETA GSM keeps its wired port and
 * gets the speed and format), or "none" to leave the modem's line as
 * configured. Over GPRS a request takes 4-5 s, so the readers get 15 s per
 * request and at least 240 s per read.
 */

const { GprsModemGateway, parseLineSettings } = require('./gprs-modem-gateway.js');
const bars02 = require('./bars02-protocol.js');
const etaGsm = require('./eta-gsm-protocol.js');

const LISTEN_PORT = Number(process.env.GPRS_LISTEN_PORT) || 2910;
const STEP_TIMEOUT_MS = 15000;
const MIN_RESPONSE_TIMEOUT_MS = 240000;

// One gateway per listening port in the process (Node-RED: shared by every
// subflow instance and kept across deploys, so the modems stay connected).
// `ready` settles when the port is listening; a failed start is forgotten,
// so the next call tries again.
const gateways = new Map();

function getGateway(port = LISTEN_PORT) {
    let gateway = gateways.get(port);
    if (gateway) return gateway;
    gateway = new GprsModemGateway({ port, protocols: [etaGsm, bars02] });
    const log = (text) => console.log(`[GPRS :${port}] ${text}`);
    gateway.on('log', (text) => {
        if (!text.startsWith('keep-alive:')) log(text);
    });
    gateway.on('modem', ({ identifier, type, remote }) => log(`${identifier} (${type}) connected from ${remote}`));
    gateway.on('modem-closed', ({ identifier, type }) => log(`${identifier} (${type}) disconnected`));
    gateway.on('unsolicited', ({ identifier, frame }) => log(`${identifier} sent ${frame.replace(/[\r\n\t]+/g, ' ')}`));
    gateway.ready = gateway.start().catch((err) => {
        gateways.delete(port);
        throw new Error(`GPRS modem gateway cannot listen on ${port}: ${err.message}`);
    });
    gateway.ready.catch(() => {}); // reported to whoever awaits it
    gateways.set(port, gateway);
    return gateway;
}

// Starts the listener (once per process; Node-RED keeps it across deploys).
function start() {
    return getGateway().ready;
}

/**
 * Reader options that send a read through the modem `identifier`:
 * { createSocket, stepTimeoutMs, responseTimeoutMs }, to spread over the
 * reader's own options in place of host and port.
 */
async function readerOptions({ identifier, line, responseTimeoutMs = 0 }) {
    if (!identifier) throw new Error('gprs-modems: "identifier" is required');
    const settings = parseLineSettings(line);
    const gateway = getGateway();
    await gateway.ready;
    return {
        createSocket: () => gateway.createSocket({ identifier, ...settings }),
        stepTimeoutMs: STEP_TIMEOUT_MS,
        responseTimeoutMs: Math.max(responseTimeoutMs, MIN_RESPONSE_TIMEOUT_MS),
    };
}

// The modems connected now: identifier, type, remote address, signal, busy...
function modems() {
    return getGateway().modems();
}

module.exports = { start, readerOptions, modems, getGateway, LISTEN_PORT };
