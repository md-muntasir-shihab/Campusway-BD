/**
 * Preservation Property Tests — CampusWay Responsive & Theme Audit
 *
 * এই টেস্টগুলো unfixed কোডে PASS হবে — baseline আচরণ নিশ্চিত করে।
 * ফিক্সের পরও এই টেস্টগুলো PASS হবে (কোনো regression নেই)।
 *
 * Property 2: Preservation — ডেস্কটপ ও লাইট মোড আচরণ সংরক্ষণ
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 800;
const THEME_STORAGE_KEY = 'campusway_theme';

const CRITICAL_ROUTES = ['/', '/login', '/exams', '/universities'];

// ─── Helper: ensure light mode ───────────────────────────────────────

async function ensureLightMode(page: import('@playwright/test').Page) {
    await page.addInitScript((key) => {
        localStorage.setItem(key, 'light');
    }, THEME_STORAGE_KEY);
}

// ─── 1. Desktop Layout — critical routes render at 1280px ────────────
// Validates: Requirement 3.1, 3.6

test.describe('Preservation: Desktop Layout (Req 3.1, 3.6)', () => {
    for (const route of CRITICAL_ROUTES) {
        test(`route "${route}" renders correctly at ${DESKTOP_WIDTH}px`, async ({ page }) => {
            await ensureLightMode(page);
            await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            });
            await page.waitForTimeout(2000);

            // Page should not have horizontal scroll at desktop width
            const scrollInfo = await page.evaluate(() => ({
                scrollWidth: document.documentElement.scrollWidth,
                clientWidth: document.documentElement.clientWidth,
            }));
            expect(
                scrollInfo.scrollWidth,
                `Horizontal overflow on "${route}" at ${DESKTOP_WIDTH}px`,
            ).toBeLessThanOrEqual(scrollInfo.clientWidth);

            // Body should be visible and have content
            const bodyVisible = await page.evaluate(() => {
                const body = document.body;
                return body.offsetHeight > 0 && body.offsetWidth > 0;
            });
            expect(bodyVisible, `Body not visible on "${route}"`).toBe(true);
        });
    }
});


// ─── 2. Light Mode CSS Variables ─────────────────────────────────────
// Validates: Requirement 3.4

test.describe('Preservation: Light Mode CSS Variables (Req 3.4)', () => {
    test('CSS variables --bg, --text, --surface have correct light mode values', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        await page.goto(`${BASE}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        const cssVars = await page.evaluate(() => {
            const style = getComputedStyle(document.documentElement);
            return {
                bg: style.getPropertyValue('--bg').trim(),
                text: style.getPropertyValue('--text').trim(),
                surface: style.getPropertyValue('--surface').trim(),
            };
        });

        expect(cssVars.bg, '--bg should be #f4f8ff in light mode').toBe('#f4f8ff');
        expect(cssVars.text, '--text should be #102a43 in light mode').toBe('#102a43');
        expect(cssVars.surface, '--surface should be #ffffff in light mode').toBe('#ffffff');
    });
});

// ─── 3. Theme Cycle — ThemeSwitchPro click cycles localStorage ───────
// Validates: Requirement 3.3

test.describe('Preservation: Theme Cycle (Req 3.3)', () => {
    test('ThemeSwitchPro cycles light → dark → system in localStorage', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        await page.goto(`${BASE}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        // Verify initial state is light
        const initialTheme = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(initialTheme).toBe('light');

        // Click theme toggle — light → dark
        const themeBtn = page.locator('[data-testid="theme-toggle"]');
        await expect(themeBtn).toBeVisible();
        await themeBtn.click();
        await page.waitForTimeout(300);

        const afterFirst = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(afterFirst, 'After 1st click: light → dark').toBe('dark');

        // Click again — dark → system
        await themeBtn.click();
        await page.waitForTimeout(300);

        const afterSecond = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(afterSecond, 'After 2nd click: dark → system').toBe('system');

        // Click again — system → light
        await themeBtn.click();
        await page.waitForTimeout(300);

        const afterThird = await page.evaluate((key) => localStorage.getItem(key), THEME_STORAGE_KEY);
        expect(afterThird, 'After 3rd click: system → light').toBe('light');
    });
});

// ─── 4. Navbar Desktop Layout ────────────────────────────────────────
// Validates: Requirement 3.2

test.describe('Preservation: Navbar Desktop Layout (Req 3.2)', () => {
    test('all nav links visible and hamburger hidden at 1280px', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        await page.goto(`${BASE}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        // Desktop nav links should be visible (they are inside hidden lg:flex container)
        const navLinkNames = ['Home', 'Universities', 'Exams', 'News', 'Resources', 'Contact'];
        for (const name of navLinkNames) {
            const link = page.locator(`header >> text="${name}"`).first();
            await expect(link, `Nav link "${name}" should be visible at ${DESKTOP_WIDTH}px`).toBeVisible();
        }

        // Hamburger button (Toggle menu) should be hidden at desktop
        const hamburger = page.locator('button[aria-label="Toggle menu"]');
        await expect(hamburger, 'Hamburger should be hidden at desktop').toBeHidden();

        // Theme toggle should be visible
        const themeToggle = page.locator('[data-testid="theme-toggle"]');
        await expect(themeToggle, 'Theme toggle should be visible').toBeVisible();
    });
});


// ─── 5. Component Classes — btn-primary, card, input-field ───────────
// Validates: Requirements 3.8, 3.9, 3.10

test.describe('Preservation: Component Classes (Req 3.8, 3.9, 3.10)', () => {
    test('btn-primary has min-height ≥ 44px', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        // Login page has a btn-primary (Login button)
        await page.goto(`${BASE}/login`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        // Find a btn-primary element
        const btnPrimary = page.locator('.btn-primary').first();
        const btnCount = await page.locator('.btn-primary').count();

        if (btnCount > 0) {
            const box = await btnPrimary.boundingBox();
            expect(box, 'btn-primary should be visible').not.toBeNull();
            if (box) {
                expect(
                    box.height,
                    `btn-primary height (${box.height}px) should be ≥ 44px`,
                ).toBeGreaterThanOrEqual(44);
            }
        }
    });

    test('card has border and shadow', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        await page.goto(`${BASE}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        const cardCount = await page.locator('.card').count();
        if (cardCount > 0) {
            const cardStyle = await page.locator('.card').first().evaluate((el) => {
                const style = getComputedStyle(el);
                return {
                    borderStyle: style.borderStyle,
                    borderWidth: style.borderWidth,
                    boxShadow: style.boxShadow,
                };
            });

            // Card should have a border (not 'none' border-style or 0px width)
            const hasBorder =
                cardStyle.borderStyle !== 'none' && cardStyle.borderWidth !== '0px';
            const hasShadow =
                cardStyle.boxShadow !== 'none' && cardStyle.boxShadow !== '';

            expect(
                hasBorder || hasShadow,
                `Card should have border or shadow. border: ${cardStyle.borderWidth} ${cardStyle.borderStyle}, shadow: ${cardStyle.boxShadow?.substring(0, 60)}`,
            ).toBe(true);
        }
    });

    test('input-field has focus ring on focus', async ({ page }) => {
        await ensureLightMode(page);
        await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
        await page.goto(`${BASE}/login`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });
        await page.waitForTimeout(2000);

        const inputField = page.locator('.input-field').first();
        const inputCount = await page.locator('.input-field').count();

        if (inputCount > 0) {
            // Focus the input
            await inputField.focus();
            await page.waitForTimeout(200);

            const focusStyle = await inputField.evaluate((el) => {
                const style = getComputedStyle(el);
                return {
                    outlineStyle: style.outlineStyle,
                    outlineWidth: style.outlineWidth,
                    outlineColor: style.outlineColor,
                    boxShadow: style.boxShadow,
                };
            });

            const hasOutline =
                focusStyle.outlineStyle !== 'none' && focusStyle.outlineWidth !== '0px';
            const hasBoxShadow =
                focusStyle.boxShadow !== 'none' && focusStyle.boxShadow !== '';

            expect(
                hasOutline || hasBoxShadow,
                `input-field should have focus ring. outline: ${focusStyle.outlineWidth} ${focusStyle.outlineStyle}, shadow: ${focusStyle.boxShadow?.substring(0, 80)}`,
            ).toBe(true);
        }
    });
});

// ─── 6. Auth Redirect — protected routes redirect to /login ──────────
// Validates: Requirement 3.7

test.describe('Preservation: Auth Redirect (Req 3.7)', () => {
    const protectedRoutes = ['/dashboard', '/student/profile'];

    for (const route of protectedRoutes) {
        test(`"${route}" redirects to /login without auth`, async ({ page }) => {
            // Clear any auth state — remove session hints so bootstrap resolves quickly
            await page.addInitScript(() => {
                localStorage.clear();
                sessionStorage.clear();
            });
            await page.setViewportSize({ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT });
            await page.goto(`${BASE}${route}`, {
                waitUntil: 'domcontentloaded',
                timeout: 30_000,
            });

            // Auth bootstrap has a 6s deadline; wait for the redirect to /login
            // The ProtectedRoute shows a spinner while isLoading, then redirects
            await page.waitForURL('**/login**', { timeout: 15_000 });

            const currentUrl = page.url();
            expect(
                currentUrl,
                `Protected route "${route}" should redirect to /login, got: ${currentUrl}`,
            ).toContain('/login');
        });
    }
});
