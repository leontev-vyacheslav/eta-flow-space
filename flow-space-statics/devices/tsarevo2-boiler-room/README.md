# Котельная ЖК Царёво-2

The remade diagram uses the [shared component standard](../../../.docs/mnemoschema-components.md)
and the existing state contract from **Node-RED A**, tab `tsarevo2-boiler-room`,
`collect-device-state`. The collector, schema, alarm rules and production assets are unchanged.

## Process layout

The native canvas is **900 × 700**, replacing the first remake’s **980 × 700** canvas
and the older **1282 × 755.4** illustration.
All equipment is drawn in native units; placement uses translations/rotations without layout scales.
The additional vertical extent relative to the reference diagrams accommodates four boiler branches,
four network-pump branches and the separate source-water/tank/makeup circuit.
The application retains its existing fit, zoom and pan behavior.

- Header: `(10,10)`, **880 × 70**, «Прочие параметры котельной». It follows Spring-2:
  date/time at the left, centered heading, a **13.2 × 13.2** information icon at **(870,15)**,
  and rounded parameter cards at **y=41.9**, height **30.1**, width **76.8**, radius **10**.
  The nine card starts are **x=130 + i×84.3**, with 7.5-unit gaps; labels/value baselines are
  **53 / 66.6**, using **10 / 9 px** (mode values remain **10 px**). They show room temperature,
  supply temperature/pressure, outdoor temperature, gas pressure, both diesel levels and the
  two diesel-valve modes. Supply readings intentionally mirror their process instruments;
  labels retain Tsarevo-2's names rather than importing Spring-2 instrument tags.
- The complete process is inside **`translate(130 0)`**. The coordinates below are local to
  that group: equipment dimensions, pipe endpoints and internal spacing are preserved.
- Four boiler centers: **100, 270, 440, 610**. Bodies start at **y=185**, **65 × 70**;
  burners **40 × 30**, radius **5**; flame instances **18 × 27**. Gas crosses the supply
  with a bridge and reaches each burner. The supply header is **y=155**.
- Each boiler return branch retains its original **unbound circulation pump** at **y=300**,
  then its mapped outlet valve at **y=335**. The common boiler-return header is **y=350**.
  These four circulation symbols have no inferred controller signals or popovers.
- Network return enters at **y=395**. The four network pumps form a compact bank with centers
  **x=100 / 146 / 192 / 238**, **y=433**, between manifolds **395 / 470**. All four branches
  have a junction dot at both manifolds. The common outlet ends at **x=238** and returns
  through **x=25** to the boiler-return header. The bank heading is at **(169,380)**.
- Source water enters at **y=640**. The compact source-water pair has centers
  **(100,590) / (146,590)**, between manifolds **535 / 640**, and feeds the symbolic ХВО
  vessel and tank-filling valve. The common-outlet pressure instrument is at **(225,501)**,
  with a stem to **(225,535)**; its caption, frame and value move together to clear the pump icons.
  The ХВО vessel uses the standard **32 × 80** artwork with a static full blue fill;
  it has no measured level.
- The reserve-water tank is at **(430,540)**, **32 × 80**. Its outlet feeds two parallel
  compact makeup pumps at **(540,605) / (586,605)**, between manifolds **550 / 660**,
  then the network-makeup valve and network return. Both branch junctions are marked;
  the old **x=650** branch and its junction dots are removed. A junction at **(735,395)**
  marks the makeup connection to the network return.
- Emergency panel: **(10,90)**, **112 × 355**, directly below the header at the left,
  following Spring-2's two-column layout. Nine **43 × 43** tiles use **x=18 / 71** and
  **y=114 / 165 / 216 / 267 / 318**, with Spring-2's connection, power, gas and vapour artwork.
  The extra row retains Tsarevo-2's ninth binary indication. Only the **96 × 37** boiler-alarm
  summary remains below the tiles at **(18,400)**. Pump summaries `alarm-summary-1/2/3` are
  replaced by individual pump warning icons; the panel now ends at **y=445**.
  The ЩУК cards and all four `boiler-*-link` dots are removed; timestamp now belongs to the header.

Pump frames are **27 × 27**, radius **3**, rotors radius **10**. Instruments are **55 × 12**.
Readings use **9 px**, emergency-tile captions **7 px**, and other text **10 px**.
Panels and emergency tiles use radius **10**; strokes use **1 / 0.5 / 0.25**.
There is no weather block because this site's current schema/state has no weather contract.
The outdoor controller temperature remains `tempOutAir`, rather than being relabeled as weather.

## State meanings and property ownership

