import { expect, type Page } from '@playwright/test';

// the signed-in session shared by the smoke tests (git-ignored)
export const authFile = 'e2e/.auth/user.json';

export function credentials() {
    const login = process.env.E2E_LOGIN;
    const password = process.env.E2E_PASSWORD;
    if (!login || !password) {
        throw new Error('Set E2E_LOGIN and E2E_PASSWORD (e.g. in .env.e2e.local)');
    }

    return { login, password };
}

export async function signIn(page: Page) {
    const { login, password } = credentials();
    await page.goto('/');
    await page.locator('input[type=password]').waitFor();
    await page.locator('input:not([type=hidden])').first().fill(login);
    await page.locator('input[type=password]').fill(password);
    await page.keyboard.press('Enter');
    // after sign-in the app opens the first device of the account
    await expect(page).toHaveURL(/#\/[^/]+\/device\/\d+$/, { timeout: 30_000 });
}

// errors in the browser console (Content-Security-Policy violations included) and uncaught exceptions
export function collectPageErrors(page: Page): string[] {
    const errors: string[] = [];
    page.on('console', message => {
        if (message.type() === 'error') {
            errors.push(message.text());
        }
    });
    page.on('pageerror', error => errors.push(error.message));

    return errors;
}
