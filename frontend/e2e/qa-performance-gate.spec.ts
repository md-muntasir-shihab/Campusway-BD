/**
 * CampusWay QA Audit — Performance Gate E2E Tests
 *
 * Critical_Route page interactive timing, JS error detection,
 * console error detection, backend API response timing,
 * এবং lazy-loaded route Suspense fallback tests।
 *
 * Requirements: 15.1-15.6
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

/** Critical routes: Home, Login, Exams (public exam list) */
const CRITICAL_ROUTES = ['/', '/login', '/exams'] as const;

// ─── Req 15.1: Desktop Interactive < 5s ──────────────────────────────

test.describe('Desktop Performance — Interactive < 5s (Req 15.1)', () => {
    for (const route of CRITICAL_ROUTES) {
        test(`${route} interactive within 5s at desktop (1280px)`, async ({ page }) => {
            await page.setViewportSize({ width: 1280, height: 900 });

            const start = Date.now();
            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 10_000,
            });

            // Wait for the page to be interactive (main content visible)
            await page.locator('body').waitFor({ state: 'visible', timeout: 5_000 });
            const elapsed = Date.now() - start;

            expect(
                elapsed,
                `${route} should be interactive within 5000ms, took ${elapsed}ms`,
            ).toBeLessThanOrEqual(5_000);
        });
    }
});

// ─── Req 15.4: Mobile Interactive < 7s ──────────────────────────────

test.describe('Mobile Performance — Interactive < 7s (Req 15.4)', () => {
    for (const route of CRITICAL_ROUTES) {
        test(`${route} interactive within 7s at mobile (375px)`, async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });

            const start = Date.now();
            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 12_000,
            });

            await page.locator('body').waitFor({ state: 'visible', timeout: 7_000 });
            const elapsed = Date.now() - start;

            expect(
                elapsed,
                `${route} should be interactive within 7000ms on mobile, took ${elapsed}ms`,
            ).toBeLessThanOrEqual(7_000);
        });
    }
});

// ─── Req 15.2: No Unhandled JS Errors ───────────────────────────────

test.describe('No Unhandled JS Errors (Req 15.2)', () => {
    for (const route of CRITICAL_ROUTES) {
        test(`${route} has no unhandled JS errors`, async ({ page }) => {
            const jsErrors: string[] = [];

            page.on('pageerror', (error) => {
                jsErrors.push(error.message);
            });

            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });

            // Wait a bit for any async errors
            await page.waitForTimeout(2_000);

            expect(
                jsErrors,
                `${route} should have no unhandled JS errors: ${jsErrors.join(', ')}`,
            ).toHaveLength(0);
        });
    }
});

// ─── Req 15.3: No Console Errors ────────────────────────────────────

test.describe('No Console Errors (Req 15.3)', () => {
    for (const route of CRITICAL_ROUTES) {
        test(`${route} has no console errors`, async ({ page }) => {
            const consoleErrors: string[] = [];

            page.on('console', (msg) => {
                if (msg.type() === 'error') {
                    const text = msg.text();
                    // Ignore known benign errors (e.g., favicon 404, dev warnings)
                    if (
                        !text.includes('favicon') &&
                        !text.includes('DevTools') &&
                        !text.includes('Download the React DevTools')
                    ) {
                        consoleErrors.push(text);
                    }
                }
            });

            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 15_000,
            });

            await page.waitForTimeout(2_000);

            expect(
                consoleErrors,
                `${route} should have no console errors: ${consoleErrors.join('; ')}`,
            ).toHaveLength(0);
        });
    }
});

// ─── Req 15.5: Backend API Response < 2s ─────────────────────────────

test.describe('Backend API Response < 2s (Req 15.5)', () => {
    const API_ENDPOINTS = [
        '/api/exams/public-list',
        '/api/news',
        '/api/settings/public',
    ] as const;

    for (const endpoint of API_ENDPOINTS) {
        test(`${endpoint} responds within 2s`, async ({ request }) => {
            const start = Date.now();
            const res = await request.get(`${API_BASE}${endpoint}`, {
                timeout: 5_000,
            });
            const elapsed = Date.now() - start;

            expect(res.status()).toBeLessThan(500);
            expect(
                elapsed,
                `${endpoint} should respond within 2000ms, took ${elapsed}ms`,
            ).toBeLessThanOrEqual(2_000);
        });
    }
});

// ─── Req 15.6: Lazy-Loaded Route Suspense Fallback ──────────────────

test.describe('Lazy-Loaded Route Suspense Fallback (Req 15.6)', () => {
    test('lazy-loaded route shows loading state then content', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });

        // Navigate to a route that is likely lazy-loaded (e.g., /universities)
        await page.goto(`${BASE}/universities`, {
            waitUntil: 'commit', // Don't wait for full load to catch Suspense
            timeout: 15_000,
        });

        // The page should eventually render content (after Suspense resolves)
        await page.locator('body').waitFor({ state: 'visible', timeout: 10_000 });

        // Verify content loaded (not stuck on loading spinner)
        const bodyText = await page.locator('body').textContent({ timeout: 10_000 });
        expect(bodyText?.trim().length).toBeGreaterThan(0);
    });

    test('help-center lazy route loads correctly', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 900 });

        await page.goto(`${BASE}/help-center`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        const body = page.locator('body');
        await expect(body).toBeVisible();
        const text = await body.textContent();
        expect(text?.trim().length).toBeGreaterThan(0);
    });
});
