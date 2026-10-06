import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { authFile } from './e2e/helpers';

// Smoke tests of the running UI (see README.md). The login comes from E2E_LOGIN / E2E_PASSWORD,
// usually kept in .env.e2e.local (git-ignored)
if (existsSync('.env.e2e.local')) {
    process.loadEnvFile('.env.e2e.local');
}

export default defineConfig({
    testDir: 'e2e',
    // results and the report next to the tests (git-ignored)
    outputDir: 'e2e/test-results',
    // the tests run against production (directly or through the dev server's tunnel): one at a time
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 60_000,
    expect: { timeout: 15_000 },
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/playwright-report' }]],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 900 },
        locale: 'ru-RU',
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
    },
    projects: [
        { name: 'sign-in', testMatch: /auth\.setup\.ts/ },
        { name: 'smoke', testMatch: /smoke\.spec\.ts/, dependencies: ['sign-in'], use: { storageState: authFile } },
        // last: signing out ends the session on the server
        { name: 'sign-out', testMatch: /sign-out\.spec\.ts/, dependencies: ['smoke'] },
    ],
});
