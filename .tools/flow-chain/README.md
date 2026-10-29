# Flow chain runner

Runs a Node-RED tab that polls a controller with Modbus nodes (modbus-read / modbus-getter → converter functions →
join → `collect-device-state`) **offline**, on register words read live with
`.tools/device-probes/modbus_rtu_dump.js`. Shows the device state the tab would store, and optionally checks it
against the data schema. Nothing is written: `storeDeviceStateToCacheAsync` is a stub that records the device code.
Written 2026-10-27 for the Гагарина boiler room; the Весна-2, Statum and Царёво-2 tabs have the same layout.

```bash
# 1. read the controller (production server only for most sites; see device-probes/README.md)
ssh -p 8022 -o BatchMode=yes admin-leo@91.144.143.40 \
  'docker exec -i eta-flow-space-nodered-a timeout 60 node - 192.168.0.190 5010 --function 3 --range 1-12 --range 19-36 --range 50-81 --range 92-115' \
  < .tools/device-probes/modbus_rtu_dump.js > words.json

# 2. run the tab's chain (its own collect-device-state, or a new mapping under test) and validate
node .tools/flow-chain/run_modbus_tab.js gagarin-boiler-room words.json \
  --mapping new-mapping.js --schema flow-space-statics/devices/gagarin-boiler-room/data-schema.json
```

- Converters are the function nodes wired straight from a Modbus node whose outputs reach the join; output 0 gets
  the word array, output 1 `{ data, buffer }` (as node-red-contrib-modbus sends them).
- Registers missing from the dump read as 0 (the count is printed to stderr), so limit blocks that were not read do
  not stop the run.
- `--mapping FILE.js` is the body of a function node (same as the `func` in flows.json).
- `--schema` uses ajv from `flow-space-ui/node_modules` (run `npm install` there once) and validates the state as the
  web API serves it, i.e. with `isConnected: true` added (mappings never set it).
