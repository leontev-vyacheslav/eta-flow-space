---
name: project-tools
description: Reuse Eta Flow Space tools for diagram previews, manifest generation, device probes, offline flow chains, TIA archives, spreadsheets, and bundle analysis. Use before creating a duplicate project helper.
---

# Project tools

Adapted from `.claude/skills/project-tools/SKILL.md`. Run commands from the repository root unless
an individual tool README specifies otherwise. Inspect an existing tool before inventing a replacement.

| Task | Existing tool and documentation |
|---|---|
| Diagram preview, real state, info-icon geometry | `.tools/diagram-renderer/README.md`; `fetch_states.py`, `render.js`, `measure.js` |
| Manifest hashes for devices and quick-help | `bash .tools/diagram-renderer/gen-manifest.sh` |
| Meter probes, subflows, GPRS and meter emulators | `.tools/device-probes/README.md`; `subflow_run.js`, `reader_via_emulator.js`, `spt_meter_emulator.js` |
| Offline stock Modbus converter/join/mapping chain | `.tools/flow-chain/README.md`; `run_modbus_tab.js` |
| Siemens TIA archive extraction and SCL recovery | `.tools/tia-project/README.md`; `pages.py`, `rhs.py` |
| XLSX register maps without openpyxl | `.tools/xlsx-dump/README.md`; `xlsx_dump.py` |
| UI source-map size by package/chunk | `.tools/bundle-size/README.md`; `bundle-size.mjs` |
| Isolated local PostgreSQL with reference schema, demo fixtures and Redis | `.tools/local-development/README.md`; `local-development.sh` |
| Lightweight SQL backup with latest device/emergency states and disposable restore verification | `.tools/database-backup/README.md`; `lightweight-backup.sh`, `test.sh` |

## Operational details

- The root statics generator hard-codes a server path. Use the wrapper above: it runs the current
  generator against this checkout and preserves quick-help entries. Never fork a private copy.
- Render diagram changes with representative states and inspect the preview. Put user-facing output
  in `.previews/` and link it in the reply. Use fixture states if production reads are unavailable;
  state that limitation. Existing `test-data.js` and `example.json` may be useful but check their shape.
- `fetch_states.py` uses the developer database tunnel (`localhost:35432`) and reporting environment.
  Use read-only database sessions; never print credentials or commit fetched production data.
- Tool names do not guarantee read-only behavior. GPRS tools may select a modem line in band, take
  over a listener, relay to real equipment, or require production polling to stop. Read implementation
  and options first; such changes require task authorization. Prefer fully local emulators for offline checks.
- The Modbus flow-chain runner substitutes zero for missing dump registers. Inspect its missing-word
  count; a schema pass with missing registers does not establish correct measurements.
- Inspect the renderer's current browser lookup rather than pinning an old Chromium build number.
  Install dependencies only when needed and respect environment permission checks.

## Reusable scripts

Keep reusable helpers in `.tools/<name>/`, with a README describing inputs, outputs, side effects and
usage. Resolve paths relative to the script; read secrets from the environment at runtime. Update
`.tools/.gitignore` for dependencies, fetched states, extracted archives and generated output.
One-off experiments can live in `/tmp` or `.temp/`; durable scripts belong in the repository.
When adding a tool, update this table and mention it to the user. Include only source and small
intentional fixtures in proposed commits.
