# Гагарина device state

The `gagarin-boiler-room` tab (`75715e53e3de61dd`) lives in
[Node-RED B](../../../flow-space-nodered-b/flows.json). Collector
`bab9bdc5393b0459` maps all 118 decoded device parameters explicitly, then awaits
`storeDeviceStateToCacheAsync` with the device code and the tab ID from `node.path`
before assigning `msg.deviceState`.

The seven converters emit 119 fields including `Time_Rqst`. That polling metadata
is deliberately excluded: `timestamp` continues to use the collector's `Date.now()`.
The Web API supplies `isConnected`. Each scalar schema field documents its source
in `$comment`.

| State section | Contents |
|---|---|
| Measurements | Outdoor temperature; network supply/return temperatures and pressures |
| Room state | Room state, local/remote control, manual/automatic operation |
| Cascade | All 15 decoded setpoints, correction, limits, bands, integrals, delays and warm-up settings |
| Alarms and inputs | Existing alarm bits plus separate battery-low, door, CO, CH4, security and fire PLC inputs |
| `sensors` | All 17 decoded sensor-fault, warning and alarm flags |
| `pressureLimits` | Four network supply/return pressure limits |
| `pressureThresholds` | Eight supply/return pressure thresholds: HH, H, L, LL |
| `temperatureThresholds` | Eight supply/return temperature thresholds: HH, H, L, LL |
| `boilers[0..2]` | К1.1–К1.3: normal/locked/running states, minimum/maximum burning, four command-feedback bits, alarm, start error and start order |
| `networkPumps[0..1]` | Н1.1–Н1.2: running state, start/stop command feedback and start error; main pump number is `mainNetworkPumpNumber` |

The mapping expansion adds 68 parameters to the previous 50. Existing state paths,
values, array ordering and storage behavior are preserved. No history migration is
needed. Newly added schema properties remain optional for older snapshots; collected
scalar values allow null while retaining primitive types for the UI schema helper.
All editors are read-only, including settings and PLC command-feedback bits.

Pressures are already converted by `data_convert` from MPa to бар (×10); the
collector does not scale them again. Temperatures are °C. Real values retain the
existing seven-significant-digit convention. The exported flow does not establish
units for delays, warm-up time or cascade integrals; no unit is assumed.

Physical TE1 is outdoor air, TE2 is supply and TE3 is return. The threshold decoder
instead numbers supply/return as T1/T2. `t_inl`/`t_out` and `P_inl`/`P_out` likewise
mean network supply/return. Return HH/H threshold values are retained even though
the converters do not provide corresponding active alarm flags.

`tempBoilersSetpoint` retains its existing name and `tnet` source for history
compatibility. The converter describes `tnet` as the current network temperature
target. This expansion does not rename or reinterpret that historical field.

`isBatteryLow` remains the alarm-list bit `Batt_alarm`; the distinct raw input
`Battery_low` is `isBatteryInputLow`. The door, CO, CH4, security and fire inputs are
also independent of their alarm-list bits. `Battery_good = 1` means a fault and is
not inverted. Boolean inputs preserve null; the collector never derives PLC alarms
from displayed measurements.

Offline validation uses the existing [flow-chain runner](../../../.tools/flow-chain/README.md)
with `--flows flow-space-nodered-b/flows.json`. The complete source inventory,
synthetic register fixture, decoded function diff and verification results are in
the local [mapping report](../../../.reports/2026-11-gagarin-data-schema/README.md).
The expansion is a local source change; it does not deploy the flow or update live state.

## Diagram bindings

The diagram retains the original two-boiler circuit and equipment positions, with
Muslum-7/9 property popovers, state colours and scoped yellow hover feedback. Its
56 bound elements reference 108 distinct state properties. The original drawing
identifies controller boiler channel 3 as absent on site; that channel remains
available in Parameters without adding a third physical boiler to the diagram.

| Diagram element | Properties and behaviour |
|---|---|
| Outdoor card | `tempOutAir` and its sensor-error flag |
| `Задание подачи` card | Historical `tempBoilersSetpoint` (`tnet`), configured setpoint, correction and upper/lower control bands |
| `По погоде` card | `tempOutNetSetpoint`, minimum/maximum supply limits |
| Three state/mode cards | Separate `boilerRoomState`, `controlMode`, `boilerRoomMode`; values use the schema's enum descriptions |
| PE1 / PE2 | Network supply/return pressure, corresponding sensor flags, pressure limits and all four HH/H/L/LL thresholds |
| TE2 / TE3 | Network supply/return temperature, corresponding sensor flags and all four HH/H/L/LL thresholds |
| Boiler bodies and burners | Identical ordered lists: `isWorking`, `isLocked`, `isNormal`, minimum/maximum burning, four command-feedback bits, `startOrder` |
| СН1 / СН2 | Running state, start/stop command feedback and start error; both pump centre and frame open the full list |
| Alarm tiles | Separate alarm and original input properties for security, fire, CO, CH4, door and battery; dedicated boiler and pump tiles |

The supply-target display label follows the converter's network-supply meaning.
The historical `tempBoilersSetpoint` key, units, values and nullability are unchanged.
No individual boiler-temperature signal is available in this model.

Boiler outlines are blue while running and black while stopped; locked boiler
bodies are amber. Flames follow `isWorking`, independently of `isNormal`. The live
API snapshot used for verification reported boiler 1 running with `isNormal = false`,
which previously left its flame dimmed. `isNormal` remains an unchanged property in
the details. Boiler alarm/start-error fields belong to their emergency tiles.

