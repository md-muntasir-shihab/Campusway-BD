import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

const baseAdminRoutes = [
    '/__cw_admin__/dashboard',
    '/__cw_admin__/universities',
    '/__cw_admin__/exams',
    '/__cw_admin__/question-bank',
    '/__cw_admin__/students',
    '/__cw_admin__/student-groups',
    '/__cw_admin__/resources',
    '/__cw_admin__/payments',
    '/__cw_admin__/support-center',
    '/__cw_admin__/subscription-plans',
    '/__cw_admin__/settings',
    '/__cw_admin__/settings/home-control',
    '/__cw_admin__/settings/site-settings',
    '/__cw_admin__/settings/banner-manager',
    '/__cw_admin__/settings/security-center',
    '/__cw_admin__/settings/system-logs',
    '/__cw_admin__/settings/reports',
    '/__cw_admin__/settings/admin-profile',
    '/__cw_admin__/news',
    '/__cw_admin__/news/pending',
    '/__cw_admin__/news/sources',
];

const viewports = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
];

async function waitForAdminShell(page: import('@playwright/test').Page, route: string) {
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('body'), `body missing on ${route}`).toBeVisible({ timeout: 15000 });

    const accessGate = page.getByText(/Checking admin access/i).first();
    if (await accessGate.isVisible().catch(() => false)) {
        await accessGate.waitFor({ state: 'hidden', timeout: 15000 }).catch(() => undefined);
    }

    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
    await expect(page.locator('main').first(), `main shell missing on ${route}`).toBeVisible({ timeout: 15000 });
}

test.describe('Admin Responsive Matrix', () => {
    test.beforeEach(async ({ page }, testInfo) => {
        test.skip(testInfo.project.name.includes('mobile'), 'Viewport matrix runs on desktop project only.');
        await loginAsAdmin(page);
    });

    for (const viewport of viewports) {
        test(`routes are responsive at ${viewport.width}x${viewport.height}`, async ({ page }) => {
            test.setTimeout(180_000);
            await page.setViewportSize(viewport);

            let editorId = '';
            try {
                editorId = await page.evaluate(async () => {
                    const response = await fetch('/api/campusway-secure-admin/news?limit=1', { credentials: 'include' });
                    if (!response.ok) return '';
                    const body = await response.json();
                    const first = Array.isArray(body?.items) ? body.items[0] : null;
                    return String(first?._id || '');
                });
            } catch {
                editorId = '';
            }

            const routes = [
                ...baseAdminRoutes,
                `/__cw_admin__/news/editor/${editorId || '000000000000000000000000'}`,
                '/__cw_admin__/news/editor/000000000000000000000000',
            ];

            for (const route of routes) {
                const tracker = attachHealthTracker(page);
                await page.goto(route, { waitUntil: 'domcontentloaded' });
                await waitForAdminShell(page, route);

                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
                expect.soft(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1);

                if (viewport.width <= 420) {
                    const menuButton = page.getByRole('button', { name: /Open admin menu/i }).first();
                    await menuButton.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined);
                    const menuVisible = await menuButton.isVisible().catch(() => false);
                    expect.soft(menuVisible, `mobile menu trigger missing on ${route}`).toBeTruthy();
                }

                await expectPageHealthy(page, tracker);
                tracker.detach();
            }
        });
    }
});
