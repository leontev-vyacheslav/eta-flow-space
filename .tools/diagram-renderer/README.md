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
[`component-standard.json`](component-standard.json) record the existing Kirov/Gagarin/
Komarova/Spring-2 component sizes. Audit native dimensions, typography and ancestor scales:

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
