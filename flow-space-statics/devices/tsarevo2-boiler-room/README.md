# Котельная ЖК Царёво-2

The remade diagram uses the [shared component standard](../../../.docs/mnemoschema-components.md)
and the existing state contract from **Node-RED A**, tab `tsarevo2-boiler-room`,
`collect-device-state`. PLC fields and alarm rules are preserved. Optional cached-weather
collection/schema support is prepared locally alongside the diagram; these changes are not deployed.

## Process layout

The native canvas is **905 × 700**, replacing the first remake’s **980 × 700** canvas
and the older **1282 × 755.4** illustration.
All equipment is drawn in native units; placement uses translations/rotations without layout scales.
The additional vertical extent relative to the reference diagrams accommodates four boiler branches,
four network-pump branches and the separate source-water/tank/makeup circuit.
The application retains its existing fit, zoom and pan behavior.

- Header: `(10,10)`, **880 × 70**, «Прочие параметры котельной». It follows Spring-2:
  date/time at the left, centered heading, a **13.2 × 13.2** information icon at **(870,15)**,
  and rounded parameter cards at **y=41.9**, height **30.1**, width **76.8**, radius **10**.
  The eight card starts are **x=214.3 + i×84.3**, with 7.5-unit gaps; labels/value baselines are
  **53 / 66.6**, using **10 / 9 px** (mode values remain **10 px**). They show room temperature,
  supply temperature/pressure, controller outdoor temperature, both diesel levels and the
  two diesel-valve modes. Supply readings intentionally mirror their process instruments;
  labels retain Tsarevo-2's names rather than importing Spring-2 instrument tags.
  Removing the gas-pressure card lets the first four remaining cards move right **84.3 units**;
  the last four retain their positions. The standard weather block occupies the freed left column.
- The complete process is inside **`translate(130 0)`**. The coordinates below are local to
  that group: equipment dimensions, pipe endpoints and internal spacing are preserved.
- Gas enters from the left below the emergency panel, then rises at local **x=10**
  (canvas **x=140**) to the existing **y=110** header. This puts its riser between the
  panel's right edge **x=122** and the supply riser **x=155**, with **18 / 15-unit** clearances.
  Its four existing burner branches and supply-crossing bridges are retained.
  The header now ends directly at the fourth branch **(562,110)**; the unused **153-unit**
  continuation and that former branch/end dot are removed. The remaining three header dots are tees.
  Gas pressure is a **55 × 12** instrument beside the inlet: canvas frame **(60.5,387)**,
  value baseline **396**, «Ргаза» baseline **382**, centered at **x=88**. Its black stem reaches
  the orange takeoff dot at **(88,418)**. It retains `pressGas`, its **кПа** unit and popup.
- Four boiler centers: **100, 270, 440, 610**. Bodies start at **y=185**, **65 × 70**;
  burners **40 × 30**, radius **5**; flame instances **18 × 27**. Gas crosses the supply
  with a bridge and reaches each burner. The supply header at **y=155** runs left to **x=25**,
  drops to **y=455**, then runs right to the red **Т1** outlet. Four **5.2-unit** crossing gaps
  keep this supply line separate from the vertical network-pump branches, following Spring-2.
- Each boiler return branch retains its original **unbound circulation-pump artwork** at **y=300**,
  then its mapped outlet valve at **y=335**. Captions **НК1–НК4** are above the pumps.
  Their separate warning icons use only the corresponding boiler's confirmed **512** alarm code;
  the artwork still has no inferred working/mode state. The boiler-return header at **y=350**
  descends directly under **ЗК1 at x=100** to the network-pump upper manifold at **y=395**.
  The former drop at **x=270** is removed; the common return header still serves all four boilers.
- Network return enters through **Т2 at y=490**. The four network pumps form a compact bank with centers
  **x=100 / 146 / 192 / 238**, **y=433**, between manifolds **395 / 490**. All four branches
  have a junction dot at both manifolds. The lower manifold continues right at **y=490** to
  the blue **Т2** inlet; it is separate from Т1 above it. The bank heading stays at **(169,380)**.
  Supply instruments move as complete assemblies to **y=421**, with stems to **455**;
  return instruments sit below Т2 at **(585,505) / (670,505)**, with captions at **y=531**.
