import { test, expect, devices, type Locator, type Page } from '@playwright/test';
import { collectPageErrors } from './helpers';

// This dashboard has a controller and two linked meters, so its graphs menu has a second level.
const dashboardPath = process.env.E2E_MENU_PATH ?? '/#/spring2-boiler-room/device/9';

async function openDashboardMenu(page: Page) {
    await page.goto(dashboardPath);
    await expect(page.locator('svg [data-state]').first()).toBeVisible({ timeout: 30_000 });
    await page.locator('.main-menu').last().getByRole('menuitem').last().click();
    const panel = page.locator('.main-menu-popup.dx-overlay-content:visible > .dx-submenu');
    await expect(panel).toBeVisible();
    return panel;
}

async function nestedMenu(panel: Locator) {
    const submenu = panel.getByText('Графики...', { exact: true })
        .locator('xpath=ancestor::*[@role="menuitem"][1]')
        .locator(':scope > .dx-submenu');
    await expect(submenu).toBeVisible();
    await expect(submenu).toHaveCSS('transition-duration', '0s');
    return submenu;
}

async function expectInsideViewport(panel: Locator, page: Page) {
    const rect = await panel.boundingBox();
    const viewport = page.viewportSize()!;
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.y).toBeGreaterThanOrEqual(0);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width);
    expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
}

for (const width of [1400, 768]) {
    test(`dashboard submenu opens beside its parent the first time at ${width}px`, async ({ page }, testInfo) => {
        const errors = collectPageErrors(page);
        await page.setViewportSize({ width, height: 900 });
        const panel = await openDashboardMenu(page);
        await panel.getByText('Графики...', { exact: true }).hover();
        const submenu = await nestedMenu(panel);

        const expectBesideParent = async () => {
            const parent = (await panel.boundingBox())!;
            const child = (await submenu.boundingBox())!;
            expect(child.x + child.width <= parent.x + 1 || child.x >= parent.x + parent.width - 1).toBe(true);
            await expectInsideViewport(submenu, page);
        };
        await expectBesideParent();
        await testInfo.attach('first-opening', { body: await page.screenshot(), contentType: 'image/png' });
        await expectBesideParent();

        // Switching away and back must keep the same correct position.
        await panel.getByText('Обновить...', { exact: true }).hover();
        await expect(submenu).toBeHidden();
        await panel.getByText('Графики...', { exact: true }).hover();
        await nestedMenu(panel);
        await expectBesideParent();

        await page.getByRole('heading', { name: 'Приборная панель' }).click();
        await expect(panel).toBeHidden();

        // The same submenu must also be usable without a pointer.
        await page.locator('.main-menu').last().focus();
        await page.keyboard.press('End');
        await page.keyboard.press('ArrowDown');
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toBeHidden();
        expect(errors).toEqual([]);
    });
}

test('an open dashboard menu closes when resizing between wide and narrow windows', async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.setViewportSize({ width: 1400, height: 900 });
    let panel = await openDashboardMenu(page);
    await panel.getByText('Графики...', { exact: true }).hover();
    await nestedMenu(panel);

    await page.setViewportSize({ width: 390, height: 900 });
    await expect(panel).toBeHidden();
    // The desktop navigation drawer becomes an overlay on phones; dismiss its shade first.
    const drawerShade = page.locator('.dx-drawer-shader');
    if (await drawerShade.isVisible()) {
        const shade = (await drawerShade.boundingBox())!;
        await drawerShade.click({ position: { x: shade.width - 5, y: 10 } });
    }
    await page.locator('.main-menu').last().getByRole('menuitem').last().click();
    panel = page.locator('.main-menu-popup.dx-overlay-content:visible > .dx-submenu');
    await panel.getByText('Графики...', { exact: true }).click();
    await nestedMenu(panel);
    await expectInsideViewport(panel, page);

    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(panel).toBeHidden();
    await page.locator('.main-menu').last().getByRole('menuitem').last().click();
    await panel.getByText('Графики...', { exact: true }).hover();
    const submenu = await nestedMenu(panel);
    const parent = (await panel.boundingBox())!;
    const child = (await submenu.boundingBox())!;
    expect(child.x + child.width).toBeLessThanOrEqual(parent.x + 1);
    await expectInsideViewport(submenu, page);
    expect(errors).toEqual([]);
});

test.describe('touch menus', () => {
    test.use({ hasTouch: true, isMobile: true, userAgent: devices['Pixel 7'].userAgent });

    for (const viewport of [{ width: 390, height: 900 }, { width: 320, height: 568 }, { width: 390, height: 480 }]) {
        test(`phone submenu keeps its original popup layout and selects an item at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
            const errors = collectPageErrors(page);
            await page.setViewportSize(viewport);
            const panel = await openDashboardMenu(page);
            const initialPanel = (await panel.boundingBox())!;
            const initialHelp = (await panel.getByText('Справка...', { exact: true }).boundingBox())!;
            await panel.getByText('Графики...', { exact: true }).tap();
            const submenu = await nestedMenu(panel);

            const expectOriginalPopupLayout = async () => {
                await expectInsideViewport(panel, page);
                const parent = (await panel.boundingBox())!;
                const help = (await panel.getByText('Справка...', { exact: true }).boundingBox())!;
                // The child floats independently instead of expanding the parent and pushing actions down.
                await expect(submenu).toHaveCSS('position', 'absolute');
                expect(parent.height).toBeCloseTo(initialPanel.height, 0);
                expect(parent.width).toBeCloseTo(initialPanel.width, 0);
                expect(help.y).toBeCloseTo(initialHelp.y, 0);
            };
            await expectOriginalPopupLayout();
            await testInfo.attach('original-phone-popup', { body: await page.screenshot(), contentType: 'image/png' });
            await expectOriginalPopupLayout();

            // Following actions stay in their original positions, including on a short screen.
            await expect(panel.getByText('Справка...', { exact: true })).toBeInViewport();

            // Pick a linked meter, which opens a read-only graph dialog and closes the menu.
            await submenu.locator('.dx-menu-item-content').last().tap();
            await expect(panel).toBeHidden();
            const graph = page.locator('.dx-popup-wrapper .dx-overlay-content').filter({ hasText: 'График' });
            await expect(graph.getByText('График', { exact: true })).toBeVisible();
            await graph.locator('.dx-popup-title .main-menu').last().getByRole('menuitem').click();
            await expect(graph).toBeHidden();
            expect(errors).toEqual([]);
        });
    }
});
