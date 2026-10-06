import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('sign-out ends the session', async ({ page }) => {
    // its own session, so the one the smoke tests used is not affected
    await signIn(page);

    await page.goto('/#/logout');
    await expect(page.locator('input[type=password]')).toBeVisible();

    // the refresh-token cookie no longer works: a reload stays on the sign-in form
    await page.reload();
    await expect(page.locator('input[type=password]')).toBeVisible();
    await expect(page).not.toHaveURL(/\/device\//);
});
