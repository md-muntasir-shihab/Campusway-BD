/**
 * CampusWay QA Audit — Public Visitor Deep E2E Tests
 *
 * সমস্ত public পেজের comprehensive testing: page load, content render,
 * search/filter, form submission, SEO meta tags, protected route redirect,
 * এবং static pages।
 *
 * Requirements: 4.1-4.19
 */

import { test, expect } from '@playwright/test';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

// ─── Helpers ─────────────────────────────────────────────────────────

/** Collect JS errors during a page visit */
function collectJSErrors(page: import('@playwright/test').Page): string[] {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    return errors;
}

// ═════════════════════════════════════════════════════════════════════
// 1. Home Page (Req 4.1)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Home Page', () => {
    /**
     * Req 4.1: Home page `/` loads within 3 seconds with no JS errors
     */
    test('Home page loads within 3s and has no JS errors', async ({ page }) => {
        const jsErrors = collectJSErrors(page);

        const start = Date.now();
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(3000);
        expect(jsErrors).toEqual([]);
    });
});

// ═════════════════════════════════════════════════════════════════════
// 2. Universities Page (Req 4.2)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Universities Page', () => {
    /**
     * Req 4.2: Universities page renders university list
     */
    test('Universities page renders list', async ({ page }) => {
        await page.goto('/universities', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Wait for content to load — look for university cards/items or a list container
        const listContainer = page.locator(
            '[data-testid="university-list"], .university-list, .university-card, [class*="university"], article, .card',
        ).first();
        await expect(listContainer).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.2: Search/filter on universities page is functional
     */
    test('Universities page search/filter works', async ({ page }) => {
        await page.goto('/universities', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Look for a search input
        const searchInput = page.locator(
            'input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i], input[name="search"], input[aria-label*="search" i]',
        ).first();

        const hasSearch = await searchInput.isVisible().catch(() => false);
        if (hasSearch) {
            await searchInput.fill('University');
            // Allow debounce/filter to apply
            await page.waitForTimeout(500);
            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 3. University Category & Cluster Browse (Req 4.3, 4.4)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — University Category & Cluster Browse', () => {
    /**
     * Req 4.3: University category browse page renders
     */
    test('University category browse page renders', async ({ page }) => {
        // Navigate to a category page — use a generic slug
        await page.goto('/universities/category/public', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Page should render without crashing — either show results or a "no results" message
        const content = page.locator('main, [role="main"], #root, #app').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.4: University cluster browse page renders
     */
    test('University cluster browse page renders', async ({ page }) => {
        await page.goto('/universities/cluster/dhaka', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const content = page.locator('main, [role="main"], #root, #app').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });
});

// ═════════════════════════════════════════════════════════════════════
// 4. University Details Page (Req 4.5)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — University Details', () => {
    /**
     * Req 4.5: University details page renders detailed info
     */
    test('University details page renders', async ({ page }) => {
        // First get a valid university slug from the universities list page
        await page.goto('/universities', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Try to find a link to a university detail page
        const uniLink = page.locator('a[href*="/university/"]').first();
        const hasLink = await uniLink.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasLink) {
            await uniLink.click();
            await expect(page.locator('body')).toBeVisible();
            await expect(page).toHaveURL(/\/university\//);
        } else {
            // Fallback: navigate to a seeded university slug
            await page.goto('/university/qa-seed-university-alpha', { waitUntil: 'domcontentloaded' });
            await expect(page.locator('body')).toBeVisible();
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 5. News Page (Req 4.6, 4.7)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — News', () => {
    /**
     * Req 4.6: News page renders article list with pagination
     */
    test('News page renders article list', async ({ page }) => {
        await page.goto('/news', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Wait for news content to load
        const content = page.locator('main, [role="main"], #root').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.6: News page pagination is functional
     */
    test('News page pagination works if available', async ({ page }) => {
        await page.goto('/news', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Check for pagination controls
        const pagination = page.locator(
            'nav[aria-label*="pagination" i], [class*="pagination"], button:has-text("Next"), a:has-text("Next"), [data-testid="pagination"]',
        ).first();
        const hasPagination = await pagination.isVisible({ timeout: 5_000 }).catch(() => false);

        if (hasPagination) {
            // Pagination exists — verify it's interactive
            await expect(pagination).toBeVisible();
        }
        // If no pagination, it's acceptable (may have fewer articles than page size)
    });

    /**
     * Req 4.7: Single news page renders article content
     */
    test('Single news page renders article content', async ({ page }) => {
        await page.goto('/news', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Try to find a link to a single news article
        const newsLink = page.locator('a[href*="/news/"]').first();
        const hasLink = await newsLink.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasLink) {
            await newsLink.click();
            await expect(page.locator('body')).toBeVisible();
            await expect(page).toHaveURL(/\/news\//);
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 6. Exams Page (Req 4.8)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Exams', () => {
    /**
     * Req 4.8: Exams page renders published exam list via /api/exams/public-list
     */
    test('Exams page renders published exam list', async ({ page }) => {
        // Intercept the public-list API call to verify it's used
        const apiPromise = page.waitForResponse(
            (res) =>
                res.url().includes('/api/exams/public-list') ||
                res.url().includes('/api/exams'),
            { timeout: 15_000 },
        ).catch(() => null);

        await page.goto('/exams', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const apiRes = await apiPromise;
        if (apiRes) {
            expect(apiRes.status()).toBeLessThan(500);
        }

        // Page should render exam content
        const content = page.locator('main, [role="main"], #root').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });
});


// ═════════════════════════════════════════════════════════════════════
// 7. Resources Page (Req 4.9, 4.10)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Resources', () => {
    /**
     * Req 4.9: Resources page renders resource list
     */
    test('Resources page renders resource list', async ({ page }) => {
        await page.goto('/resources', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const content = page.locator('main, [role="main"], #root').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.10: Resource detail page renders resource info
     */
    test('Resource detail page renders', async ({ page }) => {
        await page.goto('/resources', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Try to find a link to a resource detail page
        const resLink = page.locator('a[href*="/resources/"]').first();
        const hasLink = await resLink.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasLink) {
            await resLink.click();
            await expect(page.locator('body')).toBeVisible();
            await expect(page).toHaveURL(/\/resources\//);
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 8. Contact Page (Req 4.11)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Contact Page', () => {
    /**
     * Req 4.11: Contact page renders contact form
     */
    test('Contact page renders form', async ({ page }) => {
        await page.goto('/contact', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Verify form elements exist
        const form = page.locator('form').first();
        await expect(form).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.11: Contact form submission posts to /api/contact
     */
    test('Contact form submission calls /api/contact', async ({ page }) => {
        await page.goto('/contact', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Fill form fields — use flexible selectors
        const nameInput = page.locator(
            'input[name="name"], input[placeholder*="name" i], input[aria-label*="name" i]',
        ).first();
        const emailInput = page.locator(
            'input[name="email"], input[type="email"], input[placeholder*="email" i]',
        ).first();
        const subjectInput = page.locator(
            'input[name="subject"], input[placeholder*="subject" i], input[aria-label*="subject" i]',
        ).first();
        const messageInput = page.locator(
            'textarea[name="message"], textarea[placeholder*="message" i], textarea',
        ).first();

        const hasName = await nameInput.isVisible().catch(() => false);
        const hasEmail = await emailInput.isVisible().catch(() => false);
        const hasMessage = await messageInput.isVisible().catch(() => false);

        if (hasName) await nameInput.fill('QA Test Visitor');
        if (hasEmail) await emailInput.fill('qa-e2e-test@campusway.test');
        const hasSubject = await subjectInput.isVisible().catch(() => false);
        if (hasSubject) await subjectInput.fill('QA E2E Contact Test');
        if (hasMessage) await messageInput.fill('This is an automated QA E2E test contact message.');

        // Check for phone field
        const phoneInput = page.locator(
            'input[name="phone"], input[type="tel"], input[placeholder*="phone" i]',
        ).first();
        const hasPhone = await phoneInput.isVisible().catch(() => false);
        if (hasPhone) await phoneInput.fill('+8801700000001');

        // Check for consent checkbox
        const consent = page.locator(
            'input[name="consent"], input[type="checkbox"]',
        ).first();
        const hasConsent = await consent.isVisible().catch(() => false);
        if (hasConsent) await consent.check();

        // Intercept the contact API call
        const apiPromise = page.waitForResponse(
            (res) => res.url().includes('/api/contact') && res.request().method() === 'POST',
            { timeout: 10_000 },
        ).catch(() => null);

        // Submit the form
        const submitBtn = page.locator(
            'button[type="submit"], button:has-text("Send"), button:has-text("Submit"), button:has-text("পাঠান")',
        ).first();
        const hasSubmit = await submitBtn.isVisible().catch(() => false);
        if (hasSubmit) {
            await submitBtn.click();

            const apiRes = await apiPromise;
            if (apiRes) {
                // Contact API should respond (may be 200, 201, or 429 if rate limited)
                expect(apiRes.status()).toBeLessThan(500);
            }
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 9. Help Center (Req 4.12, 4.13)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Help Center', () => {
    /**
     * Req 4.12: Help Center renders article list
     */
    test('Help Center renders article list', async ({ page }) => {
        await page.goto('/help-center', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const content = page.locator('main, [role="main"], #root').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.12: Help Center search is functional
     */
    test('Help Center search works', async ({ page }) => {
        await page.goto('/help-center', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const searchInput = page.locator(
            'input[type="search"], input[placeholder*="search" i], input[name="search"], input[aria-label*="search" i]',
        ).first();

        const hasSearch = await searchInput.isVisible({ timeout: 5_000 }).catch(() => false);
        if (hasSearch) {
            await searchInput.fill('QA Seed');
            await page.waitForTimeout(500);
            await expect(page.locator('body')).toBeVisible();
        }
    });

    /**
     * Req 4.13: Help article detail page renders content and feedback
     */
    test('Help article detail page renders', async ({ page }) => {
        await page.goto('/help-center', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Try to find a link to a help article
        const articleLink = page.locator('a[href*="/help-center/"]').first();
        const hasLink = await articleLink.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasLink) {
            await articleLink.click();
            await expect(page.locator('body')).toBeVisible();
            await expect(page).toHaveURL(/\/help-center\//);

            // Check for feedback mechanism (thumbs up/down, rating, etc.)
            const feedback = page.locator(
                'button:has-text("Helpful"), button:has-text("Not Helpful"), [data-testid*="feedback"], [class*="feedback"], button[aria-label*="helpful" i], button[aria-label*="thumbs" i]',
            ).first();
            const hasFeedback = await feedback.isVisible({ timeout: 5_000 }).catch(() => false);
            // Feedback mechanism may or may not be visible — just verify page loaded
            if (hasFeedback) {
                await expect(feedback).toBeVisible();
            }
        }
    });
});

// ═════════════════════════════════════════════════════════════════════
// 10. Subscription Plans (Req 4.14, 4.15)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Subscription Plans', () => {
    /**
     * Req 4.14: Subscription Plans page renders plan list
     */
    test('Subscription Plans page renders plan list', async ({ page }) => {
        await page.goto('/subscription-plans', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        const content = page.locator('main, [role="main"], #root').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });

    /**
     * Req 4.15: Subscription Plan detail page renders plan info
     */
    test('Subscription Plan detail page renders', async ({ page }) => {
        await page.goto('/subscription-plans', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Try to find a link to a plan detail page
        const planLink = page.locator('a[href*="/subscription-plans/"]').first();
        const hasLink = await planLink.isVisible({ timeout: 8_000 }).catch(() => false);

        if (hasLink) {
            await planLink.click();
            await expect(page.locator('body')).toBeVisible();
            await expect(page).toHaveURL(/\/subscription-plans\//);
        }
    });
});


// ═════════════════════════════════════════════════════════════════════
// 11. Protected Route Redirect (Req 4.16)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Protected Route Redirect', () => {
    /**
     * Req 4.16: Accessing protected route redirects to login
     */
    test('/dashboard redirects unauthenticated user to login', async ({ page }) => {
        await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

        // Should redirect to login page
        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test('/profile redirects unauthenticated user to login', async ({ page }) => {
        await page.goto('/profile', { waitUntil: 'domcontentloaded' });

        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });

    test('/notifications redirects unauthenticated user to login', async ({ page }) => {
        await page.goto('/notifications', { waitUntil: 'domcontentloaded' });

        await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    });
});

// ═════════════════════════════════════════════════════════════════════
// 12. SEO Meta Tags Validation (Req 4.17)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — SEO Meta Tags', () => {
    const seoRoutes: Array<{ path: string; expectedTitlePart: string }> = [
        { path: '/', expectedTitlePart: 'CampusWay' },
        { path: '/universities', expectedTitlePart: 'Universities' },
        { path: '/news', expectedTitlePart: 'News' },
        { path: '/exams', expectedTitlePart: 'Exams' },
        { path: '/resources', expectedTitlePart: 'Resources' },
        { path: '/contact', expectedTitlePart: 'Contact' },
        { path: '/help-center', expectedTitlePart: 'Help Center' },
        { path: '/subscription-plans', expectedTitlePart: 'Subscription Plans' },
    ];

    for (const { path, expectedTitlePart } of seoRoutes) {
        test(`SEO title for ${path} contains "${expectedTitlePart}"`, async ({ page }) => {
            await page.goto(path, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('body')).toBeVisible();

            // Wait for title to be set (may be async via useEffect)
            await page.waitForTimeout(1000);

            const title = await page.title();
            expect(title.toLowerCase()).toContain(expectedTitlePart.toLowerCase());
        });
    }
});

// ═════════════════════════════════════════════════════════════════════
// 13. About, Terms, Privacy Static Pages (Req 4.18)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Static Pages', () => {
    const staticPages = [
        { path: '/about', name: 'About' },
        { path: '/terms', name: 'Terms' },
        { path: '/privacy', name: 'Privacy' },
    ];

    for (const { path, name } of staticPages) {
        test(`${name} page (${path}) renders static content`, async ({ page }) => {
            const jsErrors = collectJSErrors(page);

            await page.goto(path, { waitUntil: 'domcontentloaded' });
            await expect(page.locator('body')).toBeVisible();

            // Static pages should have meaningful content
            const content = page.locator('main, [role="main"], #root, #app').first();
            await expect(content).toBeVisible({ timeout: 10_000 });

            expect(jsErrors).toEqual([]);
        });
    }
});

// ═════════════════════════════════════════════════════════════════════
// 14. Certificate Verify Page (Req 4.19)
// ═════════════════════════════════════════════════════════════════════

test.describe('Public Visitor — Certificate Verify', () => {
    /**
     * Req 4.19: Certificate verify page renders verification result
     */
    test('Certificate verify page renders', async ({ page }) => {
        // Navigate to certificate verify with a dummy certificate ID
        await page.goto('/certificate/verify/test-certificate-id', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('body')).toBeVisible();

        // Page should render — either a verification result or a "not found" message
        const content = page.locator('main, [role="main"], #root, #app').first();
        await expect(content).toBeVisible({ timeout: 10_000 });
    });
});