- The source-water block is grouped as **`source-water-assembly`**, translated **(0,30)**
  from its preceding layout. The pressure takeoff and filling-valve centerline is **y=565**.
  В1 enters farther left at canvas **(41,483)**, runs to **(172,483)**, drops to **(172,565)**,
  then reaches the unchanged left manifold midpoint **(203,565)**. The drop stays **58 units**
  left of the Т2 line's start, so no crossing/junction is added. The parallel source pumps are
  at **(123,542) / (123,588)**; their manifolds span
  **542–588** at **x=73 / 178**, with midpoint junctions on **y=565**. Captions remain below
  the group heading and above their frames, at effective **y=525 / 571**. The existing group
  heading is **(123,503)**, raised **12 units** to clear the warning above НВ1. The pressure frame is effectively
  **(197.5,541)**, value baseline **550**, caption **536**, and stem **553→565**.
  The filling valve is at effective **(325,565)**, moved **40 units left** with its caption
  from the preceding layout; the caption stays at **y=540**. The source pipe is unchanged.
- Source water now reaches the tank through one **straight horizontal pipe** at **y=565**,
  from the bank outlet through the pressure takeoff and filling valve to the tank's left side
  at **(430,565)**. The former stepped/top-center inlet is removed. ХВО remains absent.
- The complete reserve-water block is grouped as **`reserve-water-assembly`**, translated
  **(0,−30)** from the preceding layout. Its body is effectively **(430,540)**, still **32 × 80**,
  with both tank caption lines. The four separate switch labels/dots are replaced by one
  **55 × 12** level instrument to its left: frame **(362.5,584)**, value baseline **593**,
  «Уровень» caption baseline **607**, centered at **x=390**. Its short horizontal instrument
  stem reaches the tank's left edge at **(430,590)**, clear of the inlet at **y=565**.
- The tank's right-side midpoint is **(462,580)**. Its outlet continues straight through
  **(508,580)** onto the first makeup branch, with no vertical step. The complete makeup bank
  and its heading move **2 units up**: pump centers **(563,580) / (563,626)** retain **46-unit**
  spacing, and both manifolds span **580–626**. The right manifold at **x=618** discharges via
  **(618,603)** to **x=735**, the network-makeup valve at **(735,560)** and Т2 at **(735,490)**.
  Only the true branch junctions at **(508,580)** and **(618,603)** carry dots; the three plain
  elbow dots are removed. Captions and warning icons move with their pumps.
  The inlet/outlet side-port positions are user-selected exceptions to the shared top/bottom ports.
- Emergency panel: **(10,90)**, **112 × 279**, directly below the header at the left,
  following Spring-2's two-column layout. Nine **43 × 43** tiles use **x=18 / 71** and
  **y=114 / 165 / 216 / 267 / 318**, with Spring-2's connection, power, gas and vapour artwork.
  The extra row retains Tsarevo-2's ninth binary indication. All equipment summaries, including
  `alarm-summary-0`, are replaced by the corresponding equipment warning icons. The panel
  now ends at **y=369**.
  The ЩУК cards and all four `boiler-*-link` dots are removed; timestamp now belongs to the header.

**Т1 / Т2** retain Spring-2's **11.1 × 10.8** triangles and **0.5-unit** outlines. Т1 is red
and points right at **y=455**; Т2 is blue and points left at **y=490**. Their black pipes join
directly at local **(754,455) / (754,490)**.

The left-side **gas / В1** inlets match Nurlat-5: **10 × 10**, right-pointing triangles without
outlines, orange **#FF9800** and blue **#0083CD**. In canvas coordinates their bases align at
**x=31**, tips at **x=41**, and centerlines at **y=418 / 483**. These preserve the reference's
**21-unit** inset from the panel's left edge, **49-unit** panel-bottom-to-gas offset and
**65-unit** gas/water separation. Both pipes meet their triangle tips directly. «Газ» uses
canvas anchor **(46,435)**; the site-specific «В1» label starts at **(41,501)** instead of
copying Nurlat's «От ХВО». All connector captions use **10 px**. The canvas retains **5 units**
on the right to keep the complete Т1/Т2 triangles and labels inside the viewport.