The SVG retains **96** previously displayed property paths. The four
`boilerControlLinkStatuses[i].isActive` paths are deliberately unbound for now: the user plans a
separate element later. They remain in Node-RED A and the unchanged schema. The former ЩУК cards,
boiler-link circles and boiler-popup link rows are removed; no connection colour is reassigned
to boiler bodies. The information icon lists `isConnected` then `timestamp`.
Boiler bodies and burners list **status, mode, burner power, alarm**;
this controller does not expose the other sites' `isWorking`, `isLocked` or boiler temperature fields.
The exact existing flame predicate remains **status in [2,3,4]**. A blue boiler outline indicates
those operating/startup states; status **6** or a nonzero boiler alarm gives a red outline.
Other boiler states have black outlines. Burner backgrounds remain grey in every state.
The common Spring-2 flame pulse runs over **3 s**, and flame artwork does not intercept clicks.

Network/source-water pumps use **64** for operating and **512** for fault; makeup pumps use
**8 / 32**. Other states stay grey. Each bank uses **46-unit** center spacing. Captions are end-aligned
at **(centerX − 4, centerY − 17.5)**, matching Spring-2's placement above the pump. There are no
standalone pump readings or setpoint labels; those values remain accessible on the equipment.

Frames and rotors open **status, mode, setPower, modeFc, statusFc** for network/source-water pumps,
or **status, mode** for makeup pumps. All fields remain schema-formatted, with their original units.

The exact Spring-2 `#emergencyIcon` artwork is reused beside all eight mapped pumps, at
**translate(centerX + 2, centerY − 33.6)**. It is hidden normally, and appears when that pump's
**status is 512** (makeup: **32**), **alarm is nonzero**, **statusFc is 8**, or **alarmFc is nonzero**.
Only network/source-water models have the two drive fields. Their warning popovers contain
**status, alarm, statusFc, alarmFc**; makeup warnings contain **status, alarm**. Status fields
intentionally occur on both the equipment and its warning because they describe normal and fault
states. Alarm-code fields belong to the warning only. The same complete fault predicate makes the
pump frame/rotor outline red; otherwise running outlines are blue and stopped outlines black.
Stopped, starting, no-power or waiting values are not turned into inferred alarms.

This replaces pump summaries `alarm-summary-1/2/3` without dropping their diagnostic fields.
Connection colour belongs to the connection tile and metadata icon.

**Site palette selected by the user:** every non-gas pipe and hydraulic junction dot is **black**.
Gas pipes/junctions remain **#FF9800**. This is a Tsarevo-2 exception to the shared coloured-pipe
profile; it does not change any other diagram. Tank water fill/level indicators remain blue, and
state-dependent equipment outlines retain their existing colours.

ЗК1–ЗК4 use the unified single-path bow-tie, stem and white square actuator. Their **own** schema
still maps status **0** to yellow (intermediate), **1** to red (closed) and **2** to green (open).
Every body lobe, stem and actuator resolves to the same status popup and highlights the assembly.
The two makeup valves expose **mode only**: green/yellow means auto/manual per this site's schema,
not an independently measured open/closed position. Diesel valve modes remain in the header.

**Existing mapping requiring separate confirmation:** Node-RED A assigns `alarmNP_2` to
`networkPumps[0].alarm` and `alarmNP_1` to `networkPumps[1].alarm`. The diagram preserves that
collector contract. No claim is made that the swapped physical associations are correct.

## Discrete reserve-water level

The tank has four boolean switches, not an analogue percentage. Its ordered popup is:
`isSupplyWaterLevelEmergencyMax`, `isSupplyWaterLevelWorkingMax`,
`isSupplyWaterLevelWorkingMin`, `isSupplyWaterLevelEmergencyMin`.
The highest active switch selects a **symbolic band**, following the original script's priority:
maximum / working maximum / working minimum / emergency minimum; no active switch leaves it empty.
The bands use dash lengths **80 / 68 / 34 / 6 / 0**, each against an 80-unit tank height.
These are display coordinates, not a measured or reported percentage.
Each switch keeps its own static caption and blue/white indicator, so simultaneous switches remain
inspectable. The boolean's schema display colorizer is suppressed on this label/indicator artwork.

`mnemo-schema.js` now returns an empty plugin: the SVG handles all state updates, removing the old
absolute-coordinate tank mutation and the old “hide all lower active labels” behavior.

## Verification and status — 23 November 2026

See the [compact pump banks and browser evidence](../../../.reports/2026-11-23-tsarevo2-pump-banks/README.md).
The [panel-layout follow-up](../../../.reports/2026-11-23-tsarevo2-spring2-layout/README.md) records
the preceding layout before compact pump banks and equipment warning icons.
The [22 November draft](../../../.reports/2026-11-22-tsarevo2-remake/README.md) records the earlier layout,
not the current panel positions or deferred link bindings.
Local previews use the existing API tunnel and override only this site's static files.
Synthetic operating/stopped/fault cases are browser response fixtures; they do not write device state.
These changes are prepared locally and are not deployed.
