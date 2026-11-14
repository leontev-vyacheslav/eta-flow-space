# Нурлат, котельная №5

The `nurlat-5-boiler-room` tab (`93dc403dd0a3e7b1`) is prepared in
[Node-RED B's flow file](../../../flow-space-nodered-b/flows.json). It follows the existing
boiler-room pattern: a periodic `modbus-read`, sequential `modbus-getter` nodes, one
`data_convert` function per block, `joinData`, and explicit `collect-device-state` mapping.

The controller endpoint is **10.10.3.20:502**, **Modbus TCP**, **unit 1**. All requests use
**function 03 — Read Holding Registers**. The stock Modbus client uses `tcpType: DEFAULT`
(MBAP framing). Its temporary connection address inside B is **127.0.0.1:15020**.

## Parameter source and scope

Source: `.docs/.sources/Карта регистров Нурлат.xlsx`, sheet `Лист1`.
[source-map.json](source-map.json) records the workbook hash, row, `ip_*` variable,
zero-based register, bit, source description, normalized state path and unit conversion
for every collected parameter.

All **146 named rows marked `R`** are collected: **109 BOOL**, **13 INT**, **24 REAL**.
The 83 `R/W` settings, 42 `W` commands and unnamed reserved fields are outside this tab's
scope. Readable command-feedback bits explicitly marked `R`, such as `ip_K1_1_Start`,
remain available as feedback values. There are no Modbus write nodes.

| Read block | Zero-based registers | Words | Decoded fields |
|---|---|---:|---:|
| StatusBits | 0–12 | 13 | 109 |
| AlarmInputs | 15–25 | 11 | 11 |
| RoomMode | 35–36 | 2 | 2 |
| TemperatureTargets | 56–59 | 4 | 2 |
| TemperatureRise | 66–67 | 2 | 1 |
| Temperatures | 92–111 | 20 | 10 |
| PressuresLevels | 112–133 | 22 | 11 |

The sequence reads **74 words in seven requests**, once per **60 seconds**. The client
serializes requests, adds a 150 ms command delay and uses a 4-second request timeout.
Every block validates its response length. A failed read stops the remaining sequence;
only the final successful converter marks the joined message complete. The collector
also requires all 146 named source fields before producing a state. Both debug nodes
are initially inactive.

The workbook's Modbus reference column is independently checked against the numeric
register/bit columns. In particular, alarm/fault bits are decoded at the workbook's
registers 9–12, resolving the inconsistent descriptive labels in the legacy archive.

## Decoding and mapping

Converters preserve the workbook's exact `ip_*` names and native units. BOOL values
become booleans, INT values use signed 16-bit decoding, and REAL values use the CODESYS
layout verified against live data: low 16-bit word first, big-endian bytes within each
word. `Buffer.from(source).swap16().readFloatLE(offset)` decodes a copied buffer.

`collect-device-state` maps each source explicitly and comments its register and meaning.
The state contains **120 booleans**, **2 integer mode/state values**, **24 real values**
and a separate `Date.now()` timestamp. The API supplies `isConnected`.

| State section | Source and meaning |
|---|---|
| `tempOutAir`, `tempRoomAir` | TE1 outdoor air, TE2 room air |
| `tempOutNet`, `tempInNet` | TE9 network supply, TE10 network return |
| `pressOutNet`, `pressInNet`, `pressGas` | PE9 after network pumps, PE10 network return, PE11 gas |
| `pressBoilerCircuit` | PE5 boiler-circuit pressure |
| `heatExchanger` | TE7 after / TE8 before the exchanger and PE8 before the exchanger |
| `levelBoilerMakeupTank`, `levelNetworkMakeupTank` | PE6 and PE7, respectively, in metres |
| `boilerRoomMode`, `boilerRoomState` | `ip_Kot_Mode`, `ip_Kot_State`; enum descriptions match the workbook |
| `tempOutNetSetpoint`, `tempBoilersSetpoint`, `boilerCircuitTemperatureRise` | `ip_Cascad_SP_TE_C`, `ip_Cascad_SP_TE_K`, `ip_Cascad_IncT` |
| `boilers[0..1]` | К1.1, К1.2: lock/run/fault, read-only command feedback, alarm-list bit, pump dry-run alarm/input, inlet/outlet temperatures and pressures |
| `boilerValves[0..1]` | M1, M2: opening/closing command feedback |
| `boilerPumps[0..3]` | H1.1, H1.2, H2.1, H2.2: run and start-error status |
| `boilerMakeupPumps[0..1]` | H3.1, H3.2: run and start-error status |
| `networkMakeupPumps[0..1]` | H4.1, H4.2: run and start-error status |
| `networkPumps[0..1]` | H5.1, H5.2: run and start-error status |
| `sensors` | Each TE/PE fault and each available H/L/HH/LL active flag, mapped independently |
| Alarm and valve fields | Independent alarm-list flags, original INT alarm inputs, valve output signals and audible-alarm output signals |

Workbook pressures are **кгс/см²**. The collector converts them to the existing boiler-room
state convention **бар** with `×0.980665`; it does not apply the MPa `×10` conversion used
by some other controllers. Temperature stays °C; level stays metres. Real state values
use seven significant digits. Null/undefined and non-finite real values become null;
valid zero/false values are preserved.

`tempBoilersSetpoint` retains the established boiler-room name for `ip_Cascad_SP_TE_K`.
The workbook's description calls this a network supply target while the variable and
panel label use `TE_K`; the source description is retained without assigning additional
physical meaning. Heat-exchanger measurements likewise retain neutral inlet/outlet names.

`isFault` and `isAlarm` on each boiler come from different PLC bits. Alarm-list booleans
and the original INT alarm inputs also have separate state properties. No alarm is
inferred from measured pressure, temperature, stopped pumps or another flag.

## Test-mode persistence and deployment

The collector has **`DEVICE_CODE = null`** and explicitly skips persistence in that mode.
It assigns the normalized object to `msg.deviceState`. When a device is registered and
persistence is intended, set its exact code in that guard; the existing storage helper
is awaited with the device code and tab ID before `msg.deviceState` is assigned.

These changes prepare the local B flow file and schema. They do not deploy into the
running B editor, create a database device, update Redis or restart a service. Live
validation used a separate disposable Node-RED runtime inside B's container, with an
observer in place of the inactive state debug node. Its initial polling interval was
shortened to 10 seconds for one test cycle; the saved tab uses 60 seconds.

## Temporary forwarding through .249

The forwarding path prepared on **10.10.0.246** is:

```text
Node-RED B 127.0.0.1:15020
  → temporary Node.js TCP/Unix relay inside B
  → /data/.nurlat5-controller.sock (B's shared directory)
  → SSH master on .246, logged in to eta-leo@10.10.0.249
  → 10.10.3.20:502, connected from .249
```

The host path of the Unix socket is
`/home/admin-leo/eta-flow-space/flow-space-nodered-b/.nurlat5-controller.sock`.
The SSH control socket is `/tmp/nurlat5-249-unix-forward.sock` on .246. The relay's PID
file is `/tmp/nurlat5-forward-relay.pid` inside B. The relay listens only on B's loopback;
the Unix socket is group-readable/writable. No firewall rules or persistent service
configuration were changed. The earlier unused Docker-bridge TCP forwarding was closed.

The temporary SSH master and relay remain running for importing/testing this tab. The
relay disappears when B's container restarts and the SSH session is not installed as a
service. Keep the old `ETA$RealTimeDeviceReader` stopped while this tab polls, because
the previous old-system connection prevented an additional connection from opening.

To stop this forwarding, first disable the new tab if it has been imported. Then run
on **.246**:

```sh
docker exec eta-flow-space-nodered-b sh -c 'kill "$(cat /tmp/nurlat5-forward-relay.pid)"; rm -f /tmp/nurlat5-forward-relay.pid'
ssh -S /tmp/nurlat5-249-unix-forward.sock -O exit eta-leo@10.10.0.249
rm -f /home/admin-leo/eta-flow-space/flow-space-nodered-b/.nurlat5-controller.sock
```

The source flow can later use direct access by changing only its client host/port to
`10.10.3.20:502`, after that route becomes available.

## Verification

The [local report](../../../.reports/2026-11-14-nurlat-5-boiler-room/README.md) contains the
live register capture, complete live state, formatted function sources, importable tab
export and verification results. Checks cover every workbook address and mapped value,
all 109 bit positions, null/undefined preservation, non-finite floats, malformed block
handling, schema/UI-helper compatibility and the guarded/awaited persistence contract.
All 174 pre-existing B nodes remain byte-equivalent as parsed JSON objects.
