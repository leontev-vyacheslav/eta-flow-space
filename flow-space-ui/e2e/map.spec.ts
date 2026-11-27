import { test, expect, devices, type Page } from '@playwright/test';
import type { DeviceModel } from '../src/models/flows/device-model';
import { collectPageErrors, signIn } from './helpers';

const kamskoye = 'пгт. Камское Устье';
const kazan = 'г. Казань';
const allLocalities = 'Все населённые пункты';

async function chooseLocality(page: Page, text: string) {
    await page.locator('.map-locality-filter .dx-dropdowneditor-button').click();
    await page.locator('.dx-dropdownlist-popup-wrapper .dx-list-item').getByText(text, { exact: true }).click();
    await expect(page.locator('.dx-dropdownlist-popup-wrapper')).toBeHidden();
}

async function expectLocality(page: Page, text: string, value: string | null, deviceList: DeviceModel[]) {
    const selector = page.getByRole('combobox', { name: 'Населённый пункт' });
    // DevExtreme can show the all-localities caption as its placeholder for a null value.
    await expect.poll(async () => {
        const inputValue = await selector.inputValue();
        const placeholder = page.locator('.map-locality-filter .dx-placeholder');
        return inputValue || (await placeholder.isVisible() ? await placeholder.getAttribute('data-dx_placeholder') : '');
    }).toBe(text);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('mapLocality'))).toBe(JSON.stringify(value));
    const visibleDevices = deviceList.filter(device => device.objectLocation
        && (value === null || (device.objectLocation.locality ?? '') === value));
    const flowsAtLocations = new Set(visibleDevices.map(device =>
        `${device.flowId}:${device.objectLocation!.latitude}:${device.objectLocation!.longitude}`));
    const markers = page.locator('.leaflet-marker-icon');
    await expect(markers).toHaveCount(flowsAtLocations.size);
    await expect(page.locator('.leaflet-zoom-anim')).toHaveCount(0);
    for (const marker of await markers.all()) {
        await expect(marker).toBeInViewport();
    }
}

for (const phone of [false, true]) {
    test.describe(phone ? 'phone map' : 'desktop map', () => {
        test.use(phone
            ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, userAgent: devices['Pixel 7'].userAgent }
            : { viewport: { width: 1440, height: 900 } });

        test('changing locality closes the device popup and preserves the chosen place', async ({ page }, testInfo) => {
            test.setTimeout(90_000);
            const errors = collectPageErrors(page);
            try {
                await signIn(page);
                const deviceResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/devices'
                    && response.status() === 200);
                await page.goto('/#/map');
                const deviceList = await (await deviceResponse).json() as DeviceModel[];
                const kirov = deviceList.find(device => device.objectLocation?.locality === kamskoye
                    && device.flow?.name === 'Котельная Кирова');
                expect(kirov, 'The verification account must see the Kirov boiler room').toBeDefined();
                const deviceRoute = `/map/${kirov!.flow!.code}/device/${kirov!.id}`;

                await chooseLocality(page, kamskoye);
                await expectLocality(page, kamskoye, kamskoye, deviceList);
                const tooltip = page.locator('.leaflet-tooltip').getByText('Котельная Кирова', { exact: true });
                await expect(tooltip).toHaveCount(1);
                const tooltipId = await tooltip.locator('..').getAttribute('id');
                const marker = page.locator(`.leaflet-marker-icon[aria-describedby="${tooltipId}"]`);
                if (phone) {
                    await marker.tap();
                } else {
                    await marker.click();
                }
                await expect(page).toHaveURL(url => url.hash === `#${deviceRoute}`);
                await expect(page.locator('.leaflet-popup')).toBeVisible();
                await expect(page.locator('.leaflet-popup .popup-skeleton')).toHaveCount(0);

                await chooseLocality(page, kazan);
                await expect(page).toHaveURL(/#\/map$/);
                await expectLocality(page, kazan, kazan, deviceList);
                await expect(page.locator('.leaflet-popup')).toHaveCount(0);
                await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible();
                await expect(page.locator('.leaflet-tile:not(.leaflet-tile-loaded)')).toHaveCount(0);
                const screenshot = testInfo.outputPath('kazan-after-popup.png');
                await page.screenshot({ path: screenshot });
                await testInfo.attach('kazan-after-popup', { path: screenshot, contentType: 'image/png' });

                // Back is a device-route selection outside the filter. It must reveal that device,
                // and the programmatic selector update must leave the device route intact.
                await page.goBack();
                await expect(page).toHaveURL(url => url.hash === `#${deviceRoute}`);
                await expect(page.getByRole('combobox', { name: 'Населённый пункт' })).toHaveValue(allLocalities);
                await expect(page.locator('.leaflet-popup')).toBeVisible();
                await expect(page.locator('.leaflet-popup')).toContainText(`[${kirov!.id}]`);

                await chooseLocality(page, kazan);
                await expectLocality(page, kazan, kazan, deviceList);
                await expect(page.locator('.leaflet-popup')).toHaveCount(0);
                await page.reload();
                await expectLocality(page, kazan, kazan, deviceList);
                await expect(page.locator('.leaflet-popup')).toHaveCount(0);

                await chooseLocality(page, allLocalities);
                await expectLocality(page, allLocalities, null, deviceList);
                await page.reload();
                await expectLocality(page, allLocalities, null, deviceList);

                // A saved locality removed from the available list still falls back to all.
                await page.evaluate(() => localStorage.setItem('mapLocality', JSON.stringify('__removed_locality__')));
                await page.reload();
                await expectLocality(page, allLocalities, null, deviceList);
                if (!phone) {
                    const selector = page.getByRole('combobox', { name: 'Населённый пункт' });
                    await selector.fill('Казань');
                    await expect(page.locator('.dx-dropdownlist-popup-wrapper .dx-list-item')).toHaveCount(1);
                    await selector.press('ArrowDown');
                    await selector.press('Enter');
                    await expectLocality(page, kazan, kazan, deviceList);
                }
                expect(errors).toEqual([]);
            } finally {
                await page.goto('/#/logout');
                await expect(page.locator('input[type=password]')).toBeVisible();
            }
        });
    });
}
