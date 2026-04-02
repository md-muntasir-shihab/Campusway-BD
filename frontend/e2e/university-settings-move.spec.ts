import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

test.describe('University Settings Move', () => {
    test('university-related website controls live under University Settings and are removed from Home Control', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await loginAsAdmin(page);

        await page.goto('/__cw_admin__/settings/university-settings');
        await expect(page.getByRole('heading', { name: /University Settings/i }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByRole('heading', { name: /Canonical Ownership/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Home University Sections/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Home University Windows/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Highlighted Categories/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /^Featured Universities$/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /University Card Defaults/i })).toBeVisible();

        await page.goto('/__cw_admin__/settings/home-control');
        await expect(page.getByRole('heading', { name: /Home Settings/i }).first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByText(/University Controls Moved/i)).toBeVisible();
        await expect(page.getByRole('link', { name: /Open University Settings/i })).toBeVisible();
        await expect(page.getByText(/^Featured Clusters Quick Switch$/)).toHaveCount(0);
        await expect(page.getByText(/^University Preview Windows$/)).toHaveCount(0);
        await expect(page.getByText(/^University Dashboard$/)).toHaveCount(0);
        await expect(page.getByText(/^Highlighted Categories$/)).toHaveCount(0);
        await expect(page.getByText(/^Featured Universities$/)).toHaveCount(0);
        await expect(page.getByText(/^University Card Config$/)).toHaveCount(0);

        await page.getByRole('link', { name: /Open University Settings/i }).click();
        await expect(page).toHaveURL(/\/__cw_admin__\/settings\/university-settings/);

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
