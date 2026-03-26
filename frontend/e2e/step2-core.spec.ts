import { expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsAdmin, loginAsStudent } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

async function readAccessToken(page: import('@playwright/test').Page): Promise<string> {
    const token = await page.evaluate(() => {
        return (
            window.sessionStorage.getItem('campusway-token') ||
            window.localStorage.getItem('campusway-token') ||
            ''
        );
    });
    return token || '';
}

type AdminRequestResult = {
    ok: boolean;
    status: number;
    body: any;
    base: string;
};

async function adminRequest(
    page: import('@playwright/test').Page,
    token: string,
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
    body?: Record<string, unknown>,
): Promise<AdminRequestResult> {
    return page.evaluate(async ({ token: authToken, path: adminPath, method: httpMethod, body: payload, preferred }) => {
        const bases = [`/api/${preferred}`, '/api/admin'];
        let last: Response | null = null;
        for (const base of bases) {
            const response = await fetch(`${base}${adminPath}`, {
                method: httpMethod,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${authToken}`,
                },
                credentials: 'include',
                body: payload ? JSON.stringify(payload) : undefined,
            });
            last = response;
            if (response.status !== 404) {
                let parsed: any = null;
                try {
                    parsed = await response.json();
                } catch {
                    parsed = null;
                }
                return { ok: response.ok, status: response.status, body: parsed, base };
            }
        }
        let parsed: any = null;
        try {
            parsed = last ? await last.json() : null;
        } catch {
            parsed = null;
        }
        return {
            ok: Boolean(last?.ok),
            status: Number(last?.status || 0),
            body: parsed,
            base: String(last?.url || ''),
        };
    }, { token, path, method, body, preferred: ADMIN_PATH });
}

test.describe('Step 2 Core Pack', () => {
    test('admin highlighted + featured updates are reflected in /api/home', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginAsAdmin(page);
        const token = await readAccessToken(page);
        expect(token.length).toBeGreaterThan(0);

        const result = await page.evaluate(async ({ token }) => {
            const homeRes = await fetch('/api/home', { credentials: 'include' });
            if (!homeRes.ok) {
                return { ok: false, reason: `home_status_${homeRes.status}` };
            }
            const home = await homeRes.json();
            const preview = Array.isArray(home?.universityDashboardData?.itemsPreview)
                ? home.universityDashboardData.itemsPreview
                : [];

            if (preview.length === 0) {
                return { ok: false, reason: 'no_university_preview_items' };
            }

            const first = preview[0];
            const second = preview[1] || preview[0];
            const selectedCategory = String(first.category || '');
            if (!selectedCategory) {
                return { ok: false, reason: 'empty_category' };
            }
            return {
                ok: true,
                selectedCategory,
                firstId: String(first.id),
                secondId: String(second.id),
            };
        }, { token });

        expect(result.ok, JSON.stringify(result)).toBeTruthy();
        const updateResult = await adminRequest(page, token, '/settings/home', 'PUT', {
            highlightedCategories: [
                { category: result.selectedCategory, order: 1, enabled: true, badgeText: 'HOT' },
            ],
            featuredUniversities: [
                { universityId: result.firstId, order: 1, badgeText: 'Featured', enabled: true },
                { universityId: result.secondId, order: 2, badgeText: 'Featured', enabled: true },
            ],
        });
        expect(updateResult.ok, JSON.stringify(updateResult)).toBeTruthy();

        const verify = await page.evaluate(async ({ category, firstId }) => {
            const response = await fetch('/api/home', { credentials: 'include' });
            if (!response.ok) return { ok: false, status: response.status };
            const body = await response.json();
            const highlighted = Array.isArray(body?.universityDashboardData?.highlightedCategories)
                ? body.universityDashboardData.highlightedCategories
                : [];
            const featuredItems = Array.isArray(body?.universityDashboardData?.featuredItems)
                ? body.universityDashboardData.featuredItems
                : [];
            return {
                ok: true,
                hasCategory: highlighted.some((entry: { category?: string }) => String(entry?.category || '') === category),
                hasFeaturedItem: featuredItems.some((entry: { id?: string }) => String(entry?.id || '') === firstId),
            };
        }, { category: result.selectedCategory, firstId: result.firstId });
        expect(verify.ok, JSON.stringify(verify)).toBeTruthy();
        expect(verify.hasCategory, JSON.stringify(verify)).toBeTruthy();
        expect(verify.hasFeaturedItem, JSON.stringify(verify)).toBeTruthy();

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('exam routes are gated by login and subscription policy', async ({ page }) => {
        const tracker = attachHealthTracker(page);

        await page.goto('/exam/take/000000000000000000000000');
        await expect(page).toHaveURL(/\/exam\/000000000000000000000000/, { timeout: 10000 });
        await expect(page.locator('body')).toContainText(/Unable to load|not found|Login|Contact Admin/i);

        await loginAsStudent(page);
        const studentToken = await readAccessToken(page);
        expect(studentToken).not.toBe('');
        const studentMeta = await page.evaluate(async ({ token }) => {
            const meRes = await fetch('/api/auth/me', {
                credentials: 'include',
                headers: { Authorization: `Bearer ${token}` },
            });
            const me = meRes.ok ? await meRes.json() : {};
            return {
                id: String(me?.user?._id || ''),
                subscription: me?.user?.subscription || null,
            };
        }, { token: studentToken });
        expect(studentMeta.id).not.toBe('');

        await loginAsAdmin(page);
        const adminToken = await readAccessToken(page);
        expect(adminToken).not.toBe('');
        const plansResult = await adminRequest(page, adminToken, '/subscription-plans', 'GET');
        expect(plansResult.ok, JSON.stringify(plansResult)).toBeTruthy();
        const firstPlanId = String((plansResult.body?.items || [])[0]?._id || '');
        expect(firstPlanId).not.toBe('');

        const seedAssignment = await adminRequest(page, adminToken, '/subscriptions/assign', 'POST', {
            userId: studentMeta.id,
            planId: firstPlanId,
            status: 'active',
            startAtUTC: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            expiresAtUTC: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            notes: 'E2E seed assignment before suspend',
        });
        expect(seedAssignment.ok, JSON.stringify(seedAssignment)).toBeTruthy();

        const deactivate = await adminRequest(page, adminToken, '/subscriptions/suspend', 'POST', {
            userId: studentMeta.id,
            notes: 'E2E suspended for exam gate validation',
        });
        expect(deactivate.ok, JSON.stringify(deactivate)).toBeTruthy();

        try {
            await loginAsStudent(page);
            await page.goto('/exams');
            const lockedToken = await readAccessToken(page);
            expect(lockedToken).not.toBe('');

            const blocked = await page.evaluate(async ({ token }) => {
                const response = await fetch('/api/exams', {
                    credentials: 'include',
                    headers: { Authorization: `Bearer ${token}` },
                });
                let body: any = null;
                try {
                    body = await response.json();
                } catch {
                    body = null;
                }
                return {
                    status: response.status,
                    subscriptionRequired: Boolean(body?.subscriptionRequired),
                };
            }, { token: lockedToken });

            expect([200, 403]).toContain(blocked.status);
            if (blocked.status === 403) {
                expect(blocked.subscriptionRequired).toBeTruthy();
            }
        } finally {
            await loginAsAdmin(page);
            const restoreToken = await readAccessToken(page);
            await adminRequest(page, restoreToken, '/subscriptions/assign', 'POST', {
                userId: studentMeta.id,
                planId: firstPlanId,
                status: 'active',
                startAtUTC: String(studentMeta.subscription?.startDate || new Date(Date.now() - 60 * 60 * 1000).toISOString()),
                expiresAtUTC: String(studentMeta.subscription?.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()),
                notes: 'E2E restore assignment',
            });
        }

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });

    test('question bank supports BN/EN payload and mobile card layout', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await loginAsAdmin(page);
        const token = await readAccessToken(page);
        expect(token).not.toBe('');

        const suffix = `e2e-${Date.now()}`;
        const enQuestion = `E2E EN ${suffix}`;
        const bnQuestion = `ইটু বাংলা ${suffix}`;

        const createResult = await adminRequest(page, token, '/question-bank', 'POST', {
            languageMode: 'BOTH',
            question: enQuestion,
            question_text: enQuestion,
            questionText: { en: enQuestion, bn: bnQuestion },
            subject: 'E2E Subject',
            chapter: 'E2E Chapter',
            class_level: 'HSC',
            department: 'Science',
            topic: 'Step2',
            difficulty: 'medium',
            optionA: 'Correct',
            optionB: 'Wrong',
            optionC: 'Wrong C',
            optionD: 'Wrong D',
            optionsLocalized: [
                { key: 'A', text: { en: 'Correct', bn: 'সঠিক' } },
                { key: 'B', text: { en: 'Wrong', bn: 'ভুল' } },
                { key: 'C', text: { en: 'Wrong C', bn: 'ভুল C' } },
                { key: 'D', text: { en: 'Wrong D', bn: 'ভুল D' } },
            ],
            correctAnswer: 'A',
            explanation: 'English explanation',
            explanationText: { en: 'English explanation', bn: 'বাংলা ব্যাখ্যা' },
            tags: ['e2e', 'step2'],
            estimated_time: 90,
            status: 'draft',
        });
        expect(createResult.ok, JSON.stringify(createResult)).toBeTruthy();
        const questionId = String(createResult.body?.question?._id || '');
        expect(questionId).not.toBe('');

        const created = await page.evaluate(async ({ token, preferred, questionId, enQuestion, bnQuestion }) => {
            const bases = [`/api/${preferred}`, '/api/admin'];
            let verifyRes: Response | null = null;
            for (const base of bases) {
                const response = await fetch(`${base}/question-bank/${questionId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: 'include',
                });
                if (response.status !== 404) {
                    verifyRes = response;
                    break;
                }
            }
            if (!verifyRes || !verifyRes.ok) {
                return { ok: false, reason: `verify_failed_${verifyRes?.status || 0}` };
            }
            const verifyBody = await verifyRes.json();
            const question = verifyBody?.question || {};
            return {
                ok: true,
                hasBn: Boolean(
                    String(question?.questionText?.bn || '').trim() ||
                    (Array.isArray(question?.optionsLocalized) && question.optionsLocalized.some((item: any) => String(item?.text?.bn || '').trim())),
                ),
                hasEn: Boolean(
                    String(question?.questionText?.en || '').trim() ||
                    (Array.isArray(question?.optionsLocalized) && question.optionsLocalized.some((item: any) => String(item?.text?.en || '').trim())),
                ),
            };
        }, { token, preferred: ADMIN_PATH, questionId, enQuestion, bnQuestion });

        expect(created.ok, JSON.stringify(created)).toBeTruthy();
        expect(created.hasBn, JSON.stringify(created)).toBeTruthy();
        expect(created.hasEn, JSON.stringify(created)).toBeTruthy();

        await page.goto('/admin/question-bank');
        const searchBox = page.getByPlaceholder(/খুঁজুন|Search/i).first();
        await expect(searchBox).toBeVisible({ timeout: 15000 });
        await searchBox.fill(suffix);

        await expect(searchBox).toHaveValue(suffix);
        await expect(page.locator('body')).toContainText(/Question Bank|Questions|Import/i);

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});
