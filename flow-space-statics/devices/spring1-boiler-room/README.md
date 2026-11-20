# Котельная ЖК Весна-1 — mnemoschema

## Cached weather — 20 November 2026

Instance A now has one `spring1-weather` instance of the shared `Weather` subflow:
`INTERVAL=1800`, `DEVICE_CODE=spring1-boiler-room`. It uses the controller's registered location,
the inherited `OPENWEATHER_API_KEY`, and the full `weather:location:<objectLocationId>` cache
with a 5400-second TTL. Each complete controller poll optionally adds `weather.temp` (°C),
`pressure` (sea-level hPa), `humidity` (%), available `wind.speed`/`gust` (m/s) and `wind.deg`
(degrees from), plus first-condition `description`/`icon` strings. Missing weather is omitted;
read errors do not prevent PLC storage. Controller measurements and all four meter collectors
retain their existing meanings and behavior. Weather schema fields are optional and their editors hidden.

The icon follows the user's latest Nurlat-5 reference, translated by **(-96, 4)** in this header.
Its effective hitbox is **(-83, 48)**, size **27 × 27**, with artwork at **(-81, 49)**.
The weather column now shows **temperature first**, at **(-51, 58)**, followed by a
multiline description in a **180 × 19** box at **(-51, 61)**. Both use the user's **8 px**
font. The description uses 9-unit line spacing and wraps to at most two lines. When it still exceeds
the available space, an ellipsis indicates the remaining text. Clicking the description or tapping
the station icon shows the full value in the existing popover. Missing values remain blank.

The description uses an SVG `foreignObject` with an XHTML `div` and the existing `data-state-eval`
binding, so no UI bundle or backend changes are required. Hover retains bold feedback. The station
artwork, icon click target, all existing cards and device ownership remain unchanged. The text clip
now extends to a local y=76 (75.8 for Muslum), keeping both description lines inside the header.
See [before/after images and browser checks](../../../.reports/2026-11-20-weather-wrap/README.md).

The existing cards, timestamp, canvas, topology, linked-device bindings and CRLF endings are preserved.
The new weather selection target belongs to the controller, including when a linked meter is selected.

The pre-existing Spring-1 collector/schema mismatch is unchanged: the collector emits two source-water
pumps while the schema allows one, and its boiler objects lack ten schema-required fields per boiler.
Weather validation is checked separately; offline full-state validation reproduces the same baseline errors.
See [previews, verification and deployment notes](../../../.reports/2026-11-20-spring-weather/README.md).

The shared [component standard](../../../.docs/mnemoschema-components.md) was applied
on **17 November 2026**. This diagram belongs to the controller and four meters;
each device retains its own state paths, units, property lists and selection targets.

## Device ownership

| Device | Code | Verified device ID | Distinct bound properties |
|---|---|---:|---:|
| Boiler-room controller | `spring1-boiler-room` | 13 | 76 |
| Mercury230 electricity meter EM1 | `spring1-mercury230-26077096` | 14 | 6 |
| Mercury230 electricity meter EM2 | `spring1-mercury230-26077087` | 19 | 6 |
| EK270 gas volume corrector | `spring1-ek270-1116061420` | 20 | 7 |
| Взлет026 heat calculator | `spring1-vzljot026-1415796` | 22 | 13 |

All **75 original bound elements / 108 distinct properties** remain. The ordered
`data-state` lists, date/time formats, colourizer attributes and ten `data-device`
selection targets are preserved. The electricity-panel border intentionally lists
both meters, while each information icon and energy reading belongs to one meter.
Graph actions resolve through that owner even when the controller is selected.

Controller and EK270 pressures use **бар**; heat-calculator pressures use **кгс/см²**.
Energy readings retain **кВтч / кВАрч**, and each meter's existing flow units remain
schema-owned. No collector, schema, alarm rule or database registration changes.

## Local geometry

The canvas is **`-98 8 837 485`**: **Spring-2's expanded 736-unit width + the
101-unit electricity-meter side panel**. The previous canvas was 701.2 × 462.8.
Equipment and text use native units, without compensating group scales. The root
keeps its legacy `Layer_1` ID, uses `spring1-mnemoschema` for scoped CSS and exposes
its name through `aria-label`, without a browser tooltip.

