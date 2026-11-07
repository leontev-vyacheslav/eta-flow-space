---
name: device-state-mapping
description: Create or change Eta Flow Space collect-device-state mappings, normalized fields, units, or channels, including schema, diagram, report, alarm, and history compatibility.
---

# The mapping gives the meaning

Adapted from `.claude/skills/device-state-mapping/SKILL.md`. Paths are relative to the repository root.

Each polled device has a `collect-device-state` function node on its site's tab in
`flow-space-nodered-a/flows.json` (production; a test instance's lives on the testing tab in `flow-space-nodered-b/flows.json`,
with `DEVICE_CODE = null` until the meter has a device row), right after the reader subflow.
A null-code test function must explicitly skip persistence: the storage helper does not accept null.
Inspect A/B/C ownership in the actual flows before editing. It receives the reader's **raw** payload (see [device-reader-raw](../device-reader-raw/SKILL.md)) and:

- **picks the pipes or channels that matter for this site** — e.g. ВКТ-7 heat input 1 `t1`/`t2`, ТВ7
  `input1.pipe1`/`pipe2`, Взлёт026 pipes `TR1`/`TR2`, Меркурий `energy.T1.Aplus`;
- **converts units** to what the state keeps: Gcal (`GJ / 4.1868`), kgf/cm² (`MPa × 10.1972`; technical atmosphere (at) = kgf/cm²; standard atmosphere (atm) differs),
  °C (`K − 273.15`), hours from h/min/s;
- **decodes meaning**: flags from flag words as booleans named for what they mean, "alarm active" from
  status message lists;
- **produces the state fields the data schemas, diagrams and reports already use** —
  `temperatureInputPipe`, `pressureReturnPipe`, `volumeFlowRateInputPipe`, `massInputPipe`,
  `totalHeatConsumption`, `normalOperationTime`, `deviceTime`, `timestamp`... — then stores it under
  the device's code: `storeDeviceStateToCacheAsync(global, DEVICE_CODE, deviceState, flowUid)`.

Never `...payload`: list every field explicitly.

## Writing the function

```js
const { storeDeviceStateToCacheAsync } = global.get('helpers');

// Units the device sends and what the state keeps (one line).
const GJ_PER_GCAL = 4.1868;
const convert = (value, factor, digits = 7) =>
    value === null || value === undefined ? null : Number((value * factor).toPrecision(digits));

const { input1, firmware, deviceTime } = msg.payload;

const deviceState = {
    // Heat input 1: pipe 1 is the supply, pipe 2 the return.

    // Temperature, °C
    temperatureInputPipe: input1.pipe1.t,     // supply water temperature
    temperatureReturnPipe: input1.pipe2.t,    // return water temperature

    // Heat, Gcal
    totalHeatConsumption: convert(input1.Qtv, 1 / GJ_PER_GCAL, 12),
    // Add the remaining state fields explicitly.
    timestamp: Date.now(),
};

const DEVICE_CODE = 'tsarevo1-tv7-19072584';
const flowUid = node.path.split('/').find(_ => true);
await storeDeviceStateToCacheAsync(global, DEVICE_CODE, deviceState, flowUid);
msg.deviceState = deviceState;

return msg;
```

Rules:

- **Comment every field with its meaning** (the user values this — a "Meaning" column in code form), group
  with short headings (measured values, raw words, flags from Fl_a...). State which pipe is the supply.
- **Names**: quantity first, then the qualifier (`volumeFlowRateInputPipe`, `volumeStandard`,
  `pressureReturnPipe`); flags end in `Flag` and are booleans (`lowFlowRateFlag`, `noFlowFlag`); human
  English, no protocol abbreviations (`lowQFl` → `lowFlowRateFlag`), no misspellings.
- `null` stays `null` (convert helpers must pass it through).
- **Device code, never a position**: `DEVICE_CODE` is the device's `code` (unique and NOT NULL since
  `2026-10-11-device-code-unique.sql`); passing `flowUid` makes the helper throw if the device belongs to
  another tab, and an unknown code throws too — a wrong code shows up as a Node-RED error instead of
  storing under another device. The old index form `(global, flowUid, deviceState, N)` only survives as
  a legacy fallback with a warning; don't write it. Device codes follow the naming conventions in the
  [meter-integration](../meter-integration/SKILL.md) (`<site>-<type code>-<serial>`); renaming a code is described there too.

## Keeping the stored state identical (when reworking)

Use authorized, bounded live reads or existing captures. If hardware access is unavailable, compare
fixtures offline and report the remaining live verification. Never connect a test mapping to production Redis.

1. Save the old state before changing anything: an existing capture, the latest authorized read-only
   `device_state` row, or the old client's output. Use `git show HEAD:<file>` to recover the old code.
2. Prefer `.tools/device-probes/subflow_run.js` for reader subflows and
   `.tools/flow-chain/run_modbus_tab.js` for stock Modbus tabs; read their READMEs before running them.
   For a custom harness, execute subflow → client → mapping with mock storage and captured frames or
   authorized live reads. Match Node-RED's asynchronous function lifecycle rather than assuming a
   plain `new Function` supports every subflow.
3. Compare field by field: same keys and types; values differ only by the time between reads; totals
   continue the stored history.

## Renaming fields or fixing stored data

A rename touches more than the mapping — find every use first:
`rg -n --hidden -F "<field>" flow-space-nodered-* flow-space-statics flow-space-ui/src flow-space-web-api/src flow-space-reporting database`.
Also inspect database-stored rules and settings when access is available; source search alone cannot find them.

- data schema `flow-space-statics/devices/<code>/data-schema.json` (keep its exact formatting: indent,
  final newline — rewrite only the changed keys, check `git diff --stat`), then regenerate
  `flow-space-statics/manifest.json` (`bash .tools/diagram-renderer/gen-manifest.sh` from the repository root);
- diagrams `mnemo-schema.svg` (`states['<code>'].<field>`; many SVGs use CRLF — open with `newline=''`);
- reports in `flow-space-reporting` (`METRICS` pairs are `(state key, column name)`; templates use the
  column name);
- emergency rules in the database (`emergency.reasons`).
- **History**: a migration `database/migrations/YYYY-MM-DD-*.sql` that renames keys / recomputes values
  from stored raw words. Make it **idempotent** (only rows still in the old form change; a second run
  changes nothing), test it twice on a throwaway Postgres (`docker run postgres:17` + `database/schema.sql`
  + sample rows of every kind, incl. another device). Refresh `database/schema.sql` consistently with
  the migration and affected ORM models; add a "not yet" row to `database/README.md`, and say whether
  to run it before or after the deploy.

## Show the change

Show flows.json changes as per-node function line diffs (`python3 flow-space-nodered-a/flows-diff.py`), not raw JSON.
Use [commit-message](../commit-message/SKILL.md) to propose a message; the user normally commits.
