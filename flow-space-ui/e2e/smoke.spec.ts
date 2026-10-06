import { test, expect } from '@playwright/test';
import { collectPageErrors } from './helpers';

// Read-only checks: nothing here changes settings or sends commands to the equipment

test('the diagram shows live values and opens the properties popover', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.goto('/');
    await expect(page).toHaveURL(/#\/[^/]+\/device\/\d+$/, { timeout: 30_000 });

    const boundElements = page.locator('svg [data-state]').filter({ visible: true });
    await expect(boundElements.first()).toBeVisible({ timeout: 30_000 });
    // values are written into the diagram once the device state arrives
    await expect(page.locator('svg text').filter({ hasText: /\d/ }).first()).toBeVisible();

    await boundElements.first().click();
    const popover = page.locator('.mnemoschema-popover');
    await expect(popover.getByText('Свойства')).toBeVisible();
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
