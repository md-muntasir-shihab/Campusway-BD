import { chromium } from 'playwright';
import path from 'path';

(async () => {
    console.log('Starting full admin verification...');
    const browser = await chromium.launch({ headless: true });
    // Use a desktop 1920x1080 viewport to verify responsive design isn't broken on large screens
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    
    console.log('1. Logging in...');
    await page.goto('http://127.0.0.1:5175/__cw_admin__/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    
    await page.fill('#identifier', 'e2e_admin_desktop@campusway.local');
    await page.fill('#password', 'E2E_Admin#12345');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000); 

    const artifactsDir = 'C:/Users/BGPS/.gemini/antigravity/brain/0444e3ea-1877-426e-b068-d430f204cebc/artifacts';

    // 2. Dashboard Verification
    console.log('2. Verifying Dashboard...');
    await page.goto('http://127.0.0.1:5175/__cw_admin__/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // Wait for queries to fetch and render
    await page.screenshot({ path: path.join(artifactsDir, 'admin_dashboard_final_verify.png'), fullPage: true });

    // 3. Settings / Security Center Verification
    console.log('3. Verifying Security & Settings (Personal 2FA)...');
    await page.goto('http://127.0.0.1:5175/__cw_admin__/settings', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(artifactsDir, 'admin_settings_final_verify.png'), fullPage: true });

    // 4. Site Control / Home Control (if exist within settings or elsewhere)
    // Note: Assuming these might be accessible via sub-navigation in the settings panel
    console.log('4. Checking other settings tabs...');
    
    // Try to find the site-settings or home-control tab/button
    const hasSiteControl = await page.locator(':text-is("Site Content")').count();
    if (hasSiteControl > 0) {
        await page.click(':text-is("Site Content")');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(artifactsDir, 'admin_site_control_verify.png'), fullPage: true });
    }

    console.log('Done testing flows.');
    await browser.close();
})();
