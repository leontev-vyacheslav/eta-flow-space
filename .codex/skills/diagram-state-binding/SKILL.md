---
name: diagram-state-binding
description: Bind device-state properties to Eta Flow Space SVG mnemoschemas, arrange property popovers and alarm panels, and match existing hover feedback. Use for diagram bindings and their visual verification; collected-state changes also require device-state-mapping.
---

# Diagram state binding

Use the Muslum-9 session's binding conventions when creating or revising boiler-room diagrams.
Apply corrections within the requested scope; a hover-only request does not imply reorganizing all
properties. Paths below are relative to the repository root unless expressed as Markdown links.

## Establish the state contract

Read the device's `flow-space-statics/devices/<code>/README.md`, `data-schema.json`,
`mnemo-schema.svg` and `mnemo-schema.css`. Inspect the actual owning Node-RED instance's
`collect-device-state` function and upstream converters when channel meaning is uncertain.
Use the exact device code, rather than deriving it from a display name or plural spelling.

- For a new or changed collector/schema, use [device-state-mapping](../device-state-mapping/SKILL.md).
  Confirm units, enum meanings, signal polarity, nested types and array indexes before binding.
- Reuse another site's layout or interaction, but establish each channel's meaning independently.
  Do not assign sensor faults to numbered instruments by their apparent order, infer pump faults
  from stopped pumps, or label a network setpoint as a boiler setpoint without source evidence.
- For Muslum-9, read [the session decisions](references/muslum9.md). They include unresolved channel
  associations and explicitly scoped corrections that must survive later edits.
- Follow the site's display contract for missing values. Muslum-9 intentionally uses direct access
  without null/undefined guards, optional chains or fallback text because the user expects populated
  states whenever the diagram is shown. A schema's `required` list alone does not guarantee non-null
  values; confirm that assumption before transferring it to another site. Do not change collection
  semantics or schema nullability merely to simplify an SVG expression.

## Use the application binding mechanism

Before adding unfamiliar expressions, consult these current implementations:

- `flow-space-ui/src/helpers/data-helper.ts`: flattened property paths and schema resolution.
- `flow-space-ui/src/helpers/state-expression.ts`: permitted expression syntax and assignments.
- `flow-space-ui/src/pages/dashboard-page/components/mnemoschema/use-mnemoschema-state-setup.tsx`:
  text formatting, colourizers and expression application order.
- `flow-space-ui/src/pages/dashboard-page/components/mnemoschema/use-mnemoschema-popover.tsx`:
  property resolution and click targets.

`data-state` contains exact paths separated by semicolons. Their order determines the property's
position in the popover; reordering JSON schema properties does not reorder the popover.

```xml
<rect data-state="states['muslum-9-boiler-room'].boilers[0].isWorking;states['muslum-9-boiler-room'].boilers[0].isLocked;states['muslum-9-boiler-room'].boilers[0].temperature" />
<text data-state="states['muslum-9-boiler-room'].tempOutNet" />
<text data-state="states['muslum-9-boiler-room'].timestamp" data-state-format="time" />
```

Use single-property `<text>` bindings for schema-provided numbers, units, enums and date/time
formatting. Use `data-state-format="date"` and `"time"` for separate timestamp lines.
For combined styling, bind the relevant properties and read `states['<code>']` in `data-state-eval`;
multi-property expressions do not receive `value`.

Expressions use a restricted interpreter, not unrestricted JavaScript. Use its supported
conditionals, style/text assignments, array `includes` and permitted `element.classList` methods.
Do not embed functions, DOM queries, event handlers, `new Date` or formatting method calls.
Use braces for every control-flow body. Escape XML attribute content correctly.

A single-property non-text element receives the schema colourizer before its custom expression.
Changing a multi-property binding into a single-property one can therefore add unexpected fill,
stroke or stroke width. Inspect `data-colorizer-hint` and use the intended style-property hints
(or `none` to suppress schema colouring) when custom artwork owns those styles.

