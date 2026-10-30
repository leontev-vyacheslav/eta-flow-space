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

Reader subflows are developed here. When a reader goes live at a boiler room, copy its subflow to
`../flow-space-nodered-a/flows.json` with the same id; the subflows both files have (KM5, VKT7, Vzljot026 Client)
must stay identical. A tab moved between the instances keeps its ids: the device cache ties each device to its tab's
id.

**Permissions on the server**: git writes this folder as the deploying user (uid 1001), Node-RED runs as uid 1000.
Both can write when the group is node-red and folders carry the setgid bit (once, after the folder first arrives):

```bash
sudo chgrp -R 1000 flow-space-nodered-b
sudo find flow-space-nodered-b -type d -exec chmod g+ws {} +
sudo find flow-space-nodered-b -type f -exec chmod g+w {} +
```

Run an instance without Node-RED: `node .tools/device-probes/subflow_run.js --instance vzljot043-1500406`.
Compare with git: `python3 flow-space-nodered-a/flows-diff.py HEAD flow-space-nodered-b/flows.json`.
