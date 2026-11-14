# Eta Flow Space project guidance

## Project context

This repository monitors boiler rooms and meters. Node-RED A/B/C share readers from
`flow-space-nodered-a/src/`; Redis holds current state, the NestJS API stores history and evaluates
alarms, PostgreSQL holds persistent data, React/Vite serves the dashboard, and FastAPI generates PDFs.
Device codes join database rows, Node-RED mappings and `flow-space-statics/devices/<code>/`.

Read the relevant component README and existing implementation before changing it. Consult
`docker-compose.yaml` for actual service ownership; C's README currently duplicates B's.
The local UI normally uses production data through an SSH tunnel. Keep production reads bounded;
local development is not an isolated hardware or database environment.
For UI screenshots and graph previews, use the production Web API through the developer SSH tunnel
at `http://localhost:3002` (`ssh-tunnel` user service). Preview undeployed schema changes with browser
request overrides for the edited local static files while keeping API/history requests on the tunnel.
Before working with production data, check `flow-space-ui/.env.development.local` and set
`VITE_API_HOST=http://localhost:3002`; a local API override on port `3001` takes precedence over the
default in `app-api-routes.ts`. Ensure Vite reloads the environment after changing it.
Save screenshots in `.previews/` and use the configured E2E credentials without printing them.

## Project skills

The index includes project-specific skills and adaptations of the surviving `.claude/skills/` and
English command. Legacy source files remain unchanged. Codex guidance and skills live in `.codex/`.
Treat this index as project-local skill discovery: read the matching
`SKILL.md` when its trigger applies; do not load every skill for every task. Relative paths in skill
instructions refer to the repository root unless the link or instruction says otherwise.

| Skill | When to read it | Instructions |
|---|---|---|
| meter-integration | Add, replace, move or rename a meter across components | [SKILL.md](skills/meter-integration/SKILL.md) |
| device-reader-raw | Implement or rework a protocol reader | [SKILL.md](skills/device-reader-raw/SKILL.md) |
| device-state-mapping | Change collected state, units, channels or history compatibility | [SKILL.md](skills/device-state-mapping/SKILL.md) |
| diagram-state-binding | Bind SVG diagram properties, arrange popovers and alarm panels, or match hover feedback | [SKILL.md](skills/diagram-state-binding/SKILL.md) |
| project-tools | Render diagrams, regenerate manifests, probe devices or reuse helper scripts | [SKILL.md](skills/project-tools/SKILL.md) |
| testing-with-playwright | Implement or verify web UI interactions and responsive layout; capture browser evidence | [SKILL.md](skills/testing-with-playwright/SKILL.md) |
| commit-message | Finish project changes or propose a commit subject | [SKILL.md](skills/commit-message/SKILL.md) |
| english-review | User requests English feedback or the former /english workflow | [SKILL.md](skills/english-review/SKILL.md) |

## Change conventions

- Use braced statement blocks for JavaScript/TypeScript control flow, including single-statement
  `if`, `else`, and loop bodies.

- Keep protocol values raw in readers; site mappings choose channels, units and semantic names.
- Preserve Node-RED ids and shared subflow definitions. One gateway has one polling instance;
  connection locks do not coordinate across instances. Review function changes with
  `python3 flow-space-nodered-a/flows-diff.py` and inspect its usage for another instance.
- Preserve existing SVG line endings and JSON formatting. After statics changes run
  `bash .tools/diagram-renderer/gen-manifest.sh`; render visual changes with the existing tools.
- Follow `database/README.md` for migrations, reference schema and ORM updates. Prepared migrations
  remain unapplied until verified; never infer production status from the presence of a file.
- Prepare changes locally within the user's scope. These skills do not independently authorize
  production deployment, migrations, equipment commands, listener takeover or container restarts.
- Keep helpers with repeatable project use in `.tools/<name>/`, with a README and an entry in the
  `project-tools` index. Reserve `/tmp` for disposable experiments.
- Propose a concise commit subject after changes. The user normally commits; commit only when asked.

## Verification

Use checks appropriate to the affected component:

- UI: `npm run build`, `npm run lint` in `flow-space-ui`; Playwright smoke tests when needed.
  Use `testing-with-playwright` to verify interaction and responsive-layout changes in the browser.
  Smoke tests require configured credentials and a running target; do not print credentials.
- API: `npm run build`, focused `npm test -- --runInBand` in `flow-space-web-api`.
  Its `npm run lint` includes `--fix` and modifies files; use ESLint without `--fix` for inspection.
- Readers/mappings: existing local emulators, subflow runner and offline flow-chain tools;
  authorized live checks where hardware behavior matters. Report offline/live coverage separately.
- Database: a disposable PostgreSQL instance with representative rows; repeat idempotent data fixes.

Do not run production services merely to explore the repository. Report checks actually run and
material verification gaps.
