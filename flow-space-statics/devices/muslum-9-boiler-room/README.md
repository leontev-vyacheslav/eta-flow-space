# Муслюмово-9 data schema

The schema describes all 129 decoded state values from the `muslum-9-boiler-room`
tab (`364ac3dfdbd50871`) in [Node-RED B](../../../flow-space-nodered-b/flows.json).
Its `collect-device-state` node (`a8932ca25e899bb9`) maps each source explicitly,
awaits `storeDeviceStateToCacheAsync` with device code `muslum-9-boiler-room` and
the tab ID from `node.path`, then sets `msg.deviceState`.

| State section | Contents |
|---|---|
| Root measurements | Outdoor and network-supply temperatures; both circuit-return temperatures; return temperature after the network pumps; three pressures |
| Root state and alarms | Room state, control/operation modes, main-boiler number, gas/security/fire/battery alarms and inputs, gas-valve closed signal |
| Cascade fields | Six temperature settings, cascade deadband, minimum and current temperature rise per minute |
| `sensors` | Ten sensor faults, ten warning flags and ten temperature/pressure alarm flags, using the exported T1–T6/P1–P3 identifiers |
| `pressureLimits` | Six pressure limits, P1–P3 |
| `pressureThresholds` | Eight pressure thresholds, P1–P3 |
| `temperatureThresholds` | Twelve temperature thresholds, T1–T5 |
| `boilers` | Two boilers: temperature, lock/running/input-alarm signals, manual start/stop and manual/automatic modulation commands, alarms, and six PID settings each |
| `networkPumps` | Three pumps, Н1/Н2/Н3: running state and physical number |

Like Muslum-7, the schema adds the API-provided `isConnected` property, uses
read-only editors throughout, and permits null measurements, flags and modes.
Missing collector inputs remain null. Numeric values retain seven significant
digits. The timestamp always uses the collector's `Date.now()` rather than the
converter's `Time_Rqst` metadata.

Pressures already receive the converter's factor of ten and are exposed in бар
without another conversion. Temperatures use °C. `ITmin` and `IncT` explicitly
describe temperature rise in one minute, so their unit is °C/мин. The export does
not establish units for PID gain, integration time, deadband, pulse/pause times
or actuator travel time; those values remain unscaled without assumed units.

Channel meanings and ambiguities are preserved:

- `t_net` is network supply; `t_out1`/`t_out2` are circuit 1/2 returns; `t_out`
  is the return after the network pumps before the boilers.
- `P_inl` is supply pressure (P1), `P_out1` is return pressure after the network
  pumps before the boilers (P2), and `P_out2` is return pressure before the
  network pumps (P3).
- `t_inb1` is described as boiler-1 supply, while `t_inb2` is described as
  boiler-2 return. Both use the neutral `boilers[].temperature` field until
  the second channel's supply/return meaning is confirmed.
- T1–T6 sensor flags and T1–T5 thresholds keep their exported identifiers;
  their association with the diagram's TE11/TE12/TE1/TE21/TE22/TE2 labels is
  not established by the export.
- `Boil1_norm`/`Boil2_norm` are commented as alarm inputs despite the `norm`
  suffix. `isAlarmInput` preserves the bit without inversion or alarm coloring.
  `isAlarm` separately maps `Boil1_alarm`/`Boil2_alarm`.
- `Battery_good = 1` means a fault; `GasValve = 1` means closed. Neither is
  inverted. `Queue_boil` is preserved as an integer: its comment lists 1/2/3
  although only two boilers are decoded.
- Unlike Muslum-7, no boiler-pump group, pump start/stop commands, boiler power
  flags or minimum/maximum burning flags are decoded here.

Two local flow corrections accompany the mapping: `Block_StatusBit_Integer_6`
requests 13 registers starting at 0, matching the decoder's offsets 0–12
(previously only eight registers were requested), and the general-alarm
expression uses the decoded `T2_K2_max_alarm` rather than the nonexistent
`T1_K2_max_alarm`.

Offline validation uses the existing [.tools/flow-chain](../../../.tools/flow-chain/README.md)
runner with `--flows flow-space-nodered-b/flows.json`, complete synthetic register
words, and this schema. Storage is mocked during validation.

These are local source changes; live deployment and hardware validation have
not been performed. Diagram bindings remain separate follow-up work.
