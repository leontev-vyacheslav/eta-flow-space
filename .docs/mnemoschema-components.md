# Mnemoschema component standard

The equipment geometry and styling references are **Кирова, Гагарина, Комарова and
Весна-2**. Use their native SVG component dimensions rather than compensating for a
drawing's canvas size with equipment-group scales. **Нурлат-5** implements the accepted
dimensions, typography, strokes and radii below and is the example for further work.

The machine-readable values are in
[`component-standard.json`](../.tools/diagram-renderer/component-standard.json). Kirov,
Gagarin and Komarova provide matching reference equipment footprints; Spring-2 supplies the same
component family and the original drawing conventions. The accepted defaults below
supersede their older equipment/reading sizes, typography, strokes and radii for further work.
Kirov, Gagarin and Komarova were updated to the accepted standard on 16 November
2026, followed by Muslum-7, Muslum-9 and Spring-2. Spring-2 retains its
three-device ownership, existing controller semantics and site-specific pipe routing.

Use the [mnemoschema-standard skill](../.codex/skills/mnemoschema-standard/SKILL.md) for
the workflow that applies and verifies these values when creating or changing components.

## Native component units

All dimensions below are SVG user units **after every ancestor transform**. A rectangle
declared as 43 × 43 inside `scale(2)` is an 86 × 86 component and does not meet the standard.
Use translations and rotations to place equipment. A symbol's internal artwork may use
its own coordinates, but its instance must occupy the standard component/icon box.

| Component | Dimensions and geometry | Normal stroke |
|---|---|---:|
| Boiler body | **65 × 70** | 1 |
| Burner | **40 × 30**; radius 5 | None |
| Boiler flame instance | 18 × 27 | None |
| Pump frame | **27 × 27**; radius 3 | 1 |
| Pump rotor | Radius 10; inner ring radius 10 | 1 / 0.25 |
| Measurement frame | **55 × 12** | 0.25 |
| Emergency tile | 43 × 43; radius 10 | 0.5 |
| Emergency icon instance | 24 × 25, or the reference CO artwork at its existing normalized size | Artwork-specific |
| Water/gas pipe | Junction radius 1.5 | 1 |
| Water tank/vessel | **32 × 80**; top radius 10, square bottom; white body with blue level fill | 1 |
| Valve body | **16 × 10** bow-tie; **8 × 8** square actuator on an 11-unit stem; no enclosing frame | 0.5 / 1 |
| Parameter/emergency panel | Radius 10; parameter-panel height 70 | 0.5 |
| Weather station | Reuse Nurlat-5 artwork; transparent **27 × 27** hitbox, radius 3 | 0.5 (artwork) |

The corrected boiler, burner and pump-frame dimensions were accepted on **16 November
2026**. When applying them to an existing layout, resize around the component's center
and update connected pipe endpoints. Preserve gas-inlet centering and equal boiler
supply/return clearances. Flame instances remain 18 × 27 and pump circles retain radius 10.

Use only **1, 0.5 and 0.25** for component stroke widths, rounding previous widths to
the nearest allowed value. Emergency-tile borders always use **0.5**, including alarm
and hover states. These rules apply to initial SVG attributes, state expressions and CSS.

Use **10** (`radius` in the JSON profile) for component radii and rounded panel/card/tile
corners. The exceptions are **burnerRadius = 5**, **junctionRadius = 1.5** and pump
**frameRadius = 3**, plus the weather hitbox's radius **3**. Square
sensor frames, boiler bodies and valve actuators remain square; preserve icon artwork.

The default sensor-reading frame width is **55 px**, accepted on **16 November 2026**.
Use a **12 px** height and the 9 px value font, with the value baseline at `y + 9`.
Center the frame, value, sensor label and connection stem together
(`x = centerX - width / 2`). Allow enough clearance from
neighbouring frames, tanks and equipment at normal/alarm/hover stroke widths; adjust
nearby placement rather than shrinking the value text. Wider frames may be used when
the real value and units require more room. Larger parameter cards keep their own layout.

