import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy } from './helpers';

test.describe('Public Design Visibility', () => {
    test('legacy routes normalize to subscription plans', async ({ page }) => {
        await page.goto('/services');
        await expect(page).toHaveURL(/\/subscription-plans/);

        await page.goto('/pricing');
        await expect(page).toHaveURL(/\/subscription-plans/);
    });

    test('home, news, and subscription pages render redesigned blocks', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await page.goto('/');
        await expect(page.getByRole('textbox', { name: /Search universities, news, exams and resources/i }).first()).toBeVisible();
        await expect(page.getByRole('heading', { name: /Featured Universities/i })).toBeVisible();
        await expect(page.getByRole('heading', { name: /Application Deadlines/i })).toBeVisible();

        await page.goto('/news');
        await expect(page.getByText(/CampusWay News Hub/i)).toBeVisible();
        await expect(page.locator('h1').filter({ hasText: /Admission News|News/i }).first()).toBeVisible();

        await page.goto('/subscription-plans');
        await expect(page.getByRole('heading', { name: /Subscription Plans/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /All|Free|Paid/i }).first()).toBeVisible();

        await page.getByTestId('theme-toggle').first().click();
        await expect(page.locator('body')).toBeVisible();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('theme selection persists across reload using campusway_theme', async ({ page }) => {
        await page.goto('/');
        await page.evaluate(() => localStorage.setItem('campusway_theme', 'light'));
        await page.reload();

        await expect
            .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
            .toBeFalsy();

        const toggle = page.getByTestId('theme-toggle').first();
        await expect(toggle).toBeVisible();
        await toggle.click();

        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('dark');
        await expect
            .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
            .toBeTruthy();

        await page.reload();
        await expect
            .poll(() => page.evaluate(() => localStorage.getItem('campusway_theme')))
            .toBe('dark');
        await expect
            .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
            .toBeTruthy();
    });
});
