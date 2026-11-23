---
name: mnemoschema-standard
description: Apply the shared component standard when creating or changing Eta Flow Space SVG diagram geometry, layout, typography or visual styling, including equipment, instruments, weather icons and emergency panels.
---

# Mnemoschema standard

Apply the current shared defaults to the requested components and layout. Keep unrelated
site assets and each site's signal meanings intact. Paths in commands are relative to
the repository root; Markdown links are relative to this file.

## Read the maintained standard

Read these together before choosing dimensions or styles:

- [Component profile](../../../.tools/diagram-renderer/component-standard.json): numeric
  defaults, standard headings, font roles, stroke palette, state/hover widths, radii
  and colours.
- [Component guide](../../../.docs/mnemoschema-components.md): how those values apply,
  native-unit rules, layout conventions and documented exceptions.
- The target device's `README.md`, `mnemo-schema.svg` and `mnemo-schema.css` under
  `flow-space-statics/devices/<device-code>/`: existing topology and local decisions.

Use the accepted profile and guide ahead of older measurements from reference SVGs.
Nurlat-5 is the implementation example; the guide names the historical reference family.
Spring-2 is the flame-glow reference; its animation does not replace another site's
running, locked or fault semantics.
Keep the numeric defaults in the profile and explanations in the guide. When the user
changes the shared standard, update both and their relevant documentation together.
Record local coordinates, canvas extents and site-specific exceptions in the device
README; a local layout adjustment does not establish a new universal default.

## Apply dimensions and layout

- Measure equipment, fonts and strokes after every element and ancestor transform.
  Place equipment with translations/rotations. Internal symbol artwork may use its own
  coordinates when its instance fits the standard icon box.
- Treat native SVG size and dashboard fit as separate measurements. A different
  `viewBox` can change fitted screen scale while native component dimensions stay fixed.
  Derive canvas bounds from the completed layout and explain extent changes; preserve
  the application's normal zoom/pan behaviour.
- Resize around existing centers where the requested placement permits. Move companion
  burners, flames, status/value text, captions and hit targets with the equipment. Update
  connected pipe endpoints and junction dots together. Preserve gas-inlet centering,
  boiler supply/return clearances, crossing bridges and both pump-manifold junctions.
- Keep each sensor frame, label, value anchor and stem aligned. Match the corresponding
  upper/lower sensor layout when requested. Maintain value/unit clearance at the agreed
  font size; use wider frames where real values need them, as allowed by the guide.
- Move complete requested assemblies coherently. If longer inlet drops or another local
  clearance also change internal offsets, report that separately from the assembly's
  translation. Choose stem lengths and gaps for the actual layout and requested reference.

## Apply typography and state styling

Use the profile's `labels` for shared panel headings and its `font` roles for root
inheritance, readings/setpoints, emergency-tile captions and multiline spacing. Keep
essential typography and initial styles in the SVG so standalone and application
previews agree. Emergency-panel headings use the general
text role; numeric readings retain their own role.
Weather temperature/description use the explicit 8 px exception in `weather.fontSize`.

Apply `strokeWidths`, component/state widths, `hover` and radius settings to initial SVG
attributes, embedded styles, state expressions and scoped CSS. Check computed styles:
inline expressions and schema colourizers can override initial attributes. Preserve icon
artwork and components whose corners are square in the standard.

