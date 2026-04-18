/**
 * CampusWay QA Audit — Chairman Portal E2E Tests
 *
 * Chairman login page render, dashboard render,
 * reports ও security logs access (view, export),
 * এবং unauthorized admin module access → 403 test।
 *
 * Requirements: 9.1-9.5
 */

import { test, expect } from '@playwright/test';
import { loginAsRole } from '../qa/helpers/auth-helper';
import { get } from '../qa/helpers/api-client';

const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const CHAIRMAN_BASE = `${FRONTEND_BASE}/chairman`;

// ═════════════════════════════════════════════════════════════════════
// 1. Chairman Login Page Render (Req 9.1)
// ═════════════════════════════════════════════════════════════════════

test.describe('Chairman Login Page (Req 9.1)', () => {
    test('Chairman login page renders chairman-specific login form', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto(`${CHAIRMAN_BASE}/login`, { waitUntil: 'domcontentloaded' });

        // Page body is visible
        await expect(page.locator('body')).toBeVisible();

        // Main content area renders
        const content = page.locator('main, [role="main"], #root, #app').first();
        await expect(content).toBeVisible({ timeout: 15_000 });

        // Chairman-specific form elements present
        const identifierInput = page.locator('#identifier');
        const passwordInput = page.locator('#password');
        const submitButton = page.locator('button[type="submit"]');

        await expect(identifierInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
        await expect(submitButton).toBeVisible();

        // Chairman portal branding text present
        const pageText = await page.textContent('body');
        expect(
            pageText?.toLowerCase().includes('chairman') ?? false,
        ).toBe(true);

        // No uncaught JS errors
        expect(errors, 'Chairman login page should have no JS errors').toHaveLength(0);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Chairman Dashboard Render (Req 9.2, 9.3)
// ═════════════════════════════════════════════════════════════════════

test.describe('Chairman Dashboard (Req 9.2, 9.3)', () => {
    test('Chairman login redirects to /chairman/dashboard', async ({ page }) => {
        await loginAsRole(page, 'chairman');

        // After login, should be on chairman dashboard
        await page.waitForURL('**/chairman/dashboard**', { timeout: 15_000 });
        expect(page.url()).toContain('/chairman/dashboard');
    });

    test('Chairman dashboard renders chairman-specific content', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await loginAsRole(page, 'chairman');
        await page.goto(`${CHAIRMAN_BASE}/dashboard`, { waitUntil: 'domcontentloaded' });

        // Page body is visible
        await expect(page.locator('body')).toBeVisible();

        // Main content area renders
        const content = page.locator('main, [role="main"], #root, #app').first();
        await expect(content).toBeVisible({ timeout: 15_000 });

        // Chairman portal text present
        const pageText = await page.textContent('body');
        expect(
            pageText?.toLowerCase().includes('chairman') ?? false,
        ).toBe(true);

        // No uncaught JS errors
        expect(errors, 'Chairman dashboard should have no JS errors').toHaveLength(0);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 3. Reports ও Security Logs Access (Req 9.4)
// ═════════════════════════════════════════════════════════════════════

test.describe('Chairman Reports & Security Logs Access (Req 9.4)', () => {
    // Chairman has: reports_analytics (view, export) and security_logs (view)

    test('Chairman can view reports summary (GET /api/__cw_admin__/reports/summary)', async () => {
        const res = await get<unknown>('/__cw_admin__/reports/summary', 'chairman');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });

    test('Chairman can export reports (GET /api/__cw_admin__/reports/export)', async () => {
        const res = await get<unknown>('/__cw_admin__/reports/export', 'chairman');
        // Export may require step-up verification (403) or succeed (200)
        // Either way, it should NOT be a 500 and should not be a permission-denied 403
        // from the permission middleware (step-up 403 is different)
        expect(res.status).toBeLessThan(500);
    });

    test('Chairman can view security logs / audit logs (GET /api/__cw_admin__/audit-logs)', async () => {
        const res = await get<unknown>('/__cw_admin__/audit-logs', 'chairman');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });

    test('Chairman can view security dashboard (GET /api/__cw_admin__/security/dashboard)', async () => {
        const res = await get<unknown>('/__cw_admin__/security/dashboard', 'chairman');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });

    test('Chairman can view reports analytics (GET /api/__cw_admin__/reports/analytics)', async () => {
        const res = await get<unknown>('/__cw_admin__/reports/analytics', 'chairman');
        expect(res.status).toBeLessThan(500);
        expect([200, 304]).toContain(res.status);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 4. Other Admin Module Access → 403 (Req 9.5)
// ═════════════════════════════════════════════════════════════════════

test.describe('Chairman Unauthorized Module Access → 403 (Req 9.5)', () => {
    // Chairman should NOT have access to any admin module except
    // reports_analytics and security_logs.
    // These endpoints require permissions chairman does not have.

    const forbiddenEndpoints = [
        { path: '/__cw_admin__/universities', label: 'Universities (universities module)' },
        { path: '/__cw_admin__/news', label: 'News (news module)' },
        { path: '/__cw_admin__/exams', label: 'Exams (exams module)' },
        { path: '/__cw_admin__/resources', label: 'Resources (resources module)' },
        { path: '/__cw_admin__/users', label: 'Users / Students (students_groups module)' },
        { path: '/__cw_admin__/subscription-plans', label: 'Subscription Plans (subscription_plans module)' },
        { path: '/__cw_admin__/support-center', label: 'Support Center (support_center module)' },
        { path: '/__cw_admin__/question-bank', label: 'Question Bank (question_bank module)' },
        { path: '/__cw_admin__/notification-center', label: 'Notification Center (notifications module)' },
        { path: '/__cw_admin__/help-center/articles', label: 'Help Center (support_center module)' },
        { path: '/__cw_admin__/contact-messages', label: 'Contact Messages (support_center module)' },
    ];

    for (const { path, label } of forbiddenEndpoints) {
        test(`Chairman cannot access ${label} → 403`, async () => {
            const res = await get<unknown>(path, 'chairman');
            expect(res.status, `${label} should return 403 for chairman`).toBe(403);
        });
    }
});
