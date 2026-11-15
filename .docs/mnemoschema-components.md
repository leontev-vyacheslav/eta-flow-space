# Mnemoschema component standard

The established references are **Кирова, Гагарина, Комарова and Весна-2**. Use their native
SVG component dimensions rather than compensating for a drawing's canvas size with
equipment-group scales. Nurlat-5 is the first diagram rebuilt against this reference.

The machine-readable values are in
[`component-standard.json`](../.tools/diagram-renderer/component-standard.json). Kirov,
Gagarin and Komarova provide the identical current component profiles; Spring-2 supplies
the same boiler, pump-rotor and reading-box family and the original drawing conventions.
The reference diagrams have not been modified by this standardization.

## Native component units

All dimensions below are SVG user units **after every ancestor transform**. A rectangle
declared as 43 × 43 inside `scale(2)` is an 86 × 86 component and does not meet the standard.
Use translations and rotations to place equipment. A symbol's internal artwork may use
its own coordinates, but its instance must occupy the standard component/icon box.

| Component | Dimensions and geometry | Normal stroke |
|---|---|---:|
| Boiler body | 63.6 × 69.3 | 0.8904 |
| Burner | 38.4 × 28.8; radius 4.5 | None |
| Boiler flame instance | 18 × 27 | None |
| Pump frame | 26.8 × 26.2; radius 2.6 | 1 |
| Pump rotor | Radius 10.6; inner ring radius 9.3 | 1 / 0.25 |
| Measurement frame | 45 × 11.2 | 0.25 |
| Emergency tile | 43 × 43; radius 10.32 | 0.7 |
| Emergency icon instance | 24 × 25, or the reference CO artwork at its existing normalized size | Artwork-specific |
| Water/gas pipe | Junction radius 1.3 | 1 |
| Valve artwork | Reference orientation and suitable ports for its function | 0.5 |
| Parameter/emergency panel | Radius 9.4; parameter-panel height 70 | 0.5 |

Use **Roboto, Arial, sans-serif**. Measurement values, instrument tags and equipment status
use size **9**; contextual captions use **8**; compact captions and emergency labels use
**7**; main equipment labels and titles use **10**. Keep these essential styles in the SVG
so the IDE and dashboard share the same typography and geometry. Hover rules can remain
in the diagram's scoped stylesheet.

Boiler strokes use 0.8904 when stopped and 1.272 when active (1.4% / 2% of body width).
Pump frames/rotors use stroke 1 normally and 2 when running or in fault. Instrument
strokes use 0.25 normally, 0.5 for a warning and 1 for a fault/alarm. Keep the existing
yellow hover feedback and restore the state appearance after pointer leave.

The standard defines appearance. Each site's own state paths, signal polarity, units,
alarm/input distinction and command-feedback meanings remain authoritative. Do not infer
an alarm from a numeric value, a stopped pump or another site's field order.

## Layout and canvas

Resize and reposition the whole component, including its burner, flame, labels, hit targets
and connected pipe endpoints. Use consistent margins and enough clearance for real values
with units, long mode descriptions, sensor flags and popovers. Derive canvas bounds from
the completed layout; retain at least four units of outer padding.

Kirov/Gagarin/Komarova use a **412-unit** viewBox height. Nurlat uses **880 × 412** so the
existing dashboard's common height produces the same desktop component scale while allowing
more horizontal space for ten pumps and two exchangers. Its equipment groups have no
compensating scale. Unique equipment, such as Nurlat's storage tanks and exchangers, uses
the common fonts and stroke rules with geometry appropriate to its topology.

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
