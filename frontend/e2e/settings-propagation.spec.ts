import { expect, test, type APIRequestContext } from '@playwright/test';
import { loginAsStudent, seededCreds } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type LoginResult = {
    token: string;
};

async function apiLogin(
    request: APIRequestContext,
    identifier: string,
    password: string,
): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as LoginResult;
    expect(String(body.token || '')).not.toBe('');
    return body;
}

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function clearWebsiteSettingsCache(page: import('@playwright/test').Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.removeItem('cw_public_website_settings_cache');
    });
}

test.describe('Settings Propagation', () => {
    test('site name update propagates to public API and public/student UI', async ({ request, page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Settings propagation suite is desktop-only.');

        const adminLogin = await apiLogin(
            request,
            seededCreds.admin.desktop.email,
            seededCreds.admin.desktop.password,
        );
        const adminToken = adminLogin.token;

        const before = await request.get('/api/settings/public');
        expect(before.ok()).toBeTruthy();
        const beforeBody = await before.json();
        const originalWebsiteName = String(beforeBody?.websiteName || 'CampusWay');
        const patchedWebsiteName = `CampusWay QA ${Date.now()}`;

        try {
            const update = await request.put(`/api/${ADMIN_PATH}/home/settings`, {
                headers: authHeader(adminToken),
                data: {
                    websiteName: patchedWebsiteName,
                },
            });
            expect(update.ok(), await update.text()).toBeTruthy();

            await expect
                .poll(async () => {
                    const after = await request.get('/api/settings/public');
                    const body = await after.json();
                    return String(body?.websiteName || '');
                })
                .toBe(patchedWebsiteName);

            await page.goto('/');
            await clearWebsiteSettingsCache(page);
            await page.reload();
            await expect(page.getByText(patchedWebsiteName).first()).toBeVisible();

            await page.goto('/login');
            await clearWebsiteSettingsCache(page);
            await page.reload();
            await expect(page.getByText(patchedWebsiteName).first()).toBeVisible();

            await loginAsStudent(page);
            await page.goto('/news');
            await clearWebsiteSettingsCache(page);
            await page.reload();
            await expect(page.getByText(patchedWebsiteName).first()).toBeVisible();
        } finally {
            await request.put(`/api/${ADMIN_PATH}/home/settings`, {
                headers: authHeader(adminToken),
                data: {
                    websiteName: originalWebsiteName,
                },
            });
        }
    });
});

