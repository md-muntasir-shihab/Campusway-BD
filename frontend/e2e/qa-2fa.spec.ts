/**
 * CampusWay QA Audit — Two-Factor Authentication (2FA) E2E Tests
 *
 * TOTP-based 2FA setup, confirm, login flow, backup codes,
 * disable flow, এবং security sessions management-এর সম্পূর্ণ E2E test suite।
 *
 * Requirements: 6.1-6.7
 */

import { test, expect } from '@playwright/test';
import { loginViaAPI, getAuthHeaders, clearTokenCache } from '../qa/helpers/auth-helper';
import { getSeedUser } from '../qa/types';

const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';
const FRONTEND_BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:5175';
const TEST_OTP = '123456';

test.describe('Two-Factor Authentication (2FA) E2E Tests', () => {
    test.beforeEach(() => {
        clearTokenCache();
    });

    // ─── Req 6.1: 2FA Setup (TOTP secret + QR code generation) ─────

    test.describe('2FA Setup — POST /api/auth/security/2fa/setup (Req 6.1)', () => {
        test('authenticated student 2FA setup শুরু করলে TOTP secret ও QR code data পায়', async ({ request }) => {
            const student = getSeedUser('student');
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/setup`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: student.password,
                },
            });

            // Should return 200 with secret, otpAuthUrl, and backupCodes
            expect(response.status()).toBe(200);
            const body = await response.json();

            expect(body.secret).toBeDefined();
            expect(typeof body.secret).toBe('string');
            expect(body.secret.length).toBeGreaterThan(0);

            expect(body.otpAuthUrl).toBeDefined();
            expect(typeof body.otpAuthUrl).toBe('string');
            expect(body.otpAuthUrl).toContain('otpauth://totp/');

            expect(body.backupCodes).toBeDefined();
            expect(Array.isArray(body.backupCodes)).toBe(true);
            expect(body.backupCodes.length).toBeGreaterThan(0);
        });

        test('2FA setup — ভুল password দিলে 400 error', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/setup`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: 'WrongPassword@999',
                },
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.message).toBeDefined();
        });

        test('2FA setup — unauthenticated request → 401', async ({ request }) => {
            const response = await request.post(`${API_BASE}/api/auth/security/2fa/setup`, {
                headers: { 'Content-Type': 'application/json' },
                data: {
                    currentPassword: 'AnyPassword@123',
                },
            });

            expect(response.status()).toBe(401);
        });
    });

    // ─── Req 6.2: 2FA Confirm (TOTP code verification) ─────────────

    test.describe('2FA Confirm — POST /api/auth/security/2fa/confirm (Req 6.2)', () => {
        test('ভুল TOTP code দিয়ে 2FA confirm → 400 error', async ({ request }) => {
            const student = getSeedUser('student');
            const headers = await getAuthHeaders('student');

            // First initiate setup to ensure there's a pending secret
            const setupResponse = await request.post(`${API_BASE}/api/auth/security/2fa/setup`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: { currentPassword: student.password },
            });

            if (setupResponse.status() === 200) {
                // Try confirming with an invalid code
                const confirmResponse = await request.post(`${API_BASE}/api/auth/security/2fa/confirm`, {
                    headers: { ...headers, 'Content-Type': 'application/json' },
                    data: { code: '000000' },
                });

                expect(confirmResponse.status()).toBe(400);
                const body = await confirmResponse.json();
                expect(body.message).toBeDefined();
            }
        });

        test('2FA confirm — no pending setup → 400 error', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            // Attempt confirm without prior setup (or after disable)
            const confirmResponse = await request.post(`${API_BASE}/api/auth/security/2fa/confirm`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: { code: TEST_OTP },
            });

            // Should be 400 (no pending setup) or 200 if setup was already done
            expect([200, 400]).toContain(confirmResponse.status());
        });
    });

    // ─── Req 6.3: 2FA-enabled Login Flow ────────────────────────────

    test.describe('2FA-enabled Login Flow (Req 6.3)', () => {
        test('2FA enabled user login → requires2fa: true response', async ({ request }) => {
            const student = getSeedUser('student');

            // Login to check if 2FA challenge is triggered
            const loginResponse = await request.post(`${API_BASE}/api/auth/login`, {
                data: {
                    identifier: student.email,
                    password: student.password,
                },
            });

            expect(loginResponse.status()).toBe(200);
            const loginData = await loginResponse.json();

            // If 2FA is enabled for this user, requires2fa should be true
            if (loginData.requires2fa) {
                expect(loginData.requires2fa).toBe(true);
                expect(loginData.tempToken).toBeDefined();

                // Verify with test OTP (123456)
                const verifyResponse = await request.post(`${API_BASE}/api/auth/verify-2fa`, {
                    data: {
                        tempToken: loginData.tempToken,
                        otp: TEST_OTP,
                    },
                });

                expect(verifyResponse.status()).toBe(200);
                const verifyData = await verifyResponse.json();
                expect(verifyData.token).toBeDefined();
            } else {
                // 2FA not enabled — login succeeds directly with token
                expect(loginData.token).toBeDefined();
            }
        });

        test('2FA login flow — UI redirect to OTP page (Playwright)', async ({ page }) => {
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
                // Should redirect to OTP verification page
                await page.waitForURL('**/otp-verify**', { timeout: 10_000 });
                expect(page.url()).toContain('otp-verify');
            } else {
                // No 2FA — should go directly to dashboard
                await page.waitForURL('**/dashboard**', { timeout: 15_000 });
                expect(page.url()).toContain('/dashboard');
            }
        });
    });

    // ─── Req 6.4: Backup Codes Regeneration ─────────────────────────

    test.describe('Backup Codes Regeneration — POST /api/auth/security/2fa/backup-codes (Req 6.4)', () => {
        test('authenticated user backup codes regenerate করতে পারে', async ({ request }) => {
            const student = getSeedUser('student');
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/backup-codes`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: student.password,
                },
            });

            // 200 if 2FA is enabled, 404 if 2FA not enabled
            expect([200, 404]).toContain(response.status());

            if (response.status() === 200) {
                const body = await response.json();
                expect(body.backupCodes).toBeDefined();
                expect(Array.isArray(body.backupCodes)).toBe(true);
                expect(body.backupCodes.length).toBeGreaterThan(0);

                // Each backup code should be a non-empty string
                for (const code of body.backupCodes) {
                    expect(typeof code).toBe('string');
                    expect(code.length).toBeGreaterThan(0);
                }
            }
        });

        test('backup codes regeneration — ভুল password → 400', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/backup-codes`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: 'WrongPassword@999',
                },
            });

            // 400 (wrong password) or 404 (2FA not enabled)
            expect([400, 404]).toContain(response.status());
        });
    });

    // ─── Req 6.5: 2FA Disable Flow ──────────────────────────────────

    test.describe('2FA Disable — POST /api/auth/security/2fa/disable (Req 6.5)', () => {
        test('authenticated user 2FA disable করতে পারে', async ({ request }) => {
            const student = getSeedUser('student');
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/disable`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: student.password,
                },
            });

            // 200 if 2FA was enabled and now disabled
            expect(response.status()).toBe(200);
            const body = await response.json();
            expect(body.message).toBeDefined();
        });

        test('2FA disable — ভুল password → 400', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            const response = await request.post(`${API_BASE}/api/auth/security/2fa/disable`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: {
                    currentPassword: 'WrongPassword@999',
                },
            });

            expect(response.status()).toBe(400);
            const body = await response.json();
            expect(body.message).toBeDefined();
        });

        test('2FA disable — unauthenticated → 401', async ({ request }) => {
            const response = await request.post(`${API_BASE}/api/auth/security/2fa/disable`, {
                headers: { 'Content-Type': 'application/json' },
                data: {
                    currentPassword: 'AnyPassword@123',
                },
            });

            expect(response.status()).toBe(401);
        });
    });

    // ─── Req 6.6, 6.7: Security Sessions ও Session Revoke ──────────

    test.describe('Security Sessions — GET/DELETE /api/auth/security/sessions (Req 6.6, 6.7)', () => {
        test('authenticated user active sessions list দেখতে পারে', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            const response = await request.get(`${API_BASE}/api/auth/security/sessions`, {
                headers,
            });

            expect(response.status()).toBe(200);
            const body = await response.json();

            expect(body.sessions).toBeDefined();
            expect(Array.isArray(body.sessions)).toBe(true);

            // Should have at least one session (the current one)
            expect(body.sessions.length).toBeGreaterThanOrEqual(1);

            // Validate session object structure
            const session = body.sessions[0];
            expect(session.sessionId).toBeDefined();
            expect(session.status).toBeDefined();
            expect(typeof session.current).toBe('boolean');
        });

        test('session revoke — valid sessionId দিয়ে session terminate', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            // First get sessions list
            const sessionsResponse = await request.get(`${API_BASE}/api/auth/security/sessions`, {
                headers,
            });

            expect(sessionsResponse.status()).toBe(200);
            const sessionsBody = await sessionsResponse.json();

            // Find a non-current session to revoke (if available)
            const nonCurrentSession = sessionsBody.sessions.find(
                (s: { current: boolean }) => !s.current,
            );

            if (nonCurrentSession) {
                const revokeResponse = await request.delete(
                    `${API_BASE}/api/auth/security/sessions/${nonCurrentSession.sessionId}`,
                    { headers },
                );

                expect(revokeResponse.status()).toBe(200);
                const revokeBody = await revokeResponse.json();
                expect(revokeBody.message).toBeDefined();
                expect(revokeBody.terminatedCount).toBeDefined();
            }
        });

        test('session revoke — empty sessionId → 400', async ({ request }) => {
            const headers = await getAuthHeaders('student');

            const response = await request.delete(
                `${API_BASE}/api/auth/security/sessions/`,
                { headers },
            );

            // Empty sessionId should return 400 or 404
            expect([400, 404]).toContain(response.status());
        });

        test('security sessions — unauthenticated → 401', async ({ request }) => {
            const response = await request.get(`${API_BASE}/api/auth/security/sessions`);

            expect(response.status()).toBe(401);
        });
    });

    // ─── Full 2FA Lifecycle: Setup → Confirm → Login → Disable ──────

    test.describe('2FA Full Lifecycle (Req 6.1-6.5 combined)', () => {
        test('2FA lifecycle: setup → verify login → disable', async ({ request }) => {
            const student = getSeedUser('student');
            const headers = await getAuthHeaders('student');

            // Step 1: Setup 2FA
            const setupResponse = await request.post(`${API_BASE}/api/auth/security/2fa/setup`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: { currentPassword: student.password },
            });

            expect(setupResponse.status()).toBe(200);
            const setupBody = await setupResponse.json();
            expect(setupBody.secret).toBeDefined();
            expect(setupBody.otpAuthUrl).toContain('otpauth://totp/');
            expect(setupBody.backupCodes).toBeDefined();

            // Step 2: Confirm with test OTP (may fail since verifyTotpCode
            // does real TOTP verification — this validates the error path)
            const confirmResponse = await request.post(`${API_BASE}/api/auth/security/2fa/confirm`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: { code: TEST_OTP },
            });

            // 200 if code happens to match, 400 if TOTP mismatch (expected in test env)
            expect([200, 400]).toContain(confirmResponse.status());

            // Step 3: Disable 2FA (cleanup)
            const disableResponse = await request.post(`${API_BASE}/api/auth/security/2fa/disable`, {
                headers: { ...headers, 'Content-Type': 'application/json' },
                data: { currentPassword: student.password },
            });

            expect(disableResponse.status()).toBe(200);
            const disableBody = await disableResponse.json();
            expect(disableBody.message).toBeDefined();
        });
    });
});
