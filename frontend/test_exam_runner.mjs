import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';

(async () => {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log("Navigating to http://localhost:5175...");
    await page.goto('http://localhost:5175/admin/exam-center');
    await page.waitForLoadState('networkidle');
    
    const screenshotDir = path.resolve('artifacts');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }
    const screenshotPath = path.join(screenshotDir, 'exam_runner_initial.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
    
    // Check if we need to login
    const isLoginPage = await page.locator('input[type="email"], input[type="password"]').count() > 0;
    if (isLoginPage) {
        console.log("Login page detected. Attempting to log in...");
        await page.fill('input[type="email"]', 'admin@campusway.com');
        await page.fill('input[type="password"]', 'password123'); // Just a guess
        
        const loginBtn = page.locator('button[type="submit"]');
        if (await loginBtn.count() > 0) {
            await loginBtn.click();
            await page.waitForLoadState('networkidle');
            const loggedInPath = path.join(screenshotDir, 'exam_runner_loggedin.png');
            await page.screenshot({ path: loggedInPath, fullPage: true });
            console.log(`Saved logged-in screenshot to ${loggedInPath}`);
        }
    } else {
        console.log("No login inputs found, maybe already logged in or not a login page.");
    }

    const htmlContent = await page.content();
    console.log("HTML Content excerpt:");
    console.log(htmlContent.substring(0, 500));
    
    await browser.close();
    console.log("Done.");
})();
