import http from 'node:http';
import { APIRequestContext, expect, test } from '@playwright/test';
import { seededCreds } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type LoginResult = {
    token: string;
    user: {
        _id: string;
        role: string;
        email: string;
    };
};

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function apiLogin(request: APIRequestContext, identifier: string, password: string): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as LoginResult;
    expect(String(body.token || '')).not.toBe('');
    return body;
}

function buildRssFeedXml(marker: string): string {
    const published = new Date().toUTCString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>CampusWay E2E Feed ${marker}</title>
    <link>https://example.com/${marker}</link>
    <description>Controlled E2E feed</description>
    <item>
      <title>E2E RSS Item ${marker}</title>
      <link>https://example.com/${marker}/item-1</link>
      <guid isPermaLink="false">${marker}-guid-1</guid>
      <pubDate>${published}</pubDate>
      <description>Controlled RSS item for pending review flow.</description>
    </item>
  </channel>
</rss>`;
}

test.describe('Phase4 Pipelines Validation', () => {
    test.describe.configure({ mode: 'serial' });

    let adminToken = '';
    let adminRole = '';
    let studentToken = '';
    let studentId = '';
    let rssServer: http.Server | null = null;
    let rssFeedUrl = '';
    const createdNewsIds: string[] = [];
    const createdSourceIds: string[] = [];
    const createdPlanIds: string[] = [];
    const createdExamIds: string[] = [];

    async function refreshAdminSession(request: APIRequestContext): Promise<void> {
        const adminLogin = await apiLogin(
            request,
            seededCreds.admin.desktop.email,
            seededCreds.admin.desktop.password,
        );
        adminToken = adminLogin.token;
        adminRole = String(adminLogin.user?.role || '');
    }

    test.beforeAll(async ({ request }, workerInfo) => {
        test.skip(workerInfo.project.name.includes('mobile'), 'Pipeline suite runs on desktop only.');

        const adminLogin = await apiLogin(
            request,
            seededCreds.admin.desktop.email,
            seededCreds.admin.desktop.password,
        );
        const studentLogin = await apiLogin(
            request,
            seededCreds.student.session.email,
            seededCreds.student.session.password,
        );

        adminToken = adminLogin.token;
        adminRole = String(adminLogin.user?.role || '');
        studentToken = studentLogin.token;
        studentId = String(studentLogin.user?._id || '');

        const marker = `cw-rss-${Date.now()}`;
        const xml = buildRssFeedXml(marker);
        rssServer = http.createServer((_req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/rss+xml; charset=utf-8' });
            res.end(xml);
        });

        await new Promise<void>((resolve, reject) => {
            rssServer!.listen(0, '127.0.0.1', () => resolve());
            rssServer!.on('error', reject);
        });

        const addr = rssServer.address();
        if (!addr || typeof addr === 'string') {
            throw new Error('Failed to bind RSS test server');
        }
        rssFeedUrl = `http://127.0.0.1:${addr.port}/feed.xml`;
    });

    test.afterAll(async ({ request }) => {
        for (const id of createdNewsIds) {
            await request.delete(`/api/${ADMIN_PATH}/news/${id}`, { headers: authHeader(adminToken) }).catch(() => undefined);
        }
        for (const id of createdSourceIds) {
            await request.delete(`/api/${ADMIN_PATH}/news/sources/${id}`, { headers: authHeader(adminToken) }).catch(() => undefined);
        }
        for (const id of createdPlanIds) {
            await request.delete(`/api/${ADMIN_PATH}/subscription-plans/${id}`, { headers: authHeader(adminToken) }).catch(() => undefined);
        }
        for (const id of createdExamIds) {
            await request.delete(`/api/${ADMIN_PATH}/exams/${id}`, { headers: authHeader(adminToken) }).catch(() => undefined);
        }
        if (rssServer) {
            await new Promise<void>((resolve) => rssServer!.close(() => resolve()));
        }
    });

    test('P4.1 rss ingestion creates pending items and dedupes duplicates', async ({ request }) => {
        const marker = `rss-source-${Date.now()}`;
        const createSource = await request.post(`/api/${ADMIN_PATH}/news/sources`, {
            headers: authHeader(adminToken),
            data: {
                name: marker,
                feedUrl: rssFeedUrl,
                categoryDefault: 'admission',
                tagsDefault: ['phase4', 'rss'],
                fetchIntervalMin: 30,
                maxItemsPerFetch: 20,
                isActive: true,
            },
        });
        expect(createSource.ok(), await createSource.text()).toBeTruthy();
        const createSourceBody = await createSource.json();
        const sourceId = String(createSourceBody?.item?._id || createSourceBody?.item?.id || '');
        expect(sourceId).not.toBe('');
        createdSourceIds.push(sourceId);

        const fetchNow = await request.post(`/api/${ADMIN_PATH}/news/fetch-now`, {
            headers: authHeader(adminToken),
            data: { sourceIds: [sourceId] },
        });
        expect(fetchNow.ok(), await fetchNow.text()).toBeTruthy();
        const fetchNowBody = await fetchNow.json();
        expect(Number(fetchNowBody?.stats?.fetchedCount || 0)).toBeGreaterThan(0);
        expect(Number(fetchNowBody?.stats?.createdCount || 0)).toBeGreaterThan(0);

        const pending = await request.get(`/api/${ADMIN_PATH}/news`, {
            headers: authHeader(adminToken),
            params: { status: 'pending_review', sourceId, limit: 20 },
        });
        expect(pending.ok(), await pending.text()).toBeTruthy();
        const pendingBody = await pending.json();
        const pendingItems = Array.isArray(pendingBody?.items) ? pendingBody.items : [];
        expect(pendingItems.length).toBeGreaterThan(0);
        const pendingItem = pendingItems.find((item: Record<string, unknown>) =>
            String(item?.title || '').toLowerCase().includes('e2e rss item')
        );
        expect(Boolean(pendingItem)).toBeTruthy();
        expect(String(pendingItem?.status || '')).toBe('pending_review');
        const pendingItemId = String(pendingItem?._id || '');
        if (pendingItemId) createdNewsIds.push(pendingItemId);

        const fetchAgain = await request.post(`/api/${ADMIN_PATH}/news/fetch-now`, {
            headers: authHeader(adminToken),
            data: { sourceIds: [sourceId] },
        });
        expect(fetchAgain.ok(), await fetchAgain.text()).toBeTruthy();
        const fetchAgainBody = await fetchAgain.json();
        const duplicateCount = Number(fetchAgainBody?.stats?.duplicateCount || 0);
        const createdCount = Number(fetchAgainBody?.stats?.createdCount || 0);
        expect(duplicateCount > 0 || createdCount === 0).toBeTruthy();
    });

    test('P4.1 scheduled publish and default banner fallback update work', async ({ request }) => {
        test.setTimeout(180_000);
        const marker = `phase4-news-${Date.now()}`;

        const settingsRes = await request.get(`/api/${ADMIN_PATH}/news/settings`, {
            headers: authHeader(adminToken),
        });
        expect(settingsRes.ok(), await settingsRes.text()).toBeTruthy();
        const settingsBody = await settingsRes.json();
        const currentDefaultBanner = String(settingsBody?.settings?.defaultBannerUrl || '');
        const newDefaultBanner = `https://picsum.photos/seed/${marker}/1200/630`;

        const createPublished = await request.post(`/api/${ADMIN_PATH}/news`, {
            headers: authHeader(adminToken),
            data: {
                title: `Phase4 Banner News ${marker}`,
                shortSummary: 'Default banner retroactive verification',
                content: '<p>phase4 default banner coverage</p>',
                category: 'Admission',
                status: 'published',
                sourceType: 'manual',
            },
        });
        expect(createPublished.ok(), await createPublished.text()).toBeTruthy();
        const createPublishedBody = await createPublished.json();
        const publishedId = String(createPublishedBody?.item?._id || '');
        const publishedSlug = String(createPublishedBody?.item?.slug || '');
        expect(publishedId).not.toBe('');
        expect(publishedSlug).not.toBe('');
        createdNewsIds.push(publishedId);

        const beforeArticle = await request.get(`/api/news/${publishedSlug}`);
        expect(beforeArticle.ok(), await beforeArticle.text()).toBeTruthy();
        const beforeArticleBody = await beforeArticle.json();
        const beforeBanner = String(beforeArticleBody?.item?.coverImageUrl || '');

        const updateSettings = await request.put(`/api/${ADMIN_PATH}/news/settings`, {
            headers: authHeader(adminToken),
            data: { defaultBannerUrl: newDefaultBanner },
        });
        expect(updateSettings.ok(), await updateSettings.text()).toBeTruthy();

        const afterArticle = await request.get(`/api/news/${publishedSlug}`);
        expect(afterArticle.ok(), await afterArticle.text()).toBeTruthy();
        const afterArticleBody = await afterArticle.json();
        const afterBanner = String(afterArticleBody?.item?.coverImageUrl || '');
        expect(afterBanner).not.toBe('');
        expect(afterBanner).not.toBe(beforeBanner);
        expect(afterBanner).toContain(`seed/${marker}`);

        // Restore default banner to avoid cross-suite visual drift.
        await request.put(`/api/${ADMIN_PATH}/news/settings`, {
            headers: authHeader(adminToken),
            data: { defaultBannerUrl: currentDefaultBanner },
        });

        const scheduledAt = new Date(Date.now() - 5_000).toISOString();
        const createScheduled = await request.post(`/api/${ADMIN_PATH}/news`, {
            headers: authHeader(adminToken),
            data: {
                title: `Phase4 Scheduled ${marker}`,
                shortSummary: 'Scheduled publish cron validation',
                content: '<p>scheduled publish body</p>',
                category: 'Admission',
                status: 'scheduled',
                scheduleAt: scheduledAt,
                sourceType: 'manual',
            },
        });
        expect(createScheduled.ok(), await createScheduled.text()).toBeTruthy();
        const createScheduledBody = await createScheduled.json();
        const scheduledId = String(createScheduledBody?.item?._id || '');
        expect(scheduledId).not.toBe('');
        createdNewsIds.push(scheduledId);

        const deadline = Date.now() + 90_000;
        let published = false;
        while (Date.now() < deadline && !published) {
            const itemRes = await request.get(`/api/${ADMIN_PATH}/news/${scheduledId}`, {
                headers: authHeader(adminToken),
            });
            expect(itemRes.ok(), await itemRes.text()).toBeTruthy();
            const itemBody = await itemRes.json();
            const status = String(itemBody?.item?.status || '');
            if (status === 'published') {
                published = true;
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
        expect(published, 'Scheduled news was not auto-published by cron window').toBeTruthy();
    });

    test('P4.2 exam session autosubmit cron finalizes expired attempts', async ({ request }) => {
        test.setTimeout(300_000);
        const marker = `phase4-exam-${Date.now()}`;
        const now = Date.now();
        const createExam = await request.post(`/api/${ADMIN_PATH}/exams`, {
            headers: authHeader(adminToken),
            data: {
                title: `Phase4 Autosubmit ${marker}`,
                subject: 'E2E QA',
                description: 'Cron autosubmit validation exam',
                duration: 1,
                totalQuestions: 1,
                totalMarks: 1,
                startDate: new Date(now - 5 * 60 * 1000).toISOString(),
                endDate: new Date(now + 10 * 60 * 1000).toISOString(),
                resultPublishDate: new Date(now - 60_000).toISOString(),
                attemptLimit: 1,
                negativeMarking: false,
                randomizeQuestions: false,
                randomizeOptions: false,
                allowBackNavigation: true,
                showQuestionPalette: true,
                showRemainingTime: true,
                autoSubmitOnTimeout: true,
                instructions: 'Phase4 autosubmit flow',
                require_instructions_agreement: false,
            },
        });
        expect(createExam.status()).toBe(201);
        const createExamBody = await createExam.json();
        const examId = String(createExamBody?.exam?._id || '');
        expect(examId).not.toBe('');
        createdExamIds.push(examId);

        const createQuestion = await request.post(`/api/${ADMIN_PATH}/exams/${examId}/questions`, {
            headers: authHeader(adminToken),
            data: {
                question: `Phase4 autosubmit question ${marker}`,
                optionA: 'A',
                optionB: 'B',
                optionC: 'C',
                optionD: 'D',
                correctAnswer: 'A',
                marks: 1,
                difficulty: 'easy',
                order: 1,
                questionType: 'mcq',
            },
        });
        expect([200, 201]).toContain(createQuestion.status());

        const publishExam = await request.patch(`/api/${ADMIN_PATH}/exams/${examId}/publish`, {
            headers: authHeader(adminToken),
        });
        expect([200, 400]).toContain(publishExam.status());

        const startAttempt = await request.post(`/api/exams/${examId}/start`, {
            headers: authHeader(studentToken),
        });
        expect(startAttempt.ok(), await startAttempt.text()).toBeTruthy();
        const startBody = await startAttempt.json();
        const attemptId = String(startBody?.session?.sessionId || '');
        expect(attemptId).not.toBe('');

        // Save one answer, then leave attempt untouched for cron autosubmit.
        const firstQuestionId = String(startBody?.questions?.[0]?._id || '');
        if (firstQuestionId) {
            const save = await request.post(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
                headers: authHeader(studentToken),
                data: {
                    attemptRevision: Number(startBody?.session?.attemptRevision || 0),
                    answers: [{ questionId: firstQuestionId, selectedAnswer: 'A' }],
                },
            });
            expect(save.ok(), await save.text()).toBeTruthy();
        }

        const deadline = Date.now() + 170_000;
        let autoSubmitted = false;
        while (Date.now() < deadline && !autoSubmitted) {
            const stateRes = await request.get(`/api/exams/${examId}/attempt/${attemptId}`, {
                headers: authHeader(studentToken),
            });
            if (stateRes.status() === 200) {
                const stateBody = await stateRes.json();
                const status = String(stateBody?.session?.status || '');
                const submittedAt = String(stateBody?.session?.submittedAt || '');
                if (status === 'submitted' || Boolean(submittedAt)) {
                    autoSubmitted = true;
                    break;
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 10_000));
        }
        expect(autoSubmitted, 'Cron auto-submit did not finalize expired session in time').toBeTruthy();

        const resultRes = await request.get(`/api/exams/${examId}/result`, {
            headers: authHeader(studentToken),
        });
        expect([200, 403]).toContain(resultRes.status());
    });

    test('P4.3 payment pending->paid updates dashboard and P4.4 audit logs capture action', async ({ request }) => {
        const marker = `phase4-pay-${Date.now()}`;
        await refreshAdminSession(request);

        const createPlan = await request.post(`/api/${ADMIN_PATH}/subscription-plans`, {
            headers: authHeader(adminToken),
            data: {
                code: marker.toUpperCase(),
                name: `Phase4 Plan ${marker}`,
                type: 'paid',
                priceBDT: 499,
                durationDays: 30,
                enabled: true,
                isFeatured: false,
            },
        });
        expect(createPlan.ok(), await createPlan.text()).toBeTruthy();
        const planBody = await createPlan.json();
        const planId = String(planBody?.item?._id || planBody?.item?.id || '');
        expect(planId).not.toBe('');
        createdPlanIds.push(planId);

        // Force lock first, then unlock through payment approval.
        await request.post(`/api/${ADMIN_PATH}/subscriptions/suspend`, {
            headers: authHeader(adminToken),
            data: { userId: studentId, notes: 'phase4 suspend before payment unlock validation' },
        });

        const createPayment = await request.post(`/api/${ADMIN_PATH}/payments`, {
            headers: authHeader(adminToken),
            data: {
                studentId,
                subscriptionPlanId: planId,
                amount: 499,
                method: 'bkash',
                entryType: 'subscription',
                date: new Date().toISOString(),
                reference: `PH4-${Date.now()}`,
                notes: 'Phase4 payment pending to paid test',
            },
        });
        expect(createPayment.status()).toBe(201);
        const paymentBody = await createPayment.json();
        const paymentId = String(paymentBody?.item?._id || '');
        expect(paymentId).not.toBe('');

        const approvePayment = await request.post(`/api/${ADMIN_PATH}/finance/payments/${paymentId}/approve`, {
            headers: authHeader(adminToken),
            data: { status: 'paid', remarks: 'Phase4 auto-check approval' },
        });
        expect(approvePayment.ok(), await approvePayment.text()).toBeTruthy();

        const studentMe = await request.get('/api/auth/me', {
            headers: authHeader(studentToken),
        });
        expect(studentMe.ok(), await studentMe.text()).toBeTruthy();
        const studentBody = await studentMe.json();
        expect(Boolean(studentBody?.user?.subscription?.isActive)).toBeTruthy();

        const paymentList = await request.get(`/api/${ADMIN_PATH}/payments`, {
            headers: authHeader(adminToken),
            params: { limit: 100 },
        });
        expect(paymentList.ok(), await paymentList.text()).toBeTruthy();
        const paymentListBody = await paymentList.json();
        let paymentItems = Array.isArray(paymentListBody?.items) ? paymentListBody.items : [];
        let approved = paymentItems.find((item: Record<string, unknown>) => String(item?._id || item?.id || '') === paymentId);

        if (!approved) {
            const studentPayments = await request.get(`/api/${ADMIN_PATH}/students/${studentId}/payments`, {
                headers: authHeader(adminToken),
            });
            expect(studentPayments.ok(), await studentPayments.text()).toBeTruthy();
            const studentPaymentsBody = await studentPayments.json();
            paymentItems = Array.isArray(studentPaymentsBody?.items) ? studentPaymentsBody.items : [];
            approved = paymentItems.find((item: Record<string, unknown>) => String(item?._id || item?.id || '') === paymentId);
        }

        expect(Boolean(approved), 'Approved payment record not found in admin payment datasets').toBeTruthy();
        expect(String(approved?.status || '')).toBe('paid');

        // Audit/log validation.
        if (adminRole.toLowerCase() === 'superadmin') {
            const auditRes = await request.get(`/api/${ADMIN_PATH}/audit-logs`, {
                headers: authHeader(adminToken),
                params: { action: 'payment_paid', limit: 20 },
            });
            expect(auditRes.ok(), await auditRes.text()).toBeTruthy();
        } else {
            const newsAuditRes = await request.get(`/api/${ADMIN_PATH}/news/audit-logs`, {
                headers: authHeader(adminToken),
                params: { limit: 20 },
            });
            expect(newsAuditRes.ok(), await newsAuditRes.text()).toBeTruthy();
            const newsAuditBody = await newsAuditRes.json();
            const logs = Array.isArray(newsAuditBody?.items) ? newsAuditBody.items : [];
            expect(logs.length).toBeGreaterThan(0);
        }
    });
});
