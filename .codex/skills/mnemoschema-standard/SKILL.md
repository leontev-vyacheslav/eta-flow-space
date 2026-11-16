---
name: mnemoschema-standard
description: Apply the shared component standard when creating or changing Eta Flow Space SVG diagram geometry, layout, typography or visual styling, including equipment, instruments and emergency panels.
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

Apply `strokeWidths`, component/state widths, `hover` and radius settings to initial SVG
attributes, embedded styles, state expressions and scoped CSS. Check computed styles:
inline expressions and schema colourizers can override initial attributes. Preserve icon
artwork and components whose corners are square in the standard.

For bindings, alarm/popover ownership or interactive state styling, also use
[diagram-state-binding](../diagram-state-binding/SKILL.md). Geometry-only edits preserve
IDs, ordered `data-state` lists, units, signal polarity and full state expressions;
requested style edits change appearance without changing signal predicates.

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

After SVG/CSS or other static assets change, run:

```bash
bash .tools/diagram-renderer/gen-manifest.sh
```

Inspect the asset/manifest diff for unrelated changes. Report verified dimensions,
layout changes, evidence and any remaining verification limits.
