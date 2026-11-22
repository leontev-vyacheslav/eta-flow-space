# Кирова device state and diagram

The `kirov-boiler-room` tab (`317b54f83d70049a`) lives in
[Node-RED B](../../../flow-space-nodered-b/flows.json). Collector
`dee90facac3f975e` maps all 118 decoded device parameters and awaits
`storeDeviceStateToCacheAsync` with Kirov's device code and the tab ID from
`node.path` before assigning `msg.deviceState`.

The seven converters match Gagarin's register decoding. Their functions, polling,
gateway configuration, wiring and node IDs are preserved. This expansion adds the
same 68 missing parameters as Gagarin while retaining Kirov's previous 50 state
paths and values. No history migration is needed.

## State contract

| State section | Contents |
|---|---|
| Measurements | Outdoor temperature; network supply/return temperatures and pressures |
| Room state | Room state, local/remote control, manual/automatic operation |
| Cascade | All 15 setpoints, correction, limits, bands, integrals, delays and warm-up settings |
| Alarms and inputs | Alarm bits and separate battery-low, door, CO, CH4, security and fire PLC inputs |
| `sensors` | All 17 decoded sensor-fault, warning and alarm flags |
| `pressureLimits` | Four network supply/return pressure limits |
| `pressureThresholds` | Eight supply/return thresholds: HH, H, L, LL |
| `temperatureThresholds` | Eight supply/return thresholds: HH, H, L, LL |
| `boilers[0..2]` | Normal/locked/running states, minimum/maximum burning, four command-feedback bits, alarm, start error and start order |
| `networkPumps[0..1]` | Running state, start/stop command feedback and start error; `mainNetworkPumpNumber` identifies the main pump |

There are 119 converter fields including `Time_Rqst`. This polling metadata is
excluded because `timestamp` continues to use the collector's `Date.now()`. The
Web API supplies `isConnected`. Each scalar schema property records its source
in `$comment`.

Pressures are already converted by `data_convert` from MPa to бар (×10), so the
collector does not scale them again. Temperatures are °C. Real values retain the
seven-significant-digit convention. The exported flow does not establish units
for delays, warm-up time or cascade integrals; no unit is assumed.

Physical TE1 is outdoor air, TE2 is network supply and TE3 is return. The threshold
decoder instead numbers supply/return T1/T2. `t_inl`/`t_out` and `P_inl`/`P_out`
likewise mean supply/return. All return-side HH/H threshold values are retained,
including where the converter does not provide corresponding active alarm flags.

`tempBoilersSetpoint` keeps its historical key and `tnet` source. Its display label
and header card follow the converter's current network-supply target meaning.
`tempOutNetSetpoint` is the weather-based supply target. No individual boiler
temperature is available in this model.

`isBatteryLow` remains the alarm-list bit `Batt_alarm`; the separate input
`Battery_low` is `isBatteryInputLow`. The other original input signals also remain
independent of their alarm-list bits. `Battery_good = 1` means a battery fault and
is not inverted. Null or absent scalar inputs remain null, and new schema fields
are optional for older snapshots. All editors are read-only, including settings
and PLC command-feedback fields.

## Diagram bindings

The diagram applies Gagarin's accepted refinements with Kirov's device code,
title and scoped SVG/CSS IDs. Its 56 bound elements reference 108 distinct state
properties. The existing two-boiler drawing and pipework are preserved. The third
controller boiler channel remains available in Parameters.

The six header cards show outdoor temperature, current supply target, weather
target, room state, control mode and operating mode. Setpoint cards include their
configuration, correction, control bands or supply limits. Enum text comes from
the schema. The information icon starts with `isConnected`, then `timestamp`,
followed by seven unique cascade integral/delay/warm-up properties.

Each instrument opens its measurement, corresponding sensor flags, thresholds
and pressure limits where present. Red outlines indicate reported faults or
alarms; amber indicates reported warnings. The diagram uses PLC flags directly,
without recalculating alarms from displayed readings or inventing absent flags.

Boiler bodies and burners share ten ordered properties: `isWorking`, `isLocked`,
`isNormal`, minimum/maximum burning, four command-feedback bits, then `startOrder`.
Running outlines are blue, stopped outlines black and locked body fill amber.
Flames follow `isWorking` independently of `isNormal`. Boiler alarm/start-error
fields belong to their dedicated emergency tiles.

Both pump centres and frames open the full running/command/error detail list.
Running pumps have blue outlines; stopped centres are grey. A reported start
error makes the outline red. The pump summary contains both pumps' running/error
states and the main pump number; stopped pumps alone do not make it red.

The emergency panel retains square 43 × 43 tiles in a
112-unit-wide panel, equal side margins and a 10-unit column gap. The connection
tile uses the original crossed wireless artwork, which matches Kirov's older
connection icon. Other tiles keep alarm bits separate from original input signals.

Connection status colours the information icon and timestamp; the header border
stays grey. Reconnection restores normal colours. Bound shapes use the scoped
yellow hover outline/glow and restore state colours after pointer leave.
Decorative flame, alarm and pump artwork passes pointer events to full detail
targets. Phone popovers fit the viewport and wrap long property names.

## Verification and deployment

Offline verification exercises all seven converters and all 144 polled register
words through the existing [flow-chain runner](../../../.tools/flow-chain/README.md)
with `--flows flow-space-nodered-b/flows.json`. It checks all 118 mapped parameters,
unchanged existing values, schema/UI-helper compatibility, null preservation and
the awaited storage contract with Kirov's device code and tab UID.

