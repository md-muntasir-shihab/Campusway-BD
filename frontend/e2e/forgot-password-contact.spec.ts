import { expect, test } from '@playwright/test';

test.describe('Forgot Password Contact Handoff', () => {
    test('student forgot password page links into a prefilled admin contact request', async ({ page }) => {
        const email = 'release.audit+password@campusway.local';
        const phone = '+8801712345678';

        await page.goto('/student/forgot-password', { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: /Forgot Password/i })).toBeVisible();
        await expect(page.getByText(/Self-service reset is disabled for student accounts/i)).toBeVisible();

        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="tel"]').fill(phone);
        await page.getByRole('button', { name: /Contact Admin/i }).click();

        await expect(page).toHaveURL(/\/contact\?/);
        await expect(page.getByText(/Password reset request for admin support/i)).toBeVisible();
        await expect(page.locator('#contact-email')).toHaveValue(email);
        await expect(page.locator('#contact-phone')).toHaveValue(phone);
        await expect(page.locator('#contact-subject')).toHaveValue(/Password reset help/i);
        await expect(page.locator('#contact-message')).toHaveValue(new RegExp(email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    });
});
