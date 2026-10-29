---
name: meter-integration
description: End-to-end checklist for connecting a new meter to the platform or reworking an existing one (documents, live probe, reader, Node-RED subflow and tab, mapping, device row, data schema, diagram, migrations, verification, deploy). Use whenever a meter is added, moved, replaced or its polling is rewritten.
---

# Meter integration workflow

Combines the two project rules: **the reader reads everything raw** (`device-reader-raw`) and **the
mapping gives the meaning** (`device-state-mapping`). Work in this order; report findings from the live
device to the user as you go.

## Naming conventions

- **Site codes**: `spring1` (Весна-1), `spring2` (Весна-2), `tsarevo1`, `tsarevo2`, `statum`, `amirkhana99`.
  A new site gets a code in the same style (Latin, number for the site's part, never a bare "spring").
- **Device code** = `<site>-<type code>-<serial>`, the type code being `device_type.code` (`tv7`, `vkt7`,
  `km5`, `ek270`, `irvis`, `mercury230`, `vzljot026`...): `spring2-vkt7-289452`, `spring1-mercury230-26077096`.
  Boiler rooms: `<site>-boiler-room`. Unique and NOT NULL in the database.
- **Node-RED tab label = `flow.code`** = the site's main device code (`spring1-boiler-room`,
  `amirkhana99-hws-node`); the UI's routes are `/flow/<flow.code>`.
- **Reader instance name** on the tab: `<type>-<serial>` (`vkt7-289452`, `irvis-29804`); tab comment
  `<device code> [<id>] (...)`; Node-RED connection (config) nodes named after the site (`spring1-boilers`).
- **Statics folder** `flow-space-statics/devices/<device code>/`, data schema `"title"` = the device code.
- **Display names** (`device.name`, `flow.name`): Russian, with the site number ("Котельная ЖК Весна-1"),
  no leading/trailing spaces.

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

- Client per `device-reader-raw`; register it in `flow-space-nodered-a/settings.js`.
- Subflow "<Type> Client" in `flow-space-nodered-a/flows.json`, modelled on an existing one (`TV7 Client`,
  `Vzljot026 Client`): env HOST, PORT, ADDRESS, SERIAL_NUMBER (if any), RESPONSE_TIMEOUT_MS; the function
  wraps `client.read()` in `withConnectionLock`, sends `msg.payload`, sets a green/red status, calls
  `node.error` and sends nothing on failure; a status node. Subflow `info` describes the raw output.
- When replacing stock Modbus-node polling: keep the old chain, **disable its main read node** (`"d": true`
  after `"z"`), rename its comment ("old Modbus-node polling, disabled"), fix obvious bugs in it too.
- Keep a backup of a client before reworking a delicate device: `.temp/<file>.<last-commit-date>.js`.

## 4. Site tab

- Comment (`<device code> [<id>] (...)`), inject (interval agreed: 60 s typical, 180–300 s for slow or
  battery devices), subflow instance (`<type>-<serial>`), `collect-device-state` per
  `device-state-mapping` (`DEVICE_CODE`), inactive debug.
- A new site's tab is labelled with its boiler-room device code, and its `flow` row gets the same `code`.

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

## Renaming a device code (or a site)

Everything keyed by the code moves together, in one commit:
- `git mv` the statics folder (`flow-space-statics/devices/<old>` → `<new>`), update the schema `"title"`,
  regenerate `manifest.json`;
- diagram bindings `states['<old>']` in every `mnemo-schema.svg` (CRLF-safe edit);
- `DEVICE_CODE` and the comments in `flows.json`, the tab label / reader instance name if they carry it;
- docs, skills, memory; old migrations stay untouched (history);
- a migration renaming `device.code` (and `flow.code` if needed; match flows by `uid`), idempotent
  (`WHERE code = '<old>'`).
Find every use first with a word-boundary search that cannot hit a similar code (renaming `spring` must not
touch `spring2`): `git grep -nP "(?<![\w-])<old>(?![\w-])"`, plus the database text columns
(`emergency.reasons`, `report.settings`, `user.settings`, `device.settings`). Deploy: migration, then restart
the web API (it reloads the device cache in Redis on startup) and Node-RED; until both are done Node-RED
reports "device … is not in the device cache" for a few minutes — expected. Old UI bookmarks with the code
stop working; renamed flows reset the saved diagram zoom once.

## 6. Verify

- Old vs new state field by field against the live meter (see `device-state-mapping`).
- Reliability: several sessions, requests and seconds per session, failures explained.
- Read-only production checks after deploy: the device's latest `device_state` row has the expected
  fields, and neighbouring devices on the same flow still store their own data.

## 7. Deploy notes for the user

- `git pull`, then `docker restart eta-flow-space-nodered-a` (settings.js / clients load only at startup); reload
  open Node-RED editor tabs before any Deploy (a stale editor writes old flows back — check drift with
  `python3 flow-space-nodered-a/flows-diff.py`).
- Migrations: the command is in `database/README.md`; say whether to run before or after the restart
  (data fixes that old polling would undo: after) and whether another migration must run first (one that
  finds devices by a code that a rename changes must run before the rename).
- After the user applies them, verify each on production read-only by its effect (rows still in the old
  form, the constraint present) and mark it "yes (verified <date>)" in `database/README.md`. A row written
  between the migration and the restart can keep the old form — run the (idempotent) migration once more.
- Reporting service restart if reports changed.

## Pitfalls seen in this project

- Misspelled payload keys silently store zeros (`presure` vs `pressure`) and flags decoded from the raw
  message instead of the decoded values stay 0 — compare against live values, not just "no errors".
- Scale factors from memory are often wrong (Меркурий current 0.01 vs the protocol's 0.001): check every
  factor against the document and a physical identity (S = U·I, T1+T2 = total, W1 − W2 = W).
- Passwords may be sent as digit values, not ASCII (Меркурий 230).
- Preserve file formatting: CRLF SVGs, 2-space JSON without a final newline — check `git diff --stat`.
- Rename files and folders with `git mv` so history follows; regex renames need word boundaries.
- Node-RED `flows.json` on production drifts (editor Deploys): build on the user's `sync: flows` commits,
  never overwrite them; check them node by node with `flows-diff.py`.
- Every meter follows the raw/mapping pattern now; boiler controllers (Modicon, Siemens, Statum,
  Царёво-2) stay on the stock Modbus nodes on purpose.
