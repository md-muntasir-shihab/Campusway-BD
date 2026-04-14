import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsStudent } from './helpers';

test.describe('Student Smoke', () => {
    test('student can login and open dashboard/profile', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginAsStudent(page);    
        // Wait for page to settle and popup to possibly appear
        await page.waitForTimeout(2500);
        
        // Use JavaScript to close any popup modals by removing them from DOM
        await page.evaluate(() => {
            // Find and remove all z-[9999] overlay divs (popup banners)
            const popups = document.querySelectorAll('div[class*="fixed"][class*="inset-0"][class*="z-\\[9999\\]"]');
            popups.forEach(popup => {
                (popup as HTMLElement).style.display = 'none';
            });
            // Also try finding by style attribute
            const styledPopups = document.querySelectorAll('div[style*="background: rgba(0,0,0,0.65)"]');
            styledPopups.forEach(popup => {
                (popup as HTMLElement).remove();
            });
        });
        
        await page.waitForTimeout(300);
        
        // Now click on the student-entry-trigger to open the profile card
        await page.getByTestId('student-entry-trigger').click();
        
        // Wait for the profile card modal to appear (z-100)
        await page.waitForSelector('[data-testid="student-entry-card"]', { timeout: 8000 });
        await expect(page.getByTestId('student-entry-card')).toBeVisible({ timeout: 8000 });
        await expect(page.getByTestId('student-entry-card').getByText(/Profile Readiness/i)).toBeVisible();
        await expect(page.getByText(/My Subscription/i).first()).toBeVisible();
        await expect(page.locator('text=Profile Completion').first()).toBeVisible();

        await page.goto('/profile');
        await expect(page.getByRole('heading', { name: /Profile & Documents/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Save Changes/i })).toBeVisible();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
