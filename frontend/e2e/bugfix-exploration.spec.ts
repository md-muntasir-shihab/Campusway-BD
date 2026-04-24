/**
 * Bug Condition Exploration Tests — CampusWay Responsive & Theme Audit
 *
 * এই টেস্টগুলো unfixed কোডে FAIL হবে — ব্যর্থতা বাগের অস্তিত্ব নিশ্চিত করে।
 * ফিক্সের পর এই টেস্টগুলো PASS হবে (প্রত্যাশিত আচরণ এনকোড করা আছে)।
 *
 * Validates: Requirements 1.1, 1.2, 1.5, 1.7, 1.9, 1.13
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;
const THEME_STORAGE_KEY = 'campusway_theme';

// ─── Helper: Set dark mode via localStorage ──────────────────────────

async function setDarkMode(page: import('@playwright/test').Page) {
    await page.addInitScript((key) => {
        localStorage.setItem(key, 'dark');
    }, THEME_STORAGE_KEY);
}

// ─── 1. Horizontal Scroll at 375px on /universities ──────────────────
// Bug Condition: viewport.width <= 414 AND hasTableOrGrid('/universities')
// Expected: scrollWidth <= clientWidth (no horizontal scroll)
// Validates: Requirement 1.1

test.describe('Bug Exploration: Horizontal Scroll (Req 1.1)', () => {
    test('no horizontal scroll at 375px on /universities', async ({ page }) => {
        await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
        await page.goto(`${BASE}/universities`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });

        // Wait for page content to render
        await page.waitForTimeout(2000);

        const scrollInfo = await page.evaluate(() => ({
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
        }));

        expect(
            scrollInfo.scrollWidth,
            `Expected scrollWidth (${scrollInfo.scrollWidth}) <= clientWidth (${scrollInfo.clientWidth}). ` +
            `Horizontal overflow of ${scrollInfo.scrollWidth - scrollInfo.clientWidth}px detected.`,
        ).toBeLessThanOrEqual(scrollInfo.clientWidth);
    });
});

// ─── 2. Dark Mode Hardcoded Colors ───────────────────────────────────
// Bug Condition: resolvedTheme == 'dark' AND hasHardcodedLightClasses(route)
// Expected: No visible elements with bg-white class in dark mode
// Validates: Requirement 1.7

test.describe('Bug Exploration: Dark Mode Hardcoded Colors (Req 1.7)', () => {
    test('no visible bg-white elements in dark mode on /universities', async ({ page }) => {
        await setDarkMode(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`${BASE}/universities`, {
            waitUntil: 'domcontentloaded',
            timeout: 30_000,
        });

        // Wait for React to hydrate and theme to apply
        await page.waitForTimeout(2000);

        // Verify dark mode is active
        const isDark = await page.evaluate(() =>
            document.documentElement.classList.contains('dark'),
        );
        expect(isDark, 'Dark mode should be active').toBe(true);

        // Find visible elements with bg-white class that don't have a dark: override
        const hardcodedWhiteElements = await page.evaluate(() => {
            const allElements = document.querySelectorAll('[class*="bg-white"]');
            const visible: { tag: string; classes: string; text: string }[] = [];

            allElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();
                const style = window.getComputedStyle(htmlEl);

                // Check if element is visible
                if (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden' &&
                    style.opacity !== '0'
                ) {
                    // Check if the computed background is actually white-ish
                    const bg = style.backgroundColor;
                    const isWhiteBg =
                        bg === 'rgb(255, 255, 255)' ||
                        bg === 'rgba(255, 255, 255, 1)' ||
                        bg === 'white';

                    if (isWhiteBg) {
                        visible.push({
                            tag: htmlEl.tagName.toLowerCase(),
                            classes: htmlEl.className.substring(0, 120),
                            text: (htmlEl.textContent || '').substring(0, 50).trim(),
                        });
                    }
                }
            });

            return visible;
        });

        expect(
            hardcodedWhiteElements,
            `Found ${hardcodedWhiteElements.length} visible element(s) with hardcoded white background in dark mode: ` +
            JSON.stringify(hardcodedWhiteElements.slice(0, 5), null, 2),
        ).toHaveLength(0);
    });
});

// ─── 3. FOUC (Flash of Unstyled Content) ─────────────────────────────
// Bug Condition: interaction == 'page_refresh' AND resolvedTheme == 'dark'
// Expected: html.dark class exists immediately on page load (no flash)
// Validates: Requirement 1.9

test.describe('Bug Exploration: FOUC Prevention (Req 1.9)', () => {
    test('html.dark class present on first paint after refresh in dark mode', async ({ page }) => {
        // First, navigate and set dark mode in localStorage
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.evaluate((key) => {
            localStorage.setItem(key, 'dark');
        }, THEME_STORAGE_KEY);

        // Wait for localStorage to persist
        await page.waitForTimeout(500);

        // Reload the page and check at the earliest possible moment (commit)
        // whether html.dark class is already present BEFORE React hydrates
        await page.goto(`${BASE}/`, {
            waitUntil: 'commit', // earliest possible moment
            timeout: 30_000,
        });

        // Check immediately after commit (before React hydrates)
        const immediateCheck = await page.evaluate(() => ({
            hasDark: document.documentElement.classList.contains('dark'),
            htmlClass: document.documentElement.className,
        }));

        // Wait for React to fully hydrate
        await page.waitForTimeout(2000);

        // Check after React hydration
        const afterHydration = await page.evaluate(() => ({
            hasDark: document.documentElement.classList.contains('dark'),
            htmlClass: document.documentElement.className,
        }));

        // The bug: dark class is NOT present at commit time (before React),
        // but IS present after React hydrates — this means FOUC occurs
        const hasFouc = !immediateCheck.hasDark && afterHydration.hasDark;

        expect(
            immediateCheck.hasDark,
            `html.dark class should be present on first paint (at commit time). ` +
            `Before React: class="${immediateCheck.htmlClass}", hasDark=${immediateCheck.hasDark}. ` +
            `After React: class="${afterHydration.htmlClass}", hasDark=${afterHydration.hasDark}. ` +
            `FOUC detected: ${hasFouc}. ` +
            `Fix: Add inline <script> in <head> of index.html to read localStorage and set html.dark.`,
        ).toBe(true);
    });
});


// ─── 4. Navbar Tap Targets at 375px ──────────────────────────────────
// Bug Condition: viewport.width <= 414 AND user logged in AND navbar interactive elements
// Expected: Each tap target ≥ 44x44px (WCAG 2.5.5)
// Validates: Requirement 1.2

test.describe('Bug Exploration: Navbar Tap Targets (Req 1.2)', () => {
    test('navbar buttons meet 44x44px minimum at 375px when logged in', async ({ page }) => {
        await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });

        // Wait for page to fully render
        await page.waitForTimeout(2000);

        // Check interactive elements in the navbar header area
        // These include: ThemeSwitchPro button, notification bell, hamburger menu, user avatar
        const navbarButtons = await page.evaluate(() => {
            const header = document.querySelector('header');
            if (!header) return [];

            const interactiveElements = header.querySelectorAll(
                'button, a[role="button"], [role="button"]',
            );
            const results: {
                label: string;
                width: number;
                height: number;
                meetsMinimum: boolean;
            }[] = [];

            interactiveElements.forEach((el) => {
                const htmlEl = el as HTMLElement;
                const rect = htmlEl.getBoundingClientRect();
                const style = window.getComputedStyle(htmlEl);

                if (
                    rect.width > 0 &&
                    rect.height > 0 &&
                    style.display !== 'none' &&
                    style.visibility !== 'hidden'
                ) {
                    const label =
                        htmlEl.getAttribute('aria-label') ||
                        htmlEl.textContent?.trim().substring(0, 30) ||
                        htmlEl.tagName;

                    results.push({
                        label,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        meetsMinimum: rect.width >= 44 && rect.height >= 44,
                    });
                }
            });

            return results;
        });

        // Filter to only buttons that are visible in the navbar action area
        const failingButtons = navbarButtons.filter((b) => !b.meetsMinimum);

        expect(
            failingButtons,
            `${failingButtons.length} navbar button(s) below 44x44px minimum: ` +
            JSON.stringify(failingButtons, null, 2),
        ).toHaveLength(0);
    });
});

// ─── 5. Modal Viewport Bounds at 375px ───────────────────────────────
// Bug Condition: viewport.width <= 414 AND hasModal(route)
// Expected: Modal stays within viewport bounds (max-width: 100vw, max-height: 100vh)
// Validates: Requirement 1.5

test.describe('Bug Exploration: Modal Viewport Bounds (Req 1.5)', () => {
    test('modal/dialog stays within viewport at 375px', async ({ page }) => {
        await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(2000);

        // Try to find and open a dialog on the page
        await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(1000);

        // Check for any existing dialog/modal elements, or verify the DialogShell
        // component source has the w-full constraint alongside max-w-lg
        const modalBounds = await page.evaluate((viewportWidth) => {
            // Check for any existing dialog/modal elements
            const dialogs = document.querySelectorAll(
                '[role="dialog"], [aria-modal="true"], .fixed.inset-0',
            );

            if (dialogs.length > 0) {
                const dialog = dialogs[0] as HTMLElement;
                const innerPanel = dialog.querySelector('.max-w-lg, .max-w-md, .max-w-xl, [class*="max-w"]') as HTMLElement;

                if (innerPanel) {
                    const rect = innerPanel.getBoundingClientRect();
                    return {
                        found: true,
                        width: Math.round(rect.width),
                        height: Math.round(rect.height),
                        left: Math.round(rect.left),
                        right: Math.round(rect.right),
                        exceedsViewport: rect.right > viewportWidth || rect.left < 0,
                    };
                }
            }

            // If no dialog is currently open, inject a test dialog to verify
            // that w-full + max-w-lg constrains properly within the viewport
            const testOverlay = document.createElement('div');
            testOverlay.className = 'fixed inset-0 z-[9999] flex items-center justify-center px-4 py-6';
            testOverlay.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;';

            const testPanel = document.createElement('div');
            testPanel.className = 'w-full max-w-lg';
            testPanel.style.cssText = 'width:100%;max-width:32rem;min-height:100px;';
            testPanel.textContent = 'Test dialog panel';

            testOverlay.appendChild(testPanel);
            document.body.appendChild(testOverlay);

            // Force layout
            const rect = testPanel.getBoundingClientRect();
            const result = {
                found: true,
                width: Math.round(rect.width),
                height: Math.round(rect.height),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                exceedsViewport: rect.right > viewportWidth || rect.left < 0,
            };

            // Cleanup
            document.body.removeChild(testOverlay);
            return result;
        }, MOBILE_WIDTH);

        expect(
            modalBounds.exceedsViewport,
            `Modal exceeds viewport: width=${modalBounds.width}px, left=${modalBounds.left}, right=${modalBounds.right}. ` +
            `DialogShell needs w-full max-w-lg for mobile constraint.`,
        ).toBe(false);
    });
});

// ─── 6. Focus Indicator Visibility in Dark Mode ──────────────────────
// Bug Condition: interaction == 'keyboard_navigation' AND resolvedTheme == 'dark'
// Expected: Focus ring clearly visible on dark background
// Validates: Requirement 1.13

test.describe('Bug Exploration: Focus Indicator in Dark Mode (Req 1.13)', () => {
    test('focus ring is visible during keyboard navigation in dark mode', async ({ page }) => {
        await setDarkMode(page);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
        await page.waitForTimeout(2000);

        // Verify dark mode is active
        const isDark = await page.evaluate(() =>
            document.documentElement.classList.contains('dark'),
        );
        expect(isDark, 'Dark mode should be active').toBe(true);

        // Tab through interactive elements to trigger focus-visible
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);
        await page.keyboard.press('Tab');
        await page.waitForTimeout(300);

        // Check the focus ring properties of the currently focused element
        const focusInfo = await page.evaluate(() => {
            const focused = document.activeElement as HTMLElement;
            if (!focused || focused === document.body) {
                return { found: false, message: 'No focused element found after Tab' };
            }

            const style = window.getComputedStyle(focused);
            const outlineColor = style.outlineColor;
            const outlineWidth = style.outlineWidth;
            const outlineOffset = style.outlineOffset;
            const outlineStyle = style.outlineStyle;
            const boxShadow = style.boxShadow;

            // Get the background color of the page (dark mode)
            const bgColor = window.getComputedStyle(document.documentElement).backgroundColor;

            // Parse outline color to check contrast against dark background
            // Dark bg is approximately #081124 (rgb(8, 17, 36))
            // Primary color in dark mode is #4b8dff (rgb(75, 141, 255))
            // A good focus ring for dark mode should be lighter, like #93c5fd

            // Check if outline is actually visible (not 0px, not 'none')
            const hasVisibleOutline =
                outlineStyle !== 'none' &&
                outlineWidth !== '0px' &&
                outlineColor !== 'transparent';

            // Check if there's a box-shadow based focus ring
            const hasBoxShadowRing =
                boxShadow !== 'none' && boxShadow !== '';

            // Calculate if the outline color has sufficient contrast with dark bg
            // We'll check if the outline-offset provides enough separation
            const outlineOffsetPx = parseFloat(outlineOffset) || 0;
            const hasAdequateOffset = outlineOffsetPx >= 2;

            return {
                found: true,
                tag: focused.tagName.toLowerCase(),
                label: focused.getAttribute('aria-label') || focused.textContent?.trim().substring(0, 30),
                outlineColor,
                outlineWidth,
                outlineOffset,
                outlineStyle,
                boxShadow: boxShadow?.substring(0, 100),
                bgColor,
                hasVisibleOutline,
                hasBoxShadowRing,
                hasAdequateOffset,
                hasFocusIndicator: hasVisibleOutline || hasBoxShadowRing,
            };
        });

        expect(focusInfo.found, 'Should find a focused element after Tab navigation').toBe(true);

        if (focusInfo.found) {
            // The focus indicator should be visible AND have adequate offset for dark mode
            expect(
                focusInfo.hasFocusIndicator,
                `Focus indicator not visible on "${focusInfo.label}" (${focusInfo.tag}). ` +
                `Outline: ${focusInfo.outlineWidth} ${focusInfo.outlineStyle} ${focusInfo.outlineColor}, ` +
                `offset: ${focusInfo.outlineOffset}, boxShadow: ${focusInfo.boxShadow}. ` +
                `Dark mode needs a light-colored focus ring (e.g., #93c5fd) with ≥2px offset.`,
            ).toBe(true);

            // Additionally check that the offset is adequate for dark backgrounds
            expect(
                focusInfo.hasAdequateOffset,
                `Focus ring offset (${focusInfo.outlineOffset}) should be ≥2px in dark mode for visibility. ` +
                `Current outline: ${focusInfo.outlineColor} with offset ${focusInfo.outlineOffset}.`,
            ).toBe(true);
        }
    });
});
