# Котельная ЖК Царёво-2

The remade diagram uses the [shared component standard](../../../.docs/mnemoschema-components.md)
and the existing state contract from **Node-RED A**, tab `tsarevo2-boiler-room`,
`collect-device-state`. PLC fields and alarm rules are preserved. Optional cached-weather
collection/schema support is documented below. This layout change is prepared locally and is not deployed.

## Process layout

The native canvas is **805 × 610**, cropped from the preceding **905 × 700** layout.
The header and lower-right circuit now fit the four-boiler footprint, following Spring-2.
All equipment is drawn in native units; placement uses translations/rotations without layout scales.
The canvas includes four boiler branches, four network-pump branches and the separate
source-water/tank/makeup circuit. Cropping changes the dashboard fit scale, not native component sizes.
The application retains its existing fit, zoom and pan behavior.

- Header: `(10,10)`, **785 × 70**, «Прочие параметры котельной». It follows Spring-2:
  date/time at the left, centered heading, a **13.2 × 13.2** information icon at **(775,15)**,
  and rounded parameter cards at **y=41.9**, height **30.1**, radius **10**.
  The first seven cards are **76.8** wide; «Заполнение ДТ» (`flapDtFill.mode`) is **96.8** wide,
  widened **20 units** with its label and value recentered. The complete card row uses
  **`translate(-20 0)`**, with starts **x=116.8 + i×81.8**, **5-unit** gaps and an **8.8-unit**
  inset from the panel’s right edge. The heading is centered at **x=402.5**. Labels/value baselines are
  **53 / 66.6**, using **10 / 9 px** (mode values remain **10 px**). They show room temperature,
  supply temperature/pressure, controller outdoor temperature, both diesel levels and the
  two diesel-valve modes. Supply readings intentionally mirror their process instruments;
  labels retain Tsarevo-2's names rather than importing Spring-2 instrument tags.
  The widened final card retains the preceding right edge at **x=786.2**.
  The weather description uses a **62-unit** column to keep clear of the shifted first card.
- The main process is inside **`translate(130 -40)`**, raised another **20 native pixels**
  from the preceding layout. The coordinates below are process-local unless marked canvas.
  Equipment dimensions and the boiler/network/source-water bank spacing are preserved. The gas and В1 inlets,
  gas-pressure assembly and inlet captions first move **82 units down** within the process,
  followed by the **20-unit** overall lift: their net canvas movement is **62 units down**.
  The top parameter header and emergency panel stay fixed.
- Gas enters from the left below the emergency panel, then rises at local **x=10**
  (canvas **x=140**) to the header at local **y=130**, canvas **y=90**. This puts its riser between the
  panel's right edge **x=122** and the supply riser **x=155**, with **18 / 15-unit** clearances.
  Its four existing burner branches and supply-crossing bridges are retained.
  The header now ends directly at the fourth branch **(562,130)**; the unused **153-unit**
  continuation and that former branch/end dot are removed. The remaining three header dots are tees.
  Gas pressure is a **55 × 12** instrument beside the inlet: canvas frame **(60.5,449)**,
  value baseline **458**, «Ргаза» baseline **444**, centered at **x=88**. Its black stem reaches
  the orange takeoff dot at **(88,480)**. It retains `pressGas`, its **кПа** unit and popup.
- Four boiler centers: **100, 270, 440, 610**. Bodies start at **y=185**, **65 × 70**;
  burners **40 × 30**, radius **5**; flame instances **18 × 27**. Gas crosses the supply
  with a bridge and reaches each burner. The supply header at **y=155** runs left to **x=25**,
  drops to **y=455**, then runs right to the red **Т1** outlet. Four **5.2-unit** crossing gaps
  keep this supply line separate from the vertical network-pump branches, following Spring-2.
  In canvas coordinates the gas/supply headers are now **y=90 / 115**, retaining **25-unit**
  spacing. The top parameter panel ends at **y=80**: its gap to the gas header decreases
  **30 → 10 units**. The gas bridges follow the moved supply crossing.
