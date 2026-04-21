import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:5175';

async function test() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const results = [];

    // Test 1: Universities search bar
    try {
        await page.goto(`${BASE}/universities`, { waitUntil: 'networkidle', timeout: 15000 });
        const uniSearch = await page.$('input[placeholder*="বিশ্ববিদ্যালয়"]');
        if (uniSearch) {
            await uniSearch.fill('খুলনা');
            await uniSearch.press('Enter');
            await page.waitForTimeout(1000);
            const url = page.url();
            results.push(`✅ Universities: search bar found, typed "খুলনা", URL=${url}`);
        } else {
            const anyInput = await page.$('input[type="text"]');
            results.push(anyInput ? '⚠️ Universities: search bar found but different placeholder' : '❌ Universities: NO search bar found');
        }
    } catch (e) {
        results.push(`❌ Universities: ${e.message.slice(0, 100)}`);
    }

    // Test 2: News search bar
    try {
        await page.goto(`${BASE}/news`, { waitUntil: 'networkidle', timeout: 15000 });
        const newsSearch = await page.$('input[placeholder*="নিউজ"]');
        if (newsSearch) {
            await newsSearch.fill('test');
            await page.waitForTimeout(500);
            results.push('✅ News: search bar found and typed "test"');
        } else {
            const anyInput = await page.$('input[type="text"]');
            results.push(anyInput ? '⚠️ News: input found but different placeholder' : '❌ News: NO search bar found in hero');
        }
    } catch (e) {
        results.push(`❌ News: ${e.message.slice(0, 100)}`);
    }

    // Test 3: Resources search bar
    try {
        await page.goto(`${BASE}/resources`, { waitUntil: 'networkidle', timeout: 15000 });
        const resSearch = await page.$('input[placeholder*="রিসোর্স"]');
        if (resSearch) {
            await resSearch.fill('test');
            await page.waitForTimeout(500);
            results.push('✅ Resources: search bar found and typed "test"');
        } else {
            const anyInput = await page.$('input[type="text"]');
            results.push(anyInput ? '⚠️ Resources: input found but different placeholder' : '❌ Resources: NO search bar found in hero');
        }
    } catch (e) {
        results.push(`❌ Resources: ${e.message.slice(0, 100)}`);
    }

    // Test 4: About page renders
    try {
        await page.goto(`${BASE}/about`, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.textContent('h1, h2');
        results.push(title ? `✅ About: rendered, title="${title.slice(0, 50)}"` : '❌ About: no title found');
    } catch (e) {
        results.push(`❌ About: ${e.message.slice(0, 100)}`);
    }

    // Test 5: Terms page renders
    try {
        await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.textContent('h1, h2');
        results.push(title ? `✅ Terms: rendered, title="${title.slice(0, 50)}"` : '❌ Terms: no title found');
    } catch (e) {
        results.push(`❌ Terms: ${e.message.slice(0, 100)}`);
    }

    // Test 6: Privacy page renders
    try {
        await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle', timeout: 15000 });
        const title = await page.textContent('h1, h2');
        results.push(title ? `✅ Privacy: rendered, title="${title.slice(0, 50)}"` : '❌ Privacy: no title found');
    } catch (e) {
        results.push(`❌ Privacy: ${e.message.slice(0, 100)}`);
    }

    await browser.close();
    console.log('\n=== SEARCH BAR & PAGE TEST RESULTS ===');
    results.forEach(r => console.log(r));
    console.log('======================================\n');
}

test().catch(e => { console.error('Test failed:', e.message); process.exit(1); });
