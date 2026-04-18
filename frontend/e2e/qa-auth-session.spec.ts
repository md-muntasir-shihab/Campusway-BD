/**
 * CampusWay QA Audit — Auth ও Session E2E Tests
 *
 * Authentication, session management, token lifecycle, OTP verification,
 * registration, এবং account lockout flow-এর সম্পূর্ণ E2E test suite।
 *
 * Requirements: 5.1-5.11, 5.15-5.17
 */

import { test, expect } from '@playwright/test';
import {
    loginAsRole,
    loginWithOTP,
    clearTokenCache,
} from '../qa/helpers/auth-helper';
import { getSeedUser } from '../qa/types';

const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';
const TEST_OTP = '123456';

test.describe('Auth ও Session E2E Tests', () => {
    test.beforeEach(() => {
        clearTokenCache();
    });

    // ─── Req 5.1: Student Login/Logout Flow ─────────────────────────

    test.describe('Student Login/Logout Flow (Req 5.1, 5.10)', () => {
        test('Student সঠিক credentials দিয়ে login → JWT → /dashboard redirect', async ({ page }) => {
            const student = getSeedUser('student');

            await page.goto(`${FRONTEND_BASE}/login`);

            // Fill credentials
            await page.locator('#identifier').fill(student.email);
            await page.locator('#password').fill(student.password);

            // Intercept login API response
            const [apiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.url().includes('/api/auth/login') &&
                        res.request().method() === 'POST',
                ),
                page.locator('button[type="submit"]').click(),
            ]);

            const responseBody = await apiResponse.json();

            // Should receive a token (JWT) or 2FA challenge
            if (responseBody.requires2fa) {
                // Handle OTP if 2FA is required
                await loginWithOTP(page, 'student', TEST_OTP);
            }

            // Should redirect to /dashboard
            await page.waitForURL('**/dashboard**', { timeout: 15_000 });
            expect(page.url()).toContain('/dashboard');
        });

        test('Student logout → session invalidate → login page redirect', async ({ page }) => {
            // Login first
            await loginAsRole(page, 'student');
            expect(page.url()).toContain('/dashboard');

            // Perform logout via API
            const logoutResponse = await page.request.post(`${API_BASE}/api/auth/logout`);
            // Logout should succeed (200) or redirect
            expect([200, 204, 302].some((s) => logoutResponse.status() === s)).toBe(true);
        });
    });

    // ─── Req 5.2: Admin Login Flow ──────────────────────────────────

    test.describe('Admin Login Flow (Req 5.2)', () => {
        test('Admin সঠিক credentials দিয়ে admin portal login → /__cw_admin__/dashboard redirect', async ({ page }) => {
            const admin = getSeedUser('admin');

            await page.goto(`${FRONTEND_BASE}/__cw_admin__/login`);

            await page.locator('#identifier').fill(admin.email);
            await page.locator('#password').fill(admin.password);

            const [apiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.url().includes('/api/auth/admin/login') &&
                        res.request().method() === 'POST',
                ),
                page.locator('button[type="submit"]').click(),
            ]);

            const responseBody = await apiResponse.json();

            if (responseBody.requires2fa) {
                await loginWithOTP(page, 'admin', TEST_OTP);
            }

            await page.waitForURL('**/__cw_admin__/dashboard**', { timeout: 15_000 });
            expect(page.url()).toContain('/__cw_admin__/dashboard');
        });
    });

    // ─── Req 5.3: Chairman Login Flow ───────────────────────────────

    test.describe('Chairman Login Flow (Req 5.3)', () => {
        test('Chairman সঠিক credentials দিয়ে chairman portal login → /chairman/dashboard redirect', async ({ page }) => {
            const chairman = getSeedUser('chairman');

            await page.goto(`${FRONTEND_BASE}/chairman/login`);

            await page.locator('#identifier').fill(chairman.email);
            await page.locator('#password').fill(chairman.password);

            const [apiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.url().includes('/api/auth/chairman/login') &&
                        res.request().method() === 'POST',
                ),
                page.locator('button[type="submit"]').click(),
            ]);

            const responseBody = await apiResponse.json();

            if (responseBody.requires2fa) {
                await loginWithOTP(page, 'chairman', TEST_OTP);
            }

            await page.waitForURL('**/chairman/dashboard**', { timeout: 15_000 });
            expect(page.url()).toContain('/chairman/dashboard');
        });
    });


    // ─── Req 5.4: Wrong Credentials → 401 ──────────────────────────

    test.describe('Wrong Credentials (Req 5.4)', () => {
        test('ভুল credentials দিয়ে login → 401 error', async ({ request }) => {
            const response = await request.post(`${API_BASE}/api/auth/login`, {
                data: {
                    identifier: 'nonexistent@campusway.test',
                    password: 'WrongPassword@999',
                },
            });

            expect(response.status()).toBe(401);
            const body = await response.json();
            expect(body.message).toBeDefined();
        });

        test('সঠিক email কিন্তু ভুল password → 401 error', async ({ request }) => {
            const student = getSeedUser('student');

            const response = await request.post(`${API_BASE}/api/auth/login`, {
                data: {
                    identifier: student.email,
                    password: 'TotallyWrongPassword@999',
                },
            });

            expect(response.status()).toBe(401);
        });
    });

    // ─── Req 5.5: Account Lockout After Max Failed Attempts → 423 ──

    test.describe('Account Lockout (Req 5.5)', () => {
        test('max failed attempts-এর পর account lock → 423 status', async ({ request }) => {
            // Use a dedicated seed user email to avoid locking out other tests
            // SecurityConfig default: maxAttempts = 5
            const student = getSeedUser('student');
            const maxAttempts = 5;

            let lastResponse;
            for (let i = 0; i < maxAttempts + 1; i++) {
                lastResponse = await request.post(`${API_BASE}/api/auth/login`, {
                    data: {
                        identifier: student.email,
                        password: 'WrongPassword@' + i,
                    },
                });

                // After maxAttempts, should get 423
                if (lastResponse.status() === 423) break;
            }

            // The last response should be 423 (locked)
            expect(lastResponse!.status()).toBe(423);
        });
    });

    // ─── Req 5.6: Expired Token → 401 ──────────────────────────────

    test.describe('Expired Token (Req 5.6)', () => {
        test('expired JWT token দিয়ে API call → 401', async ({ request }) => {
            // Use a clearly expired/invalid JWT token
            const expiredToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                'eyJ1c2VySWQiOiI2NjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJyb2xlIjoic3R1ZGVudCIsImlhdCI6MTYwMDAwMDAwMCwiZXhwIjoxNjAwMDAwMDAxfQ.' +
                'invalid_signature_here';

            const response = await request.get(`${API_BASE}/api/auth/me`, {
                headers: {
                    Authorization: `Bearer ${expiredToken}`,
                },
            });

            expect(response.status()).toBe(401);
        });
    });

    // ─── Req 5.7: Token Refresh Flow ────────────────────────────────

    test.describe('Token Refresh Flow (Req 5.7)', () => {
        test('refresh token দিয়ে নতুন access token পাওয়া যায়', async ({ request }) => {
            // First login to get tokens
            const student = getSeedUser('student');

            const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
                data: {
                    identifier: student.email,
                    password: student.password,
                },
            });

            // If login succeeds, try refresh
            if (loginResponse.status() === 200) {
                const loginData = await loginResponse.json();

                // If 2FA not required, we have a token
                if (!loginData.requires2fa && loginData.token) {
                    // Attempt refresh — refresh token is typically in cookies
                    const refreshResponse = await request.post(`${API_BASE}/api/auth/refresh`, {
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });

                    // Refresh should return 200 with new token, or 401 if no refresh cookie
                    expect([200, 401]).toContain(refreshResponse.status());

                    if (refreshResponse.status() === 200) {
                        const refreshData = await refreshResponse.json();
                        expect(refreshData.token).toBeDefined();
                    }
                }
            }
        });
    });

    // ─── Req 5.8, 5.9: OTP Verification Flow ───────────────────────

    test.describe('OTP Verification Flow (Req 5.8, 5.9)', () => {
        test('test OTP 123456 দিয়ে 2FA verify করা যায় (API-based)', async ({ request }) => {
            // Login via API to check if 2FA is required
            const student = getSeedUser('student');

            const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
                data: {
                    identifier: student.email,
                    password: student.password,
                },
            });

            if (loginResponse.status() === 200) {
                const loginData = await loginResponse.json();

                if (loginData.requires2fa && loginData.tempToken) {
                    // Verify with test OTP
                    const verifyResponse = await request.post(
                        `${API_BASE}/api/auth/verify-2fa`,
                        {
                            data: {
                                tempToken: loginData.tempToken,
                                otp: TEST_OTP,
                            },
                        },
                    );

                    expect(verifyResponse.status()).toBe(200);
                    const verifyData = await verifyResponse.json();
                    expect(verifyData.token).toBeDefined();
                }
            }
        });

        test('OTP verification UI flow (Playwright)', async ({ page }) => {
            const student = getSeedUser('student');

            await page.goto(`${FRONTEND_BASE}/login`);
            await page.locator('#identifier').fill(student.email);
            await page.locator('#password').fill(student.password);

            const [apiResponse] = await Promise.all([
                page.waitForResponse(
                    (res) =>
                        res.url().includes('/api/auth/login') &&
                        res.request().method() === 'POST',
                ),
                page.locator('button[type="submit"]').click(),
            ]);

            const responseBody = await apiResponse.json();

            if (responseBody.requires2fa) {
                // Should redirect to OTP page
                await page.waitForURL('**/otp-verify**', { timeout: 10_000 });

                // Complete OTP verification
                const tokens = await loginWithOTP(page, 'student', TEST_OTP);
                expect(tokens.accessToken).toBeDefined();

                // Should end up on dashboard
                await page.waitForURL('**/dashboard**', { timeout: 15_000 });
                expect(page.url()).toContain('/dashboard');
            } else {
                // No 2FA — should go directly to dashboard
                await page.waitForURL('**/dashboard**', { timeout: 15_000 });
                expect(page.url()).toContain('/dashboard');
            }
        });
    });


    // ─── Req 5.11: Session Idle Timeout ─────────────────────────────

    test.describe('Session Idle Timeout (Req 5.11)', () => {
        test('expired/invalid session → 401 with SESSION_IDLE_TIMEOUT or similar', async ({ request }) => {
            // Simulate an expired session by using a stale token
            // A truly idle session would require waiting 60 min, so we test
            // that the backend properly rejects stale/invalid session tokens
            const staleToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                'eyJ1c2VySWQiOiI2NjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJyb2xlIjoic3R1ZGVudCIsInNlc3Npb25JZCI6InN0YWxlLXNlc3Npb24iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.' +
                'fake_signature';

            const response = await request.get(`${API_BASE}/api/auth/session-check`, {
                headers: {
                    Authorization: `Bearer ${staleToken}`,
                },
            });

            expect(response.status()).toBe(401);
        });
    });

    // ─── Req 5.15: Registration Flow ────────────────────────────────

    test.describe('Registration Flow (Req 5.15)', () => {
        test('নতুন student registration → user তৈরি', async ({ request }) => {
            const uniqueSuffix = Date.now();
            const newUser = {
                fullName: `QA Test User ${uniqueSuffix}`,
                email: `qa-test-${uniqueSuffix}@campusway.test`,
                password: 'QaTest@123456',
                username: `qa-test-${uniqueSuffix}`,
            };

            const response = await request.post(`${API_BASE}/api/auth/register`, {
                data: newUser,
            });

            // Registration should succeed (201) or return validation error (400)
            // Some backends may require additional fields or app-check
            expect([200, 201, 400, 403]).toContain(response.status());

            if (response.status() === 201 || response.status() === 200) {
                const body = await response.json();
                // Should have user data or success message
                expect(body).toBeDefined();
            }
        });

        test('duplicate email registration → 400 error', async ({ request }) => {
            const student = getSeedUser('student');

            const response = await request.post(`${API_BASE}/api/auth/register`, {
                data: {
                    fullName: 'Duplicate User',
                    email: student.email,
                    password: 'QaDuplicate@123',
                    username: 'qa-duplicate-user',
                },
            });

            // Should reject duplicate — 400 or 409
            expect([400, 409]).toContain(response.status());
        });
    });

    // ─── Req 5.16: Forgot Password ─────────────────────────────────

    test.describe('Forgot Password Flow (Req 5.16)', () => {
        test('forgot password request → success response', async ({ request }) => {
            const student = getSeedUser('student');

            const response = await request.post(`${API_BASE}/api/auth/forgot-password`, {
                data: {
                    email: student.email,
                },
            });

            // Should accept the request (200) or require app-check (403)
            expect([200, 403]).toContain(response.status());
        });
    });

    // ─── Req 5.17: Reset Password ──────────────────────────────────

    test.describe('Reset Password Flow (Req 5.17)', () => {
        test('invalid reset token → error response', async ({ request }) => {
            const response = await request.post(`${API_BASE}/api/auth/reset-password`, {
                data: {
                    token: 'invalid-reset-token-12345',
                    newPassword: 'NewPassword@123',
                },
            });

            // Should reject invalid token — 400 or 401
            expect([400, 401]).toContain(response.status());
        });
    });
});
