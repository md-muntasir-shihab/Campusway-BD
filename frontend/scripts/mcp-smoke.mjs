import fs from 'fs/promises';
import path from 'path';
import { chromium } from '@playwright/test';

const BASE_URL = (process.env.E2E_BASE_URL || 'http://localhost:5175').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e_admin@campusway.local';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2E_Admin#12345';
const STUDENT_EMAIL = process.env.E2E_STUDENT_EMAIL || 'e2e_student@campusway.local';
const STUDENT_PASSWORD = process.env.E2E_STUDENT_PASSWORD || 'E2E_Student#12345';

const routePlan = [
    { route: '/', kind: 'public' },
    { route: '/services', kind: 'public' },
    { route: '/news', kind: 'public' },
    { route: '/exams', kind: 'public' },
    { route: '/resources', kind: 'public' },
    { route: '/contact', kind: 'public' },
    { route: '/login', kind: 'public' },
    { route: '/chairman/login', kind: 'public' },
    { route: '/__cw_admin__/login', kind: 'public' },
    { route: '/dashboard', kind: 'student' },
    { route: '/profile', kind: 'student' },
    { route: '/__cw_admin__/dashboard', kind: 'admin' },
];

function slugify(route) {
    return route.replace(/^\/+/, '').replace(/[\/:?&=#]+/g, '-').replace(/^-+|-+$/g, '') || 'home';
}

async function monitorPage(page) {
    const errors = [];
    const criticalApis = [];

    const onPageError = (err) => errors.push(err.message);
    const onResponse = (res) => {
        const url = res.url();
        if (!url.includes('/api/')) return;
        if (res.status() >= 500) criticalApis.push(`${res.status()} ${url}`);
    };

    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    return {
        errors,
        criticalApis,
        dispose: () => {
            page.off('pageerror', onPageError);
            page.off('response', onResponse);
        },
    };
}

async function loginStudent(context) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(STUDENT_EMAIL);
    await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: /(Sign in|Access Dashboard)/i }).first().click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    await page.close();
}

async function loginAdmin(context) {
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/__cw_admin__/login`);
    await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: /Sign In/i }).click();
    await page.waitForURL(/\/__cw_admin__\/dashboard/, { timeout: 30000 });
    await page.close();
}

async function run() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputDir = path.resolve(process.cwd(), '../qa-artifacts/mcp-smoke', timestamp);
    await fs.mkdir(outputDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    const publicContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const studentContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    await loginStudent(studentContext);
    await loginAdmin(adminContext);

    const results = [];

    for (const item of routePlan) {
        const context = item.kind === 'student' ? studentContext : item.kind === 'admin' ? adminContext : publicContext;
        const page = await context.newPage();
        const tracker = await monitorPage(page);
        const url = `${BASE_URL}${item.route}`;

        let status = 'pass';
        let note = 'OK';
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
            await page.waitForSelector('body', { timeout: 8000 });
            await page.waitForTimeout(1000);
            await page.screenshot({
                path: path.join(outputDir, `${slugify(item.route)}.png`),
                fullPage: true,
            });

            if (tracker.errors.length > 0 || tracker.criticalApis.length > 0) {
                status = 'fail';
                note = `pageErrors=${tracker.errors.length}, api500=${tracker.criticalApis.length}`;
            }
        } catch (err) {
            status = 'fail';
            note = `navigation error: ${err instanceof Error ? err.message : String(err)}`;
        } finally {
            tracker.dispose();
            await page.close();
        }

        results.push({
            route: item.route,
            kind: item.kind,
            status,
            note,
            pageErrors: tracker.errors,
            criticalApiFailures: tracker.criticalApis,
        });
    }

    await publicContext.close();
    await studentContext.close();
    await adminContext.close();
    await browser.close();

    const failCount = results.filter((r) => r.status === 'fail').length;
    const passCount = results.length - failCount;

    const markdown = [
        `# MCP Smoke Report (${timestamp})`,
        '',
        `- Base URL: ${BASE_URL}`,
        `- Pass: ${passCount}`,
        `- Fail: ${failCount}`,
        '',
        '| Route | Kind | Status | Note |',
        '|---|---|---|---|',
        ...results.map((r) => `| \`${r.route}\` | ${r.kind} | ${r.status.toUpperCase()} | ${r.note} |`),
        '',
    ].join('\n');

    await fs.writeFile(path.join(outputDir, 'findings.md'), markdown, 'utf-8');
    await fs.writeFile(path.join(outputDir, 'findings.json'), JSON.stringify(results, null, 2), 'utf-8');

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ outputDir, passCount, failCount }, null, 2));
    process.exitCode = failCount > 0 ? 1 : 0;
}

run().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[mcp-smoke] failed', err);
    process.exitCode = 1;
});
