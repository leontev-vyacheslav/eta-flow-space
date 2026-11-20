# Node-RED instance A

This directory is `/data` for `eta-flow-space-nodered-a` (editor port 1895).
The exported tabs cover Tsarevo-1/2, Spring-1/2, Statum and Amirkhana-99. Shared settings,
readers and helpers in this directory are also mounted by instances B and C.

## Spring boiler-room weather

Spring-1 and Spring-2 each have one independent `Weather` instance, named `spring1-weather`
and `spring2-weather`. The shared definition and internal node IDs/configuration match B exactly.
Instance parameters are `INTERVAL=1800` seconds and the corresponding controller `DEVICE_CODE`.
The timer starts after 30 seconds and then repeats every 30 minutes.

The subflow reads the controller's registered coordinates from the device cache and the existing
`OPENWEATHER_API_KEY` from the inherited container environment. Compose loads this key from the
ignored `.env-flows` file; `.env.example` documents it. No API key is stored in exported flows.
Missing coordinates, device/tab mismatches or missing credentials skip the request.

The full metric provider response is stored at `weather:location:<objectLocationId>` with timestamps
and a TTL of three intervals (5400 seconds by default). Request failures leave previous entries and
their expiry untouched. On each complete PLC poll, the controller collector optionally copies
temperature (°C), sea-level pressure (hPa), humidity (%), available wind speed/gusts (m/s), wind
direction (degrees from), and first-condition description/icon strings into `deviceState.weather`.
Missing weather is omitted; read errors warn while allowing PLC storage. PLC measurements retain
their original meanings. Linked heat, gas and electricity meter collectors are unchanged.

The diagrams retain the station artwork and show 8 px temperature first, with a description that
wraps across up to two lines below it. Missing values remain blank; longer descriptions use an
ellipsis and remain available in full in the popover.
Weather remains owned by the controller when a linked meter is selected. See each site's README
and the [verification report](../.reports/2026-11-20-spring-weather/README.md).

## Verification and deployment

From the repository root:

```bash
node flow-space-nodered-a/src/helpers/get-weather-from-cache.test.js
node flow-space-nodered-a/src/helpers/store-weather-to-cache.test.js
python3 flow-space-nodered-a/flows-diff.py HEAD flow-space-nodered-a/flows.json
```

Deploy the two site schemas/SVGs and static manifest, then synchronize/import the modified A flows
after preserving newer server/editor changes. A must have `getWeatherFromCacheAsync` and
`storeWeatherToCacheAsync` loaded in `global.get('helpers')`. If A has not restarted since these
shared helpers were introduced, restart A once to load them before using the weather nodes.
Alternatively, synchronizing `flows.json` and restarting A loads both flows and helpers together.
An A restart briefly interrupts its polling; no restart or deployment is performed by source editing.

Environment changes require container recreation; an ordinary flow deployment does not reload
the container environment. Existing credentials need no change. Reload the editor after a disk-based
deployment so stale editor state cannot overwrite the exported file.
