---
name: device-state-mapping
description: Write or change a Node-RED collect-device-state mapping (flow-space-nodered-a/flows.json) the project way — "the mapping gives the meaning". Use after adding or reworking a device reader, when renaming state fields, or when a site needs other pipes/channels or units.
---

# The mapping gives the meaning

Each polled device has a `collect-device-state` function node on its site's tab in
`flow-space-nodered-a/flows.json`, right after the reader subflow. It receives the reader's **raw** payload (see the
`device-reader-raw` skill) and:

- **picks the pipes or channels that matter for this site** — e.g. ВКТ-7 heat input 1 `t1`/`t2`, ТВ7
  `input1.pipe1`/`pipe2`, Взлёт026 pipes `TR1`/`TR2`, Меркурий `energy.T1.Aplus`;
- **converts units** to what the state keeps: Gcal (`GJ / 4.1868`), kgf/cm² (`MPa × 10.1972`; atm = kgf/cm²),
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
    ...
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
  `meter-integration` skill (`<site>-<type code>-<serial>`); renaming a code is described there too.

## Keeping the stored state identical (when reworking)

1. Save the old state before changing anything: the old client's output (`git show HEAD:<file>` into the
   scratchpad, run it) and/or the latest `device_state` row.
2. Run the full chain outside Node-RED: subflow function → new client → new mapping, with a mock Redis,
   against the live meter (see past `*chain.js` scripts in the scratchpad pattern: load `flows.json`, run
   the subflow `func` with `new Function('msg','env','global','node', func)`, then the mapping with an
   AsyncFunction).
3. Compare field by field: same keys and types; values differ only by the time between reads; totals
   continue the stored history.

## Renaming fields or fixing stored data

A rename touches more than the mapping — find every use first:
`grep -rn "<field>" --include=*.py --include=*.ts --include=*.tsx --include=*.js --include=*.json --include=*.svg --include=*.html`.
- data schema `flow-space-statics/devices/<code>/data-schema.json` (keep its exact formatting: indent,
  final newline — rewrite only the changed keys, check `git diff --stat`), then regenerate
  `flow-space-statics/manifest.json` (`generate-manifest.sh` with the local path);
- diagrams `mnemo-schema.svg` (`states['<code>'].<field>`; many SVGs use CRLF — open with `newline=''`);
- reports in `flow-space-reporting` (`METRICS` pairs are `(state key, column name)`; templates use the
  column name);
- emergency rules in the database (`emergency.reasons`).
- **History**: a migration `database/migrations/YYYY-MM-DD-*.sql` that renames keys / recomputes values
  from stored raw words. Make it **idempotent** (only rows still in the old form change; a second run
  changes nothing), test it twice on a throwaway Postgres (`docker run postgres:17` + `database/schema.sql`
  + sample rows of every kind, incl. another device), add a "not yet" row to `database/README.md`, and say
  whether to run it before or after the deploy.

## Show the change

Show flows.json changes as per-node function line diffs (`python3 flow-space-nodered-a/flows-diff.py`), not raw JSON.
Propose a commit message in the repo style; the user commits.
