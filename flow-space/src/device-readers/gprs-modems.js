'use strict';
/**
 * GPRS modems for the meter readers
 *
 * The one place the Node-RED reader subflows go through when a meter sits
 * behind a GPRS modem that connects to us instead of waiting for a
 * connection (БАРС-02 now; ETA GSM once the gateway speaks its protocol, see
 * .docs/eta-gsm/eta-gsm-notes.md). A subflow sets GPRS_MODEM_ID to the
 * identifier the modem sends on connect and GPRS_LINE to the meter's line,
 * then builds its reader with readerOptions() in place of host and port:
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
 * 8N1", or "none" to leave the modem's line as configured (old-firmware
 * БАРС-02 3.0.1). Over GPRS a request takes 4-5 s, so the readers get 15 s per
 * request and at least 240 s per read.
 */

const { getGateway, parseLineSettings } = require('./bars02-gateway.js');

const LISTEN_PORT = Number(process.env.GPRS_LISTEN_PORT) || 2910;
const STEP_TIMEOUT_MS = 15000;
const MIN_RESPONSE_TIMEOUT_MS = 240000;

// Starts the listener (once per process; Node-RED keeps it across deploys).
function start() {
    return getGateway(LISTEN_PORT).ready;
}

/**
 * Reader options that send a read through the modem `identifier`:
 * { createSocket, stepTimeoutMs, responseTimeoutMs }, to spread over the
 * reader's own options in place of host and port.
 */
async function readerOptions({ identifier, line, responseTimeoutMs = 0 }) {
    if (!identifier) throw new Error('gprs-modems: "identifier" is required');
    const settings = parseLineSettings(line);
    const gateway = getGateway(LISTEN_PORT);
    await gateway.ready;
    return {
        createSocket: () => gateway.createSocket({ identifier, ...settings }),
        stepTimeoutMs: STEP_TIMEOUT_MS,
        responseTimeoutMs: Math.max(responseTimeoutMs, MIN_RESPONSE_TIMEOUT_MS),
    };
}

// The modems connected now: identifier, remote address, signal, busy...
function modems() {
    return getGateway(LISTEN_PORT).modems();
}

module.exports = { start, readerOptions, modems, LISTEN_PORT };