When changing frame height, keep its top position and update attached stems and value
alignment together. The older reference diagrams use 45-unit reading frames and earlier
stroke/radius values. Their geometry is a starting point; the accepted defaults above
take precedence for new diagrams and component updates. Reference SVGs retain their
historical values until their update is requested; Kirov, Gagarin and Komarova now
follow the accepted defaults, as do Muslum-7/9 and Spring-2.

## Water tanks and valves

The Nurlat-5 tank and actuated-valve symbols were accepted as shared defaults on
**16 November 2026**, and applied to the ХПВ vessels and two valves in Kirov,
Gagarin, Komarova and Muslum-7/9.

The level-capable water tank introduced on **21 November 2026** uses a **32 × 80**
white body, **10-unit top corner radii**, square lower corners and a flat bottom.
The outline is black at **1 unit**. Solid **#0083CD** water rises from the bottom,
clipped to the body, with a horizontal surface. Nurlat-5's two makeup tanks are
its first instances. Gagarin, Komarova, Kirov and Muslum-7/9 use the same outline
as static filled ХПВ vessels from 22 November 2026.

For sites without a measured level, draw a **static fully filled** tank in
**#0083CD**, using the same `tank.bodyPath` in a site-prefixed definition and a
`<use>` instance. Do not bind it to unrelated state or add numeric percentages.
This full fill is symbolic artwork, not measured 100%. Preserve the existing
centre and side-pipe connections when replacing the older 32 × 50 vessel: expand
15 units above/below, move its caption with the top and extend the canvas if needed.

Reusable local geometry is stored in `tank.bodyPath` and `tank.waterPath` in the
profile. Nurlat-5 defines the tank artwork once as `<g id="nurlat5-water-tank">`
inside SVG `<defs>`: white background, clipped blue water and outline. Each instance
uses this definition inside its translated, state-bound group. The tank displays
**only its graphical level**; its nearby level instrument is a separate component
that owns the numeric reading, tag and sensor warning/alarm colours.

```xml
<g class="water-tank" transform="translate(155 355)"
   stroke-dasharray="0 80" color="#000000">
    <use class="water-tank-artwork" href="#nurlat5-water-tank"/>
</g>
```

The water is a 32-unit-wide vertical stroke `d="M16 80V0"`, with butt caps and the
body clip. It inherits the instance's `stroke-dasharray`:
**`(clampedPercent × 0.8) 80`** means `0 80` empty, `40 80` half full and `80 80` full.
Missing/non-finite values leave an empty tank without text, dash or «Нет данных»
caption. The shared artwork has no state bindings; SVG `<use>` shadow contents are
not queried by the application's state setup. Bind the instance group with colorizer
hint `none` and set `style.strokeDasharray` through the existing interpreter.
Keep the multi-property pass so it also clears stale fill if a level disappears.

Place a regular **55 × 12** level instrument nearby, connected to the process pipe
with its stem and junction dot, and put its tag below the frame. The instrument uses
normal **9 px** numeric text, Russian schema formatting, decimal precision and units.
Nurlat-5 PE6/PE7 have their original six ordered properties, normal/warning/alarm
predicates and 0.25 / 0.5 / 1-unit frame strokes. Missing numeric readings retain
the site's standard dash. Artwork clamps to 0–100%; the instrument retains the
actual numeric value. For levels measured in metres, obtain the confirmed empty/full
range before normalization.

The tank outline uses `currentColor`, with an undashed **1-unit** black stroke.
Sensor diagnostic colours belong to the separate instrument frame. Tank hover turns
only its outline yellow and restores black on leave; the inherited filter affects
the outline without changing blue water. Tank and instrument remain independent
pointer targets with their existing ordered level/diagnostic popovers. Equipment
captions stay with the tank, and PE6/PE7 tags stay with the instruments.

Preserve site labels, dimensions, placement and process topology. Ports stay at
local top/bottom center **(16, 0)** / **(16, 80)**. Nurlat-5's PE6/PE7 fields use
percent after the 21 November normalization; their original register descriptions
in `source-map.json` remain source evidence. The earlier three dashed water lines
are historical symbolic artwork and should not be used for new level displays.

Use this local geometry for a horizontal actuated valve, with its pipe axis at y = 0:

