---
name: testing-with-playwright
description: Verify Flow Space web UI interactions and responsive layout in a real browser with Playwright, including screenshots or video as evidence. Use when implementing user-visible behavior or when asked to test the UI yourself.
---

# Testing with Playwright

Test observable behavior in the running `flow-space-ui`. Choose a focused browser scenario that
demonstrates the requested result; a successful build alone does not verify an interaction.
Paths below are relative to the repository root. Run Node and npm commands from `flow-space-ui/`.

## Use the existing setup

Read `flow-space-ui/README.md`, `flow-space-ui/playwright.config.ts`, `flow-space-ui/e2e/helpers.ts`,
and the relevant existing tests before choosing a check. Reuse the installed `@playwright/test`, its Chromium, and the existing
`signIn` and `collectPageErrors` helpers. Resolve the browser through Playwright rather than pinning
a cached Chromium version. Install missing browser dependencies only when needed.

- Reuse a running development server or start `npm run dev`. Use `http://localhost:3000`, since the
  API permits that origin; `127.0.0.1` is not interchangeable. Check readiness and confirm that the
  browser loads the edited local source.
- Follow `.codex/project.md` for the API target. Normally `VITE_API_HOST` in
  `.env.development.local` must point to the production tunnel at `http://localhost:3002`.
  Restart the development server if its environment changes; do not take over an occupied port.
- Load `.env.e2e.local` at runtime; never print its credentials. The Playwright config loads it for
  tests, while a standalone Node script needs `process.loadEnvFile('.env.e2e.local')`.
- Local UI sessions normally use real production data. Keep checks bounded and serial. Opening
  help, reading pages, and signing into a test session are normal verification steps; changing
  settings or sending equipment commands requires authorization for those actions. For a write
  scenario without that authorization, use suitable fixtures or browser request overrides and
  identify that coverage in the result.

Prefer an existing relevant test. For example, from `flow-space-ui/`:

```bash
npx playwright test --project=smoke --grep 'the About page'
```

The current config matches specific test filenames: a new standalone spec is not automatically
included. Check discovery with `--list` when adding a test. Add a durable regression test when it
protects meaningful behavior; a one-off UX check can live in `/tmp` or `.temp/`.

For a standalone script outside the UI directory, resolve installed packages with
`createRequire(resolve(process.cwd(), 'package.json'))` from `node:module`. Import the existing
TypeScript helpers using an absolute file URL; the project's Node version supports type stripping.
Set the browser context's `baseURL`, viewport, and locale explicitly. Do not create another login
implementation or persist session tokens just to pass them between browser contexts; an in-memory
`storageState()` object is sufficient.

## Exercise the behavior

Define the observable success condition before interacting. Open the feature through its normal
UI, then use Playwright clicks, typing, scrolling, or mouse/touch gestures. Do not demonstrate a
feature by calling its internal setter or changing DOM styles to manufacture the expected result.

Wait for the actual content and relevant resources, not an arbitrary long delay. Use locator
assertions and polling for asynchronous results. Collect console errors and uncaught exceptions
from the start of the scenario; investigate errors rather than silently filtering them out.

Check the result after the gesture ends and the UI settles, then after a subsequent relevant
interaction. A transient intermediate state is not a passing result. In particular, for a resizable
DevExtreme popup, measure its bounding box after `mouse.up()`, take the screenshot, and check its
dimensions again. Controlled width/height props can restore the initial size after the drag appears
to succeed. Use actual edge/corner handles and verify both enlargement and shrinking when relevant.

Also exercise nearby behavior affected by the change, such as scrolling the content and closing
the dialog. Check a phone-sized viewport when responsive layout or small-screen behavior is in
scope. Inspect the resulting screenshots for clipping, overflow, and unreachable controls; numeric
assertions alone do not establish a usable layout.

If a check fails, distinguish an incorrect test assumption from a product defect using the actual
DOM, pointer hit target, measured state, and browser errors. When the task includes implementation,
fix relevant defects and repeat the failed scenario. For a verification-only task, report the defect
without assuming authority to change the application.

## Evidence and handoff

Save user-facing screenshots, optional video, and small measurement reports in `.previews/`, using
descriptive filenames. For a change in size or layout, capture comparable before/after views with
the same viewport. Record video when the gesture or timing matters; start recording after sign-in
so credentials do not enter the recording. Keep auth state and traces containing secrets private.

Close browser contexts when finished. Sign out a session created specifically for the check, without
ending an existing user session. If application code changed, also run the appropriate build/lint
checks from `.codex/project.md`; browser verification and those checks cover different failures.

Report the target, interactions tested, settled observations or measurements, and links to the
evidence. Separate existing warnings from new failures. State any missing browser, credentials,
tunnel, fixture-only coverage, or untested behavior plainly; do not describe a check as passed if
it was not executed successfully.