- Each boiler return branch retains its original **unbound circulation-pump artwork** at **y=300**,
  then its mapped outlet valve at **y=335**. Captions **НК1–НК4** are above the pumps.
  Their separate warning icons use only the corresponding boiler's confirmed **512** alarm code;
  the artwork still has no inferred working/mode state. The boiler-return header at **y=370**
  descends directly under **ЗК1 at x=100** to the network-pump upper manifold at **y=395**.
  The former drop at **x=270** is removed; the common return header still serves all four boilers.
  The header and its three tee dots at **x=100 / 270 / 440** are lowered **20 units**
  from the preceding **y=350** layout. All four boiler return tails extend to **y=370**;
  the first-boiler drop shortens to **25 units** before the unchanged network manifold.
- Network return enters through **Т2 at y=490**. The four network pumps form a compact bank with centers
  **x=100 / 146 / 192 / 238**, **y=433**, between manifolds **395 / 490**. Only tees have
  junction dots: upper **(100,395) / (146,395) / (192,395)** and lower
  **(146,490) / (192,490) / (238,490)**. The upper-right **(238,395)** and lower-left
  **(100,490)** corners are two-segment elbows without dots. The lower manifold continues right at **y=490** to
  the blue **Т2** inlet; it is separate from Т1 above it. The bank heading is at **(169,385)**.
  All four supply/return instruments move **85 units left** as complete assemblies.
  Supply centers are process-local **(500,421) / (585,421)** with stems to **455**;
  return centers are **(500,505) / (585,505)**, with captions at **y=531**.
  Temperature and pressure remain in matching columns at canvas **x=630 / 715**.
  Frames, readings, captions, stems and dots move together; all four instruments remain
  **55 × 12** with **9 px** readings.
- The source-water block is grouped as **`source-water-assembly`**, translated **(0,30)**
  from its preceding layout. The pressure takeoff and filling-valve centerline is **y=565**.
  В1 now runs straight from canvas **(41,525)** to the left manifold midpoint **(203,525)**.
  Its former intermediate drop at **x=172** is removed; the pipe keeps its existing manifold
  tee without adding any crossing or junction. The parallel source pumps are
  at **(123,542) / (123,588)**; their manifolds span
  **542–588** at **x=73 / 178**, with midpoint junctions on **y=565**. Captions remain below
  the group heading and above their frames, at effective **y=525 / 571**. The existing group
  heading is process-local **(123,513)**, preserving the user's current placement above НВ1.
  The pressure frame is effectively
  **(197.5,541)**, value baseline **550**, caption **536**, and stem **553→565**.
  The filling valve is at effective **(325,565)**, moved **40 units left** with its caption
  from the preceding layout; the caption stays at **y=540**. The outlet pipe shortens to meet
  the tank’s new position without changing the filling valve or pressure takeoff.
- Source water now reaches the tank through one **straight horizontal pipe** at **y=565**,
  from the bank outlet through the pressure takeoff and filling valve to the tank's left side
  at **(390,565)**, canvas **(520,525)**. The former stepped/top-center inlet is removed. ХВО remains absent.
- The complete reserve-water block is grouped as **`reserve-water-assembly`**, translated
  **(−40,−30)**: the complete tank, level instrument and both caption lines move **40 units left**
  in the final compact layout. Its body is effectively **(390,540)**, still **32 × 80**,
  with both tank caption lines. The four separate switch labels/dots are replaced by one
  **55 × 12** level instrument to its left: frame **(322.5,584)**, value baseline **593**,
  «Уровень» caption baseline **607**, centered at **x=350**. Its short horizontal instrument
  stem reaches the tank's left edge at **(390,590)**, clear of the inlet at **y=565**.
