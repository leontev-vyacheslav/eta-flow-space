# Муслюмово-7 data schema

The schema describes the complete decoded payload of the `muslum-7-boiler-room` tab
(`cf7c93d5a38dd948`) in [Node-RED B](../../../flow-space-nodered-b/flows.json).
Its `collect-device-state` node (`8c33f49f8b6d7ba5`) maps all 139 decoded parameters
into named state fields and generates its own timestamp. The converter's `Time_Rqst`
metadata is not stored. Each schema property records its source in `$comment`.

The collector awaits `storeDeviceStateToCacheAsync` with device code
`muslum-7-boiler-room` and the tab ID extracted from `node.path`, then sets
`msg.deviceState`. Polling configuration, converter functions and wiring are unchanged.
The original mapping was validated offline; deployment was outside that change.
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
- `t_inb` / `t_oub` are boiler-circuit supply / return. The threshold decoder names
  the corresponding channels TE11 / TE12. Their diagram association was confirmed
  for the binding update below; neither is an individual boiler temperature.
- `t1_n` becomes `tempOutNetSetpoint`, the weather-based supply setpoint;
  `tnet` becomes `tempOutNetTarget`, the current network-supply target described by
  the converter. It is not relabelled as a boiler-temperature setpoint.
- `Battery_good = 1` means a battery fault. This signal is not inverted.
- Input signals and alarm bits remain separate. `isGeneralAlarm` preserves the
  existing converter's result rather than recomputing a different alarm condition.
- The commented-out pump-error decoders are not collected, so the schema does not
  invent pump-fault fields.

Offline mapping validation uses the existing
[.tools/flow-chain](../../../.tools/flow-chain/README.md) runner with
`--flows flow-space-nodered-b/flows.json` and synthetic register words.

## Diagram bindings

The diagram follows Muslum-9's property popovers, six header cards, equipment colours
and scoped yellow hover highlighting. It binds 70 SVG elements to 143 distinct
properties from this site's schema. The collector and schema are unchanged.

| Diagram element | State property |
|---|---|
| Outdoor temperature | `tempOutAir`, with its sensor-fault flag |
| Supply target | `tempOutNetTarget`, with configured setpoint, correction and control bands |
| Weather-based setpoint (`По погоде`) | `tempOutNetSetpoint`, with minimum/maximum supply limits |
| Room state / control mode / operation mode | Separate `boilerRoomState`, `controlMode`, `boilerRoomMode` cards |
| TE1 / TE2 | `tempOutNet` / `tempInNet` |
| TE11 / TE12 | `tempOutBoiler` / `tempInBoiler` (common boiler-circuit supply / return) |
| PE1 / PE2 | `pressOutNet` / `pressInNet` |
| PE11 / PE21 | `pressOutBoiler` / `pressInBoiler` |
| Н1 / Н2 / Н3 | `networkPumps[0..2]`: number, running state, start/stop command feedback |
| Н4 / Н5 | `boilerPumps[0..1]`: number, running state, start/stop command feedback |
| Boiler body and burner | Running, locked, powered, minimum/maximum burning, four command-feedback bits, start order |
| Boiler emergency tiles | The corresponding `isAlarm` and `isStartError` flags |
| Security / fire / gas tiles | The corresponding decoded alarm and original input flags |

TE12 was moved from boiler 2's supply outlet to the common boiler return, following
the confirmed circuit meaning. TE11 retains the supply-side position. The physical
PE21 label is retained from the drawing; it represents boiler-circuit return
pressure (`P_oub`, with P12 limits and P4 warning/alarm thresholds).

Each instrument's detail list includes its own available sensor faults, warning and
alarm flags, thresholds, and pressure limits. Red outlines indicate a reported fault
or alarm; amber indicates a warning. The diagram uses the PLC flags directly rather
than recalculating them from displayed measurements. For example, the API snapshot
used for verification reports a supply-pressure warning even though its displayed
pressure is above the low-warning threshold; that discrepancy is retained.

Boiler body/burner popovers start with `isWorking`, `isLocked`, `isPowered`, followed
by the burning-stage and command-feedback fields, then `startOrder` (ten properties).
This model has no individual boiler-temperature or PID fields. Alarm fields belong
to the emergency tiles. Running equipment has blue outlines, stopped pumps are grey,
locked boilers are amber, and flame visibility follows `isWorking` independently
of power and command-feedback bits.

The pump summary tiles show running states, with `mainNetworkPumpNumber` additionally
on the network summary. Individual pumps retain their physical numbers and command
feedback. A stopped pump is not treated as an alarm. Battery alarm/fault/low signals
remain available in Parameters, without being assigned to an unrelated diagram tile.

The information icon lists `isConnected`, `timestamp`, then seven unique cascade
settings/current integrals. No alarm flags or other contextual duplicates are added.
Connection status colours the icon and shared timestamp. The header border stays
solid grey regardless of connection status or the general-alarm flag.
Other readings and equipment follow their own state fields. Single-property texts
use schema formatting and enum descriptions. The inspected API response supplied
every bound property without nulls; expressions use direct state access as in
Muslum-9, while collection/schema nullability stays unchanged.

Flames and decorative pump rings/arrows do not intercept clicks. Bound shapes use
Muslum-9's yellow outline/glow on hover and restore state colours on pointer leave.
Burners open the same full properties as their boiler bodies.
On phone-sized screens, popovers are constrained to the viewport and long property
names can wrap. These rules apply only while the Muslum-7 diagram is displayed.

The binding update is local. Browser verification uses the production API tunnel
with overrides for the edited SVG/CSS only; simulated states stay in browser
responses. See the [verification report](../../../.reports/2026-11-12-muslum7-diagram-bindings/README.md).
