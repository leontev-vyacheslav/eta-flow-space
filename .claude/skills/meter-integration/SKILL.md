---
name: meter-integration
description: End-to-end checklist for connecting a new meter to the platform or reworking an existing one (documents, live probe, reader, Node-RED subflow and tab, mapping, device row, data schema, diagram, migrations, verification, deploy). Use whenever a meter is added, moved, replaced or its polling is rewritten.
---

# Meter integration workflow

Combines the two project rules: **the reader reads everything raw** (`device-reader-raw`) and **the
mapping gives the meaning** (`device-state-mapping`). Work in this order; report findings from the live
device to the user as you go.

## 1. Documents

- Protocol description + operating manual from the manufacturer into `.docs/<device_type code>/`
  (`tv7`, `vkt7`, `km5`, `ek270`, `irvis`, `mercury230`, `vzljot026`...), ASCII names
  `<type>-protocol-*.pdf` / `<type>-manual-*.pdf`, one row each in `.docs/README.md` (original Russian
  title, edition, source URL). Verify every PDF opens fully (pypdf: page count, first-page title, last page
  extracts) — mirrors are often truncated or the wrong model.

## 2. Probe the live device

- Small script in the scratchpad (never in the repo): identity (serial number!), every block/command,
  byte order, unsupported values, timing. Compare with what the site claims (a "mock" note turned out to be
  wrong: Взлёт026 1415796).
- Production Node-RED polls the same gateways: space probes out, expect collisions; never keep idle
  connections open for long.

## 3. Reader + subflow

- Client per `device-reader-raw`; register it in `flow-space/settings.js`.
- Subflow "<Type> Client" in `flow-space/flows.json`, modelled on an existing one (`TV7 Client`,
  `Vzljot026 Client`): env HOST, PORT, ADDRESS, SERIAL_NUMBER (if any), RESPONSE_TIMEOUT_MS; the function
  wraps `client.read()` in `withConnectionLock`, sends `msg.payload`, sets a green/red status, calls
  `node.error` and sends nothing on failure; a status node. Subflow `info` describes the raw output.
- When replacing stock Modbus-node polling: keep the old chain, **disable its main read node** (`"d": true`
  after `"z"`), rename its comment ("old Modbus-node polling, disabled"), fix obvious bugs in it too.
- Keep a backup of a client before reworking a delicate device: `.temp/<file>.<last-commit-date>.js`.

## 4. Site tab

- Comment (`<device code> [<id>] (...)`), inject (interval agreed: 60 s typical, 180–300 s for slow or
  battery devices), subflow instance, `collect-device-state` per `device-state-mapping`, inactive debug.

## 5. Database and statics (new devices)

- Migration `database/migrations/YYYY-MM-DD-add-<site>-<type>.sql` in the style of
  `2026-10-09-add-tsarevo1-tv7.sql`: `device_type` row if new, device (code `<site>-<type>-<serial>`, name,
  description, flowId/location/order of the site's boiler room, `deviceTypeId`), `mnemoschema_selector`
  (source = the site's boiler room), `emergency` row (`'[]'`, interval 3), user links (ask which users).
  The `collect-device-state` addresses it by this code (`DEVICE_CODE`), so the code must be unique (the
  database enforces it).
- Test the migration on a throwaway Postgres; add a row to `database/README.md`.
- Data schema `flow-space-statics/devices/<code>/data-schema.json` built from a similar meter's schema
  (same groups, labels, units as the state), then regenerate the manifest.
- Diagram bindings only if the user asks; render a preview with real state for any visual change.

## 6. Verify

- Old vs new state field by field against the live meter (see `device-state-mapping`).
- Reliability: several sessions, requests and seconds per session, failures explained.
- Read-only production checks after deploy: the device's latest `device_state` row has the expected
  fields, and neighbouring devices on the same flow still store their own data.

## 7. Deploy notes for the user

- `git pull`, then `docker restart eta-flow-space` (settings.js / clients load only at startup); reload
  open Node-RED editor tabs before any Deploy (a stale editor writes old flows back — check drift with
  `python3 flow-space/flows-diff.py`).
- Migrations: the command is in `database/README.md`; say whether to run before or after the restart
  (data fixes that old polling would undo: after).
- Reporting service restart if reports changed.

## Pitfalls seen in this project

- Misspelled payload keys silently store zeros (`presure` vs `pressure`) and flags decoded from the raw
  message instead of the decoded values stay 0 — compare against live values, not just "no errors".
- Scale factors from memory are often wrong (Меркурий current 0.01 vs the protocol's 0.001): check every
  factor against the document and a physical identity (S = U·I, T1+T2 = total, W1 − W2 = W).
- Passwords may be sent as digit values, not ASCII (Меркурий 230).
- Preserve file formatting: CRLF SVGs, 2-space JSON without a final newline — check `git diff --stat`.
- Every meter follows the raw/mapping pattern now; boiler controllers (Modicon, Siemens, Statum,
  Царёво-2) stay on the stock Modbus nodes on purpose.
