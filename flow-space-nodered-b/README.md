# Node-RED instance B

The second Node-RED (`eta-flow-space-nodered-b` in `docker-compose.yaml`, editor on port 1896) owns the
Gagarin, Komarova, Kirov, Muslum-7, Muslum-9 and Nurlat-5 boiler-room tabs in this export.
Instance A (`eta-flow-space-nodered-a`, port 1895, folder `../flow-space-nodered-a`) polls other sites.

- **This folder is its user directory** (`/data`): `flows.json` (the boiler-room tabs and their shared subflows),
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

The `nurlat-5-boiler-room` tab reads the Oven160's 146 workbook parameters marked `R`
using seven stock Modbus TCP blocks and an explicit `collect-device-state` mapping. Its
collector stores state under `DEVICE_CODE = 'nurlat-5-boiler-room'`. The [site README](../flow-space-statics/devices/nurlat-5-boiler-room/README.md)
records the temporary `.249 → .246/B` forwarding path, source inventory and live verification.
Check the running B editor separately before assuming that a local export is deployed.

Each of the six boiler-room tabs has one independent **Weather** subflow instance:
`gagarin-weather`, `komarova-weather`, `kirov-weather`, `muslum-7-weather`, `muslum-9-weather`
and the existing `nurlat-5-weather`. All use the same subflow definition and existing shared helpers.
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
validates the full provider JSON and removes request URLs/headers containing the key.
`store-weather-to-cache` then awaits the shared `storeWeatherToCacheAsync` helper before emitting the
JSON through the subflow output in `msg.payload`, with `deviceCode`, `objectLocationId` and
`weatherCacheKey`. Enable the internal `current-weather` debug node to inspect it.

Redis key `weather:location:<objectLocationId>` is shared by devices at that location. Its JSON contains
`provider: "openweather"`, `objectLocationId`, `units: "metric"`, `observedAt` and `fetchedAt` (epoch
milliseconds), and the **complete unchanged provider response** in `data`, including all returned
temperature, wind, humidity, pressure, precipitation, cloud, visibility, condition and solar fields.
Optional fields remain absent when the provider omits them. TTL is three `INTERVAL`s: 90 minutes for
the default 30-minute polling. Request failures leave the previous entry and its expiry untouched.
Request/validation/Redis errors produce a status and warning and emit no output. The cache value and
expiry are written together in one Redis SET operation.
The full provider response remains in this separate cache. On every successful PLC poll,
`collect-device-state` in every B boiler-room tab reads that device's current location cache and optionally adds
`weather: { temp, pressure, humidity, wind: { speed, deg, gust } }` before storing device state.
Temperature is °C, pressure is hPa, humidity is %, wind speeds are m/s and direction is degrees.
Wind and gust are omitted when absent; unavailable pressure/humidity/wind numbers remain `null`.
Missing/expired/malformed weather produces no `weather` object. Read errors warn and still allow PLC
state storage. `tempOutAir` remains the controller's measured outdoor temperature. The API's normal JSON state history now
includes this optional object in future samples; existing historical states remain valid without it.

For this all-room extension, deploy the updated B flow and the five sites' SVG/schema files plus the
static manifest. The existing `Weather` definition, shared helpers, environment key and Nurlat-5
assets are reused. No helper reload or UI rebuild is required if the preceding Nurlat-5 weather
changes are already deployed. Each device needs cached location metadata with valid coordinates;
otherwise its weather request is skipped. Import into a freshly reloaded editor and deploy only
the modified nodes, preserving running PLC polling and any newer server edits.
Helper/subflow cache checks: `node flow-space-nodered-a/src/helpers/store-weather-to-cache.test.js`
(run from the repository root; Redis is mocked and no external requests are made).
Collector/cache-read/schema checks: `node flow-space-nodered-a/src/helpers/get-weather-from-cache.test.js`
(also mocked; verifies weather is optional and PLC storage continues on weather-cache errors).

**Permissions on the server**: git writes this folder as the deploying user (uid 1001), Node-RED runs as uid 1000.
Both can write when the group is node-red and folders carry the setgid bit (once, after the folder first arrives):

```bash
sudo chgrp -R 1000 flow-space-nodered-b
sudo find flow-space-nodered-b -type d -exec chmod g+ws {} +
sudo find flow-space-nodered-b -type f -exec chmod g+w {} +
```

Run an instance without Node-RED: `node .tools/device-probes/subflow_run.js --instance vzljot043-1500406`.
Compare with git: `python3 flow-space-nodered-a/flows-diff.py HEAD flow-space-nodered-b/flows.json`.
