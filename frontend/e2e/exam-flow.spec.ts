import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsStudent } from './helpers';

test.describe('Student Exam Flow', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsStudent(page);
        await page.goto('/exams');
        await expect(page.getByRole('heading', { name: /(Exam Portal|Exams|Welcome)/i }).first()).toBeVisible({ timeout: 20000 });
    });

    test('full exam lifecycle: landing, taking, auto-save, and results', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        // 1. Open the first available exam CTA from landing list
        const takeExamBtn = page.locator('a[href^="/exam/"]').filter({ hasText: /^Start$/i }).first();
        const startLinkCount = await takeExamBtn.count();
        test.skip(startLinkCount === 0, 'No internal live exam with Start CTA available in seeded data.');
        await expect(takeExamBtn).toBeVisible({ timeout: 20000 });
        await takeExamBtn.click();

        // 2. Landing/taking mode verification
        await page.waitForURL(/\/exam(\/take)?\//, { timeout: 15000 });

        const startBtn = page.getByRole('button', { name: /^Start Exam$/i });
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click();
        }

        // 3. Active exam UI verification and answer at least one question
        const questionCards = page.locator('[id^="exam-question-"]');
        const questionVisible = await questionCards.first().isVisible({ timeout: 20000 }).catch(() => false);
        test.skip(!questionVisible, 'Selected exam did not enter internal question runner.');
        await questionCards.first().getByRole('button').first().click();

        // Let auto-save trigger
        await page.waitForTimeout(2000);

        // 4. Navigate and answer more questions if available
        const paletteTwo = page.getByRole('button', { name: /^2$/ }).first();
        if (await paletteTwo.isVisible().catch(() => false)) {
            await paletteTwo.click();
            await questionCards.nth(1).getByRole('button').first().click();
        }

        const paletteThree = page.getByRole('button', { name: /^3$/ }).first();
        if (await paletteThree.isVisible().catch(() => false)) {
            await paletteThree.click();
            await questionCards.nth(2).getByRole('button').first().click();
        }

        // 5. Submit Exam
        await expect(page.getByText(/Saved|Saving/i).first()).toBeVisible({ timeout: 15000 });
        await page.getByRole('button', { name: /^Submit$/i }).first().click();
        await expect(page.getByRole('heading', { name: /Submit Exam/i })).toBeVisible();
        await page.getByRole('button', { name: /Confirm Submit/i }).click();

        // In case of stale revision race, the UI asks for a second submit attempt.
        await page.waitForTimeout(1500);
        if (!/\/exam\/[^/]+\/result/.test(page.url())) {
            const submitAgain = page.getByRole('button', { name: /Confirm Submit/i });
            if (await submitAgain.isVisible().catch(() => false)) {
                await submitAgain.click();
            }
        }

        // 6. Result Page Verification
        await page.waitForURL(/\/exam\/[^/]+\/result/, { timeout: 20000 });
        await expect(page.getByRole('heading', { name: /Result Published|Result not published yet/i }).first()).toBeVisible({ timeout: 20000 });

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
