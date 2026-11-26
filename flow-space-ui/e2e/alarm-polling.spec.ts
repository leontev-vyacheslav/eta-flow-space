import { test, expect, type Page, type Request, type Route } from '@playwright/test';
import { collectPageErrors } from './helpers';

test.skip(process.env.E2E_ALARM_POLLING !== '1', 'Opt in on a local Vite server; all API responses are synthetic');

const alarm = (description = 'Test connection alarm') => [{
    deviceId: 1, timestamp: 1_795_680_000_000, reasons: [{ id: 100, description }],
}];
const reply = (route: Route, description?: string) => route.fulfill({ json: alarm(description) });
type Handler = (route: Route) => Promise<unknown> | void;

async function openFixture(page: Page, handlers: { alarm?: Handler; refresh?: Handler; health?: Handler; signOut?: Handler; signIn?: Handler } = {}) {
    const errors = collectPageErrors(page);
    const activeAlarms = new Set<Request>();
    const activeRefreshes = new Set<Request>();
    const stats = { alarms: 0, refreshes: 0, peakAlarms: 0, peakRefreshes: 0, activeAlarms, activeRefreshes, errors };
    page.on('request', request => {
        const path = new URL(request.url()).pathname;
        if (path === '/api/emergency-states') {
            stats.alarms++;
            activeAlarms.add(request);
            stats.peakAlarms = Math.max(stats.peakAlarms, activeAlarms.size);
        } else if (path === '/refresh') {
            stats.refreshes++;
            activeRefreshes.add(request);
            stats.peakRefreshes = Math.max(stats.peakRefreshes, activeRefreshes.size);
        }
    });
    const finished = (request: Request) => { activeAlarms.delete(request); activeRefreshes.delete(request); };
    page.on('requestfinished', finished);
    page.on('requestfailed', finished);
    await page.addInitScript(() => {
        localStorage.setItem('@userAuthData', JSON.stringify({ login: 'fixture', role: 'viewer', accessToken: 'test-token' }));
    });
    // Browser fixture imports the real provider, HTTP wrapper and auth store from this checkout.
    // No API call, token or login is sent to production.
    await page.route('**/*', async route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/emergency-states') {
            return handlers.alarm ? handlers.alarm(route) : reply(route);
        }
        if (path === '/refresh') {
            return handlers.refresh ? handlers.refresh(route) : route.fulfill({ json: { accessToken: 'fresh-test-token' } });
        }
        if (path === '/health-check') {
            return handlers.health ? handlers.health(route) : route.fulfill({ json: { message: 'healthy' } });
        }
        if (path === '/sign-out') {
            return handlers.signOut ? handlers.signOut(route) : route.fulfill({ json: {} });
        }
        if (path === '/sign-in' && handlers.signIn) {
            return handlers.signIn(route);
        }
        if (path === '/static/manifest.json') {
            return route.fulfill({ json: {} });
        }
        if (path.startsWith('/api/') || path.startsWith('/static/') || path === '/sign-in') {
            throw new Error(`Unexpected fixture API request: ${path}`);
        }
        await route.continue();
    });
    const time = new Date('2026-11-26T09:00:00Z');
    await page.clock.install({ time });
    await page.goto('/e2e/fixtures/alarm-polling.html');
    // Let Vite/React finish cold startup before freezing time or mounting the poller.
    await expect(page.getByRole('button', { name: 'Start provider' })).toBeVisible();
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 1000));
    await page.getByRole('button', { name: 'Start provider' }).click();
    await expect.poll(() => stats.alarms).toBeGreaterThan(0);
    return stats;
}

async function assertBounded(page: Page, stats: Awaited<ReturnType<typeof openFixture>>) {
    expect(stats.peakAlarms).toBeLessThanOrEqual(1);
    expect(stats.peakRefreshes).toBeLessThanOrEqual(1);
    // These HTTP/network errors are deliberately injected; uncaught JS errors are still failures.
    expect(stats.errors.filter(message => !/Failed to load resource:.*(?:401|503|ERR_INTERNET_DISCONNECTED)/.test(message))).toEqual([]);
    await expect(page.locator('#warning-count')).not.toBeEmpty();
    await test.info().attach('polling-traffic', {
        body: JSON.stringify({
            alarmRequests: stats.alarms,
            peakPendingAlarmRequests: stats.peakAlarms,
            tokenRefreshRequests: stats.refreshes,
            peakPendingTokenRefreshRequests: stats.peakRefreshes,
            outageWarnings: Number(await page.locator('#warning-count').textContent()),
        }),
        contentType: 'application/json',
    });
}

