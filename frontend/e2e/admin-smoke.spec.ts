import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin } from './helpers';

test.describe('Admin Smoke', () => {
    test('admin can login and navigate key tabs', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginAsAdmin(page);
        const isMobileViewport = (page.viewportSize()?.width || 0) < 768;
        if (isMobileViewport) {
            await expect(page.getByRole('button', { name: /Toggle menu|Open admin menu/i })).toBeVisible();
            await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
            await expectPageHealthy(page, tracker);
            tracker.detach();
            return;
        }

        await expect(page).toHaveURL(/\/__cw_admin__\/dashboard/);

        const expectSingleExamShell = async () => {
            await expect(page.locator('aside').first()).toBeVisible();
            await expect(page.locator('aside')).toHaveCount(1);
            await expect(page.getByRole('heading', { name: /Exams|Exam Center/i }).first()).toBeVisible();
        };

        await page.goto('/__cw_admin__/exams');
        await expect(page).toHaveURL(/\/__cw_admin__\/exams/);
        await expect(page.getByText(/Exam Management|Exam Center|Exams/i).first()).toBeVisible();
        await expectSingleExamShell();

        await page.goto('/__cw_admin__/dashboard');
        await page.getByRole('button', { name: /Open Exams/i }).click();
        await expect(page).toHaveURL(/\/__cw_admin__\/exams/);
        await expectSingleExamShell();

        await page.goto('/__cw_admin__/dashboard');
        await page.getByRole('link', { name: /^Exams$/i }).click();
        await expect(page).toHaveURL(/\/__cw_admin__\/exams/);
        await expectSingleExamShell();

        await page.goto('/__cw_admin__/students');
        // Legacy students route now canonicalizes to student-management/list.
        await expect(page).toHaveURL(/\/__cw_admin__\/(students|student-management\/list)/);
        await expect(page.getByText(/Student Management/i).first()).toBeVisible();

        await page.goto('/__cw_admin__/settings/security-center');
        await expect(page).toHaveURL(/\/__cw_admin__\/settings\/security-center/);
        await expect(page.getByRole('heading', { name: /Security Center/i }).first()).toBeVisible();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
