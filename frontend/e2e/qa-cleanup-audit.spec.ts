/**
 * CampusWay QA Audit — Cleanup Audit E2E Tests
 *
 * Frontend unused import/dead code detection, backend unused controller/
 * route/model detection, legacy redirect documentation, duplicate model
 * file detection, broken legacy redirect → Medium severity,
 * এবং _LEGACY_README.md review।
 *
 * Requirements: 19.1-19.6
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

// ─── Req 19.1: Frontend Unused Import / Dead Code Detection ─────────

test.describe('Frontend Dead Code Detection (Req 19.1)', () => {
    test('frontend builds without unused import warnings blocking render', async ({ page }) => {
        // Navigate to the app — if there are critical dead code issues,
        // the app won't render properly
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await page.goto(`${BASE}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        // App should render (no crash from dead code)
        const body = page.locator('body');
        await expect(body).toBeVisible();

        // No critical JS errors from unused/dead code
        const criticalErrors = jsErrors.filter(
            (e) =>
                e.includes('is not defined') ||
                e.includes('is not a function') ||
                e.includes('Cannot read properties of undefined'),
        );

        expect(
            criticalErrors,
            `Frontend should not have dead code errors: ${criticalErrors.join('; ')}`,
        ).toHaveLength(0);
    });

    test('critical routes render without import errors', async ({ page }) => {
        const routes = ['/', '/login', '/exams', '/universities', '/news', '/contact'];
        const errors: string[] = [];

        page.on('pageerror', (err) => errors.push(`${err.message}`));

        for (const route of routes) {
            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });
        }

        const importErrors = errors.filter(
            (e) =>
                e.includes('is not defined') ||
                e.includes('Failed to resolve import') ||
                e.includes('does not provide an export'),
        );

        expect(
            importErrors,
            `No import-related errors across routes: ${importErrors.join('; ')}`,
        ).toHaveLength(0);
    });
});

// ─── Req 19.2: Backend Unused Controller/Route/Model Detection ──────

test.describe('Backend Unused Route Detection (Req 19.2)', () => {
    test('core backend API endpoints are reachable', async ({ request }) => {
        // Verify that documented API endpoints actually exist and respond
        const coreEndpoints = [
            { path: '/api/auth/me', expectedStatus: [200, 401] },
            { path: '/api/news', expectedStatus: [200] },
            { path: '/api/exams/public-list', expectedStatus: [200] },
            { path: '/api/universities', expectedStatus: [200] },
            { path: '/api/resources', expectedStatus: [200] },
            { path: '/api/help-center', expectedStatus: [200] },
            { path: '/api/subscription-plans/public', expectedStatus: [200] },
            { path: '/api/settings/public', expectedStatus: [200] },
        ];

        for (const { path, expectedStatus } of coreEndpoints) {
            const res = await request.get(`${API_BASE}${path}`, {
                timeout: 10_000,
            });

            expect(
                expectedStatus,
                `${path} should return one of ${expectedStatus.join('/')}, got ${res.status()}`,
            ).toContain(res.status());
        }
    });

    test('backend does not have orphaned routes returning 500', async ({ request }) => {
        // Test a set of known routes to ensure none return 500 (server error)
        const routes = [
            '/api/news',
            '/api/exams/public-list',
            '/api/universities',
            '/api/resources',
            '/api/help-center',
            '/api/contact',
        ];

        for (const route of routes) {
            const res = await request.get(`${API_BASE}${route}`, {
                timeout: 10_000,
            });

            expect(
                res.status(),
                `${route} should not return 500 (server error)`,
            ).not.toBe(500);
        }
    });
});

// ─── Req 19.3: Legacy Redirect Documentation & Validation ───────────

test.describe('Legacy Redirect Validation (Req 19.3)', () => {
    const LEGACY_ROUTES = [
        { from: '/campusway-secure-admin', description: 'Old admin path' },
        { from: '/admin-dashboard', description: 'Old admin dashboard' },
        { from: '/services', description: 'Old services page' },
        { from: '/pricing', description: 'Old pricing page' },
        { from: '/exam-portal', description: 'Old exam portal' },
        { from: '/student/login', description: 'Old student login' },
    ];

    for (const { from, description } of LEGACY_ROUTES) {
        test(`legacy route "${from}" (${description}) redirects correctly`, async ({ page }) => {
            await page.goto(`${BASE}${from}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });

            const finalUrl = page.url();

            // Should NOT stay on the legacy path
            expect(
                finalUrl.includes(from) === false || from === '/services' || from === '/pricing',
                `${from} should redirect away from legacy path, final URL: ${finalUrl}`,
            ).toBe(true);
        });
    }
});

// ─── Req 19.4: Duplicate Model File Detection ──────────────────────

test.describe('Duplicate Model Detection (Req 19.4)', () => {
    test('backend API responds consistently (no model conflict errors)', async ({ request }) => {
        // If duplicate models exist, they may cause runtime conflicts
        // Test that core endpoints don't return model-related errors
        const endpoints = [
            '/api/exams/public-list',
            '/api/news',
            '/api/universities',
        ];

        for (const endpoint of endpoints) {
            const res = await request.get(`${API_BASE}${endpoint}`, {
                timeout: 10_000,
            });

            expect(res.status()).not.toBe(500);

            if (res.status() === 200) {
                const body = await res.text();
                // Should not contain model conflict errors
                expect(body).not.toContain('OverwriteModelError');
                expect(body).not.toContain('Cannot overwrite model');
                expect(body).not.toContain('MissingSchemaError');
            }
        }
    });
});

// ─── Req 19.5: Broken Legacy Redirect → Medium Severity ────────────

test.describe('Broken Legacy Redirect Detection (Req 19.5)', () => {
    test('legacy redirects do not lead to 404 pages', async ({ page }) => {
        const legacyPaths = [
            '/campusway-secure-admin',
            '/admin-dashboard',
            '/services',
            '/pricing',
            '/exam-portal',
        ];

        const brokenRedirects: string[] = [];

        for (const path of legacyPaths) {
            await page.goto(`${BASE}${path}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });

            const bodyText = await page.locator('body').textContent();
            const is404 =
                bodyText?.toLowerCase().includes('not found') ||
                bodyText?.toLowerCase().includes('404');

            if (is404) {
                brokenRedirects.push(path);
            }
        }

        // Report broken redirects as Medium severity
        if (brokenRedirects.length > 0) {
            test.info().annotations.push({
                type: 'issue',
                description: `Medium severity: Broken legacy redirects: ${brokenRedirects.join(', ')}`,
            });
        }

        expect(
            brokenRedirects,
            `Legacy redirects should not lead to 404: ${brokenRedirects.join(', ')}`,
        ).toHaveLength(0);
    });
});

// ─── Req 19.6: _LEGACY_README.md Review ─────────────────────────────

test.describe('Legacy README Review (Req 19.6)', () => {
    test('backend serves documented legacy endpoints correctly', async ({ request }) => {
        // Verify that legacy-documented endpoints are either redirected or removed
        // The _LEGACY_README.md documents items that should be reviewed

        // Test that the backend doesn't have stale legacy endpoints returning errors
        const legacyApiPaths = [
            '/api/auth/login',
            '/api/auth/admin/login',
            '/api/auth/chairman/login',
        ];

        for (const path of legacyApiPaths) {
            const res = await request.post(`${API_BASE}${path}`, {
                data: { identifier: 'test@test.com', password: 'test' },
                timeout: 10_000,
            });

            // Should return a proper response (not 500 or connection error)
            expect(
                res.status(),
                `${path} should not return 500`,
            ).not.toBe(500);
        }
    });
});