During the 13 November verification, the live API returned the older 50-parameter
mapping. That browser preview kept those values live and filled only the newly
mapped fields with synthetic fixture values. Alarm/connection scenarios also
stayed in browser responses. The local
[verification report](../../../.reports/2026-11-13-kirov-refinement/README.md)
contains the decoded collector diff, source inventory and browser evidence.
That report records local verification, not deployment confirmation.


## Component standard — 16 November 2026

The diagram now follows the current [component standard](../../../.docs/mnemoschema-components.md),
using Nurlat-5 as the implementation example. These dimensions supersede Kirov's
earlier reference dimensions and proportional boiler-border widths.

- Boiler bodies are **65 × 70**, centered at x = 181.8 / 311.8, y = 195.
  Their tops remain at y = 160; both supply/return clearances are **40**.
  Lower pipe endpoints follow the new bottom edge at y = 230.
- Burners are **40 × 30**, radius **5**. Their horizontal centers now match
  the boiler and flame centers; the old 1.2-unit offset is removed. Burner
  vertical centers remain y = 211.8; the **18 × 27** flames align to them.
- Network pump frames are **27 × 27**, radius **3**, at the original centers
  (440, 270) and (440, 310). Both concentric circles use radius **10**;
  connected branch endpoints follow x = 426.5 / 453.5.
- All four network reading frames are **55 × 12**, centered on their existing
  sensor tags, values and stems. Tops remain y = 96 / 246; value baselines
  are y = 105 / 255 and attached stems begin at y = 108 / 258.
- Readings and numeric setpoints use **9 px**, emergency-tile captions **7 px**,
  and other text **10 px**, with root `Roboto, Arial, sans-serif` inheritance.
  The parameter heading is **«Прочие параметры котельной»**.
- Component strokes use **1 / 0.5 / 0.25**. Boiler and pump borders use **1**
  in every state; yellow hover uses **1**, with emergency tiles fixed at **0.5**.
  Panel/card/tile corners use radius **10**, and junction dots **1.5**.
  Intrinsic alarm-symbol artwork retains its own geometry and strokes.

Decorative text passes pointer events through to equipment targets, matching Nurlat-5.
This prevents the СН1 caption from intercepting the pump frame's upper-edge hover.

The Бак подпитки vessel and both valves also use the Nurlat-5 symbols, now recorded as
shared `tank` / `valve` defaults. The canvas is now `0 4 724 427`. The vessel is **32 × 80**, top radius **10**, square lower corners, centered
at its original (202.5, 380), with solid **#0083CD** fill (static artwork, no measured level). Its label stays
Бак подпитки, six units above the top; horizontal inlet/outlet connections end at
x = 186.5 / 218.5. The water artwork is symbolic and has no level binding.

The КП valve stays at (430, 380) and the drain valve at (675, 300). Both use the
**16 × 10** bow-tie, **11-unit** stem and **8 × 8** square actuator, with no
surrounding frame. КП's actuator sits above the pipe and its caption baseline is
y = 355. The drain symbol rotates **−90°**, putting the actuator on the left;
its original drain caption stays upright. Pipe endpoints now meet the valve bodies
directly. Neither valve has a collected state channel, so both remain static grey.
See the [tank/valve report](../../../.reports/2026-11-16-kirov-tanks-valves/README.md).

The **724 × 412** canvas (`viewBox="0 4 724 412"`), two-boiler topology,
all 56 bound elements and 108 distinct properties, their ordered lists, units,
state predicates are preserved. Burner backgrounds now stay `#808080` in both
stopped and running states; the running flame uses the Spring-2 animated glow.
Running boiler outlines stay blue and locked body fill amber.

The [standardization report](../../../.reports/2026-11-16-kirov-standardization/README.md)
records current browser checks and before/after evidence separately from the
historical mapping verification above. These assets are prepared locally;
production deployment is outside this change.

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

The B tab uses one independent `Weather` subflow (`INTERVAL=1800`, `DEVICE_CODE=kirov-boiler-room`).
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

## Filled makeup-water tank — 22 November 2026

The Бак подпитки vessel now uses Nurlat-5's 32 × 80 outline: rounded upper corners,
flat bottom, black 1-unit stroke and solid **#0083CD** fill. It is a static full
tank symbol because no level measurement is available, with no numeric reading
or new state binding. Its existing centre and side-pipe connections are preserved;
the top/caption move up 15 units and the bottom extends down 15. The canvas grows by 15 units to retain the bottom margin.
See [previews and verification](../../../.reports/2026-11-22-filled-tanks/README.md).

## Makeup assembly placement — 22 November 2026

The tank and its horizontal inlet/outlet pipe assembly are raised **30 units**.
The tank centre is now **(202.5, 350)**, with body bounds x = 186.5–218.5,
y = 310–390 and caption baseline y = 304. КП and its caption move **50 units left**
within the raised assembly: the valve centre is **(380, 350)** and caption baseline
y = 325. Pipes meet its body at x = 372 / 388. The vertical connection still meets
the fixed return pipe at **(510, 270)**. Other equipment and canvas bounds stay fixed.
See [before/after verification](../../../.reports/2026-11-22-makeup-layout/README.md).

### Further alignment — 22 November 2026

The assembly is raised another 20 units (50 total). КП moves another 30 left:
its centre is now (350, 330). The tank and complete inlet fragment move 19.3 units
right to align the inlet arrow's left edge with К1 at x = 149.3. Tank centre is (221.8, 330),
body y = 290–370, and its Бак подпитки caption baseline is y = 284. The inlet arrow and ХВС
label move together. The outlet connects tank x = 237.8 to valve x = 342; the
right valve port x = 358 connects to the unchanged return junction (510, 270).
See [current previews](../../../.reports/2026-11-22-makeup-align/README.md).
