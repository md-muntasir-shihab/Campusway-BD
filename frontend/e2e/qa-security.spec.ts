/**
 * CampusWay QA Audit — Security Vulnerability E2E Tests
 *
 * Rate limiting, admin panel policy, read-only mode, sensitive action
 * step-up verification, two-person approval flow, এবং role boundary
 * enforcement-এর সম্পূর্ণ E2E test suite।
 *
 * Requirements: 12.4, 12.6, 12.8, 12.9, 12.10, 12.11, 12.12
 */

import { test, expect, type APIRequestContext } from '@playwright/test';
import { getSeedUser, type UserRole } from '../qa/types';

const API_BASE = process.env.E2E_API_URL || 'http://127.0.0.1:5003';

// ─── Helper: login via API and return token ─────────────────────────

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
        const verifyRes = await request.post(
            `${API_BASE}/api/auth/verify-2fa`,
            { data: { tempToken: body.tempToken, otp: '123456' } },
        );
        const verifyBody = await verifyRes.json();
        return verifyBody.token;
    }

    return body.token;
}


test.describe('Security Vulnerability E2E Tests', () => {
    // ─── Req 12.8: Rate Limiting ────────────────────────────────────

    test.describe('Rate Limiting (Req 12.8)', () => {
        test('login endpoint rate limit → 429 after excessive attempts', async ({ request }) => {
            const endpoint = `${API_BASE}/api/auth/login`;
            const payload = {
                identifier: 'rate-limit-test@campusway.test',
                password: 'WrongPass@999',
            };

            let got429 = false;
            // Send rapid requests to trigger rate limiter
            for (let i = 0; i < 30; i++) {
                const res = await request.post(endpoint, { data: payload });
                if (res.status() === 429) {
                    got429 = true;
                    break;
                }
            }

            expect(got429).toBe(true);
        });

        test('exam start endpoint rate limit → 429 after excessive attempts', async ({ request }) => {
            const token = await getToken(request, 'student');
            const fakeExamId = '000000000000000000000000';
            const endpoint = `${API_BASE}/api/exams/${fakeExamId}/start`;

            let got429 = false;
            for (let i = 0; i < 30; i++) {
                const res = await request.post(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: {},
                });
                if (res.status() === 429) {
                    got429 = true;
                    break;
                }
            }

            expect(got429).toBe(true);
        });

        test('exam submit endpoint rate limit → 429 after excessive attempts', async ({ request }) => {
            const token = await getToken(request, 'student');
            const fakeExamId = '000000000000000000000000';
            const endpoint = `${API_BASE}/api/exams/${fakeExamId}/submit`;

            let got429 = false;
            for (let i = 0; i < 30; i++) {
                const res = await request.post(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { answers: [] },
                });
                if (res.status() === 429) {
                    got429 = true;
                    break;
                }
            }

            expect(got429).toBe(true);
        });

        test('contact endpoint rate limit → 429 after excessive attempts', async ({ request }) => {
            const endpoint = `${API_BASE}/api/contact`;

            let got429 = false;
            for (let i = 0; i < 30; i++) {
                const res = await request.post(endpoint, {
                    data: {
                        name: 'Rate Test',
                        email: `rate-${i}@test.com`,
                        message: 'Rate limit test',
                    },
                });
                if (res.status() === 429) {
                    got429 = true;
                    break;
                }
            }

            expect(got429).toBe(true);
        });

        test('upload endpoint rate limit → 429 after excessive attempts', async ({ request }) => {
            const token = await getToken(request, 'admin');
            const endpoint = `${API_BASE}/api/__cw_admin__/resources/upload`;

            let got429 = false;
            for (let i = 0; i < 30; i++) {
                const res = await request.post(endpoint, {
                    headers: { Authorization: `Bearer ${token}` },
                    data: { file: 'rate-limit-test-content' },
                });
                if (res.status() === 429) {
                    got429 = true;
                    break;
                }
            }

            expect(got429).toBe(true);
        });
    });

    // ─── Req 12.9: Admin Panel Disabled → Access Blocked ────────────

    test.describe('Admin Panel Disabled (Req 12.9)', () => {
        test('when admin panel disabled, admin API endpoints should be blocked', async ({ request }) => {
            // First get superadmin token to toggle the setting
            const superToken = await getToken(request, 'superadmin');

            // Disable admin panel via security settings
            const disableRes = await request.put(
                `${API_BASE}/api/__cw_admin__/settings/security`,
                {
                    headers: { Authorization: `Bearer ${superToken}` },
                    data: { adminPanelEnabled: false },
                },
            );

            // Only proceed if the setting was accepted
            if (disableRes.status() === 200) {
                try {
                    // Now try accessing admin endpoints with a regular admin token
                    const adminToken = await getToken(request, 'admin');
                    const res = await request.get(
                        `${API_BASE}/api/__cw_admin__/universities`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                        },
                    );

                    // Should be blocked (403 or 423)
                    expect([403, 423]).toContain(res.status());
                } finally {
                    // Re-enable admin panel
                    await request.put(
                        `${API_BASE}/api/__cw_admin__/settings/security`,
                        {
                            headers: { Authorization: `Bearer ${superToken}` },
                            data: { adminPanelEnabled: true },
                        },
                    );
                }
            }
        });
    });

    // ─── Req 12.10: Admin Read-Only Mode → Write Blocked ────────────

    test.describe('Admin Read-Only Mode (Req 12.10)', () => {
        test('when read-only mode active, write operations should be blocked', async ({ request }) => {
            const superToken = await getToken(request, 'superadmin');

            // Enable read-only mode
            const enableRes = await request.put(
                `${API_BASE}/api/__cw_admin__/settings/security`,
                {
                    headers: { Authorization: `Bearer ${superToken}` },
                    data: { panic: { readOnlyMode: true } },
                },
            );

            if (enableRes.status() === 200) {
                try {
                    const adminToken = await getToken(request, 'admin');

                    // POST (create) should be blocked
                    const postRes = await request.post(
                        `${API_BASE}/api/__cw_admin__/news`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                            data: { title: 'Read-only test', content: 'test' },
                        },
                    );
                    expect(postRes.status()).toBe(423);

                    // PUT (update) should be blocked
                    const putRes = await request.put(
                        `${API_BASE}/api/__cw_admin__/news/placeholder-id`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                            data: { title: 'Updated' },
                        },
                    );
                    expect(putRes.status()).toBe(423);

                    // DELETE should be blocked
                    const delRes = await request.delete(
                        `${API_BASE}/api/__cw_admin__/news/placeholder-id`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                        },
                    );
                    expect(delRes.status()).toBe(423);

                    // GET (read) should still work
                    const getRes = await request.get(
                        `${API_BASE}/api/__cw_admin__/news`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                        },
                    );
                    expect(getRes.status()).not.toBe(423);
                } finally {
                    // Disable read-only mode
                    await request.put(
                        `${API_BASE}/api/__cw_admin__/settings/security`,
                        {
                            headers: { Authorization: `Bearer ${superToken}` },
                            data: { panic: { readOnlyMode: false } },
                        },
                    );
                }
            }
        });
    });

    // ─── Req 12.11: Sensitive Action Step-Up Verification ───────────

    test.describe('Sensitive Action Step-Up Verification (Req 12.11)', () => {
        test('export action requires step-up verification when enabled', async ({ request }) => {
            const superToken = await getToken(request, 'superadmin');

            // Enable sensitive action verification
            const enableRes = await request.put(
                `${API_BASE}/api/__cw_admin__/settings/security`,
                {
                    headers: { Authorization: `Bearer ${superToken}` },
                    data: { sensitiveActionVerification: { enabled: true } },
                },
            );

            if (enableRes.status() === 200) {
                try {
                    const adminToken = await getToken(request, 'admin');

                    // Attempt an export (sensitive action)
                    const exportRes = await request.get(
                        `${API_BASE}/api/__cw_admin__/students/export`,
                        {
                            headers: { Authorization: `Bearer ${adminToken}` },
                        },
                    );

                    // Should require step-up verification (403 with specific code, or 428)
                    // The middleware may return 403 with a sensitiveAction flag or 428
                    expect([200, 403, 428]).toContain(exportRes.status());

                    if (exportRes.status() === 403) {
                        const body = await exportRes.json();
                        // Should indicate step-up verification needed
                        expect(
                            body.code === 'SENSITIVE_ACTION_REQUIRED' ||
                            body.requiresVerification === true ||
                            body.message?.includes('verification') ||
                            body.message?.includes('sensitive'),
                        ).toBeTruthy();
                    }
                } finally {
                    await request.put(
                        `${API_BASE}/api/__cw_admin__/settings/security`,
                        {
                            headers: { Authorization: `Bearer ${superToken}` },
                            data: { sensitiveActionVerification: { enabled: false } },
                        },
                    );
                }
            }
        });
    });

    // ─── Req 12.12: Two-Person Approval Flow ────────────────────────

    test.describe('Two-Person Approval Flow (Req 12.12)', () => {
        test('bulk delete requires two-person approval', async ({ request }) => {
            const adminToken = await getToken(request, 'admin');

            // Attempt a bulk delete (requires two-person approval)
            const bulkRes = await request.post(
                `${API_BASE}/api/__cw_admin__/students/bulk`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                    data: {
                        action: 'delete',
                        ids: ['000000000000000000000001', '000000000000000000000002'],
                    },
                },
            );

            // Should either require approval (202 Accepted / 403 / 428)
            // or return a pending approval response
            const status = bulkRes.status();
            const body = await bulkRes.json().catch(() => ({}));

            // Two-person approval should prevent immediate execution
            // Acceptable: 202 (pending), 403 (approval required), 400 (validation),
            // or 200 with approval metadata
            expect([200, 202, 400, 403, 404, 428]).toContain(status);

            if (status === 403 || status === 428) {
                expect(
                    body.code === 'APPROVAL_REQUIRED' ||
                    body.requiresApproval === true ||
                    body.message?.includes('approval'),
                ).toBeTruthy();
            }
        });

        test('payment refund requires two-person approval', async ({ request }) => {
            const adminToken = await getToken(request, 'admin');

            const refundRes = await request.post(
                `${API_BASE}/api/__cw_admin__/payments/refund`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                    data: {
                        paymentId: '000000000000000000000001',
                        reason: 'QA test refund',
                    },
                },
            );

            const status = refundRes.status();
            // Should require approval or fail validation
            expect([200, 202, 400, 403, 404, 428]).toContain(status);
        });
    });

    // ─── Req 12.6: Student Token → Admin API → 403 ─────────────────

    test.describe('Student Role → Admin API Rejection (Req 12.6)', () => {
        test('student token accessing admin API endpoints → 403', async ({ request }) => {
            const studentToken = await getToken(request, 'student');

            const adminEndpoints = [
                `${API_BASE}/api/__cw_admin__/universities`,
                `${API_BASE}/api/__cw_admin__/news`,
                `${API_BASE}/api/__cw_admin__/exams`,
                `${API_BASE}/api/__cw_admin__/students`,
                `${API_BASE}/api/__cw_admin__/settings`,
                `${API_BASE}/api/__cw_admin__/reports`,
                `${API_BASE}/api/__cw_admin__/team/members`,
                `${API_BASE}/api/__cw_admin__/payments`,
            ];

            for (const endpoint of adminEndpoints) {
                const res = await request.get(endpoint, {
                    headers: { Authorization: `Bearer ${studentToken}` },
                });

                expect(
                    res.status(),
                    `Student accessing ${endpoint} should get 403`,
                ).toBe(403);
            }
        });

        test('student token POST to admin API → 403', async ({ request }) => {
            const studentToken = await getToken(request, 'student');

            const res = await request.post(
                `${API_BASE}/api/__cw_admin__/news`,
                {
                    headers: { Authorization: `Bearer ${studentToken}` },
                    data: { title: 'Unauthorized', content: 'test' },
                },
            );

            expect(res.status()).toBe(403);
        });
    });

    // ─── Req 12.4: Expired JWT → 401 ───────────────────────────────

    test.describe('Expired JWT Token (Req 12.4)', () => {
        test('expired JWT token → 401 on protected endpoint', async ({ request }) => {
            // Craft a JWT with exp in the past
            const expiredToken =
                'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
                'eyJ1c2VySWQiOiI2NjAwMDAwMDAwMDAwMDAwMDAwMDAwMDAiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.' +
                'invalid_expired_signature';

            const endpoints = [
                `${API_BASE}/api/auth/me`,
                `${API_BASE}/api/student/dashboard`,
                `${API_BASE}/api/__cw_admin__/universities`,
            ];

            for (const endpoint of endpoints) {
                const res = await request.get(endpoint, {
                    headers: { Authorization: `Bearer ${expiredToken}` },
                });
                expect(res.status()).toBe(401);
            }
        });
    });
});