## Arrange properties deliberately

For new diagrams using this convention, keep contextual readings and modes on their corresponding
equipment, instruments or cards. Preserve existing conventions outside the requested change.

- The information icon always starts with `isConnected`, then `timestamp`, including when those
  properties are also bound elsewhere. Follow them with useful properties unique to the icon.
  Exclude alarms, faults and warnings from this generic list. Before removing other duplicates,
  inspect all `data-state` owners in the SVG; these two metadata properties are explicit exceptions.
- When the model exposes them, boiler detail lists start with `isWorking`, `isLocked`, `temperature`,
  followed by relevant existing command-feedback and PID fields. Do not invent those fields for a
  different model. Muslum-9's boiler alarm fields belong only to its emergency panel; see the reference.
- Limit pump-summary details to the signals the summary represents. Muslum-9 excludes physical
  pump numbers from `network-pumps-alarm` while retaining them on individual pumps.
- Give room state, control mode and operating mode separate matching cards when requested. Bind
  each card's own property and let the schema supply enum descriptions.

Do not globally deduplicate bindings: a frame and its value text can intentionally share a field,
and multiple clickable parts of one boiler can intentionally open the same complete detail list.
Connection status, operation status and alarms have distinct roles; preserve the requested colour
ownership rather than applying connection styling to every instrument.

## Match hover feedback and preserve hit targets

Read the user-selected reference's current CSS/SVG. For the Spring-2 appearance approved here,
use the Muslum-9 CSS as an implemented example: scoped yellow outlines and glow on bound shapes,
bold bound text, and normal state colours after the pointer leaves. Copy relevant rules, not the
reference's unrelated equipment animation or layout. Keep selectors scoped to the diagram root.

Check real pointer targets. Decorative pump rings/arrows and flame artwork must not intercept the
underlying bound shapes. If a burner becomes clickable, retain the boiler frame's full ordered
property list there rather than reducing its popover to `isWorking`. Use CSS hover rules to restore
state colours naturally on pointer leave; verify their interaction with inline colourizer styles.

Make surgical SVG edits and preserve line endings. When changing geometry, match actual XML
attribute boundaries: a regex such as `\bwidth=` also matches `stroke-width=`. Inspect stroke widths,
corner radii, text fit and nearby geometry after edits instead of trusting a successful replacement.

## Verify and hand off

Use [project-tools](../project-tools/SKILL.md) for existing preview helpers. Parse the SVG as XML,
resolve every added state path against the current schema, inspect binding order and ownership,
and run `bash .tools/diagram-renderer/gen-manifest.sh` after static changes. Review manifest and
asset diffs for unrelated changes. A standalone renderer may not reproduce the application's nested
schema resolution and colourizers; a rendered image alone does not verify popovers or hit targets.

Use [testing-with-playwright](../testing-with-playwright/SKILL.md) for browser verification. Preview
undeployed changes by overriding only the edited static-file requests in the local UI, following
the project's API-tunnel setup. Exercise the affected readings, enum cards, property order,
hover enter/leave and click targets with real gestures. Include relevant connected/disconnected,
running/stopped, locked or alarm cases; label synthetic cases separately from real API data.
Check scrolling and closing detail popovers, and touch interaction when affected.

Capture after gestures and popup transitions settle; a screenshot during opening animation is
inadequate evidence. Inspect the images for clipping and readable text. Save previews in
`.previews/`; when making a report, keep its images beside it and use relative Markdown links.
Document confirmed channel mappings and remaining uncertainty in the device README. Report actual
checks and local/deployed status accurately, and sign out the browser session created for checking.

For collector changes, also provide decoded function diffs and appropriate offline/live validation
through the mapping skill. Use [commit-message](../commit-message/SKILL.md) for a concise proposed
subject. Creating bindings does not itself authorize deployment, equipment commands or a commit.
