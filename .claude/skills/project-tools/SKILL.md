---
name: project-tools
description: Reuse and keep helper scripts in the project's .tools/ folder (diagram renderer with real states, info-icon measuring, manifest regeneration, production state fetch, TIA Portal archive reader, read-only device probes) instead of rebuilding them in the scratchpad. Use before writing any helper script, before rendering or checking a mnemoschema, before regenerating manifest.json, when reading a Siemens TIA project archive, and whenever a session writes a script worth keeping.
---

# Project tools

The session scratchpad is wiped between sessions, so tools rebuilt there are lost. Reusable scripts live in
**`.tools/<tool>/`**, one folder per tool, each with a `README.md` saying what it does and how to run it.
Look here first; extend a tool rather than writing a second one.

## Rules for `.tools/`

- **Scripts only in git.** `.tools/.gitignore` keeps out installed packages (`node_modules/`, `venv/`),
  extracted archives, fetched data (`*-states.json`, `*.pkl`) and big generated files. Add new patterns there
  when a tool produces such files. The user decides whether to commit the scripts (propose a commit message).
- **Relative paths.** Resolve the repo from the script (`path.resolve(__dirname, '../..')`,
  `$(cd "$(dirname "$0")/../.." && pwd)`, `os.path.dirname(__file__)`); never hard-code `/home/...`.
- **Never copy a repo script into a tool** — wrap it. Example: `gen-manifest.sh` runs the repository's own
  `flow-space-statics/generate-manifest.sh` with the local path; an old copy once dropped the help-file
  (`quick-help`) entries from `manifest.json`.
- **No secrets.** Read credentials from the project's env files at run time
  (`flow-space-reporting/.env-reporting`); never print them or write them into a tool.
- **Production is read-only.** Database access through the SSH tunnel uses a READ ONLY session; field devices
  are probed with read functions only.
- **Outputs** for the user go to `.previews/` (git-ignored, link them in the reply); one-off throwaway scripts
  may still go to the scratchpad.
- When adding a tool: create `.tools/<name>/README.md`, list the tool below, and tell the user.

## Current tools

| Tool | What it is for | Entry points |
|---|---|---|
| `.tools/diagram-renderer` | Render a mnemoschema with real states exactly as the UI applies them (numbers, units, enums, colorizers, `data-state-eval`); check info-icon placement; regenerate the manifest | `fetch_states.py <site> <out.json>` (prod DB, read-only), `node render.js <site> <states.json> <out.png> [scale] [x0,y0,x1,y1]`, `STATICS=<dir> node render.js …` for an older diagram, `node measure.js <site>`, `bash gen-manifest.sh` |
| `.tools/tia-project` | Read a Siemens TIA Portal project archive without TIA Portal: block SCL code and comments, interface names, network parameters, HMI alarm texts | `pages.py` (decompress `System/PEData.plf` pages), `rhs.py` (syntax tree → SCL text); see its README for what can and cannot be recovered |
| `.tools/device-probes` | Read-only probes of field devices from this machine (was `.sandbox/` until 2026-10-20) | `modbus_register_scan.py HOST PORT [ranges]`, `spring1_modicons_tester.py`, `ek270_tester.py`, Меркурий address scan / energy probe / passive listen, `vzljot026m_tester.py`, `modbus_rtu_dump.js`, БАРС-02 `bars02_session.js` (listens in place of a dispatch server, reads meters through the modems), `bars02_emulator.js` and `reader_via_emulator.js` (a reader direct vs through the gateway); see its README |
| `.tools/flow-chain` | Run a Modbus-node tab offline (converters → join → `collect-device-state`) on words read live by `modbus_rtu_dump.js`; test a new mapping and validate the state against the data schema | `node run_modbus_tab.js TAB_LABEL WORDS.json [--mapping FILE.js] [--schema DATA-SCHEMA.json]` |
| `.tools/xlsx-dump` | Read an `.xlsx` (register maps, customer tables) as text without openpyxl — standard library only | `python3 xlsx_dump.py BOOK.xlsx [--sheet NAME] [--require-col N ...]` |
| `.tools/bundle-size` | Where the UI's start JavaScript comes from: source-map byte totals per package and DevExtreme folder (`grids`, `viz`, `ui`), start chunks or all | `node bundle-size.mjs [--all] [--depth N] [--dist <build>]` (Node 24 in PATH) |

The device readers themselves (`flow-space/src/device-readers/*-client.js`) also run from the command line
with a frame trace (`node <client>.js <host> <port> <address>`) — the first tool for probing a meter.

## Setup notes

- Renderer: `npm install` in `.tools/diagram-renderer`; it launches the Chromium headless shell already in
  `~/.cache/ms-playwright` (`chromium_headless_shell-1243`) with `--no-proxy-server`. If that build is gone,
  `npx playwright install chromium-headless-shell` and update the path in `render.js`/`measure.js`.
- TIA reader: `python3 -m venv venv && venv/bin/pip install py7zr openpyxl`; extract the archive into the tool
  folder (ignored). `strings` drops Cyrillic — decode texts in Python (UTF-8 / UTF-16).
- `fetch_states.py` needs the SSH tunnel (`tunnel.sh`) for `localhost:35432`.