- The tank's right-side midpoint is **(422,580)**, canvas **(552,540)**. Its outlet runs
  straight to the makeup inlet tee **(476,580)**, without a step. The makeup bank uses
  **`translate(-60 -2)`**, moving **60 units left** while retaining its preceding vertical position.
  Pump centers are **(503,580) / (503,626)**, canvas **(633,540) / (633,586)**.
  The **27 × 27** frames and **46-unit** vertical spacing remain unchanged. Manifolds move
  inward **28 units each**, reducing branch width **110 → 54**; each side port retains **13.5 units**
  of straight pipe. Effective manifolds are **x=476 / 530**, spanning **y=580–626**.
  The right manifold discharges via **(530,603)** to **x=630**, the network-makeup valve at
  **(630,585)** and Т2 tee **(630,490)**. The valve is at canvas **(760,545)**; its caption
  is end-aligned at local **(605,588)**. This clears the return-pressure frame by **17.5 units**
  and the makeup manifold by **6.1 units**. The bank heading is at **(503,548)**.
  Only the true branch junctions **(476,580) / (530,603)** carry dots; elbows have none.
  The inlet/outlet side-port positions remain the user-selected exception to shared top/bottom ports.
- Emergency panel: **(10,90)**, **112 × 279**, directly below the header at the left,
  following Spring-2's two-column layout. Ten **43 × 43** tiles use **x=18 / 71** and
  **y=114 / 165 / 216 / 267 / 318**, with Spring-2's connection, power, gas and vapour artwork.
  The fifth row contains «Пары ДТ2» and the combined «ЩУК» connection tile. All equipment summaries, including
  `alarm-summary-0`, are replaced by the corresponding equipment warning icons. The panel
  now ends at **y=369**.
  The ЩУК cards and all four `boiler-*-link` dots are removed; timestamp now belongs to the header.

**Т1 / Т2** retain Spring-2's **11.1 × 10.8** triangles and **0.5-unit** outlines. Т1 is red
and points right at **y=455**; Т2 is blue and points left at **y=490**. Their black pipes join
directly at local **(644,455) / (644,490)** after a **110-unit** leftward shift of the complete
connector assemblies. Their rightmost extent is canvas **x=785.1**, leaving about **20 units**
to the canvas edge. The fourth boiler’s warning remains inside with **13.2 units** of clearance.

The left-side **gas / В1** inlets match Nurlat-5: **10 × 10**, right-pointing triangles without
outlines, orange **#FF9800** and blue **#0083CD**. In canvas coordinates their bases align at
**x=31**, tips at **x=41**, and centerlines at **y=480 / 525**. These preserve the reference's
**21-unit** inset from the panel's left edge and retain **45-unit** gas/water separation.
The user-selected lower inlet position gives **111 units** from the panel bottom to the gas line.
Both pipes meet their triangle tips directly. «Газ» uses canvas anchor **(46,497)**;
the site-specific «В1» label starts at **(41,543)** instead of
copying Nurlat's «От ХВО». All connector captions use **10 px**.

Pump frames are **27 × 27**, radius **3**, rotors radius **10**. Instruments are **55 × 12**.
Readings use **9 px**, emergency-tile captions **7 px**, and other text **10 px**.
Panels and emergency tiles use radius **10**; strokes use **1 / 0.5 / 0.25**.
The outdoor controller temperature remains `tempOutAir`, separate from cached `weather.temp`.

## Standard weather block

The station reuses Spring-2's exact Nurlat-style artwork, black **0.5-unit** strokes and
non-interactive decorations. The **27 × 27** transparent hitbox is at canvas **(19,46)**,
artwork at **(21,47)**, temperature anchor **(51,56)**, and description box **(51,59)**,
**62 × 19**, narrowed **20 units** alongside the card row’s leftward shift. These are the shared offsets
from the header's **(10,10)** origin. The first card at **x=116.8** leaves **3.8 units** after the text box;
both temperature and description use **8 px**, with **9-unit** line height and two-line clamping.
The clip starts at **(48,45)** and ends at **(113,78)**, clearing the first card and panel edge.

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

The latest read-only live preview includes cached weather. Long-description and negative-temperature
checks use browser response fixtures. This layout work makes no provider request, Node-RED deployment,
restart or production device-state write; flow deployment status is independent of the SVG preview.

## State meanings and property ownership

