# Diagram renderer

Renders a mnemoschema (`flow-space-statics/devices/<site>/mnemo-schema.svg`) with real device states applied the way
the UI applies them (ru-RU numbers with units from the data schemas, enum texts, colorizers, `data-state-eval`), so a
diagram change can be checked as a picture before it is deployed. Previews go to `.previews/` (git-ignored).

Setup once: `npm install` (Playwright; it uses the Chromium headless shell in `~/.cache/ms-playwright`).

```bash
# latest stored state of every device of a site (production database, read-only, through the SSH tunnel)
../../flow-space-reporting/.venv/bin/python fetch_states.py tsarevo1-boiler-room tsarevo1-boiler-room-states.json
# whole diagram, or a crop given as fractions x0,y0,x1,y1
node render.js tsarevo1-boiler-room tsarevo1-boiler-room-states.json ../../.previews/tsarevo1.png 1.5
node render.js tsarevo1-boiler-room tsarevo1-boiler-room-states.json ../../.previews/tsarevo1-km5.png 3 0.7,0.45,0.95,0.7
# render an older diagram: STATICS=<folder with devices/*> node render.js ...
# info icon offsets from their block frames (Весна-1 reference: 7.35 from the right, 5.92 from the top)
node measure.js tsarevo1-boiler-room
# regenerate flow-space-statics/manifest.json after changing statics
bash gen-manifest.sh
```

## Component dimensions

The [component standard](../../.docs/mnemoschema-components.md) and
[`component-standard.json`](component-standard.json) record the Kirov/Gagarin/
Komarova/Spring-2 equipment family and the accepted defaults: readings/setpoints
**9 px**, emergency-tile captions **7 px**, all other text **10 px**. Set the root SVG
font size to 10 px and use explicit overrides for the two exceptions. Multiline captions
use at least 12 units between baselines. The version 2 JSON profile records these values
under `font`; Nurlat-5 is the current typography example. Sensor-reading frames default
to **55 × 12** (`instrument.width` / `instrument.height`), centered on their value and
connection stem. Keep the 9 px value font and adjust neighbouring clearances as needed.
Boiler bodies default to **65 × 70**, burners to **40 × 30** and pump frames to **27 × 27**.
Resize around existing centers and update attached pipe endpoints; flames remain 18 × 27.
Stroke widths use the nearest of **1 / 0.5 / 0.25**; emergency-tile borders always use
**0.5**. Component radii default to **10**, with burner corners **5**, junction dots
**1.5** and pump-frame corners **3**. Existing reference SVGs retain their current
values until an update is requested.

Water tanks/vessels default to **32 × 50**, radius **10**, with three blue dashed
water lines. Actuated valves use a **16 × 10** bow-tie, an **11-unit** stem and an
**8 × 8** square actuator, without an enclosing frame. The `tank` / `valve` profile
entries and component guide specify their strokes, offsets and rotation conventions.

Shared panel wording is stored under `labels`; the boiler-room other-parameters heading
uses `labels.otherParameters`.

Audit native dimensions, typography and ancestor scales:

```bash
# from the repository root; an optional CSS selector limits the output
node .tools/diagram-renderer/measure-components.mjs nurlat-5-boiler-room \
  '#boiler-1-frame,#network-pump-1-frame,#TE9-frame,#TE9-value,#connection-frame'
node .tools/diagram-renderer/measure-components.mjs kirov-boiler-room \
  '#boiler-1-frame,#network-pump-1-frame,#tempOutNet-frame,#tempOutNet-value,#connection-frame'
```

This helper uses the UI's installed `@playwright/test` and its default Chromium resolution.
It reads local SVG/CSS files, launches a disposable browser, and writes JSON to stdout;
it does not change files, authenticate, query device state or contact controllers.
The SVG is measured at native size. The report includes local and effective bounds,
effective font/stroke sizes, and the element/ancestor transforms that produced them.
No `data-state` values are applied, so measurements describe the initial static artwork.
Use the application browser checks for actual readings, state-dependent styling and UX.
