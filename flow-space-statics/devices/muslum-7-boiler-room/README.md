# Муслюмово-7 data schema

The schema describes the complete decoded payload of the `muslum-7-boiler-room` tab
(`cf7c93d5a38dd948`) in [Node-RED B](../../../flow-space-nodered-b/flows.json).
Its `collect-device-state` node (`8c33f49f8b6d7ba5`) maps all 139 decoded parameters
into named state fields and generates its own timestamp. The converter's `Time_Rqst`
metadata is not stored. Each schema property records its source in `$comment`.

The collector awaits `storeDeviceStateToCacheAsync` with device code
`muslum-7-boiler-room` and the tab ID extracted from `node.path`, then sets
`msg.deviceState`. Polling configuration, converter functions and wiring are unchanged.
These are local source changes; no live deployment has been performed.
The schema adds the API-provided `isConnected` property. It also includes physical pump
numbers so the two boiler-pump entries can be identified as Н4 and Н5.

| State section | Contents |
|---|---|
| Root measurements | Outdoor temperature; supply/return temperatures and pressures of the network and boiler circuits |
| Root state and alarms | Room/control modes, room state, general alarm, gas/security/fire signals, battery state and original input signals |
| Cascade fields | All 15 decoded setpoints, correction, limits, integrals, delays and warm-up values |
| `sensors` | All 32 decoded sensor-fault, warning and alarm flags |
| `pressureLimits` | Eight pressure limits |
| `pressureThresholds` | Twelve pressure thresholds |
| `temperatureThresholds` | Ten temperature thresholds |
| `boilers` | Two boilers: power, running/lock state, minimum/maximum burning, four PLC command-feedback bits, alarms and start order |
| `networkPumps` | Three pumps, Н1/Н2/Н3: running, start/stop command feedback and physical number |
| `boilerPumps` | Two pumps, Н4/Н5: running, start/stop command feedback and physical number |

All UI editors are read-only, including setpoints and PLC command-feedback bits.
Floats retain the collector's seven-significant-digit convention. Pressures are already
converted by `data_convert` with a factor of ten and are exposed in бар without another
conversion. Temperature units are °C. The flow does not state units for delays, warm-up
time or cascade integrals; their values are preserved without assigning an assumed unit.

Missing inputs remain null. The schema uses Ajv's `nullable` keyword so scalar types
continue to work with the dashboard's existing schema helper. State enums also allow
null, while their UI dictionaries contain numeric IDs only. `timestamp` always uses
`Date.now()` at state creation, independently of the converter's `Time_Rqst`.

The names and meanings follow the exported converter comments:

- `t_inl` / `t_out` are network supply / return, despite their legacy abbreviations.
- `t_inb` / `t_oub` are boiler-circuit supply / return. Their association with the
  diagram's individual TE11/TE12 labels is not established by this export.
- `t1_n` becomes `tempOutNetSetpoint`, the weather-based supply setpoint;
  `tnet` becomes `tempOutNetTarget`, the current network-supply target described by
  the converter. It is not relabelled as a boiler-temperature setpoint.
- `Battery_good = 1` means a battery fault. This signal is not inverted.
- Input signals and alarm bits remain separate. `isGeneralAlarm` preserves the
  existing converter's result rather than recomputing a different alarm condition.
- The commented-out pump-error decoders are not collected, so the schema does not
  invent pump-fault fields.

Diagram bindings and live deployment are separate follow-up work. Offline validation
uses the existing [.tools/flow-chain](../../../.tools/flow-chain/README.md) runner with
`--flows flow-space-nodered-b/flows.json` and synthetic register words.
