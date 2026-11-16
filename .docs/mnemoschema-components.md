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
The reference diagrams have not been modified by this standardization.

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
| Valve artwork | Reference orientation and suitable ports for its function | 0.5 |
| Parameter/emergency panel | Radius 10; parameter-panel height 70 | 0.5 |

The corrected boiler, burner and pump-frame dimensions were accepted on **16 November
2026**. When applying them to an existing layout, resize around the component's center
and update connected pipe endpoints. Preserve gas-inlet centering and equal boiler
supply/return clearances. Flame instances remain 18 × 27 and pump circles retain radius 10.

Use only **1, 0.5 and 0.25** for component stroke widths, rounding previous widths to
the nearest allowed value. Emergency-tile borders always use **0.5**, including alarm
and hover states. These rules apply to initial SVG attributes, state expressions and CSS.

Use **10** (`radius` in the JSON profile) for component radii and rounded panel/card/tile
corners. The exceptions are **burnerRadius = 5**, **junctionRadius = 1.5** and pump
**frameRadius = 3**. Square
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
take precedence for new diagrams and component updates. Existing reference SVGs remain
unchanged unless their update is requested.

## Typography

Use the exact heading **«Прочие параметры котельной»** for the boiler-room panel of
other parameters. Its canonical wording is `labels.otherParameters` in the JSON profile;
use the general text role (`font.other`). Keep the boiler-room identity in the SVG title
and application header.

The following scheme was accepted on **16 November 2026**. Use it for new mnemoschemas
and when typography is part of the requested work on an existing diagram.

| Text role | Font size | Examples |
|---|---:|---|
| Sensor readings and numeric setpoints | **9 px** | Temperature, pressure, tank level, temperature setpoint |
| Emergency-tile captions | **7 px** | Связь, Охрана, Пожар, CO, Метан |
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

Gagarin, Komarova and Kirov remain geometry/style references. Their existing typography
is historical: some text uses 9 px status/timestamps, 8.5 px parameter captions and an
8 px emergency heading. Those sizes do not override this accepted standard for further
work. Updating the guide does not imply changing every existing SVG; preserve unrelated
or explicitly excluded site layouts.

## State styling

Boiler bodies and pump frames/rotors use stroke **1** in normal, running and fault
states; preserve their state colours. Pump inner rings use **0.25**. Instrument strokes
use **0.25** normally, **0.5** for a warning and **1** for a fault/alarm. Yellow hover
outlines use **1**, except emergency tiles, which stay at **0.5**. Restore the state
appearance after pointer leave.

The standard defines appearance. Each site's own state paths, signal polarity, units,
alarm/input distinction and command-feedback meanings remain authoritative. Do not infer
an alarm from a numeric value, a stopped pump or another site's field order.

## Layout and canvas

Resize and reposition the whole component, including its burner, flame, labels, hit targets
and connected pipe endpoints. Use consistent margins and enough clearance for real values
with units, long mode descriptions, sensor flags and popovers. Derive canvas bounds from
the completed layout; retain at least four units of outer padding.

Kirov/Gagarin/Komarova use a **412-unit** viewBox height. Nurlat uses **880 × 456** to
leave more space above both makeup assemblies and accommodate longer tank inlet drops.
Its equipment groups have no compensating scale; component dimensions remain those
listed above. Unique equipment, such as Nurlat's storage tanks and exchangers, uses its
declared font profile and the common stroke rules with geometry appropriate to its topology.

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
