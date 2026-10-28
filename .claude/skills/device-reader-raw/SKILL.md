---
name: device-reader-raw
description: Write or rework a meter device reader (flow-space/src/device-readers/*-client.js) the project way — "the reader reads everything raw". Use when adding a new meter, porting a meter from Node-RED Modbus nodes to its own client, or changing what an existing client reads.
---

# The reader reads everything raw

A device reader (`flow-space/src/device-readers/<type>-client.js`) polls **every current value the
protocol offers**, in the **device's own units**, with **no supply/return or other site interpretation**.
Names follow the **manufacturer's protocol document**, written in Latin letters and **grouped the way the
document groups them**. Giving the values their meaning is the job of the Node-RED mapping — see the
`device-state-mapping` skill.

Why: one generic client per device type works for any site; moving or rewiring a meter only changes the
mapping, and nothing the meter can tell us is thrown away.

## What "raw" means

- **Every current value**: read all current/instant values, current totals, statuses/flag words, identity
  (serial number, firmware, model) and the device clock. Not read: archives, settings/calibration,
  verification-mode copies — unless asked.
  - Exception — cost per value: if every value is a separate slow request or the device is battery powered
    (EK270, IEC 61107, ~0.4 s per address, batteries drain with reading), agree a short list with the user
    first: count the candidates, measure the session time, explain the cost.
- **Device units**: GJ, MPa, K, kPa, atm... stay as sent. Unit conversion is the mapping's job.
- **Decoding is allowed, interpretation is not**: byte order, BCD clocks, scaled integers (value /
  10^decimals from the device's own properties), long+float totals, status bracket lists → numbers, epoch
  ms, arrays. Choosing pipe 1 as "supply" or computing flags with human names is not.
- **Protocol names, transliterated**: `input1.pipe1.t` (ТВ7 Тв1 Тр1), `Qo`, `VNR`, `GM1`/`GV1` (КМ-5,
  where the protocol uses G1 for both mass and volume flow), `TR1.W`, `PR1.Q`, `Fl_a`/`Fl_b` (Ирвис),
  `"2:302"` (EK270 IEC 61107 address as the key). Group like the document: heat inputs → pipes, flow /
  temperature / pressure channels, the heat system (`TS`), `energy.T1.Aplus`...
- **Null, not invented values**: an element outside the measurement scheme, bad quality, NaN, a
  "not counted" marker (FFFFFFFF), counters a firmware does not support (zeros where `Tw` would be > 0)
  → `null`. An empty status list → `[]`, not `[0]`.
- Round float32 to 7 significant digits (`Number(v.toPrecision(7))`); the rest is noise.

## Transport rules (learned the hard way — keep them)

- **Strict reply matching**: accept a reply only when its CRC/BCC is valid, it comes from the requested
  address and function, and it has exactly the expected length. Skip anything else. Gateways forward every
  frame on the line to every TCP client, so another master's requests and replies arrive in our session
  (EK270 `:5021`, Взлёт026 `:5023`). A poll that cannot get every value **fails** — it never stores a value
  under the wrong field.
- **Retries** for "no valid reply" and the device's "busy" answers (КМ-5 0xF1, Modbus exception 6); never
  for a real error reply. The first request after a new TCP connection is often lost (Maestro, the Меркурий
  gateway) — the retry covers it.
- **Pause between requests** (stepDelayMs ~100 ms): some meters ignore a request sent right after their
  last reply (Взлёт026).
- **One session per read()**, overall timeout, `socket.destroy()` at the end (gateways never close their
  side). Transport-only: the Node-RED subflow wraps `read()` in `withConnectionLock(host, port, ...)`.
- **The transport is replaceable**: the socket comes from `this.createSocket()` (option `createSocket`,
  default `() => new net.Socket()`; host and port are then optional). A GPRS modem that connects to us
  (БАРС-02, ETA GSM) hands the reader a channel from the gateway instead, so use only `connect`, `write`,
  `on('data' | 'error' | 'close')` and `destroy` on the socket, keep the step and overall timeouts options
  (`stepTimeoutMs`, `responseTimeoutMs`; GPRS needs ~15 s per request), and don't rely on the connection
  being new for the first request. Every reader has it since 2026-10-28.
- **Identity check** when possible: serial number option (`serialNumber`) — read() fails if another device
  answers.
- **Unreadable registers**: if a block read gets "illegal address" or no reply, scan register by register
  (with pauses!) and split the block around the hole; document it in the header (Взлёт026 0x4006, 0xC13E).

## File shape (copy an existing client)

Use `tv7-client.js`, `vzljot026-client.js` (Modbus RTU, register blocks), `irvis-client.js` (Modbus RTU +
function 17 identity), `km5-client.js` (own binary protocol), `vkt7-client.js` (element lists),
`mercury230-client.js` (channel open/close, password) or `ek270-iec61107-client.js` (IEC 61107, values keyed
by address — touch its handshake only with great care) as the template:

1. Header comment: device, connection, the protocol document (title as in `.docs/README.md`), every
   request/register block and what it returns, encoding/byte order, the strict-matching paragraph, usage,
   the channel-sharing paragraph. Note device quirks found on the live meter.
2. Constants and register/element tables named after the protocol.
3. `class <Type>Client` with an options object (`host`, `port`, `createSocket`, `address`, timeouts, `retries`, `trace`),
   `_connect()` returning `{ request|readRegisters, close }`, `_readSession(connection, results)`,
   `read()` that rejects with `err.partialResults`.
4. `module.exports = { <Type>Client, ... }` and a CLI block: `node <type>-client.js <host> <port> ...`
   printing every frame to stderr — used to probe the live meter.
5. Register in `flow-space/settings.js` → `functionGlobalContext`: `<type>: require('./src/device-readers/<type>-client.js')`.

## Before writing

- Get the protocol document and manual into `.docs/<device_type code>/` with ASCII names
  `<type>-protocol-*.pdf` / `<type>-manual-*.pdf` and a row in `.docs/README.md` (original title, source
  URL). Read the protocol there; extract text with pypdf in a scratchpad venv.
- **Probe the live meter first** (small Node/Python script in the scratchpad): identity, every block,
  byte order, what is unsupported. Production polls the same lines — expect occasional collisions; space
  probes out.

## Verify

- Run the CLI against the live meter: every value decoded, identity correct, totals continue the stored
  history.
- Run 6–10 sessions: count requests and seconds per session; failures must be explained (collisions with
  production / another master), not ignored.
- Check the GPRS path: `node .tools/device-probes/reader_via_emulator.js <type>-client.js <host> <port>
  '<options json>'` reads the meter directly and through the БАРС-02 gateway + emulator and compares the fields.
- Then follow `device-state-mapping` to keep the stored state identical.