test('concurrent refreshes share one request and the next poll waits for completion', async ({ page }) => {
    const held: Route[] = [];
    const stats = await openFixture(page, { alarm: route => { held.push(route); } });
    await page.getByRole('button', { name: 'Refresh three times' }).click();
    await expect(page.getByTestId('same-promise')).toHaveText('true');
    await page.clock.runFor(9000);
    expect(stats.alarms).toBe(1);
    await reply(held[0]);
    await expect(page.locator('#processed-count')).toHaveText('1');
    await page.clock.runFor(29_999);
    expect(stats.alarms).toBe(1);
    await page.clock.runFor(1);
    await expect.poll(() => stats.alarms).toBe(2);
    await assertBounded(page, stats);
});

test('timeouts retain existing alarms, warn once per outage, and recover', async ({ page }) => {
    let stalled = false;
    const stats = await openFixture(page, { alarm: route => stalled ? undefined : reply(route) });
    await expect(page.locator('#processed-count')).toHaveText('1');
    const icon = page.locator('[data-emergency-icon-container="1"] svg').first();
    await expect(icon).toBeVisible();
    stalled = true;
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.clock.runFor(30_000);
        await expect.poll(() => stats.activeAlarms.size).toBe(1);
        await page.clock.runFor(10_001);
        await expect.poll(() => stats.activeAlarms.size).toBe(0);
        await expect(page.locator('#processed-count')).toHaveText('1');
        await expect(page.locator('#warning-count')).toHaveText('1');
        await expect(icon).toBeVisible();
        if (attempt === 0) {
            await page.clock.runFor(400);
            await expect(page.locator('.dx-toast-message')).toContainText('Отображаются последние полученные данные.');
            await expect(page.locator('.dx-toast-content')).toHaveCSS('opacity', '1');
            await test.info().attach('outage-warning', { body: await page.screenshot(), contentType: 'image/png' });
        }
    }
    stalled = false;
    await page.clock.runFor(30_000);
    await expect(page.locator('#processed-count')).toHaveText('2');
    stalled = true;
    await page.clock.runFor(30_000);
    await expect.poll(() => stats.activeAlarms.size).toBe(1);
    await page.clock.runFor(10_001);
    await expect(page.locator('#warning-count')).toHaveText('2');
    await assertBounded(page, stats);
});

test('network failure recovers on the next poll without reloading', async ({ page }) => {
    let offline = true;
    const stats = await openFixture(page, { alarm: route => offline ? route.abort('internetdisconnected') : reply(route) });
    await expect(page.locator('#warning-count')).toHaveText('1');
    offline = false;
    await page.clock.runFor(30_000);
    await expect(page.locator('#processed-count')).toHaveText('1');
    await assertBounded(page, stats);
});

test('stopping the provider cancels its request and prevents late results or further polls', async ({ page }) => {
    const held: Route[] = [];
    const stats = await openFixture(page, { alarm: route => { held.push(route); } });
    await page.getByRole('button', { name: 'Stop provider' }).click();
    await expect.poll(() => stats.activeAlarms.size).toBe(0);
    await page.clock.runFor(90_000);
    expect(stats.alarms).toBe(1);
    await expect(page.locator('#processed-count')).toHaveText('0');
    await expect(page.locator('#warning-count')).toHaveText('0');
    await page.getByRole('button', { name: 'Start provider' }).click();
    await expect.poll(() => stats.alarms).toBe(2);
    await reply(held[1], 'Current alarm');
    await expect(page.locator('#processed-count')).toHaveText('1');
    await reply(held[0], 'Late obsolete alarm').catch(() => {});
    await page.clock.runFor(100);
    await expect(page.locator('#processed-count')).toHaveText('1');
    await assertBounded(page, stats);
});

test('logout stops polling immediately even if cookie revocation stalls', async ({ page }) => {
    const stats = await openFixture(page, { alarm: () => {}, signOut: () => {} });
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByTestId('signed-out')).toBeVisible();
    await expect.poll(() => stats.activeAlarms.size).toBe(0);
    await page.clock.runFor(90_000);
    expect(stats.alarms).toBe(1);
    await expect(page.locator('#processed-count')).toHaveText('0');
    await expect(page.locator('#warning-count')).toHaveText('0');
    await assertBounded(page, stats);
});

test('stalled token refresh is bounded and a later poll can refresh successfully', async ({ page }) => {
    let stalled = true;
    const stats = await openFixture(page, {
        alarm: route => route.request().headers().authorization === 'Bearer fresh-test-token'
            ? reply(route) : route.fulfill({ status: 401, json: {} }),
        refresh: route => stalled ? undefined : route.fulfill({ json: { accessToken: 'fresh-test-token' } }),
    });
    await expect.poll(() => stats.activeRefreshes.size).toBe(1);
    await page.clock.runFor(10_001);
    await expect.poll(() => stats.activeRefreshes.size).toBe(0);
    await expect(page.locator('#warning-count')).toHaveText('1');
    await expect(page.getByTestId('signed-out')).toHaveCount(0);
    stalled = false;
    await page.clock.runFor(30_000);
    await expect(page.locator('#processed-count')).toHaveText('1');
    expect(stats.refreshes).toBe(2);
    await assertBounded(page, stats);
});

