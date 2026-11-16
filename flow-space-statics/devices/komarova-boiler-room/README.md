# Комарова device state and diagram

The `komarova-boiler-room` tab (`5ca4365890b5a5ed`) lives in
[Node-RED B](../../../flow-space-nodered-b/flows.json). Collector
`4441926607fc016b` maps all 118 decoded device parameters and awaits
`storeDeviceStateToCacheAsync` with Komarova's device code and the tab ID from
`node.path` before assigning `msg.deviceState`.

The seven converters match Gagarin's register decoding. Their functions, polling,
gateway configuration, wiring and node IDs are preserved. This expansion adds the
same 68 missing parameters as Gagarin while retaining Komarova's previous 50 state
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

The diagram applies Gagarin's accepted refinements with Komarova's device code,
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

The emergency panel retains Gagarin's corrected square 43 × 43 tiles in a
112-unit-wide panel, equal side margins and a 10-unit column gap. The connection
tile uses the original crossed wireless artwork, which matches Komarova's older
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
the awaited storage contract with Komarova's device code and tab UID.

During the 13 November verification, the live API returned the older 50-parameter
mapping. That preview kept those values live and filled only the newly mapped
fields with synthetic fixture values. Alarm/connection scenarios also stayed in
browser responses. The local
[verification report](../../../.reports/2026-11-13-komarova-refinement/README.md)
contains the decoded collector diff, source inventory and browser evidence.
That report records local verification, not deployment confirmation.


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
