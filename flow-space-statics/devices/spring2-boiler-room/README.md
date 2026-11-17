# Котельная ЖК Весна-2 — mnemoschema

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

The saved diagram has **119 bound elements / 120 distinct properties**. Every
original ordered `data-state` list, format hint and `data-colorizer-hint` is
preserved. Popovers and graph actions resolve properties through their owning
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

The canvas is **`-98 8 636 485`**. Its width increased from 600 to 636 to accommodate
native alarm tiles and keep clearance from the first boiler's circulation pump.
The right edge and height of the process layout remain close to the original.
There are no compensating scales on equipment, panels, tiles or text; normalized
symbol instances retain their original internal artwork.

| Component | Native geometry |
|---|---|
| Four boiler bodies | 65 × 70, resized around their original centres |
| Burners / flame instances | 40 × 30, radius 5 / 18 × 27 |
| Eight pump frames / five relay frames | 27 × 27, radius 3; rotor radius 10 and inner ring radius 10 |
| Reading frames | 55 × 12, centred value/tag; value baseline at top + 9 |
| VKT-7 flow frames / IRVIS working-flow frame | 70 × 12 / 80 × 12 for their value and unit lengths |
| Four boiler-output valves | Vertical 10 × 16 bow-tie, 11-unit stem to the left, square 8 × 8 actuator |
| Other-parameters panel | x = −92, y = 12, width 619.1, height 70; radius 10 |
| Alarm panel | x = −92, y = 90, width 112, height 228; radius 10 |
| Eight alarm tiles | 43 × 43, radius 10, two columns at x = −84 / −31; rows y = 114 / 165 / 216 / 267 |
| Alarm icon instances | 24 × 25, with the existing artwork retained in symbols |

All pipe endpoints affected by resizing follow the new body, pump, relay or valve
ports. Boiler gas inlets retain their original lower-body height, around y = 190.7,
so gas branches stay clear of the circulation pumps. This is a local routing
exception to centring an inlet vertically on the boiler. Crossing gaps, junctions,
manifolds and flow directions remain part of the existing circuit.

Controller supply/return temperature assemblies move 10 units right as complete
assemblies to separate the wider TE5/TE6 frames from PE1/PE2. The boiler flue
readings centre within the bodies; their decorative waves move 12 units upward
so they do not cover values. Makeup-pump and source-water-relay captions are
centred above their own symbols. DT1/DT2 remain measured-level cards in the
header; this diagram does not show separate water vessels.

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

Structural checks preserve all 119 bindings, ordered lists, units, selection targets,
legacy IDs, original shared icon/flame artwork and CRLF line endings. All 120
property paths resolve against the appropriate local device schema. Regenerate
`flow-space-statics/manifest.json` after changing the assets.

The actual local application was checked through the read-only API tunnel with
local SVG/CSS/JS overrides and a saved live snapshot containing all three devices.
Browser-only synthetic responses cover additional states. Evidence is kept in
`.reports/2026-11-16-spring2-standardization/` and `.previews/spring2-standardization/`.
These checks and files are local; they do not establish production deployment.
