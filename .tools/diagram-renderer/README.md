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