Pump outlines follow running/start-error signals. A stopped pump has a grey centre;
a reported start error makes its outline red. The summary tile contains both
pumps' running/error states and `mainNetworkPumpNumber`, and turns red only for a
reported error. Sensor outlines similarly use the actual PLC alarm/warning flags,
with red for faults/alarms and amber for warnings. Threshold values alone do not
create an alarm or an active HH/H flag that the PLC does not provide.

The information icon starts with `isConnected`, then `timestamp`, followed by the
seven cascade integral/delay/warm-up properties that are unique to it. Connection
status colours the information icon and timestamp; the outer header border stays
grey. Reconnection restores the normal colours. The connection alarm tile retains
its own status display.

Emergency tiles use square 43 × 43 geometry, following the square proportions of
Muslum-7/9. The panel is 112 units wide, with equal side margins and a 10-unit gap
between its two columns. The `Связь` tile retains Gagarin's original crossed wireless
artwork. Its icon is decorative so clicks and taps open the connection property.

Decorative flame and pump artwork lets pointer events reach the full detail targets.
Hovering bound shapes shows the Muslum-7/9 yellow outline and glow; state colours
return after pointer leave. Phone popovers are constrained to the viewport and long
property names wrap. These styles apply only while the Gagarin diagram is displayed.

Browser verification uses the production API tunnel and overrides the local SVG,
CSS and the changed schema label. All bound properties were populated in the live
snapshot. Running/stopped, locked, alarm, warning, disconnected and reconnect cases
were also exercised with browser-only states, alongside desktop clicks and phone
taps. The local [diagram report](../../../.reports/2026-11-13-gagarin-diagram/README.md)
contains screenshots and verification results. This diagram change is not deployed.


## Component standard — 16 November 2026

Source comparison confirmed that this diagram matched Kirov's earlier SVG, CSS
and script exactly after substituting only site identity. Its data schema is also
identical. The complete accepted Kirov component corrections are now applied here,
including the Nurlat-5 tank/valve symbols, while preserving this site's own code,
SVG/CSS scope, title and state bindings.

- Boiler bodies **65 × 70**, centered at x = 181.8 / 311.8, y = 195, with equal
  **40-unit** clearances to supply and return. Lower pipe endpoints meet y = 230.
- Centered burners **40 × 30**, radius **5**, with **18 × 27** flames. The old
  1.2-unit horizontal offset is removed; burner vertical centers stay y = 211.8.
- Pump frames **27 × 27**, radius **3**, at the original centers (440, 270) and
  (440, 310); concentric circles use radius **10**. Branch endpoints follow the frames.
- Four reading frames **55 × 12**, with centered tags/values/stems. Tops stay
  y = 96 / 246; value baselines are top + 9, and stems meet the new lower edges.
- The ХПВ vessel is **32 × 50**, radius **10**, at its original center (202.5, 380),
  with three symbolic blue dashed water lines. Side pipes meet x = 186.5 / 218.5.
- КП and drain valves use **16 × 10** bow-ties, **11-unit** stems and **8 × 8**
  square actuators without enclosing frames. КП's label is at y = 355; the drain
  rotates **−90°** for an actuator on the left. Pipes meet the valve ports directly.
- Readings/setpoints use **9 px**, emergency captions **7 px**, and all other text
  **10 px**, with `Roboto, Arial, sans-serif` inherited from the SVG root. The
  parameter heading is **«Прочие параметры котельной»**.
- Strokes use **1 / 0.5 / 0.25**; boiler/pump state and hover outlines use **1**,
  emergency-tile borders and hover **0.5**. Panel/card/tile radii are **10** and
  junction radii **1.5**. Decorative text passes pointer events through to equipment.

The `0 4 724 412` canvas, two-boiler topology, all 56 bound elements and 108
properties, ordered popover lists, units, signal predicates and colours are preserved.
Tank/valve artwork stays static; no new sensor or valve state is inferred.

See the [shared standard](../../../.docs/mnemoschema-components.md) and
[comparison/browser report](../../../.reports/2026-11-16-gagarin-komarova-standardization/README.md)
for the original-source comparison, before/after images and current checks. These
assets are prepared locally; production deployment is outside this change.

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

## Weather — 20 November 2026

The B tab uses one independent `Weather` subflow (`INTERVAL=1800`, `DEVICE_CODE=gagarin-boiler-room`).
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
a 27 × 27 hitbox at **(13, 44)**, and artwork translated to **(15, 45)**.
The popover order is description, temperature, pressure, humidity, wind speed, direction and gusts.
Weather editors stay hidden; chart metadata matches Nurlat-5. Missing weather dims the icon
and opens no empty popover. Nullable values display a dash; absent wind/gust fields are omitted.
See the [verification and deployment notes](../../../.reports/2026-11-20-b-weather/README.md).

The weather column now shows **temperature first**, at **(45, 54)**, followed by a
multiline description in a **65 × 19** box at **(45, 57)**. Both use the user's **8 px**
font. The description uses 9-unit line spacing and wraps to at most two lines. When it still exceeds
the available space, an ellipsis indicates the remaining text. Clicking the description or tapping
the station icon shows the full value in the existing popover. Missing values remain blank.

The description uses an SVG `foreignObject` with an XHTML `div` and the existing `data-state-eval`
binding, so no UI bundle or backend changes are required. Hover retains bold feedback. The station
artwork, icon click target, all existing cards and device ownership remain unchanged. The text clip
now extends to a local y=76 (75.8 for Muslum), keeping both description lines inside the header.
See [before/after images and browser checks](../../../.reports/2026-11-20-weather-wrap/README.md).
