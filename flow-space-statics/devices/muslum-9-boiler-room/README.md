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
- T1–T6 sensor flags and T1–T5 thresholds keep their exported identifiers.
  The old Muslum-9 alarm-page wiring establishes T1 → TE11 (boiler 1),
  T2 → TE12 (boiler 2), T3 → TE1 (network supply), T4 → TE21 (circuit 1
  return) and T5 → TE22 (circuit 2 return). Its measurement-to-SVG commands
  agree with these reading positions. T6's association with TE2 remains
  unconfirmed: the old export decodes `T6_err` but never uses it in a labelled
  display. See the [decoded wiring evidence](../../../.reports/2026-11-13-muslum9-temperature-mapping/README.md).
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

## Diagram bindings

The diagram binds the decoded readings to the corresponding equipment and pipe
positions. Bound frames, alarm tiles, pump symbols and the information icon open
the existing properties popover; graph links remain available for chartable fields.
Hover styling follows Весна-2: yellow outlines and a yellow glow on bound shapes,
with the original state colours restored after the pointer leaves. Burner clicks
open the same ordered boiler properties as the boiler frame. Decorative pump
rings/arrows and flame artwork do not intercept their underlying bound shapes.

| Diagram element | State property |
|---|---|
| Outdoor temperature | `tempOutAir` |
| Supply target | `tempOutNetTarget` |
| Weather-based supply setpoint (`По погоде`) | `tempOutNetSetpoint` |
| Room state | `boilerRoomState`, with the main-boiler number in the details |
| Control mode (`Режим управления`) | `controlMode` |
| Operation mode (`Режим работы`) | `boilerRoomMode` |
| TE11 / TE12 | `boilers[0].temperature` / `boilers[1].temperature`, with T1/T2 fault, warning, high-alarm and threshold fields |
| TE1 | `tempOutNet`, with T3 fault, high/low warning, alarm and threshold fields |
| TE21 / TE22 | `tempInNetCircuit1` / `tempInNetCircuit2`, with T4/T5 fault, low-warning, low-alarm and threshold fields |
| TE2 | `tempInBoiler`; no unconfirmed T6 fault binding |
| PE1 | `pressOutNet`, with P1 fault, warning, alarm and threshold fields |
| PE22 | `pressInBoiler`, with P2 fault, warning, alarm and threshold fields |
| PE21 | `pressInNet`, with P3 fault, warning, alarm and threshold fields |
| Н1 / Н2 / Н3 | The corresponding `networkPumps[].isWorking` and physical number |
| Boiler body | `isWorking`, `isLocked`, `temperature`, then command-feedback and PID properties |
| Boiler flame | The corresponding boiler's `isWorking` flag |
| Boiler emergency tiles | The corresponding boiler's `isAlarmInput`, `isStartError` and `isAlarm` flags |
| Security / fire / gas tiles | The corresponding decoded alarm and original input flags |

TE11 and TE12 display the channels associated with boilers 1 and 2; the second
channel's supply/return ambiguity remains as described above. The five confirmed
T1–T5 instruments now have red outlines for a reported sensor fault or alarm,
amber outlines for a warning, and black outlines otherwise. Faults/alarms take
priority over warnings. Their frame popovers start with the reading, then include
the channel's available fault/alarm/warning flags and numeric threshold settings.
The UI follows controller bits rather than comparing readings with thresholds.
Value formatting, chart links and hover highlighting retain the existing behaviour.
T6 remains available only on `Параметры` → `Датчики`, without colouring TE2.
On phone-sized screens, property popovers stay within the viewport and long
property names can wrap; these rules apply only while this diagram is displayed.
The information icon always lists `isConnected` first and `timestamp` second,
even though those properties are also bound elsewhere.
They are followed by the properties unique to the icon: `cascadeTempDeadband`,
`cascadeMinTempRisePerMinute`, `cascadeTempRisePerMinute` and `isGasValveClosed`.
Alarm, fault, warning and other duplicate properties are excluded. Its colour
follows connection status only.
The outdoor sensor and P1–P3 pressures have established mappings and receive
their own fault/warning outlines.

The former `Задание котлов` card now shows `По погоде`: this export has no separate
boiler-temperature setpoint. The supply target and weather-based supply setpoint
retain their distinct meanings. The left panel is labelled `Аварийные события`;
its network-pump tile summarises running states, because no pump-fault signals
are decoded. Its popover contains only the three `networkPumps[].isWorking`
properties. Physical pump numbers remain bound to the individual pump symbols.
No alarm is inferred from a stopped pump. The six header cards share one row;
the control and operation modes use the same card style as the room state.

