import { chromium } from 'playwright';

(async () => {
    console.log('Starting playwright...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    console.log('Navigating to login...');
    await page.goto('http://127.0.0.1:5175/__cw_admin__/login', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(2000);
    
    console.log('Filling credentials...');
    await page.fill('#identifier', 'e2e_admin_desktop@campusway.local');
    await page.fill('#password', 'E2E_Admin#12345');
    
    console.log('Clicking login...');
    await page.click('button[type="submit"]');
    
    console.log('Waiting for load state...');
    await page.waitForTimeout(3000); // give it a moment
    
    console.log('Navigating to settings...');
    await page.goto('http://127.0.0.1:5175/__cw_admin__/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // give it a moment to render
    
    const screenshotPath = `C:/Users/BGPS/.gemini/antigravity/brain/0444e3ea-1877-426e-b068-d430f204cebc/artifacts/admin_settings_verification.png`;
    console.log(`Taking screenshot... saved to ${screenshotPath}`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log('Done.');
    await browser.close();
})();