```xml
<g class="valve" transform="translate(430 380)">
    <path class="valve-body" d="M-8 -5L8 5V-5L-8 5Z" fill="#808080" stroke="#000000" stroke-width="0.5"/>
    <path class="valve-stem" d="M0 0V-11" fill="none" stroke="#000000" stroke-width="1" pointer-events="stroke"/>
    <path class="valve-actuator" d="M-4 -19H4V-11H-4Z" fill="#FFFFFF" stroke="#000000" stroke-width="0.5"/>
</g>
```

The grey bow-tie body is **16 × 10** with stroke **0.5**. The stem extends **11**
units from the pipe axis, with stroke **1**; its white square actuator is **8 × 8**
with stroke **0.5** and square corners. Do not add an enclosing rounded frame.
Connect pipes directly to the body ports at x = **−8 / +8**. Place the caption
baseline **25 units above** the axis for an actuator above the pipe. Translate or
rotate the complete symbol for the actual pipe direction; keep captions upright
and clear of the actuator. Nurlat HV5 and Kirov's drain valve use **−90°** for a
vertical pipe with the actuator on the left. Preserve existing names and any
confirmed state bindings; static valves without a state channel keep the grey fill.

### Unified valve bodies and three-way valves

Use **one SVG `<path>` for every valve body's lobes**, following Nurlat-5's
`HV1-state`–`HV5-state` and `mixing-valve-1-state` / `mixing-valve-2-state`.
Two separate bound polygons make each half highlight independently. Keep the bow-tie
in one path; a three-way valve adds its third triangle as another subpath in that
**same path**, sharing the same fill, state binding and hover target:

```xml
<path class="valve-body"
      d="M-8 -5L8 5V-5L-8 5Z M-5 -9L0 0L5 -9Z"
      fill="#808080" stroke="#000000" stroke-width="0.5"/>
```

This mixing body is **16 × 14**, with horizontal ports at x = −8 / +8 and its
third port at **(0, −9)**. Translate/rotate it for the site's actual pipe directions.
Add a stem/actuator only where that equipment has one; keep all three ports and
their connected pipes. `valve.bodyPath` and `valve.threeWay.bodyPath` in the profile
record the canonical local paths, measured at the body centre. These are geometric
defaults; Nurlat-5's command-feedback colours do not establish another site's state meanings.

Keep an actuated valve's body, stem and square actuator in one `.valve` group.
Separate paths preserve the body's state fill and the actuator's white fill.
Use scoped `.valve:hover > .valve-body`, `.valve:hover > .valve-stem` and
`.valve:hover > .valve-actuator` rules to highlight the complete assembly in yellow
(`#ffeb3b`), with **1-unit** outlines and the established glow. Hovering either
body half, the stem or actuator must produce the same highlight and restore each
part's original state appearance on pointer leave. Captions remain upright and
non-interactive. An actuator to the left of a vertical pipe uses an end-aligned
caption with a **5-unit gap** before the actuator; do not enclose the symbol in a frame.

For a bound assembly, give its group the existing ordered `data-state` list and
`data-colorizer-hint="none"`; the group lets stem clicks resolve to the same popover.
Bind the body once with its existing fill semantics. Where the actuator already
shows state, retain the same property with the `stroke` hint and a **0.5-unit**
normal outline; do not import an enum's unrelated stroke-width mapping. Keep the
stem unbound with `pointer-events="stroke"` so the group receives its clicks.
For an unmapped/static valve, retain its grey body and omit `data-state` entirely:
hover can highlight geometry without inventing a channel or a property popup.

Applied on **20 November 2026** to **ЗК1–ЗК4 in Spring-2 and Tsarevo-1**. Spring-2
keeps its `boilerOutputValves[i].state` semantics; Tsarevo-1's `returnValves[i]`
sections remain static layout markers. Their device READMEs record local positions.
See the [before/after and interaction checks](../.reports/2026-11-20-unified-valves/README.md).

The follow-up on the same date applies grouped interaction to **Nurlat-5 HV1–HV5
and M1/M2**, preserving their original blue/grey command-feedback semantics, and
replaces **Spring-1 РК1** with a single three-way body. Spring-1 rotates the canonical
body 90° to keep its third port on the right, removes its enclosing frame and
extends connected pipes to the body ports. Its status/alarm outlines move from the
frame onto the body, while its alarm icon retains the same visibility predicate.
Every lobe opens the complete existing status/alarm list. Do not discard a frame's
state information when removing it, or add an actuator to a symbol that has none.
See the [follow-up geometry and interaction evidence](../.reports/2026-11-20-valve-followup/README.md).
Other site layouts remain outside this update.