Running pumps have blue outlines. Boiler outlines show running in blue and
stopped in black; locked boilers have an amber body. Flames appear when the
reported boiler running flag is true. Boiler popovers always start with
`isWorking`, `isLocked`, `temperature`, in that order. On the diagram,
`isAlarmInput`, `isStartError` and `isAlarm` are bound only in the emergency panel,
not on the boiler bodies or their status labels. Alarm/start-error colours remain
on the corresponding emergency tiles.
The bindings assume a complete state with populated fields and use the schema's
formatting directly. `isConnected` is listed on the information icon,
`other-parameters-frame` and the shared `timestamp` group. The icon and timestamp
turn red when disconnected; the date and time are black when connected. The header
border stays solid grey regardless of connection status or the general-alarm flag.
Readings, equipment and alarm symbols follow their own reported state properties. The
diagram does not interpret an unknown `Boil*_norm` polarity as an alarm.

These are local source changes; deployment and hardware validation are separate.


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
- The Бак подпитки vessel is **32 × 80**, top radius **10**, square lower corners, centered at local **(149.5, 347.75)**,
  with solid **#0083CD** fill (static artwork, no measured level). Its side ports meet the existing
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

Muslum-9 retains both supply outlets and both return inlets, its three network
pumps, and the absence of individual boiler pumps or a hydraulic separator. TE11
and TE12 keep their boiler temperature channels and confirmed T1/T2 flags. T6
remains unassigned to TE2; the second boiler channel keeps its neutral temperature
meaning. All **64 bound elements** and **124 distinct properties** remain unchanged.

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

## Emergency-panel heading — 18 November 2026

The shared heading is **«Аварийные события»**, split into two centred lines for
the narrow single-column panel. The existing 10 px font, x = 47 anchor and
y = 100 / 112 baselines are retained. Tile layout, state bindings and alarm
semantics are unchanged.

## Weather — 20 November 2026

The B tab uses one independent `Weather` subflow (`INTERVAL=1800`, `DEVICE_CODE=muslum-9-boiler-room`).
Requests use this device's cached location coordinates and the inherited `OPENWEATHER_API_KEY`;
full responses are cached at `weather:location:<objectLocationId>` with a 5400-second TTL.
Each PLC poll optionally adds `weather.temp` (°C), `pressure` (sea-level hPa), `humidity` (%)
and available `wind.speed`/`gust` (m/s) and `wind.deg` (degrees, direction from).
Missing/expired weather omits the object; Redis errors do not prevent PLC state storage.
Optional `weather.description` and `weather.icon` strings now come from the first provider condition,
matching the current Nurlat-5 collector. Missing, blank or non-string metadata is omitted.
Controller readings, including `tempOutAir`, retain their existing meanings. Historical states
without weather remain valid; no migration or backfill is required.

The top-panel icon follows the user's revised Nurlat-5 artwork: black 0.5-unit strokes,
a 27 × 27 hitbox at **(22, 43.8)**, and artwork translated to **(24, 44.8)**.
The popover order is description, temperature, pressure, humidity, wind speed, direction and gusts.
Weather editors stay hidden; chart metadata matches Nurlat-5. Missing weather dims the icon
and opens no empty popover. Nullable values display a dash; absent wind/gust fields are omitted.
See the [verification and deployment notes](../../../.reports/2026-11-20-b-weather/README.md).

The weather column now shows **temperature first**, at **(54, 53.8)**, followed by a
multiline description in a **47 × 19** box at **(54, 56.8)**. Both use the user's **8 px**
font. The description uses 9-unit line spacing and wraps to at most two lines. When it still exceeds
the available space, an ellipsis indicates the remaining text. Clicking the description or tapping
the station icon shows the full value in the existing popover. Missing values remain blank.

The description uses an SVG `foreignObject` with an XHTML `div` and the existing `data-state-eval`
binding, so no UI bundle or backend changes are required. Hover retains bold feedback. The station
artwork, icon click target, all existing cards and device ownership remain unchanged. The text clip
now extends to a local y=76 (75.8 for Muslum), keeping both description lines inside the header.
See [before/after images and browser checks](../../../.reports/2026-11-20-weather-wrap/README.md).

## Filled makeup-water tank — 22 November 2026

The Бак подпитки vessel now uses Nurlat-5's 32 × 80 outline: rounded upper corners,
flat bottom, black 1-unit stroke and solid **#0083CD** fill. It is a static full
tank symbol because no level measurement is available, with no numeric reading
or new state binding. Its existing centre and side-pipe connections are preserved;
the top/caption move up 15 units and the bottom extends down 15. The existing canvas already contains the taller tank.
See [previews and verification](../../../.reports/2026-11-22-filled-tanks/README.md).

## Makeup valve block placement — 22 November 2026

The makeup valve and check valve move together 303.5 native units left, retaining
all artwork, orientation, spacing and static semantics. The valve centre is now
(203.5, 347.75), leaving **30 units** from the tank's right edge x = 165.5 to
the valve's left port x = 195.5. The inter-valve pipe spans x = 211.5–223.65;
the check-valve outlet at x = 236.65 joins the unchanged return connection.
See [before/after verification](../../../.reports/2026-11-22-muslum-valves/README.md).
