# Котельная ЖК Весна-2 — mnemoschema

## Cached weather — 20 November 2026

Instance A now has one `spring2-weather` instance of the shared `Weather` subflow:
`INTERVAL=1800`, `DEVICE_CODE=spring2-boiler-room`. It uses the controller's registered location,
the inherited `OPENWEATHER_API_KEY`, and the full `weather:location:<objectLocationId>` cache
with a 5400-second TTL. Each complete controller poll optionally adds `weather.temp` (°C),
`pressure` (sea-level hPa), `humidity` (%), available `wind.speed`/`gust` (m/s) and `wind.deg`
(degrees from), plus first-condition `description`/`icon` strings. Missing weather is omitted;
read errors do not prevent PLC storage. Controller measurements and both meter collectors
retain their existing meanings and behavior. Weather schema fields are optional and their editors hidden.

Inside the header's existing `translate(-70, 0)`, the icon uses **translate(-26, 4)** to match the
latest Nurlat-5 reference. Its effective hitbox is **(-83, 48)**, size **27 × 27**, and artwork
starts at **(-81, 49)**. The weather column now shows **temperature first**, at **(-51, 58)**, followed by a
multiline description in a **82 × 19** box at **(-51, 61)**. Both use the user's **8 px**
font. The description uses 9-unit line spacing and wraps to at most two lines. When it still exceeds
the available space, an ellipsis indicates the remaining text. Clicking the description or tapping
the station icon shows the full value in the existing popover. Missing values remain blank.

The description uses an SVG `foreignObject` with an XHTML `div` and the existing `data-state-eval`
binding, so no UI bundle or backend changes are required. Hover retains bold feedback. The station
artwork, icon click target, all existing cards and device ownership remain unchanged. The text clip
now extends to a local y=76 (75.8 for Muslum), keeping both description lines inside the header.
See [before/after images and browser checks](../../../.reports/2026-11-20-weather-wrap/README.md).

Existing cards, timestamp, canvas, topology, linked-device
bindings and CRLF endings are preserved. The new weather target belongs to the controller,
including when a linked meter is selected.
See [previews, verification and deployment notes](../../../.reports/2026-11-20-spring-weather/README.md).

This is one shared diagram for the controller and two measuring devices. The
current [component standard](../../../.docs/mnemoschema-components.md) was applied
on 16 November 2026. The controller's process topology and all three devices'
state contracts remain unchanged.

## Device and property ownership

| Device | Code | Verified device ID | Distinct bound properties |
|---|---|---:|---:|
| Boiler-room controller | `spring2-boiler-room` | 9 | 100 |
| IRVIS gas meter, serial 29804 | `spring2-irvis-29804` | 17 | 7 |
| VKT-7 heat calculator, serial 289452 | `spring2-vkt7-289452` | 24 | 13 |

The saved diagram has **123 bound elements / 120 distinct properties**. The
original 119 bound elements retain their ordered `data-state` lists, format hints
and colourizer hints. Four additional header bindings mirror the existing TE5
and PE1 readings and their sensor-status fields. Popovers and graph actions resolve properties through their owning
device code, independently of the currently selected device.

The seven `data-device` targets are also preserved: the controller's information
icon and two panel borders; each meter's information icon and panel border. The
existing `mnemo-schema.js` selection pulse retains its timing, colour and abort
cleanup, with the standard 1-unit stroke. The root keeps its legacy `Layer_1` ID;
CSS is scoped with `spring2-mnemoschema` to avoid affecting other application SVGs.

Controller pressures use **bar**. The IRVIS working flow uses **р.м3/ч** and its
pressure uses **кПа**; the VKT-7 flows use **м³/ч**. These units remain supplied by
each device's schema. This change does not alter collectors, schemas, channel
assignments, history, alarms or database registrations.

## Local geometry