The profile records tank and valve defaults under `tank` and `valve`.

## Typography

Use the exact heading **«Прочие параметры котельной»** for the boiler-room panel of
other parameters. Its canonical wording is `labels.otherParameters` in the JSON profile;
use the general text role (`font.other`). Keep the boiler-room identity in the SVG
root's `aria-label` and application header. Use `aria-describedby` to reference a
`<desc>` when present. Do not add SVG `<title>` elements or `title` attributes to
diagrams: their browser tooltips cover equipment while the user inspects it.

Use the exact heading **«Аварийные события»** for every emergency panel. Its
canonical wording is `labels.emergencyEvents` in the JSON profile. Use the
general 10 px text role. Narrow single-column panels split it into centred
**«Аварийные» / «события»** lines with at least 12 units between baselines;
wider panels may keep one line. Preserve the panel's existing state meanings.

The following scheme was accepted on **16 November 2026**. Use it for new mnemoschemas
and when typography is part of the requested work on an existing diagram.

| Text role | Font size | Examples |
|---|---:|---|
| Sensor readings and numeric setpoints | **9 px** | Temperature, pressure, tank level, temperature setpoint |
| Emergency-tile captions | **7 px** | Связь, Охрана, Пожар, CO, Метан |
| Weather temperature and description | **8 px** | Dedicated weather readout; see the weather station rules below |
| All other text | **10 px** | Sensor tags, equipment names, captions, timestamps, statuses, mode text and panel headings |

Use **Roboto, Arial, sans-serif** and set `font-size:10px` on the root `<svg>`. Text
without an individual size inherits 10 px, including Газ, Подача Т1 and Обратка Т2.
Explicitly set `font-size="9px"` on readings/setpoints and `font-size="7px"` on emergency
tile captions. The emergency-panel heading itself is 10 px. Keep these essential styles
in the SVG so standalone and application previews use the same sizes.

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"
     style="font-family:Roboto,Arial,sans-serif;font-size:10px;">
    <text x="10" y="15">TE3</text>
    <text x="10" y="30" font-size="9px">52,25 °C</text>
    <text x="10" y="50" font-size="7px">Связь</text>