test('alarm deadline releases its waiter while another caller shares token refresh', async ({ page }) => {
    let initial: Route | undefined;
    let refresh: Route | undefined;
    const stats = await openFixture(page, {
        alarm: route => { initial = route; },
        refresh: route => { refresh = route; },
        health: route => route.request().headers().authorization === 'Bearer fresh-test-token'
            ? route.fulfill({ json: { message: 'healthy' } }) : route.fulfill({ status: 401, json: {} }),
    });
    await page.clock.runFor(6000);
    await initial!.fulfill({ status: 401, json: {} });
    await expect.poll(() => stats.refreshes).toBe(1);
    await page.getByRole('button', { name: 'Read health' }).click();
    await expect(page.getByTestId('health')).toHaveText('pending');
    await page.clock.runFor(4001);
    await expect(page.locator('#warning-count')).toHaveText('1');
    expect(stats.activeRefreshes.size).toBe(1);
    expect(stats.refreshes).toBe(1);
    await refresh!.fulfill({ json: { accessToken: 'fresh-test-token' } });
    await expect(page.getByTestId('health')).toHaveText('healthy');
    expect(stats.alarms).toBe(1);
    await expect(page.locator('#processed-count')).toHaveText('0');
    await assertBounded(page, stats);
});

test('logout cancels shared refresh and a late answer cannot restore the session', async ({ page }) => {
    let refresh: Route | undefined;
    const stats = await openFixture(page, {
        alarm: route => route.fulfill({ status: 401, json: {} }),
        refresh: route => { refresh = route; },
    });
    await expect.poll(() => stats.activeRefreshes.size).toBe(1);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByTestId('signed-out')).toBeVisible();
    await expect.poll(() => stats.activeRefreshes.size).toBe(0);
    await refresh!.fulfill({ json: { accessToken: 'late-test-token' } }).catch(() => {});
    await page.clock.runFor(90_000);
    expect(await page.evaluate(() => localStorage.getItem('@userAuthData'))).toBeNull();
    expect(stats.alarms).toBe(1);
    await expect(page.locator('#processed-count')).toHaveText('0');
    await expect(page.locator('#warning-count')).toHaveText('0');
    await assertBounded(page, stats);
});

test('the same alarm deadline also covers the authenticated retry', async ({ page }) => {
    let refresh: Route | undefined;
    const stats = await openFixture(page, {
        alarm: route => route.request().headers().authorization === 'Bearer fresh-test-token'
            ? undefined : route.fulfill({ status: 401, json: {} }),
        refresh: route => { refresh = route; },
    });
    await expect.poll(() => stats.refreshes).toBe(1);
    await page.clock.runFor(6000);
    await refresh!.fulfill({ json: { accessToken: 'fresh-test-token' } });
    await expect.poll(() => stats.activeAlarms.size).toBe(1);
    await page.clock.runFor(4001);
    await expect.poll(() => stats.activeAlarms.size).toBe(0);
    await expect(page.locator('#warning-count')).toHaveText('1');
    await expect(page.getByTestId('signed-out')).toHaveCount(0);
    await assertBounded(page, stats);
});

test('a rejected refresh still signs out and stops polling', async ({ page }) => {
    const stats = await openFixture(page, {
        alarm: route => route.fulfill({ status: 401, json: {} }),
        refresh: route => route.fulfill({ status: 401, json: {} }),
    });
    await expect(page.getByTestId('signed-out')).toBeVisible();
    await page.clock.runFor(90_000);
    expect(stats.alarms).toBe(1);
    expect(stats.refreshes).toBe(1);
    await expect(page.locator('#processed-count')).toHaveText('0');
    await expect(page.locator('#warning-count')).toHaveText('0');
    await assertBounded(page, stats);
});

for (const completion of ['response', 'timeout']) {
    test(`a new sign-in waits for bounded cookie revocation: ${completion}`, async ({ page }) => {
        let signOut: Route | undefined;
        let signIns = 0;
        const stats = await openFixture(page, {
            signOut: route => { signOut = route; },
            signIn: route => {
                signIns++;
                return route.fulfill({ json: { login: 'fixture-again', role: 'viewer', accessToken: 'new-session-token' } });
            },
        });
        await expect(page.locator('#processed-count')).toHaveText('1');
        await page.getByRole('button', { name: 'Sign out', exact: true }).click();
        await expect(page.getByTestId('signed-out')).toBeVisible();
        await page.getByRole('button', { name: 'Sign in again' }).click();
        expect(signIns).toBe(0);
        await page.clock.runFor(5000);
        expect(signIns).toBe(0);
        if (completion === 'response') {
            await signOut!.fulfill({ json: {} });
        } else {
            await page.clock.runFor(5001);
        }
        await expect(page.getByTestId('current-login')).toHaveText('fixture-again');
        expect(signIns).toBe(1);
        await assertBounded(page, stats);
    });
}
