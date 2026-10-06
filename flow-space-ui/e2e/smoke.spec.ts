import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers';

// Read-only checks: nothing here changes settings or sends commands to the equipment

test('the diagram shows live values and opens the properties popover', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/');
    await expect(page).toHaveURL(/#\/[^/]+\/device\/\d+$/, { timeout: 30_000 });

    const boundElements = page.locator('svg [data-state]').filter({ visible: true });
    await expect(boundElements.first()).toBeVisible({ timeout: 30_000 });

    // the drawing appears before the device data the popover is built from: click until it opens
    const popover = page.locator('.mnemoschema-popover');
    await expect(async () => {
        await boundElements.first().click();
        await expect(popover.getByText('Свойства')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    // the live value of the clicked element
    await expect(popover.locator('td b').first()).not.toBeEmpty();

    await popover.locator('.popup-close-button').click();
    await expect(popover.getByText('Свойства')).toBeHidden();

    expect(errors).toEqual([]);
});

test('the parameters tab shows the device parameters', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/');
    await expect(page).toHaveURL(/#\/[^/]+\/device\/\d+$/, { timeout: 30_000 });

    // only opened: no field is changed and nothing is saved
    await page.locator('.dx-tab').filter({ hasText: /Параметры/i }).click();
    await expect(page.locator('.dx-form .dx-field-item').first()).toBeVisible({ timeout: 30_000 });

    expect(errors).toEqual([]);
});

test('the map shows the objects', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/map');

    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.leaflet-marker-icon').first()).toBeVisible({ timeout: 30_000 });

    expect(errors).toEqual([]);
});

test('the About page shows the build version', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/#/about');

    await expect(page.locator('.about-app-title')).toContainText(/v\.\d+\.\d+\.\d+\.\d{8}-\d{6}/);

    expect(errors).toEqual([]);
});

test('version.json carries the version the page runs (the new-version notice compares them)', async ({ page, request, baseURL }) => {
    // written by the production build only
    test.skip(new URL(baseURL!).hostname === 'localhost', 'production only');

    const response = await request.get('/version.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toContain('no-cache');
    const { version } = await response.json();

    await page.goto('/#/about');
    await expect(page.locator('.about-app-title')).toContainText(version);
});

test('security headers are sent with the page, the bundles and the static files', async ({ page, request, baseURL }) => {
    // the dev server sends none of them; they come from the nginx configs
    test.skip(new URL(baseURL!).hostname === 'localhost', 'production only');

    await page.goto('/');
    const bundle = await page.locator('script[type=module][src*="/assets/"]').getAttribute('src');
    expect(bundle).toBeTruthy();

    const checks: { path: string, headers: string[] }[] = [
        { path: '/', headers: ['content-security-policy', 'x-content-type-options', 'x-frame-options'] },
        { path: bundle!, headers: ['x-content-type-options', 'x-frame-options'] },
        { path: '/static/manifest.json', headers: ['x-content-type-options'] },
    ];
    for (const { path, headers } of checks) {
        const response = await request.get(path);
        expect(response.status(), path).toBe(200);
        for (const header of headers) {
            expect(response.headers()[header], `${header} of ${path}`).toBeTruthy();
        }
    }
});
