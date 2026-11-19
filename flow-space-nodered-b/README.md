# Node-RED instance B (testing)

The second Node-RED (`eta-flow-space-nodered-b` in `docker-compose.yaml`, editor on port 1896) runs the
`testing-of-device-readers` tab, so trying a new or reworked reader never restarts or redeploys instance A
(`eta-flow-space-nodered-a`, port 1895, folder `../flow-space-nodered-a`), which polls the boiler rooms.

- **This folder is its user directory** (`/data`): `flows.json` (the testing tab and the reader subflows it uses),
  `package.json` (the same nodes as A, `node-red-contrib-modbus` included).
- **Shared with A** (mounted read-only from `../flow-space-nodered-a`): `settings.js` and `src/` (device readers,
  helpers), so a reader's code exists once. `EDITOR_TITLE` in the compose service names this editor.
- **State**: both instances write device states to the same Redis (`deviceState:<id>`); the web API persists them and
  raises alarms as before. Test instances with `DEVICE_CODE = null` store nothing.
- **GPRS modems** (БАРС-02, ETA GSM) connect to this instance: port 2910 belongs to it, not to A.
- **One gateway, one instance**: `withConnectionLock` queues reads within one Node-RED only, so never poll a gateway
  from both instances.

Node-RED A, B and C load the shared `../flow-space-nodered-a/.env-flows` file through Docker Compose.
For a new installation, copy `../flow-space-nodered-a/.env.example` to that path and set
`OPENWEATHER_API_KEY`. Keep the real key in the ignored `.env-flows` file; Function nodes read it with
`env.get('OPENWEATHER_API_KEY')`. Environment changes take effect when the consuming container is
recreated; deploying flows alone does not reload them.

Reader subflows are developed here. When a reader goes live at a boiler room, copy its subflow to
`../flow-space-nodered-a/flows.json` with the same id; the subflows both files have (KM5, VKT7, Vzljot026 Client)
must stay identical. A tab moved between the instances keeps its ids: the device cache ties each device to its tab's
id.

The local `nurlat-5-boiler-room` tab reads the Oven160's 146 workbook parameters marked `R`
using seven stock Modbus TCP blocks and an explicit `collect-device-state` mapping. Its test
collector has `DEVICE_CODE = null` and stores nothing. The [site README](../flow-space-statics/devices/nurlat-5-boiler-room/README.md)
records the temporary `.249 → .246/B` forwarding path, source inventory and live verification.
The tab is prepared locally; it has not been deployed into the running B editor.

The Nurlat-5 tab also has an independent **OpenWeather** subflow instance, `nurlat-5-weather`.
The entire weather group, including its timer, request/error handling and initially inactive debug
node, is inside the subflow. Its two instance properties are `INTERVAL` (seconds; positive, at most
2147483; default `1800` = 30 minutes) and `DEVICE_CODE` (required; `nurlat-5-boiler-room` here).
The timer starts 30 seconds after deployment. Its internal Inject button or the subflow input allows
a manual request. Status appears on the subflow instance.

`prepare-weather-request` finds `DEVICE_CODE` in the shared device cache, verifies its containing tab,
and reads `objectLocation.latitude`/`longitude` and the inherited container `OPENWEATHER_API_KEY`.
Missing credentials or invalid/missing coordinates skip the request. The API's location-cache change
must be deployed before this branch can run.

The HTTP request uses metric units, Russian descriptions and a ten-second timeout. `weather-response`
returns the full provider JSON through the subflow output in `msg.payload`, with `deviceCode` and
`objectLocationId`, excluding request URLs/headers that contain the key. Enable the internal
`current-weather` debug node to inspect it. Network/HTTP/invalid-response failures produce a status and
warning without changing the PLC polling branch. Weather is not merged into PLC state or persisted;
`tempOutAir` remains TE1.

**Permissions on the server**: git writes this folder as the deploying user (uid 1001), Node-RED runs as uid 1000.
Both can write when the group is node-red and folders carry the setgid bit (once, after the folder first arrives):

```bash
sudo chgrp -R 1000 flow-space-nodered-b
sudo find flow-space-nodered-b -type d -exec chmod g+ws {} +
sudo find flow-space-nodered-b -type f -exec chmod g+w {} +
```

Run an instance without Node-RED: `node .tools/device-probes/subflow_run.js --instance vzljot043-1500406`.
Compare with git: `python3 flow-space-nodered-a/flows-diff.py HEAD flow-space-nodered-b/flows.json`.