</svg>
```

Sizes are native SVG user units after ancestor transforms, equivalent to CSS pixels
when rendered at native size. Do not use group scaling to compensate for text sizes.
For 10 px multiline captions, keep baselines at least **12 units** apart. Adjust line
breaks and caption positions to maintain clearance from other text, pipework and symbols;
keep the agreed font sizes. Verify actual values and hover states in the application.
Bound text keeps the established bold hover feedback and returns to regular weight on
pointer leave. Alarm colouring and ordered property popovers stay on their original
logical equipment or caption when its presentation changes.

The canonical machine-readable settings are in `component-standard.json` under `font`:
`reading: 9`, `emergencyLabel: 7`, `other: 10`, `multilineBaseline: 12`. These values
replace the earlier Nurlat-only trial; there is no separate `fontTrials` profile.
The weather readout is an explicit 8 px exception, recorded under `weather.fontSize`.

The earlier Kirov/Gagarin/Komarova reference assets used 9 px status/timestamps,
8.5 px parameter captions and an 8 px emergency heading. All three now use the
accepted typography above. Updating the guide does not imply changing every existing
SVG; preserve unrelated or explicitly excluded site layouts.

## Weather station

The shared weather presentation, established on **20 November 2026**, is implemented in
[Nurlat-5's SVG](../flow-space-statics/devices/nurlat-5-boiler-room/mnemo-schema.svg)
and [scoped CSS](../flow-space-statics/devices/nurlat-5-boiler-room/mnemo-schema.css).
Reuse its existing station paths and circles unchanged: black **0.5-unit** strokes,
round caps/joins, original white details and non-interactive artwork. The stored
provider `weather.icon` code does not replace this fixed station symbol.
Numeric defaults live under `weather` in the component profile.

### Placement and text

Place the station at the left of **«Прочие параметры котельной»**, below its heading
and before the process-reading cards. Measure the following offsets from the
header frame's top-left corner, after every ancestor transform:

| Element | Offset from header frame | Geometry |
|---|---|---|
| Transparent click target | (+9, +36) | 27 × 27; radius 3; transparent fill/stroke |
| Station artwork origin | (+11, +37) | Original reference artwork, translated without scaling |
| Temperature anchor | (+41, +46) | Left-aligned baseline; 8 px |
| Description box origin | (+41, +49) | 19 units high; site-specific width; 8 px |
| Readout clip origin | (+38, +35) | 33 units high; right edge matches description box |

Temperature appears **first**, with the description **below**. Use the schema-formatted
single-property SVG `<text>` for temperature, including its °C unit. Description uses
an SVG `foreignObject` containing an XHTML `div`: `Roboto,Arial,sans-serif`, **8 px**,
**9 px** line height, normal whitespace, `overflow-wrap:anywhere`, hidden overflow,
`display:-webkit-box`, vertical box orientation and a **two-line** clamp. Very long text
ends with an ellipsis; its complete value remains in the popover. Keep the clip large
enough for both lines and bold hover text. Do not shrink the agreed font to fit.

Description width follows the space before the first card; it is not a universal
45- or 50-unit limit. These are the current local layouts, in effective root coordinates:

| Diagrams | Header frame origin | Hitbox origin | Artwork origin | Temperature baseline | Description origin | Description width |
|---|---|---|---|---|---|---:|
| Gagarin, Komarova, Kirov | (4, 8) | (13, 44) | (15, 45) | (45, 54) | (45, 57) | 65 |
| Nurlat-5 | (4, 8) | (13, 44) | (15, 45) | (45, 54) | (45, 57) | 45 |
| Muslum-7/9 | (13, 7.8) | (22, 43.8) | (24, 44.8) | (54, 53.8) | (54, 56.8) | 47 |
| Spring-1 | (-92, 12) | (-83, 48) | (-81, 49) | (-51, 58) | (-51, 61) | 180 |
| Spring-2 | (-92, 12) | (-83, 48) | (-81, 49) | (-51, 58) | (-51, 61) | 82 |

Spring-1's weather group uses `translate(-96 4)`. Spring-2 uses `translate(-26 4)`
inside the header's `translate(-70 0)`. Preserve these ownership/layout arrangements
and existing cards, equipment, pipes and canvas bounds when reusing the weather block.
Record future local coordinates and width choices in the device README.

### Bindings and interaction

Bind `weather-info` and `weather-icon-hitbox` to the controller's weather properties
in this popover order: **description, temp, pressure, humidity, wind.speed, wind.deg,
wind.gust**. Use exact `states['<controller-code>'].weather...` paths; keep the provider
icon code out of this list. Set `data-colorizer-hint="none"` on the hitbox so schema
colourizers do not recolour the artwork. On shared diagrams such as Spring-1/2, retain
`data-device="<controller-code>"` on the weather group so selecting a linked meter
still resolves weather to the controller.

The station artwork uses `pointer-events="none"` so clicks and phone taps reach the
hitbox. The description `foreignObject` owns pointer interaction (`pointer-events="all"`)
and its inner HTML text uses `pointer-events:none`. Bind both to `weather.description`,
assigning the inner text through `element.textContent` with a null/undefined-to-blank
check. Preserve scoped bold hover for the description, yellow hitbox hover and state
restoration on pointer leave. The icon opens all seven properties; clicking the
description opens its full value. The station is the main touch target on fitted phones.

Set group opacity to **1** when the weather object exists and **0.4** when absent.
Missing temperature/description display blank; zero and negative temperatures remain
valid readings. Missing weather must not create an empty popup. Preserve the schema's
units, null formatting and omitted optional wind/gust behavior.

### Data meaning and verification

`weather` is optional cached provider data owned by the controller. Its temperature is
separate from the PLC's `tempOutAir`. Units are °C, sea-level hPa, %, m/s and wind
direction in degrees **from**. Description and icon strings come from the provider's
first condition; the full provider response stays in the separate location cache.
Reuse Nurlat-5's current `WeatherModel` / `WeatherWindModel` schema definitions,
hidden read-only editors and chart metadata when adding support. Existing history
without weather remains valid. For collection/cache changes, also use
[device-state-mapping](../.codex/skills/device-state-mapping/SKILL.md) and the owning
Node-RED README; diagram reuse does not require changing the collector.

For weather visual changes, check native offsets, unchanged station artwork, text/card
clearance, temperature above description and two complete lines. In the real browser,
check “небольшой дождь”, a longer description, ellipsis with the full value in the
popover, zero/negative values, missing/partial weather, hover/restoration, icon and
description clicks, phone tap/scroll/close and linked-meter selection when applicable.
Label browser fixtures separately from live PLC data. Reuse the
[latest text-layout evidence](../.reports/2026-11-20-weather-wrap/README.md); the earlier
[B rollout](../.reports/2026-11-20-b-weather/README.md) and
[Spring rollout](../.reports/2026-11-20-spring-weather/README.md) describe prior layouts.
Those reports are historical verification records, not confirmation of deployment.

## State styling

Boiler bodies and pump frames/rotors use stroke **1** in normal, running and fault
states; preserve their state colours. Pump inner rings use **0.25**. Instrument strokes
use **0.25** normally, **0.5** for a warning and **1** for a fault/alarm. Yellow hover
outlines use **1**, except emergency tiles, which stay at **0.5**. Restore the state
appearance after pointer leave.

The standard defines appearance. Each site's own state paths, signal polarity, units,
alarm/input distinction and command-feedback meanings remain authoritative. Do not infer
an alarm from a numeric value, a stopped pump or another site's field order.

### Boiler burners and flame glow

Burner backgrounds use **`#808080` in both stopped and running states**, accepted
on **17 November 2026**. A running boiler is distinguished by its flame and the
animated orange glow from Spring-2, replacing the previous `#333333` running
background. Keep the site's own boiler-body colours, locked/fault indicators,
ordered property lists and exact flame-visibility predicate.