For boiler burners, apply the guide's
[burner and flame-glow rules](../../../.docs/mnemoschema-components.md#boiler-burners-and-flame-glow):
grey backgrounds in running and stopped states, Spring-2's exact filter phases and
the profile's pulse timing. Use diagram-scoped CSS and a unique keyframe name on the
existing flame instance; avoid stacking the old inner shadow. Keep flame artwork
non-interactive so the burner remains the property-popover target. Update initial
and evaluated fills together while preserving ordered bindings, hints, other state
expressions and the exact existing flame-visibility predicate.

For bindings, alarm/popover ownership or interactive state styling, also use
[diagram-state-binding](../diagram-state-binding/SKILL.md). Geometry-only edits preserve
IDs, ordered `data-state` lists, units, signal polarity and full state expressions;
requested style edits change appearance without changing signal predicates.

## Reuse the weather station

For weather icons and header placement, read the guide's
[weather station standard](../../../.docs/mnemoschema-components.md#weather-station)
and the profile's `weather` section. Reuse Nurlat-5's current fixed station artwork,
black 0.5-unit strokes and 27 × 27 transparent hitbox. Place the complete block using
the documented header-relative offsets; measure through all ancestor transforms.
Temperature comes first with a two-line wrapped description below, both at 8 px.
Choose description width from available space before the first card, preserving the
site's layout. The guide records existing site coordinates and the Spring translations.
Use the latest temperature-first implementation ahead of older report screenshots.

Preserve ordered weather properties, controller ownership, blank missing labels,
dimmed absent weather and pointer targets through
[diagram-state-binding](../diagram-state-binding/SKILL.md). Verify long text, popovers,
hover and phone interaction using the guide's focused weather checks when changing
the visual result. Record local width/coordinate decisions in the device README.

## Construct unified valves

Follow the guide's
[unified valve standard](../../../.docs/mnemoschema-components.md#unified-valve-bodies-and-three-way-valves)
and the profile's `valve` paths. Nurlat-5's `HV*-state` and `mixing-valve-*-state`
are the references: one path contains every body lobe, including the third triangle
of a three-way valve. Do not split lobes into separately bound polygons. Keep the
stem and white square actuator as separate paths in one `.valve` group, with no
enclosing frame. Translate/rotate the whole symbol and preserve its pipe ports.

Use `valve.fill` in the profile for confirmed positions: **closed grey #808080**,
**open white #FFFFFF**. Retain the target controller's enum/feedback meanings and
existing intermediate/fault indications. Auto/manual mode does not establish position;
mode-only or unmapped bodies stay neutral grey with their existing popovers. Override
legacy red/green body colourizers in the SVG when needed; preserve actuator/outline
state ownership and collected values. See the guide's valve-position-colour rule.

Apply scoped group-hover rules so either body half, stem or actuator highlights the
whole assembly and restores its own state colours afterward. Preserve each site's
confirmed bindings and signal meanings; static valves stay unbound. Spring-2 and
Tsarevo-1's ЗК1–ЗК4 implement this group interaction. Verify both body halves,
stem/actuator hover, bound popovers, open/closed restoration and phone taps.
Spring-1 РК1 demonstrates a three-way body rotated to a right-hand third port;
Nurlat-5 HV1–HV5 and M1/M2 also implement the grouped interaction. When removing
an enclosing frame, transfer its confirmed status/alarm outline to the body and
connect pipes to the actual ports. Retain any alarm icon's visibility predicate;
do not invent an actuator for a symbol that has none.

## Verify the affected result

Reuse [project-tools](../project-tools/SKILL.md) and the
[diagram renderer documentation](../../../.tools/diagram-renderer/README.md).
For example, measure local native geometry with the existing helper:

```bash
node .tools/diagram-renderer/measure-components.mjs nurlat-5-boiler-room \
  '#boiler-1-frame,#boiler-1-burner,#network-pump-1-frame,#TE9-frame,#TE9-value,#connection-frame'
```

Use the target site's actual IDs. The helper applies no device state; its output does
not establish formatted reading fit, alarm styling or popup behaviour. For text
alignment, measure SVG anchors and baselines; glyph bounding boxes describe ink/metrics
and can be asymmetric. Wait for fonts and loading/animations to settle before capturing.

Compare against the current saved baseline, including pending user edits. Parse XML and
inspect changed attributes, bindings and relevant geometry. Check actual values with
units, nearby captions/equipment, connected endpoints, viewBox fit and margins.

Use [testing-with-playwright](../testing-with-playwright/SKILL.md) for affected UI behaviour:
representative state styling, hover/restoration, moved or resized hit targets, popovers
and phone interaction as relevant to the change. Keep checks focused and reuse existing
scenarios. Save inspectable before/after PNGs and measurements; distinguish supplied
saved data, synthetic cases and live reads in the result.

For burner-glow changes, follow the guide's focused verification: every affected
burner running/stopped, multiple burners running together, locked/fault appearance, computed
animation phases/timing, full property popovers and phone taps. Compare matching
before/after states and remember that a PNG records only one animation phase.

After SVG/CSS or other static assets change, run:

```bash
bash .tools/diagram-renderer/gen-manifest.sh
```

Inspect the asset/manifest diff for unrelated changes. Report verified dimensions,
layout changes, evidence and any remaining verification limits.