| Component | Native geometry |
|---|---|
| Four boiler bodies | 65 × 70; centres x = 119.4 / 263.9 / 408.4 / 552.9 |
| Boiler spacing | Equal 144.5-unit centre pitch; 79.5-unit gaps between bodies |
| Burners / flames | 40 × 30, radius 5 / 18 × 27 |
| Nine pump frames | 27 × 27, radius 3; rotor and inner ring radius 10 |
| Instrument frames | 55 × 12; centred readings/tags, value baseline at top + 9 |
| Heat-meter flow / pressure frames | 70 × 12 / 65 × 12 for value and unit clearance |
| EK270 flow frame / electricity readings | 80 × 12 / 75 × 12 |
| Other-parameters panel | x = −92, y = 12, width 820.1, height 70, radius 10 |
| Alarm panel | x = −92, y = 90, width 68, height 277, radius 10 |
| Five emergency tiles | 43 × 43, radius 10; one column, 24 × 25 icon instances |
| Electricity panel | x = 627.1, y = 90, width 101, height 165, radius 10 |

Complete boiler/circulation-pump assemblies move together. Connected pipe endpoints,
junction dots and crossing gaps follow the equipment. Sensor stems are vertical
and centred on their frames and branch dots. The old 4.5-unit gap below boiler 4
is closed. Both existing makeup pumps connect to the shared inlet and outlet;
their frames have room for the standard size. The three-way mixing valve retains
its three ports, artwork, controller feedback and fault interpretation. No two-way
valve symbol is substituted for it.

The heat-meter inlet riser is at **x = 330** and the makeup inlet at **x = 250**,
in separate sections of their original circuits, clear of the heat-meter readings.
The **ЧРП ПН** caption sits above the upper makeup pump, clear of both
its frame and the heat-calculator panel border.

The header uses **«Прочие параметры котельной»**, with **T12 → TE2 → PE2** cards
aligned together to the right. Date/time anchors are **(−83, 28)** and **(−78, 41)**, matching Spring-2.
Readings use **9 px**, emergency captions **7 px**, and other text **10 px**.
Two invisible exporter artifacts with empty artwork are removed, including a line
whose enormous bounds extended far outside the canvas.

## State styling and interaction

Burner backgrounds stay grey with Spring-2's exact orange glow: a **3-second
ease-in-out infinite** animation, scoped as `spring1IntenseGlow`. The original
working-flame visibility expressions are unchanged. Flame artwork passes pointer
events through to the burners' original two-property detail lists.

Existing pump, sensor, connection and mixing-valve colours retain their meanings.
Six existing expressions change only their equipment stroke-width assignment to
**1**; all other expressions are unchanged. Sensor warning/fault widths remain
**0.5 / 1**, and normal instrument borders remain **0.25**. Emergency borders stay
**0.5**, including hover and alarm states. Hover uses yellow outlines and bold text,
then restores the state appearance. The selection pulse retains its original
1300 ms / three-iteration timing and abort cleanup, with a standard 1-unit stroke.

## Verification

XML parsing, original binding/ownership comparisons, all five schema resolutions,
ID/symbol checks, CRLF preservation and pipe-endpoint checks are recorded in
`.reports/2026-11-17-spring1-standardization/`. Use `cr-at-eol` when checking the
diff, because the source SVG deliberately retains CRLF line endings.

The actual local UI uses the existing production API tunnel and local SVG/CSS/JS
overrides. One saved API response supplies all five devices' readings; operating,
fault and disconnected cases use browser-only synthetic responses. Desktop/phone
checks cover native dimensions, text/value fit, popovers, owner-specific graph
actions, all five selection highlights, flame animation, warnings/faults and
gestures. Graph ownership checks use empty local history fixtures. See the report
for screenshots and actual results. Local verification does not establish deployment.

Regenerate `flow-space-statics/manifest.json` after changing these static assets.

## Block spacing — 18 November 2026

The complete network-pump/EK270 block moves **50 units left**, including its gas
inlet arrow, meter panel, instruments and captions. The gas riser and its junction
move to **x = 220** while retaining the crossing gap at the return header.

The heat-meter/controller-instrument block moves **50 units right**, including all
three labelled water outlet arrows. The two makeup pumps and their inlet/outlet
manifolds then move **30 units left twice** relative to that translation: their final
offset from the 17 November layout is **10 units left**. The heat-meter panel
now starts at **x = 365**; the EK270 panel starts at **x = 3**. Connected sensor
stems, branch dots, captions and meter information icons follow their assemblies.

