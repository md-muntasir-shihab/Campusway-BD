import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Go to login page
    console.log("Navigating to login page...");
    await page.goto('http://localhost:5175/login');
    await page.waitForLoadState('networkidle');

    // Attempt login with generic credentials (if there are inputs)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
        console.log("Filling login form...");
        await emailInput.fill('student@campusway.com');
        await passwordInput.fill('password123'); // Adjust based on your seeder
        await page.click('button[type="submit"]');
        await page.waitForLoadState('networkidle');
    } else {
        console.log("Login form not found, maybe already logged in.");
    }

    // Go to exams
    console.log("Navigating to /exams...");
    await page.goto('http://localhost:5175/exams');
    await page.waitForLoadState('networkidle');

    // Try to find a link or button to start/take an exam
    const examLinks = page.locator('a, button').filter({ hasText: /Start Exam|Take Exam|Resume|Start/i });
    if (await examLinks.count() > 0) {
        console.log("Clicking the first Exam link/button...");
        await examLinks.first().click();
        await page.waitForLoadState('networkidle');
        
        // Handle instructions page if any (e.g. "Start Attempt" button)
        const startAttemptBtns = page.locator('button').filter({ hasText: /Start Attempt|Begin|Start Exam/i });
        if (await startAttemptBtns.count() > 0) {
            console.log("Clicking Start Attempt...");
            await startAttemptBtns.first().click();
            await page.waitForLoadState('networkidle');
        }

        // Now we should be in the Exam Runner. Wait a bit for questions to render.
        await page.waitForTimeout(2000);
        
        await page.screenshot({ path: 'exam_runner_test.png', fullPage: true });
        console.log("Saved screenshot to exam_runner_test.png");

        // Verify if questions exist by looking for radio buttons or checkboxes (common for options)
        const inputCount = await page.locator('input[type="radio"], input[type="checkbox"]').count();
        console.log(`Number of question options (radio/checkbox) found: ${inputCount}`);
        
        const bodyText = await page.textContent('body') || '';
        
        if (inputCount > 0) {
            console.log("✅ SUCCESS: Questions are loading correctly in the exam runner!");
        } else {
            console.log("❌ WARNING: No question inputs found. It might still be showing 0 questions.");
            console.log("Body text excerpt:", bodyText.substring(0, 1000).replace(/\n\s*\n/g, '\n'));
        }
    } else {
        console.log("❌ No exams found on the /exams page to click.");
        await page.screenshot({ path: 'exams_page_empty.png', fullPage: true });
    }

    await browser.close();
})();