Pump frames are **27 × 27**, radius **3**, rotors radius **10**. Instruments are **55 × 12**.
Readings use **9 px**, emergency-tile captions **7 px**, and other text **10 px**.
Panels and emergency tiles use radius **10**; strokes use **1 / 0.5 / 0.25**.
The outdoor controller temperature remains `tempOutAir`, separate from cached `weather.temp`.

## Standard weather block — prepared locally

The station reuses Spring-2's exact Nurlat-style artwork, black **0.5-unit** strokes and
non-interactive decorations. The **27 × 27** transparent hitbox is at canvas **(19,46)**,
artwork at **(21,47)**, temperature anchor **(51,56)**, and description box **(51,59)**,
**155 × 19**. These are the shared offsets from the header's **(10,10)** origin.
The description width follows the available space before the first card at **x=214.3**;
both temperature and description use **8 px**, with **9-unit** line height and two-line clamping.
The clip starts at **(48,45)** and ends at **(206,78)**, clearing the first card and panel edge.

The icon lists **description, temp, pressure, humidity, wind.speed, wind.deg, wind.gust**;
the description opens its full text. Weather is owned by **tsarevo2-boiler-room**. Missing weather
dims the station to **0.4** and hides both readout slots. Multi-property slot guards also hide
previous readings when weather/description disappears on a later poll; valid zero/negative
temperatures remain visible and schema-formatted. No provider icon replaces the station artwork.

The optional `WeatherModel` / `WeatherWindModel` definitions match Nurlat-5. The local Node-RED A
collector reads the location cache through `getWeatherFromCacheAsync`, copying only standard metric
fields and first-condition description/icon. A new **tsarevo2-weather** instance reuses the existing
Weather subflow, with **INTERVAL=600** seconds like the current Spring-2 instance and a three-interval
cache TTL. It uses registered location coordinates and the inherited provider credential; no location
or secret is embedded in the diagram/flow. Missing cache or read failures still allow PLC storage.
No existing PLC field, enum, unit, wiring or shared subflow changes.

Current live controller state has no weather object. The block stays dim/blank until these local
flow/schema changes are deployed and a weather/PLC poll succeeds. Browser weather previews use
response fixtures only; no provider request, Node-RED deployment, restart or production device-state write was made.

## State meanings and property ownership

The SVG retains all **96** previously displayed property paths and adds **seven** weather paths.
The four
`boilerControlLinkStatuses[i].isActive` paths are deliberately unbound for now: the user plans a
separate element later. They remain in Node-RED A and the unchanged schema. The former ЩУК cards,
boiler-link circles and boiler-popup link rows are removed; no connection colour is reassigned
to boiler bodies. The information icon lists `isConnected` then `timestamp`.
Boiler bodies and burners list **status, mode, burner power**. Each boiler's separate warning
lists **status, alarm**, appears for **status 6 or any nonzero alarm**, and sits just outside
its upper-right corner at **(centerX+35,187)**. The removed boiler-summary fields now belong
on these icons; they remain available in full.

The circulation-pump warning at **(centerX+2,266.4)** lists that boiler's **alarm** and appears
only for code **512 — Отключение насосов**. This is a boiler-level diagnostic, not independent
circulation-pump telemetry. The schema and collector expose no per-circulation-pump state.
No running state or additional fault meaning is inferred for their static artwork.

For boilers,
this controller does not expose the other sites' `isWorking`, `isLocked` or boiler temperature fields.
The exact existing flame predicate remains **status in [2,3,4]**. A blue boiler outline indicates
those operating/startup states; status **6** or a nonzero boiler alarm gives a red outline.
Other boiler states have black outlines. Burner backgrounds remain grey in every state.
The common Spring-2 flame pulse runs over **3 s**, and flame artwork does not intercept clicks.

Network/source-water pumps use **64** for operating and **512** for fault; makeup pumps use
**8 / 32**. Other states stay grey. Each bank uses **46-unit** center spacing: horizontal spacing
for the network bank, vertical spacing for the two newly horizontal pump pairs. Only their bound
artwork rotates; labels and warning icons remain upright. Captions are end-aligned at
**(centerX − 4, centerY − 17.5)** for network/makeup pumps. The existing source-water captions use
**(centerX − 4, centerY − 17)** above the frames. There are no
standalone pump readings or setpoint labels; those values remain accessible on the equipment.

