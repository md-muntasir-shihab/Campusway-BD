/**
 * CampusWay QA Audit — Form Validation E2E Tests
 *
 * Login empty credentials, contact invalid email, admin required field,
 * backend 400/500 error handling, NotFound page, session restore,
 * এবং registration invalid data tests।
 *
 * Requirements: 16.1-16.8
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { getSeedUser, type UserRole } from '../qa/types';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

// ─── Helper ──────────────────────────────────────────────────────────

async function getToken(
    request: APIRequestContext,
    role: UserRole,
): Promise<string> {
    const user = getSeedUser(role);
    const endpoint =
        role === 'student'
            ? `${API_BASE}/api/auth/login`
            : `${API_BASE}/api/auth/admin/login`;

    const res = await request.post(endpoint, {
        data: { identifier: user.email, password: user.password },
    });
    const body = await res.json();

    if (body.requires2fa && body.tempToken) {
        const verifyRes = await request.post(`${API_BASE}/api/auth/verify-2fa`, {
            data: { tempToken: body.tempToken, otp: '123456' },
        });
        return (await verifyRes.json()).token;
    }

    return body.token;
}

// ─── Req 16.1: Login Empty Credentials → Error ─────────────────────

test.describe('Login Empty Credentials (Req 16.1)', () => {
    test('submitting login form with empty fields shows validation error', async ({ page }) => {
        await page.goto(`${BASE}/login`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        // Click submit without filling any fields
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();

        // Wait for validation errors to appear
        await page.waitForTimeout(1_000);

        // Check for validation error messages or HTML5 validation
        const errorMessages = page.locator(
            '[class*="error" i], [role="alert"], [data-error], ' +
            '.text-red, .text-destructive, [class*="invalid" i]',
        );
        const errorCount = await errorMessages.count();

        // Also check for HTML5 required validation
        const identifierInput = page.locator('#identifier, input[name="identifier"], input[name="email"]').first();
        const isInvalid = await identifierInput.evaluate(
            (el) => !(el as HTMLInputElement).validity.valid,
        ).catch(() => false);

        expect(
            errorCount > 0 || isInvalid,
            'Empty login form should show validation errors',
        ).toBe(true);
    });
});

// ─── Req 16.2: Contact Invalid Email → Error ────────────────────────

test.describe('Contact Invalid Email (Req 16.2)', () => {
    test('contact form with invalid email shows error', async ({ page }) => {
        await page.goto(`${BASE}/contact`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        // Fill form with invalid email
        const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
        const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]').first();
        const messageInput = page.locator('textarea[name="message"], textarea[placeholder*="message" i]').first();

        const nameExists = await nameInput.isVisible().catch(() => false);
        const emailExists = await emailInput.isVisible().catch(() => false);

        if (nameExists) await nameInput.fill('QA Test User');
        if (emailExists) await emailInput.fill('not-an-email');
        const msgExists = await messageInput.isVisible().catch(() => false);
        if (msgExists) await messageInput.fill('Test message');

        // Submit
        const submitBtn = page.locator('button[type="submit"]').first();
        await submitBtn.click();
        await page.waitForTimeout(1_000);

        // Check for email validation error
        const errorVisible = page.locator(
            '[class*="error" i], [role="alert"], [data-error], ' +
            '.text-red, .text-destructive',
        );
        const errorCount = await errorVisible.count();

        // Or HTML5 email validation
        const emailInvalid = emailExists
            ? await emailInput.evaluate((el) => !(el as HTMLInputElement).validity.valid).catch(() => false)
            : false;

        expect(
            errorCount > 0 || emailInvalid,
            'Invalid email should trigger validation error',
        ).toBe(true);
    });
});

// ─── Req 16.3: Admin Required Field Empty → Error ───────────────────

test.describe('Admin Required Field Empty (Req 16.3)', () => {
    test('admin form with empty required field shows error', async ({ page, request }) => {
        const token = await getToken(request, 'admin');

        // Try creating a news article with empty title via API
        const res = await request.post(`${API_BASE}/api/__cw_admin__/news`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { title: '', content: '' },
        });

        // Should return 400 (validation error)
        expect([400, 422]).toContain(res.status());
    });
});

// ─── Req 16.4: Backend 400 → User-Friendly Error ───────────────────

test.describe('Backend 400 → User-Friendly Error (Req 16.4)', () => {
    test('400 response contains user-friendly error message', async ({ request }) => {
        // Send invalid login data to trigger 400
        const res = await request.post(`${API_BASE}/api/auth/login`, {
            data: { identifier: '', password: '' },
        });

        const status = res.status();
        expect([400, 401, 422]).toContain(status);

        const body = await res.json();
        // Should have a message field (user-friendly)
        expect(
            body.message || body.error || body.errors,
            'Error response should contain a message',
        ).toBeTruthy();

        // Should NOT contain stack traces
        const bodyStr = JSON.stringify(body);
        expect(bodyStr).not.toContain('at Object.');
        expect(bodyStr).not.toContain('at Module.');
        expect(bodyStr).not.toMatch(/\/home\//);
        expect(bodyStr).not.toMatch(/\/usr\//);
    });
});

// ─── Req 16.5: Backend 500 → Generic Error, No Internals ───────────

test.describe('Backend 500 → Generic Error (Req 16.5)', () => {
    test('error responses do not expose internal details', async ({ request }) => {
        // Try to trigger an error with malformed data
        const res = await request.post(`${API_BASE}/api/auth/login`, {
            data: 'not-json',
            headers: { 'Content-Type': 'text/plain' },
        });

        const body = await res.text();

        // Should not contain stack traces or file paths
        expect(body).not.toContain('node_modules');
        expect(body).not.toMatch(/at\s+\w+\.\w+\s+\(/);
        expect(body).not.toMatch(/\/app\/src\//);
    });
});

// ─── Req 16.6: Non-Existent Route → NotFound Page ──────────────────

test.describe('NotFound Page (Req 16.6)', () => {
    test('non-existent route shows NotFound page', async ({ page }) => {
        await page.goto(`${BASE}/this-route-does-not-exist-${Date.now()}`, {
            waitUntil: 'domcontentloaded',
            timeout: 15_000,
        });

        // Should show a 404 / NotFound page
        const bodyText = await page.locator('body').textContent();
        const hasNotFound =
            bodyText?.toLowerCase().includes('not found') ||
            bodyText?.toLowerCase().includes('404') ||
            bodyText?.toLowerCase().includes('page not found') ||
            bodyText?.toLowerCase().includes('does not exist');

        expect(hasNotFound, 'Non-existent route should show NotFound page').toBe(true);
    });
});

// ─── Req 16.7: Browser Refresh → Session Restore ───────────────────

test.describe('Session Restore on Refresh (Req 16.7)', () => {
    test('browser refresh preserves session via session-check', async ({ request }) => {
        // Login first
        const token = await getToken(request, 'student');

        // Call session-check endpoint (simulates what frontend does on refresh)
        const sessionRes = await request.get(`${API_BASE}/api/auth/session-check`, {
            headers: { Authorization: `Bearer ${token}` },
        });

        // Should return 200 with user data (session valid)
        // Or the endpoint may be /api/auth/me
        if (sessionRes.status() === 404) {
            // Try /api/auth/me as alternative
            const meRes = await request.get(`${API_BASE}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            expect(meRes.status()).toBe(200);
        } else {
            expect(sessionRes.status()).toBe(200);
        }
    });
});

// ─── Req 16.8: Registration Invalid Data → 400 ─────────────────────

test.describe('Registration Invalid Data (Req 16.8)', () => {
    test('registration with weak password → 400', async ({ request }) => {
        const res = await request.post(`${API_BASE}/api/auth/register`, {
            data: {
                username: 'qa-invalid-reg',
                email: 'qa-invalid-reg@campusway.test',
                password: '123', // Too weak
                fullName: 'QA Invalid',
            },
        });

        // Should reject with 400 (validation error)
        expect([400, 422]).toContain(res.status());

        const body = await res.json();
        expect(body.message || body.error || body.errors).toBeTruthy();
    });

    test('registration with duplicate email → 400 or 409', async ({ request }) => {
        const existingUser = getSeedUser('student');

        const res = await request.post(`${API_BASE}/api/auth/register`, {
            data: {
                username: `duplicate-${Date.now()}`,
                email: existingUser.email,
                password: 'StrongPass@123',
                fullName: 'Duplicate Test',
            },
        });

        // Should reject duplicate email
        expect([400, 409, 422]).toContain(res.status());
    });
});
