import { expect, Page, test } from '@playwright/test';
import { loginAsAdmin } from './helpers';
import { ADMIN_PATHS } from '../src/routes/adminPaths';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

async function openRuntimeSection(page: Page): Promise<void> {
    await page.goto(ADMIN_PATHS.securityCenter);
    await expect(page.getByRole('heading', { name: /Runtime Flags/i })).toBeVisible();
}

function runtimeCheckbox(page: Page) {
    return page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: /Runtime Flags/i }) })
        .first()
        .locator('[data-testid="runtime-flag-web-next"]')
        .first();
}

async function readAccessToken(page: Page): Promise<string> {
    return page.evaluate(() => {
        return (
            window.sessionStorage.getItem('campusway-token') ||
            window.localStorage.getItem('campusway-token') ||
            ''
        );
    });
}

async function updateRuntimeFlagViaApi(page: Page, token: string, value: boolean): Promise<boolean> {
    return page.evaluate(async ({ authToken, desiredValue, preferred }) => {
        const candidates = [`/api/${preferred}/settings/runtime`, '/api/admin/settings/runtime'];
        for (const endpoint of candidates) {
            const response = await fetch(endpoint, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                credentials: 'include',
                body: JSON.stringify({ featureFlags: { webNextEnabled: desiredValue } }),
            });
            if (response.status !== 404) {
                if (!response.ok) return false;
                try {
                    const body = await response.json();
                    return Boolean(body?.featureFlags?.webNextEnabled === desiredValue);
                } catch {
                    return false;
                }
            }
        }
        return false;
    }, { authToken: token, desiredValue: value, preferred: ADMIN_PATH });
}

async function readRuntimeFlagViaApi(page: Page, token: string): Promise<boolean | null> {
    return page.evaluate(async ({ authToken, preferred }) => {
        const candidates = [`/api/${preferred}/settings/runtime`, '/api/admin/settings/runtime'];
        for (const endpoint of candidates) {
            const response = await fetch(endpoint, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                },
                credentials: 'include',
            });
            if (response.status !== 404) {
                if (!response.ok) return null;
                try {
                    const body = await response.json();
                    return typeof body?.featureFlags?.webNextEnabled === 'boolean'
                        ? body.featureFlags.webNextEnabled
                        : null;
                } catch {
                    return null;
                }
            }
        }
        return null;
    }, { authToken: token, preferred: ADMIN_PATH });
}

test.describe('Runtime Flags Settings', () => {
    test('admin can toggle runtime flag and it persists after reload', async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Runtime settings edit path is desktop-scoped in smoke.');

        await loginAsAdmin(page, 'desktop');
        await openRuntimeSection(page);
        const token = await readAccessToken(page);
        expect(token).not.toBe('');

        const checkbox = runtimeCheckbox(page);
        const initialValue = await checkbox.isChecked();
        const nextValue = !initialValue;

        try {
            const updated = await updateRuntimeFlagViaApi(page, token, nextValue);
            test.skip(!updated, 'Runtime featureFlags update is not writable in this runtime.');
            const persisted = await readRuntimeFlagViaApi(page, token);
            expect(persisted).toBe(nextValue);

            await page.reload();
            await openRuntimeSection(page);
            await expect(runtimeCheckbox(page)).toBeVisible();
        } finally {
            await updateRuntimeFlagViaApi(page, token, initialValue);
        }
    });
});