The canvas is **`-98 8 736 485`**. The initial standardized width was 636 units;
on **17 November 2026** it increased by **100**. The widening initially adds **25** units to each of
the four gaps from the emergency panel through the boiler assemblies. A later **15-unit left shift** of
the process brings it closer to the fixed emergency panel; boiler assemblies 1–4
are now **10 / 35 / 60 / 85** units right of the initial standardized layout,
including their pumps, valves, relays, sensors, captions, burners and flames.
The height and native component dimensions stay the same. The dashboard retains its normal responsive fit and zoom/pan behaviour.
There are no compensating scales on equipment, panels, tiles or text; normalized
symbol instances retain their original internal artwork.

| Component | Native geometry |
|---|---|
| Four boiler bodies | 65 × 70; translated right by 10 / 35 / 60 / 85 from the initial standardized layout |
| Burners / flame instances | 40 × 30, radius 5 / 18 × 27 |
| Eight pump frames / five relay frames | 27 × 27, radius 3; rotor radius 10 and inner ring radius 10 |
| Reading frames | 55 × 12, centred value/tag; value baseline at top + 9 |
| VKT-7 flow frames / IRVIS working-flow frame | 70 × 12 / 80 × 12 for their value and unit lengths |
| Four boiler-output valves | Vertical 10 × 16 bow-tie, 11-unit stem to the left, square 8 × 8 actuator |
| Other-parameters panel | x = −92, y = 12, width 719.1, height 70; radius 10 |
| Alarm panel | x = −92, y = 90, width 112, height 228; radius 10 |
| Eight alarm tiles | 43 × 43, radius 10, two columns at x = −84 / −31; rows y = 114 / 165 / 216 / 267 |
| Alarm icon instances | 24 × 25, with the existing artwork retained in symbols |

All pipe endpoints affected by resizing follow the new body, pump, relay or valve
ports. Boiler gas inlets retain their original lower-body height, around y = 190.7,
so gas branches stay clear of the circulation pumps. This is a local routing
exception to centring an inlet vertically on the boiler. Crossing gaps, junctions,
manifolds and flow directions remain part of the existing circuit.

After the later left shifts, the network-pump group and gas meter are 10 units
right of the initial standardized layout. The heat meter, right-side instrument
block and makeup assembly are 55 units right: they move **30 units left**, then
another **15 units left** with the full process (**45 units total** from the
preceding layout). Shared manifolds and the makeup inlet connect these
assemblies. Gas branches retain their crossing gaps around the following boiler pumps and water manifolds.
The header grows by 100 units, its heading moves 50 units and its information icon
100 units; card labels move 1 unit upward for label/value clearance on phones.

Within the right-side instrument block, the controller supply/return temperature
assemblies retain their 10-unit extra offset from PE1/PE2. The boiler flue
readings centre within the bodies; their decorative waves move 12 units upward
so they do not cover values. Makeup-pump and source-water-relay captions are
centred above their own symbols. DT1/DT2 remain measured-level cards in the
header; this diagram does not show separate water vessels.

The subsequent 17 November refinements merge each TE1–TE4 take-off with its
boiler-pump branch junction: one radius-1.5 dot per connection and a **10-unit**
horizontal sensor stem. Frames, values and tags move together to align with the
shared junction. Their native frame size and value baseline remain unchanged.
The separate former sensor dots are removed; no bound element is removed.

The left main vertical supply pipe is now at **x = 33.6**: the requested 10-unit
left correction is followed by the 15-unit process translation; both horizontal
corner segments follow it. ЗК1–ЗК4 captions are upright to the left of their own valve actuators, with a **5-unit** gap from
the caption end anchor to the actuator. The central gas rise and makeup-water
riser first move equally ten units right, then follow the 15-unit process shift.
Their final positions are **x = 220 / 234.8** respectively. The gas
outlet, makeup inlet, junction dots and supply crossing gap follow these moves;
their existing vertical crossing gaps and 14.8-unit separation remain unchanged.