The shared return-header span grows by **100 units**, from **x = 104.1 to 404.6**.
The mixing valve also moves **50 units left**, aligning its centre and straight
network-pump feed at **x = 68.7**, as marked by the user's temporary red line.
Its upper inlet and side return reconnect to the fixed main pipes. The makeup
inlet ultimately moves to **x = 250**, and its outlet manifold to **x = 325**; the B1 pipe
extends to the translated outlet arrow. The boiler assemblies, header,
alarm panel, electricity panel and **837 × 485** canvas retain their positions and
dimensions. All **75** ordered binding lists and **35** state expressions remain
exactly as before this spacing adjustment; CSS and selection JavaScript are unchanged.

Before/after layout measurements and desktop/phone evidence are saved in
`.reports/2026-11-18-spring1-block-spacing/`. The update builds on the pending
17 November standardization and remains local and undeployed.

The additional 30-unit makeup-pump correction is measured against the preceding
accepted view in `.reports/2026-11-18-spring1-makeup-more-left/`. Both pump centres
move from approximately **x = 340 to x = 310**; their captions, fault icons and
inlet/outlet manifolds follow, while the B1 outlet arrow retains its position.

## Right sensor-block alignment — 18 November 2026

The PE1/PE2 and TE1/TE2 assemblies, their stems/junctions and the T1/T2 arrows
and captions move **48.4689 units right**. Their combined right edge aligns with
the electricity-panel border at **x = 728.1**, including the T1 caption's text
bounds. Both horizontal water pipes extend by the same amount from the fixed
heat-meter flow frames. The heat calculator, makeup pumps, B1 outlet and canvas
retain their positions. All bindings and state expressions remain unchanged.

Comparable desktop/phone previews and measured border alignment are recorded in
`.reports/2026-11-18-spring1-sensor-right-align/`.

## Heat-calculator instrument spacing — 18 November 2026

The Взлет026 panel widens **50 units to the right** in two increments of 30 and 20,
from **165 to 215** units. Its original left edge stays **365**; the right edge moves
**530 → 580**, with height 115. Both pressure assemblies and the information icon
move **50 units right** in total; inline flow readings and captions move **25 units
right**. Temperature instruments retain their original positions. This adds 50 units of clearance between each
temperature/pressure pair. The panel caption is centred within the widened frame.

The sensor stems, junctions and four connecting pipe endpoints follow their
instruments. Native reading-frame sizes, the external controller sensors, pumps,
outlet arrows, all bindings and state expressions stay unchanged. Before/after
and desktop/phone checks are in `.reports/2026-11-18-spring1-heat-panel-right/`.
This replaces the earlier leftward widening at the user's request.

The additional **20-unit** widening, **195 → 215**, moves pressure assemblies
another 20 units right and flow assemblies another 10. Its before/after and
desktop/phone checks are in `.reports/2026-11-18-spring1-heat-extra20/`.

## Information-icon clearance — 18 November 2026

The makeup-pump assembly moves another **20 units left**, including both pumps,
fault icons, caption, inlet junction/riser and outlet manifold. Pump centres are
now approximately **x = 290**; B1 extends from the relocated manifold to its fixed
arrow. The meter panel gains **20 units on the left**: its current bounds are
**x = 345 to 580**, width **235**, with the later height adjustment to **130**.

All six meter reading assemblies move **20 units left** into the added space,
including their stems and junctions. The information icon stays at its existing
top-right position, with a separate clear area to the right of PE2.1. The panel
caption is re-centred. External controller sensors and their aligned outlet arrows
remain fixed. Bindings, state expressions and native reading sizes are unchanged.

Before/after, measured icon clearance and desktop/phone results are saved in
`.reports/2026-11-18-spring1-info-clearance/`.

## Gas manifold above the water pipe — 18 November 2026

The orange horizontal gas manifold moves **y = 269.6 → 244.8**, placing its
centreline **10 units above** the fixed black water pipe at **y = 254.8**.
Both boiler gas branches end at the new manifold height, and its riser junction
follows. The water-pipe crossing gap moves from those side branches to the central
gas riser at **x = 220**. The central riser still retains its separate gap across
the lower return header. One obsolete unbound side-branch segment is removed.

Equipment, instruments, all binding lists and expressions remain unchanged.
Before/after and desktop/phone checks are in
`.reports/2026-11-18-spring1-gas-above-water/`.

## Taller heat-meter panel and standard icon inset — 18 November 2026

The heat-meter panel extends **15 units upward**, from **y = 276 to 261**, with
height **115 → 130**. Its bottom remains **391**, width **235** and horizontal
bounds **345–580**. The black pipe at y = 254.8 has 6.2 units of clearance above
the panel's top edge.

