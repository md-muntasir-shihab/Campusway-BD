import { chromium } from 'playwright';

(async () => {
    try {
        console.log('Launching browser...');
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        console.log('Navigating to login...');
        await page.goto('http://localhost:5175/__cw_admin__/login');

        console.log('Logging in...');
        await page.fill('input[type="email"]', 'e2e_admin_desktop@campusway.local');
        await page.fill('input[type="password"]', 'E2E_Admin#12345');
        await page.click('button[type="submit"]');

        console.log('Waiting for Dashboard...');
        await page.waitForTimeout(3000);
        console.log('Current URL:', page.url());

        console.log('Looking for UI elements on the dashboard...');
        const html = await page.content();
        
        console.log('Attempting to click "Open Website Control" action card button...');
        const actionButton = await page.$('button:has-text("Open Website Control")');
        if (actionButton) {
            console.log('Found button! Clicking...');
            await actionButton.click();
            await page.waitForTimeout(2000);
            console.log('URL after click:', page.url());
        } else {
            console.log('Action button NOT FOUND!');
        }

        console.log('Attempting to click "Website Control" from SIDEBAR...');
        const sidebarParent = await page.$('aside nav div:has-text("Website Control") button');
        if (sidebarParent) {
            console.log('Found Sidebar Expand Toggle! Clicking...');
            await sidebarParent.click();
            await page.waitForTimeout(1000);
            
            const subPanelLink = await page.$('aside nav a:has-text("Campaign Banners")');
            if (subPanelLink) {
                 console.log('Found Sub Panel Link! Clicking...');
                 await subPanelLink.click();
                 await page.waitForTimeout(2000);
                 console.log('URL after clicking sub panel:', page.url());
            } else {
                 console.log('Sub Panel link NOT FOUND!');
            }
        }

        await browser.close();
        console.log('Test Complete.');
    } catch (e) {
        console.error('Test failed:', e);
    }
})();
