import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Question Bank Critical Flows', () => {
    test('qbank-add-question-upload-and-link', async ({ page }) => {
        test.skip(true, 'Skeleton: wire exact selectors for current admin DOM.');
        await loginAsAdmin(page);
        await page.goto('/__cw_admin__/dashboard');
        await expect(page).toHaveURL(/__cw_admin__\/dashboard/);
    });

    test('qbank-bulk-import-mapping-and-report', async ({ page }) => {
        test.skip(true, 'Skeleton: upload fixture, map columns, assert import report.');
        await loginAsAdmin(page);
        await page.goto('/__cw_admin__/dashboard');
        await expect(page.locator('body')).toBeVisible();
    });

    test('qbank-picker-filter-smart-pick-and-preview', async ({ page }) => {
        test.skip(true, 'Skeleton: open exam builder, query picker, assert selected totals.');
        await loginAsAdmin(page);
        await page.goto('/__cw_admin__/dashboard');
        await expect(page.locator('body')).toBeVisible();
    });

    test('qbank-moderator-approve-flow', async ({ page }) => {
        test.skip(true, 'Skeleton: approve pending question and assert status/webhook side effects.');
        await loginAsAdmin(page);
        await page.goto('/__cw_admin__/dashboard');
        await expect(page.locator('body')).toBeVisible();
    });
});