The information icon moves **15 units up**, preserving the standard visible-art
insets of approximately **5.92 from the top / 7.35 from the right**, matching the
electricity-panel information icon. The upper TE2.1/PE2.1 assemblies move **10 units
up** and their stems lengthen by 10. The inline flow frames, lower instruments,
panel caption and pipe junctions retain their positions, increasing vertical
separation within the panel. All bindings and state expressions stay unchanged.

Before/after, measured reference insets and desktop/phone results are saved in
`.reports/2026-11-18-spring1-heat-panel-height/`.

## Makeup-pump warning clearance — 18 November 2026

Both existing emergency icons move clear of the pump outlet pipes. Their artwork
remains unchanged; the upper icon sits above its branch and the lower icon between
the B1 header and lower branch, clear of the shared outlet riser. The **ЧРП ПН**
caption is centred above the upper pump to avoid the warning icon. The missing
upper inlet T-junction dot is restored at **(250, 413.3)** with radius **1.5**.

Both pump alarms are displayed in browser-only fixtures when checking the layout.
The original alarm visibility predicates, property lists and pump geometry remain
unchanged. Evidence is in `.reports/2026-11-18-spring1-pump-warning-clearance/`.

## B1 connector alignment — 18 November 2026

The B1 inlet arrow moves **47.4689 units right** to match the T2 arrow's
horizontal bounds (**x = 715.4689–726.4689**). Its caption moves **48.4689 units
right** to match T1's caption anchor; the connected pipe extends to **x = 715.4689**.
Vertical positions, pump geometry and all state bindings remain unchanged.

## Header summary cards — 18 November 2026

The top panel follows the shared reference layout: white rounded cards for
**T12 (н.в.) → TE2 (обратка) → PE2 (обратка)**, grouped against its right edge.
Each is now **112 × 30.1**, matching Nurlat-5's reading-card width, with radius
**10**, **7.4-unit gaps**, x positions **370.8 / 490.2 / 609.6**, top **43.9**, bottom **74**. Labels use 10 px and
values 9 px. The last card ends at **721.6**, inset **6.5** from the panel edge.
The standard heading, information icon and date/time positions remain unchanged.

TE2 repeats controller **tempOutNet**, and PE2 repeats **pressOutNet**, both on the
return line. Their card frames retain the corresponding instrument's exact
ordered six-property list and warning/error stroke expressions. T12 retains
**tempOutAir**, and its frame also opens that property's details. All values use
the owning schema's units; there are no collector or schema changes.

The original 75 bindings remain; five additional bound elements bring the total
to **80**, with **37 state expressions**. All source geometry outside the cards
is unchanged. Browser verification covers reading parity, card spacing/value fit,
normal/warning/fault styles, hover restoration and desktop/phone popovers.
Evidence: `.reports/2026-11-18-spring1-top-panel/`.

## Single-column emergency panel — 18 November 2026

The emergency panel follows Muslum-7/9's **68-unit width**, **12.5-unit side
insets** and **48-unit vertical pitch**: five 43 × 43 tiles with 5-unit gaps.
Its left/top edges remain **(−92, 90)**; height increases **177 → 277** and width
decreases **112 → 68**. The white frame is behind the existing tile hit targets.
The heading keeps **«Аварийные события»**, split into two centred 10 px lines at
**x = −58**, baselines **104 / 116**.

Visual order is **Связь → Пожар → Охрана → CO → CH**, matching the previous
row-by-row order. Complete tile assemblies use **x = −79.5**, tops
**124 / 172 / 220 / 268 / 316**; captions remain 7 px, icons 24 × 25.
All tile contents, IDs, bindings, colourizers and state expressions are unchanged.
The rest of the diagram, including the pending header cards and the 837 × 485
canvas, stays fixed. Browser evidence and static comparison are recorded in
`.reports/2026-11-18-spring1-alarm-column/`.

## Header-card width matched to Nurlat-5 — 18 November 2026

All three header cards widen **76.9 → 112** native units, matching Nurlat-5's
outdoor/room/setpoint reading cards. Their right-aligned row still ends at
**721.6**, with the same 7.4-unit gaps and 6.5-unit panel inset; the row starts
at **370.8**. Card text is re-centred at local **x = 56**.
Height, vertical positions, fonts, radius, all bindings and state expressions
are unchanged. The remainder of the diagram stays fixed. Evidence is in
`.reports/2026-11-18-spring1-card-width/`.