Frames and rotors open **status, mode, setPower, modeFc, statusFc** for network/source-water pumps,
or **status, mode** for makeup pumps. All fields remain schema-formatted, with their original units.

The exact Spring-2 `#emergencyIcon` artwork is reused beside all eight mapped pumps, at
**translate(centerX + 2, centerY − 33.6)** for network pumps, or
**translate(centerX + 18, centerY − 33.6)** above-right of the horizontal source-water/makeup
pumps. These four warnings are raised **24.6 units** from their previous pipe-crossing
positions, giving the same vertical clearance above the pump frame as the network warnings.
It is hidden normally, and appears when that pump's
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

ЗК1–ЗК4 use the unified single-path bow-tie, stem and white square actuator. The current
[shared position-colour rule](../../../.docs/mnemoschema-components.md#valve-position-colours)
uses **grey #808080 for closed** and **white #FFFFFF for open**. Tsarevo-2's confirmed enum
codes remain **1 / 2**, and **0** intermediate stays yellow. Each SVG body suppresses the
legacy schema red/green colourizer and explicitly chooses these standard fills; the schema,
collector values and enum descriptions are unchanged. Group hover and property popovers remain.

The two makeup valves expose **Auto/Manual mode only**, so their bodies remain **neutral grey**
for both mode values. This placeholder does not establish a closed position. Their mode popovers
remain available, and no Auto→Open or Manual→Closed mapping is invented. Diesel modes stay in the header.

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
The separate **«Уровень»** instrument combines the four switch labels into one reading:
**«Авар. макс.» / «Раб. макс.» / «Раб. мин.» / «Авар. мин.»**, using that same highest-active
priority. When no switch is active, the instrument shows **«—»** without asserting a measured zero level.
Its frame and value bind the same four ordered properties as the tank, so every simultaneous
switch state remains inspectable in the full popup. The frame has the standard white fill and
black **0.25-unit** outline, with yellow hover; no sensor tag, percentage or new alarm predicate
is invented. The four old label/dot pairs are removed. Boolean display colourizers are suppressed
with `data-colorizer-hint="none"`, so the combined instrument remains visible for all-false states.

`mnemo-schema.js` now returns an empty plugin: the SVG handles all state updates, removing the old
absolute-coordinate tank mutation and the old “hide all lower active labels” behavior.

## Verification and status — 24 November 2026

See the [gas-pressure instrument and weather block](../../../.reports/2026-11-24-tsarevo2-weather-pressure/README.md).
The [left gas route and Nurlat-style inlets](../../../.reports/2026-11-24-tsarevo2-left-inlets/README.md)
records the preceding header card, gas tail and weather-free header.
The [straight makeup inlet and joined connectors](../../../.reports/2026-11-24-tsarevo2-pipe-junctions/README.md)
records the preceding gas header and В1 inlet position.
The [combined level instrument and filling-valve move](../../../.reports/2026-11-24-tsarevo2-level-instrument/README.md)
records the preceding makeup-bank position and separated connector triangles.
The [straight inlet, block alignment and valve colours](../../../.reports/2026-11-23-tsarevo2-straight-inlet/README.md)
records the preceding separate switch labels and filling-valve position.
The [preceding water-layout report](../../../.reports/2026-11-23-tsarevo2-water-layout/README.md)
records the earlier tank position and stepped top inlet.
The [preceding routing report](../../../.reports/2026-11-23-tsarevo2-routing/README.md) records
Т1/Т2 connectors and boiler diagnostics before this water-circuit refinement.
The [compact-bank report](../../../.reports/2026-11-23-tsarevo2-pump-banks/README.md) records
pump property ownership before this routing and orientation update.
The [panel-layout follow-up](../../../.reports/2026-11-23-tsarevo2-spring2-layout/README.md) records
the preceding layout before compact pump banks and equipment warning icons.
The [22 November draft](../../../.reports/2026-11-22-tsarevo2-remake/README.md) records the earlier layout,
not the current panel positions or deferred link bindings.
Local previews use the existing API tunnel and override only this site's static files.
Synthetic operating/stopped/fault cases are browser response fixtures; they do not write device state.
These changes are prepared locally and are not deployed.
