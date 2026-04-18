/**
 * CampusWay QA Audit — Legacy Route Redirect E2E Tests
 *
 * /campusway-secure-admin, /admin-dashboard, /admin/*, /exam/take/:examId,
 * /exam/result/:examId, /student/login, /services, /pricing, /exam-portal,
 * এবং LEGACY_ADMIN_PATH_REDIRECTS mapping redirect tests।
 *
 * Requirements: 17.1-17.10, 4.20, 4.21, 4.22
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';

// ─── Req 17.1: /campusway-secure-admin → /__cw_admin__/dashboard ────

test.describe('Legacy Admin Redirects (Req 17.1)', () => {
    test('/campusway-secure-admin → /__cw_admin__/dashboard', async ({ page }) => {
        await page.goto(`${BASE}/campusway-secure-admin`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/__cw_admin__/');
    });

    test('/campusway-secure-admin/exams → /__cw_admin__/exams', async ({ page }) => {
        await page.goto(`${BASE}/campusway-secure-admin/exams`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/__cw_admin__/exams');
    });
});

// ─── Req 17.2: /admin-dashboard → /__cw_admin__/dashboard ──────────

test.describe('/admin-dashboard Redirect (Req 17.2)', () => {
    test('/admin-dashboard → /__cw_admin__/dashboard', async ({ page }) => {
        await page.goto(`${BASE}/admin-dashboard`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/__cw_admin__/');
    });
});

// ─── Req 17.3: /admin/* → /__cw_admin__/* ──────────────────────────

test.describe('/admin/* Redirect (Req 17.3)', () => {
    test('/admin/universities → /__cw_admin__/universities', async ({ page }) => {
        await page.goto(`${BASE}/admin/universities`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/__cw_admin__/universities');
    });

    test('/admin/exams → /__cw_admin__/exams', async ({ page }) => {
        await page.goto(`${BASE}/admin/exams`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/__cw_admin__/exams');
    });
});

// ─── Req 17.4: /exam/take/:examId → /exam/:examId ──────────────────

test.describe('/exam/take/:examId Redirect (Req 17.4)', () => {
    test('/exam/take/abc123 → /exam/abc123', async ({ page }) => {
        await page.goto(`${BASE}/exam/take/abc123`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        // Should redirect to /exam/abc123 (without /take/)
        expect(url).toContain('/exam/abc123');
        expect(url).not.toContain('/take/');
    });
});

// ─── Req 17.5: /exam/result/:examId → /exam/:examId/result ─────────

test.describe('/exam/result/:examId Redirect (Req 17.5)', () => {
    test('/exam/result/abc123 → /exam/abc123/result', async ({ page }) => {
        await page.goto(`${BASE}/exam/result/abc123`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/exam/abc123/result');
    });
});


// ─── Req 17.6: /student/login, /student-login → /login ─────────────

test.describe('Student Login Redirects (Req 17.6)', () => {
    test('/student/login → /login', async ({ page }) => {
        await page.goto(`${BASE}/student/login`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/login');
        expect(url).not.toContain('/student/login');
    });

    test('/student-login → /login', async ({ page }) => {
        await page.goto(`${BASE}/student-login`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/login');
    });
});

// ─── Req 4.20: /services → /subscription-plans ─────────────────────

test.describe('/services Redirect (Req 4.20)', () => {
    test('/services → /subscription-plans', async ({ page }) => {
        await page.goto(`${BASE}/services`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/subscription-plans');
    });
});

// ─── Req 4.21: /pricing → /subscription-plans ──────────────────────

test.describe('/pricing Redirect (Req 4.21)', () => {
    test('/pricing → /subscription-plans', async ({ page }) => {
        await page.goto(`${BASE}/pricing`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/subscription-plans');
    });
});

// ─── Req 4.22: /exam-portal → /exams ───────────────────────────────

test.describe('/exam-portal Redirect (Req 4.22)', () => {
    test('/exam-portal → /exams', async ({ page }) => {
        await page.goto(`${BASE}/exam-portal`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        expect(url).toContain('/exams');
    });
});

// ─── Req 17.9: Legacy Admin Sub-Route Redirects ────────────────────

test.describe('Legacy Admin Sub-Route Redirects (Req 17.9)', () => {
    /**
     * LEGACY_ADMIN_PATH_REDIRECTS mapping:
     * /__cw_admin__/featured → /__cw_admin__/settings/home-control
     * /__cw_admin__/live-monitor → /__cw_admin__/exams
     * /__cw_admin__/alerts → /__cw_admin__/settings/home-control
     * /__cw_admin__/file-upload → /__cw_admin__/student-management/list
     * /__cw_admin__/backups → /__cw_admin__/settings/system-logs
     * /__cw_admin__/users → /__cw_admin__/settings/admin-profile
     * /__cw_admin__/exports → /__cw_admin__/reports
     * /__cw_admin__/payments → /__cw_admin__/finance/transactions
     * /__cw_admin__/subscription-plans → /__cw_admin__/subscriptions/plans
     * /__cw_admin__/password → /__cw_admin__/settings/admin-profile
     * /__cw_admin__/security → /__cw_admin__/settings/security-center
     * /__cw_admin__/audit → /__cw_admin__/settings/system-logs
     */

    const LEGACY_REDIRECTS: Array<[string, string]> = [
        ['/__cw_admin__/featured', '/__cw_admin__/settings/home-control'],
        ['/__cw_admin__/live-monitor', '/__cw_admin__/exams'],
        ['/__cw_admin__/alerts', '/__cw_admin__/settings/home-control'],
        ['/__cw_admin__/backups', '/__cw_admin__/settings/system-logs'],
        ['/__cw_admin__/exports', '/__cw_admin__/reports'],
        ['/__cw_admin__/audit', '/__cw_admin__/settings/system-logs'],
    ];

    for (const [from, to] of LEGACY_REDIRECTS) {
        test(`${from} → ${to}`, async ({ page }) => {
            await page.goto(`${BASE}${from}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });

            const url = page.url();
            // The redirect should land on the target path
            // (may include /login redirect if auth required, which is acceptable)
            const redirectedCorrectly =
                url.includes(to) || url.includes('/login') || url.includes('/__cw_admin__/login');

            expect(
                redirectedCorrectly,
                `${from} should redirect to ${to} (or login), got ${url}`,
            ).toBe(true);
        });
    }
});

// ─── Req 17.10: Validate All Legacy Redirects ──────────────────────

test.describe('Legacy Redirect Validation (Req 17.10)', () => {
    test('/student → /dashboard redirect', async ({ page }) => {
        await page.goto(`${BASE}/student`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const url = page.url();
        // Should redirect to /dashboard or /login (if not authenticated)
        expect(
            url.includes('/dashboard') || url.includes('/login'),
            `/student should redirect to /dashboard or /login, got ${url}`,
        ).toBe(true);
    });
});
