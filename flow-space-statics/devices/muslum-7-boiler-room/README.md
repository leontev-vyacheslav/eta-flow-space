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


## Component standard — 16 November 2026

Applied the [shared component standard](../../../.docs/mnemoschema-components.md)
to this site's own circuit. The former 1070 × 700 drawing grid is normalized to
**700 × 468**: layout coordinates convert by **0.65**, with actual component
sizes set explicitly rather than placing equipment inside a scaled group. The
hydraulic translation is **(58.5, 57.5)**, including 12 additional units below the
70-unit header. This keeps the circuit proportions and leaves room for the standard
fonts and alarm tiles. The application's existing fit, zoom and pan remain in use.

- Boiler bodies **65 × 70**, burners **40 × 30** (radius **5**), flames **18 × 27**.
  Each is centered on its converted original position; pipe endpoints follow body edges.
- Pump frames **27 × 27**, radius **3**, with radius-**10** outer and inner circles.
  Frame/rotor strokes use **1**, inner rings **0.25**; all branch endpoints meet frames.
- Reading frames **55 × 12**, centered on their tags and values; value baselines
  are top + 9. Horizontal TE11/TE12 stems and their junctions meet frame centers,
  and vertical stems follow the new frame edges.
- The ХПВ vessel is **32 × 50**, radius **10**, centered at local **(149.5, 347.75)**,
  with three symbolic blue dashed water lines. Its side ports meet the existing
  makeup route. The makeup and drain valves use **16 × 10** bow-ties, **11-unit**
  stems and white **8 × 8** square actuators. The drain actuator remains on the
  left. The distinct check-valve symbol and its direction are retained.
- Readings/setpoints **9 px**, emergency captions **7 px**, other text **10 px**,
  using `Roboto, Arial, sans-serif`. The heading is **«Прочие параметры котельной»**.
  The control-mode card is **103.4** units wide, centered at x = 520, to leave
  sufficient clearance for «Режим управления» with phone font metrics.
- Alarm tiles are **43 × 43**, radius **10**, with no group scaling. Their original
  order and property ownership stay in one column at x = 25.5, first y = 120,
  with a **48-unit** pitch. Each icon instance is **24 × 25**; two-line pump
  captions use 7 px with separate baselines. Panel/card corners use radius **10**,
  junctions **1.5**, and stroke widths **1 / 0.5 / 0.25**. Emergency borders stay
  **0.5**, including hover; equipment and other yellow hover outlines use **1**.

All ordered bindings, units, colour predicates and non-width state expressions
are preserved. Instrument widths now follow their existing red/amber/black colour
conditions: **1 / 0.5 / 0.25**. No alarm is inferred from a stopped pump or a
reading, and the tank/valves remain static. Decorative text passes pointer events
through to equipment targets, while bound text keeps its existing behaviour.

See the [source comparison and browser report](../../../.reports/2026-11-16-muslum-standardization/README.md)
for before/after images, native dimensions, source checks and desktop/phone evidence.
These assets are prepared locally; no production deployment is included.

Muslum-7 retains all five pumps. The central component is a **heat exchanger**,
labelled **«Теплообменник»**. Following the Nurlat-5 symbol, it has a square-cornered
**53.625 × 230.75** rectangle with a diagonal from its lower-left to upper-right
corner. Its top is at local **y = 53.625** and bottom at **y = 284.375**,
giving equal **24.375-unit** margins from the upper (**y = 78**) and lower
(**y = 260**) pipe connections. The caption baseline is **y = 297.375**.
The body size and four side connections are preserved. TE11
remains on the common boiler supply and TE12 on the common boiler
return; neither is an individual boiler-temperature channel. All **70 bound
elements** and **143 distinct properties** remain unchanged.

The heat-exchanger identity and symbol were corrected on **17 November 2026**:
the former «Гидрострелка» caption and rounded body were replaced with the
rectangular exchanger convention used in Nurlat-5. Desktop/phone browser checks
with production API values confirmed caption clearance and nearby instrument
popovers. See the [before/after report](../../../.reports/2026-11-17-muslum7-heat-exchanger/README.md).

## Burner glow standard — 17 November 2026

Both burner backgrounds remain **#808080** while stopped or running. The existing
flame instances use Spring-2's orange glow: the same **3-second ease-in-out
infinite** keyframes, scoped to this diagram with a unique animation name. This
replaces the earlier dark running background and inner static flame shadow. The
legacy filter definition is retained, while its inner artwork reference is removed.
Original flame paths, 18 × 27 instances, 40 × 30 burner geometry and hit targets
are unchanged.

Each existing running predicate still controls flame visibility. Boiler-body,
locked/fault and pump colours retain their existing meanings. All ordered
`data-state` lists, hints and other expressions are preserved; only the two
burner fill expressions now assign the constant grey background. The original
full-detail burner popovers remain available. CSS glow artwork passes pointer
events through to those targets.

Before/after screenshots, synthetic state checks and desktop/phone evidence are
recorded in `.reports/2026-11-17-standard-burner-glow/`. These files remain local;
no deployment or controller change is implied.
