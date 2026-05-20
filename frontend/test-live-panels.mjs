import { chromium } from '@playwright/test';

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const consoleMsgs = [];
    const networkFailures = [];

    page.on('console', msg => {
        const text = msg.text();
        const type = msg.type();
        if (type === 'error' || text.includes('failed') || text.includes('Error')) {
            consoleMsgs.push(`[${type}] ${text}`);
        }
    });

    page.on('requestfailed', request => {
        networkFailures.push(`Request failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', async response => {
        if (response.status() >= 400) {
            let bodyText = '';
            try {
                bodyText = await response.text();
            } catch (err) {}
            networkFailures.push(`API failure: ${response.status()} ${response.url()} - Body: ${bodyText.substring(0, 300)}`);
        }
    });

    try {
        // --- 1. STUDENT PANEL TEST ---
        console.log('\n--- TESTING STUDENT PANEL ---');
        console.log('Navigating to student login...');
        await page.goto('https://campuswaybd.web.app/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        console.log('Filling student credentials...');
        await page.locator('input[type="email"], input[name="email"], input#identifier, input[name="identifier"]').first().fill('mm.xihab@gmail.com');
        await page.locator('input[type="password"]').first().fill('CampusWay@2024');
        
        console.log('Submitting student login form...');
        await page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Access Dashboard")').first().click();
        
        // Wait for page transition
        console.log('Waiting for redirection...');
        await page.waitForTimeout(8000);
        console.log('Current URL after student login:', page.url());

        if (page.url().includes('/dashboard')) {
            console.log('Student logged in successfully!');
            // Go to profile and try saving changes
            console.log('Navigating to student profile...');
            await page.goto('https://campuswaybd.web.app/profile', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);

            // Try saving profile
            const saveBtn = page.locator('button:has-text("Save Changes"), button[type="submit"]').first();
            if (await saveBtn.isVisible()) {
                console.log('Attempting to save student profile (without changes to check API response)...');
                await saveBtn.click();
                await page.waitForTimeout(4000);
            } else {
                console.log('Save button not found on profile page.');
            }
        } else {
            console.log('Student login failed or remained on same page.');
        }

        // --- 2. ADMIN PANEL TEST ---
        console.log('\n--- TESTING ADMIN PANEL ---');
        console.log('Navigating to admin login...');
        await page.goto('https://campuswaybd.web.app/__cw_admin__/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        console.log('Filling admin credentials...');
        await page.locator('input[type="email"], input[name="email"], input#identifier, input[name="identifier"]').first().fill('admin@campusway.com');
        await page.locator('input[type="password"]').first().fill('admin123456');

        console.log('Submitting admin login form...');
        await page.locator('button[type="submit"], button:has-text("Sign In")').first().click();

        console.log('Waiting for redirection...');
        await page.waitForTimeout(8000);
        console.log('Current URL after admin login:', page.url());

        if (page.url().includes('/dashboard')) {
            console.log('Admin logged in successfully!');
            // Try going to a settings or simple update page
            console.log('Navigating to exam center list as a test...');
            await page.goto('https://campuswaybd.web.app/__cw_admin__/exam-center', { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(3000);
        } else {
            console.log('Admin login failed or remained on same page.');
        }

    } catch (e) {
        console.error('Error during test execution:', e);
    } finally {
        console.log('\n--- DIAGNOSTICS ---');
        console.log(`Console messages count: ${consoleMsgs.length}`);
        consoleMsgs.forEach(msg => console.log('  ' + msg));

        console.log(`Network failure messages count: ${networkFailures.length}`);
        networkFailures.forEach(msg => console.log('  ' + msg));

        await browser.close();
        console.log('Done.');
    }
}

run();