The SVG displays **107** unique property paths: the preceding **96**, **seven** weather paths
and the four `boilerControlLinkStatuses[i].isActive` paths now bound to the combined «ЩУК»
emergency tile. The former separate ЩУК cards, boiler-link circles and boiler-popup link rows
remain removed; no connection colour is reassigned to boiler bodies. The information icon
lists `isConnected` then `timestamp`.
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

The exact Spring-2 `#emergencyIcon` artwork is reused beside all eight mapped pumps.
Network/source-water warnings retain their existing positions. In the compact makeup bank,
ПН1/ПН2 warning transforms are **(595,557) / (595,603)** inside `supplyPumps-bank`:
**16 units right and 4 units up** relative to their preceding pump-local placement.
This gives **6.5 units** of clearance from the narrowed right manifold while keeping the
«Подпитка сети» caption between the two warning rows. Pump captions remain above their frames.
Each warning is hidden normally, and appears when that pump's
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
collector values and enum descriptions are unchanged. Each **white actuator square** now has a
**blue #0000FF outline for open (2)** and black outline otherwise, matching Spring-2's appearance
while preserving Tsarevo-2's own enum values. The actuator binds the same status as its body/group,
keeps a **0.5-unit** outline and suppresses the legacy fill colourizer. Whole-symbol yellow hover
restores the blue open indication on leave; group and actuator retain the status popup.

The two makeup valves expose **Auto/Manual mode only**, so their bodies remain **neutral grey**
for both mode values. This placeholder does not establish a closed position. Their mode popovers
remain available, and no Auto→Open or Manual→Closed mapping is invented. Diesel modes stay in the header.

**Existing mapping requiring separate confirmation:** Node-RED A assigns `alarmNP_2` to
`networkPumps[0].alarm` and `alarmNP_1` to `networkPumps[1].alarm`. The diagram preserves that
collector contract. No claim is made that the swapped physical associations are correct.

## ЩУК connection tile and emergency

The tenth emergency tile occupies the free bottom-right slot **(71,318)** without resizing
the panel. It uses the shared **43 × 43**, radius **10**, **0.5-unit** border and **7 px** caption
«ЩУК». The **24 × 25** icon reproduces the user's three-slider reference as native vector
artwork with black strokes and transparent openings, leaving the alarm background visible.

`boilerControlLinks-alarm` binds `boilerControlLinkStatuses[0..3].isActive`, in boiler order
1–4. Any value **strictly equal to false** makes its background **red**; otherwise it is white.
Missing/null properties do not create an inferred failure and clear stale red when no false
remains. The tile's frame, icon and caption open the same four-property popup. Hover retains
the standard 0.5-unit emergency outline and restores the current alarm fill on pointer leave.
The collector already provides these booleans with true meaning active communication;
the collector and schema are unchanged.

The [prepared migration](../../../database/migrations/2026-11-24-tsarevo2-boiler-control-link-emergency.sql)
adds one combined **reason 33**, «Нет связи с ЩУК», with the same strict-false condition.
Production was inspected read-only: **32** existing reasons, no ЩУК rule, and a **three-minute**
history interval. The migration preserves existing rules and intervals, rejects conflicts and
does nothing on identical reruns. It is validated locally and **not applied to production**.

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

## Verification and status — 25 November 2026

See the [wider filling-mode card and shifted row](../../../.reports/2026-11-25-tsarevo2-header-card-width/README.md).
See the [final compact layout, desktop/phone previews and checks](../../../.reports/2026-11-25-tsarevo2-final-layout/README.md).

See the [straight left inlets and reduced top-panel gap](../../../.reports/2026-11-25-tsarevo2-straight-inlets/README.md).
See the [aligned instruments, Spring-2 actuator feedback and tighter pipe spacing](../../../.reports/2026-11-24-tsarevo2-layout-refinement/README.md).
See the [ЩУК tile, browser states and prepared emergency rule](../../../.reports/2026-11-24-tsarevo2-shchuk/README.md).
See the [junction-dot corrections and 20-pixel return-header move](../../../.reports/2026-11-24-tsarevo2-junction-rule/README.md).
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
