# Flow Space UI

Web dashboard of the Eta Flow Space platform (FlowSpace ETA24™): boiler room diagrams with live
values and alarms, device parameters and control, a map of the objects, and PDF reports.

## Stack

- **React 19** + **TypeScript**, built with **Vite**
- **DevExtreme 23.1** - UI components (grids, forms, popups, charts)
- **zustand** - auth and app settings stores
- **axios** - HTTP client
- **Leaflet** / **react-leaflet** - the objects map

## Development

Node.js 24 (`.nvmrc`; with nvm: `nvm use`), the same version the Docker build uses.

```bash
npm install --legacy-peer-deps
npm run dev            # http://localhost:3000
```

The dev server talks to the API on `http://localhost:3002`. That port is the developer SSH tunnel
(`../tunnel.sh` starts and stops it) to the production gateway, so **the dev UI works with production
data**: sign-in, device states, settings and reports are real.

- Open the UI as `http://localhost:3000`, not `127.0.0.1`: the API only allows the `localhost` origin.
- Diagrams and their plugins (`/static/devices/<device code>/`) come from production too, so a local
  change in `../flow-space-statics` is not visible in the dev UI until it is deployed.
- To work on reports against a local `flow-space-reporting`, create `.env.development.local`
  (not committed) and restart `npm run dev`:

  ```bash
  VITE_REPORTING_HOST=http://localhost:8000/api
  ```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot reload on port 3000 |
| `npm run build` | Type check (`tsc -b`) and production build into `dist/` |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build locally |
| `npm run e2e` | Smoke tests in a headless browser (see below) |

## Smoke tests

A quick check that the site works, meant to be run after every deployment. The tests sign in, open a
diagram and its properties popover, the parameters tab, the map and the About page, fail on any browser
console error (Content-Security-Policy violations included), check the security headers, and sign out.
They are **read-only**: they never change settings or send commands to the equipment.

Once per machine:

```bash
npx playwright install chromium                # the browser, into ~/.cache/ms-playwright
npx playwright install-deps chromium           # its system libraries (Linux / WSL); asks for the sudo password
```

The login is read from `.env.e2e.local` (git-ignored, like every `*.local` file):

```bash
E2E_LOGIN=...
E2E_PASSWORD=...
```

Run:

```bash
E2E_BASE_URL=https://eta24.ru:3000 npm run e2e   # production, after a deployment
npm run e2e                                      # the dev server (npm run dev); the header check is skipped
npx playwright test --ui                         # interactive: watch the steps, rerun one test
npm run e2e:report                               # report of the last run: screenshot and trace of a failure
```

The tests are in `e2e/`, the settings in `playwright.config.ts`; each run writes its report to
`e2e/playwright-report/` and the failure screenshots and traces to `e2e/test-results/` (both git-ignored).

## Build and deployment

The production image (`Dockerfile.ui`) builds the app and serves `dist/` with nginx (`nginx.conf`).
The gateway in front of it (`../nginx.conf`) serves the UI and the API on one address
(`https://eta24.ru:3000`), so a production build calls the API on its own origin.

```bash
docker compose up -d --build eta-flow-space-ui     # from the repository root
```

- **Version:** `vite.config.ts` generates it at build time
  (`v.<package.json version>.<YYYYMMDD-HHMMSS Moscow time>[-<git commit>]`); it is shown on the About page.
  The commit is missing in the Docker build, which has no `.git`.
- **Caching:** `index.html` is revalidated on every load, while the hashed bundles in `assets/` are cached for a
  year. A tab opened before a deployment still asks for the old lazy chunks; when one is gone, `src/main.tsx`
  reloads the page once to pick up the new build.
- **Security headers:** a location with its own `add_header` in `nginx.conf` does not inherit the server-level
  ones, so they are repeated there. The Content-Security-Policy is sent by the gateway (no `eval`, no inline or
  foreign scripts).

## Diagrams

A device's diagram (mnemoschema) is an SVG with a plugin script and stylesheet, kept in
`../flow-space-statics/devices/<device code>/` and loaded at run time. Elements with a `data-state` attribute show
values from the device state and open the properties popover on click. Files are fetched with the hash from
`../flow-space-statics/manifest.json` as a cache buster, so run `generate-manifest.sh` there after changing them.

## Project Structure

```
flow-space-ui/
├── src/
│   ├── components/      # Shared components and dialogs (graphs, emergency log, ...)
│   ├── constants/       # API routes, app routes, navigation, icons, constants
│   ├── contexts/        # Auth and settings stores, data access (app-data/), emergency polling
│   ├── helpers/         # State formatting, data schema helpers, map helpers
│   ├── layouts/         # Side navigation layout, single card layout (sign-in)
│   ├── models/          # Types
│   ├── pages/           # Dashboard (diagram, parameters, control), map, reports, about, sign-out
│   ├── services/        # Alarm sound mute manager
│   ├── themes/          # DevExtreme theme
│   ├── utils/           # Dialogs, notifications, Excel export
│   ├── app.tsx          # Providers and the hash router
│   └── main.tsx         # Entry point
├── e2e/                 # Smoke tests (Playwright)
├── Dockerfile.ui        # Production image: build, then nginx
├── nginx.conf           # nginx config of the UI container
├── playwright.config.ts # Smoke test settings
└── vite.config.ts       # Build config, build-time version
```