The final compaction keeps the other-parameters header, emergency panel and
**T1/T2/B1 outlet triangles and captions fixed**. The pictured VKT-7/instrument/
makeup block moves 45 units left in total, while all other process assemblies
move 15 units left. Pipe endpoints stretch or shorten to preserve connections at
the differently translated assemblies and fixed outlets. No component is resized;
the canvas remains 736 × 485. Earlier junction merges, sensor stems, valve-label
clearances and crossing gaps move coherently with their owning assemblies.

The seven-card header row is right-aligned inside `parameter-cards`, whose
common translation is **267.9 units right**. Its visible order is **T12 / TE5 /
PE1 / T11 / gas pressure / DT1 / DT2**. T12 moves **168.6 units left** within the
row so the two new cards follow it. The four cards to the right retain their
positions; the last card keeps its **6.5-unit** right inset, matching Muslum-7/9.
The new cards match T12's **76.9 × 30.1** geometry, radius 10, label/value sizes
and baselines. TE5 binds `tempOutNet` with `statusTempOutNetSensor`; PE1 binds
`pressOutNet` with `statusPressOutNetSensor`. Units remain °C and bar, supplied
by the controller schema. These are intentional duplicate displays: the original
pipe instruments and their bindings stay unchanged. Sensor warning/fault colours,
property popovers and graph actions follow the same existing controller fields.
Date/time use Kirov's upper-left placement: global anchors **(−83, 28)** and
**(−78, 41)**, corresponding to a 9-unit left inset for the date, a 5-unit time
indent and 13-unit line spacing. Fonts, formatting, letter spacing and connection
colouring are unchanged. The panel border, heading, information icon and all
process geometry retain their positions.

Readings use **9 px**, emergency captions **7 px**, and other text **10 px**.
Equipment and hover strokes are **1**, emergency borders remain **0.5** through
alarm/hover, and sensor borders retain **0.25 / 0.5 / 1** normal/warning/alarm
semantics. The standard heading is **«Прочие параметры котельной»**.

## Site-specific state behaviour

Keep Spring-2's existing enum and Boolean predicates. Boiler bodies retain white
fill and black/red outlines from their existing fault flags. Burner fault outlines,
working-flame visibility and flame animation remain separate. Pump operation,
stopped and fault meanings come from Spring-2's schemas; valve triangles retain
their open/closed fills and the actuators their state-coloured outlines. No running,
locked or alarm interpretation is transferred from another boiler-room controller.

## Verification

Structural checks preserve all original 119 bindings, ordered lists, units, selection targets,
legacy IDs, original shared icon/flame artwork and CRLF line endings. All 120
property paths resolve against the appropriate local device schema. Regenerate
`flow-space-statics/manifest.json` after changing the assets.

The actual local application was checked through the read-only API tunnel with
local SVG/CSS/JS overrides and a saved live snapshot containing all three devices.
Browser-only synthetic responses cover additional states. Evidence is kept in
`.reports/2026-11-16-spring2-standardization/` and `.previews/spring2-standardization/`.
The 17 November width adjustment has its own before/after, native gap measurements,
pipe-connectivity checks and desktop/phone evidence in
`.reports/2026-11-17-spring2-spacing/`. All 119 `data-state` and 37 `data-state-eval`
attributes remain exactly as in the initial standardized version. These checks
and files are local; they do not establish production deployment.
The later sensor-junction, pipe and valve-caption refinements are recorded in
`.reports/2026-11-17-spring2-layout-refinements/`, with a fresh baseline of the
accepted wider diagram. The same 119 bindings and 37 expressions are preserved.

The final 30 + 15 unit block/process translations are recorded in
`.reports/2026-11-17-spring2-compact/`, including exact before/after measurements,
fixed-outlet checks, connectivity and desktop/phone evidence.

The final right-aligned parameter-card row and upper-left timestamps are recorded
in `.reports/2026-11-17-spring2-header/`, with before/after desktop and phone
measurements and header popover/connection checks.

The TE5/PE1 header-card addition is recorded in
`.reports/2026-11-17-spring2-supply-cards/`. It adds four bound elements and no new
state properties, expressions, schema fields or collector mappings.
