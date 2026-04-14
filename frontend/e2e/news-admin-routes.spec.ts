import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin, seededCreds } from './helpers';

async function loginOrSkip(page: Parameters<typeof loginAsAdmin>[0]) {
    const probe = await page.request.post('/api/auth/admin/login', {
        data: {
            identifier: seededCreds.admin.desktop.email,
            password: seededCreds.admin.desktop.password,
        },
    });
    if (!probe.ok()) {
        test.skip(true, `Admin login is unavailable in this environment: ${probe.status()}`);
    }

    const body = await probe.json().catch(() => ({} as Record<string, unknown>));
    if (!String(body?.token || '').trim()) {
        const reason = body?.requires2fa ? 'admin login currently requires 2FA' : 'admin login did not return a session token';
        test.skip(true, `Admin credentials unavailable in this environment: ${reason}`);
    }

    await loginAsAdmin(page);
}

test.describe('News admin routes', () => {
    test('canonical /__cw_admin__/news routes resolve without runtime failures', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginOrSkip(page);

        const routes: Array<{ path: string; marker: RegExp }> = [
            { path: '/__cw_admin__/news', marker: /Items to Review/i },
            { path: '/__cw_admin__/news/dashboard', marker: /Overview/i },
            { path: '/__cw_admin__/news/pending', marker: /Items to Review/i },
            { path: '/__cw_admin__/news/drafts', marker: /Saved Drafts/i },
            { path: '/__cw_admin__/news/published', marker: /Published News/i },
            { path: '/__cw_admin__/news/scheduled', marker: /Scheduled/i },
            { path: '/__cw_admin__/news/rejected', marker: /Rejected/i },
            { path: '/__cw_admin__/news/ai-selected', marker: /AI Review/i },
            { path: '/__cw_admin__/news/sources', marker: /RSS Sources|Sources/i },
            { path: '/__cw_admin__/news/editor/000000000000000000000000', marker: /Edit Article|Create Article/i },
            { path: '/__cw_admin__/news/settings', marker: /News Settings/i },
        ];

        for (const route of routes) {
            await page.goto(route.path, { waitUntil: 'domcontentloaded' });
            await expect(page).toHaveURL(/\/__cw_admin__\/news(\/.*)?$/i);
            await expect(page.locator('body')).toBeVisible();
            await expect(page.getByRole('heading', { name: route.marker }).first()).toBeVisible();
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('news queue-first UI stays compact and understandable', async ({ page }) => {
        await loginOrSkip(page);

        await page.goto('/__cw_admin__/news/pending', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Items to Review/i }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /More filters/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Create Custom News/i })).toBeVisible();
        await expect(page.locator('button[aria-label*="Workflow Help"]')).toHaveCount(0);

        await page.goto('/__cw_admin__/news/dashboard', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Start with the task you need/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Primary shortcuts/i })).toBeVisible();
        await expect(page.getByText(/Publishing Center/i)).toHaveCount(0);
    });

    test('legacy password-change section is removed from the active news console', async ({ page }) => {
        await loginOrSkip(page);
        await page.goto('/__cw_admin__/news/dashboard');
        await expect(page.getByRole('link', { name: /Password Change/i })).toHaveCount(0);
        await expect(page.getByText(/Publishing Center/i)).toHaveCount(0);
    });

    test('legacy /admin/news redirects to secret admin base', async ({ page }) => {
        await loginOrSkip(page);
        await page.goto('/admin/news/sources', { waitUntil: 'domcontentloaded' });
        await expect(page).toHaveURL(/\/__cw_admin__\/news\/sources$/);
    });
});
