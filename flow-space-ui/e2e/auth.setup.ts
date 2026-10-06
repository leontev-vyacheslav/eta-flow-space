import { test as setup } from '@playwright/test';
import { authFile, signIn } from './helpers';

setup('sign-in lands on a device', async ({ page }) => {
    await signIn(page);
    // the smoke tests reuse this session (the access token and the refresh-token cookie)
    await page.context().storageState({ path: authFile });
});