Use Spring-2's flame filter keyframes with a **3-second**, **ease-in-out**,
**infinite** pulse. The timing/reference are recorded under `flameGlow` in the
profile. Add `boiler-flame-animation` to the existing 18 × 27 flame instances,
with a diagram-scoped selector and unique keyframe name; flame artwork remains
non-interactive so clicks reach the burner. Apply the animation to the flame
instance, and disable the older inner static shadow to avoid combining effects.
The original flame paths and component geometry stay unchanged.

The animation source is
[Spring-2's CSS](../flow-space-statics/devices/spring2-boiler-room/mnemo-schema.css).
Copy its filter declarations at **0 / 25 / 50 / 75 / 100%** unchanged, giving the
keyframes a name unique to the target diagram. For example,
[Kirov's CSS](../flow-space-statics/devices/kirov-boiler-room/mnemo-schema.css) uses:

```css
#kirov-mnemoschema .boiler-flame-animation {
    animation: kirov_mnemoschema_burner_glow 3s ease-in-out infinite;
    pointer-events: none;
}
```

Keep the burner's initial SVG fill and evaluated fill consistent. Where an existing
`data-state-eval` switches between dark running and grey stopped fills, replace only
that fill assignment with `element.style.fill = '#808080';`. Retain its other
expressions, ordered `data-state` properties and colourizer hints so the full burner
popover and hover restoration still work. Preserve the flame's existing visibility
expression exactly; adding the animation class does not introduce another working,
normal or lock condition. Stopped flames remain hidden according to that site's logic.

Nurlat-5, Kirov, Gagarin, Komarova and Muslum-7/9 now use this appearance. Spring-2
retains its approved glow and grey burner background, including its own fault
outline semantics.

## Layout and canvas

Resize and reposition the whole component, including its burner, flame, labels, hit targets
and connected pipe endpoints. Use consistent margins and enough clearance for real values
with units, long mode descriptions, sensor flags and popovers. Derive canvas bounds from
the completed layout; retain at least four units of outer padding.

Kirov/Gagarin/Komarova use a **412-unit** viewBox height. Nurlat uses **880 × 456** to
leave more space above both makeup assemblies and accommodate longer tank inlet drops.
Its equipment groups have no compensating scale; component dimensions remain those
listed above. Tank ports follow the site's topology. Unique equipment, such as Nurlat's
exchangers, uses the common font/stroke rules with geometry appropriate to its function.

Muslum-7/9 were drawn on a larger **1070 × 700** coordinate grid. Their standard
versions use **700 × 468**, with native equipment and reading dimensions as listed
above. Layout coordinates were converted by 0.65, then actual component sizes, ports,
captions, the 70-unit header and unscaled 43-unit alarm tiles were set explicitly.
The hydraulic groups use translations only; no equipment/panel scale compensates
for component size. This local canvas accommodates Muslum-7's seven single-column
alarm tiles while retaining both sites' distinct circuits. See their device READMEs
for coordinates and exceptions, including Muslum-7's heat exchanger and the
slightly wider control-mode card needed for phone text metrics.

Spring-2 uses **`-98 8 736 485`**. Its initial standardized 636-unit width was
increased by 100 on 17 November 2026, initially adding 25 units to each of the four gaps
from its fixed emergency panel through the four boiler assemblies. Equipment
sizes and the 485-unit height stay unchanged; complete assemblies, connected
pipes and crossing gaps follow the new positions. Its eight unscaled alarm tiles
remain in two columns. The process subsequently moves 15 units left toward the
emergency panel, with the heat-meter/instrument/makeup block another 30 units
left. The header, emergency panel and three labelled outlet arrows stay fixed.
Its controller, IRVIS gas meter and
VKT-7 heat calculator share the diagram while retaining their individual state
paths, units, property lists and selection markers. The meter flow frames are
**70 units** wide for VKT-7 and **80 units** for IRVIS working flow; other reading
frames use 55 × 12. The four boiler-output valves use the standard vertical
bow-tie and left actuator. Gas branches keep their original lower-body entry
height to avoid crossing circulation pumps. The device README records these
local coordinates and the controller temperature assemblies' extra clearance.

Spring-1 uses **`-98 8 837 485`**: Spring-2's expanded **736-unit** width plus its
**101-unit** electricity-meter side panel. Its four boiler assemblies have equal
144.5-unit centre spacing. The controller, EK270, Взлет026 and two Mercury230 meters
keep their individual bindings and selection highlights. Its three-way mixing
valve retains the appropriate three-port artwork. See the
[Spring-1 README](../flow-space-statics/devices/spring1-boiler-room/README.md) for
local coordinates, wider meter-reading frames and verification.

The dashboard still fits SVGs into its existing responsive viewport. Different viewBox
heights, or width-constrained screens, can produce different screen scales; compare native
units at 100% or use the same actual zoom when checking component sizes. Do not compensate
by enlarging only one panel. Existing pan, pinch and zoom behaviour remains available.

## Measurement and verification

From the repository root:

```bash
node .tools/diagram-renderer/measure-components.mjs nurlat-5-boiler-room \
  '#boiler-1-frame,#boiler-1-status,#network-pump-1-frame,#TE9-frame,#TE9-value,#connection-frame'
```

The helper reports effective dimensions, font sizes, stroke widths and all ancestor
transforms in native SVG units. It reads local files and applies no device state.
Use the real UI for schema formatting, colourizers, hit targets and font-fit checks.

For a normalized diagram, compare both native 100% snapshots and equal-viewport dashboard
measurements against the references. Check normal/running/locked, connected/disconnected,
warnings/alarms, hover enter/leave, popup scrolling/closing and phone gestures. Validate
all state paths and preserve the source topology. Regenerate the static manifest and
keep screenshots and machine-readable results beside the work report.

For burner-glow changes, check every affected burner in running and stopped cases,
plus the site's locked/fault appearance. In the application, confirm the grey fill,
unchanged flame visibility and body colours, all five animation phases and the
profile's timing. When multiple burners run together, every visible flame must
animate under its existing predicate. Check full burner property popovers, hover/restoration
and phone taps through the non-interactive flame. Save before/after captures with
the same operating case and zoom; label synthetic states and note that each PNG
captures only one phase of the continuous glow.
