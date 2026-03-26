import { expect, test, type APIRequestContext } from '@playwright/test';
import { seededCreds } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type LoginPayload = {
    token: string;
};

async function loginAs(
    request: APIRequestContext,
    identifier: string,
    password: string,
): Promise<string> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.ok(), `login failed for ${identifier}`).toBeTruthy();
    const body = (await response.json()) as LoginPayload;
    expect(String(body?.token || '')).not.toBe('');
    return body.token;
}

function adminHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

test.describe('Admin Phase2 Micro Saves', () => {
    test('site settings save reflects on public settings payload', async ({ request }) => {
        const adminToken = await loginAs(request, seededCreds.admin.desktop.email, seededCreds.admin.desktop.password);
        const readBefore = await request.get('/api/settings/public');
        expect(readBefore.ok()).toBeTruthy();
        const beforeBody = await readBefore.json();
        const originalName = String(beforeBody?.websiteName || 'CampusWay');
        const patchedName = `CampusWay E2E ${Date.now()}`;

        try {
            const save = await request.put(`/api/${ADMIN_PATH}/home/settings`, {
                headers: adminHeaders(adminToken),
                data: {
                    websiteName: patchedName,
                },
            });
            expect(save.ok(), await save.text()).toBeTruthy();

            const readAfter = await request.get('/api/settings/public');
            expect(readAfter.ok()).toBeTruthy();
            const afterBody = await readAfter.json();
            expect(String(afterBody?.websiteName || '')).toBe(patchedName);
        } finally {
            await request.put(`/api/${ADMIN_PATH}/home/settings`, {
                headers: adminHeaders(adminToken),
                data: {
                    websiteName: originalName,
                },
            });
        }
    });

    test('home control toggle save reflects on /api/home', async ({ request }) => {
        const adminToken = await loginAs(request, seededCreds.admin.desktop.email, seededCreds.admin.desktop.password);

        const beforeRes = await request.get('/api/home');
        expect(beforeRes.ok()).toBeTruthy();
        const beforeBody = await beforeRes.json();
        const beforeValue = Boolean(beforeBody?.homeSettings?.sectionVisibility?.stats);
        const nextValue = !beforeValue;

        try {
            const save = await request.put(`/api/${ADMIN_PATH}/settings/home`, {
                headers: adminHeaders(adminToken),
                data: {
                    sectionVisibility: {
                        ...(beforeBody?.homeSettings?.sectionVisibility || {}),
                        stats: nextValue,
                    },
                },
            });
            expect(save.ok(), await save.text()).toBeTruthy();

            const afterRes = await request.get('/api/home');
            expect(afterRes.ok()).toBeTruthy();
            const afterBody = await afterRes.json();
            expect(Boolean(afterBody?.homeSettings?.sectionVisibility?.stats)).toBe(nextValue);
        } finally {
            await request.put(`/api/${ADMIN_PATH}/settings/home`, {
                headers: adminHeaders(adminToken),
                data: {
                    sectionVisibility: {
                        ...(beforeBody?.homeSettings?.sectionVisibility || {}),
                        stats: beforeValue,
                    },
                },
            });
        }
    });

    test('news source save reflects on public sources list', async ({ request }) => {
        const adminToken = await loginAs(request, seededCreds.admin.desktop.email, seededCreds.admin.desktop.password);
        const marker = `e2e-source-${Date.now()}`;
        let createdSourceId = '';

        try {
            const create = await request.post(`/api/${ADMIN_PATH}/news/sources`, {
                headers: adminHeaders(adminToken),
                data: {
                    name: marker,
                    feedUrl: `https://example.com/${marker}.xml`,
                    categoryDefault: 'admission',
                    tagsDefault: ['e2e', 'phase2'],
                    fetchIntervalMin: 180,
                    maxItemsPerFetch: 10,
                    isActive: true,
                },
            });
            expect(create.ok(), await create.text()).toBeTruthy();
            const createBody = await create.json();
            createdSourceId = String(createBody?.item?._id || createBody?.item?.id || '');

            const publicSources = await request.get('/api/news/sources');
            expect(publicSources.ok()).toBeTruthy();
            const sourceBody = await publicSources.json();
            const items = Array.isArray(sourceBody) ? sourceBody : Array.isArray(sourceBody?.items) ? sourceBody.items : [];
            const found = items.some((item: Record<string, unknown>) => String(item?.name || '') === marker);
            expect(found).toBeTruthy();
        } finally {
            if (createdSourceId) {
                await request.delete(`/api/${ADMIN_PATH}/news/sources/${createdSourceId}`, {
                    headers: adminHeaders(adminToken),
                });
            }
        }
    });

    test('subscription plan create and support unread simulation work through admin endpoints', async ({ request }) => {
        const adminToken = await loginAs(request, seededCreds.admin.desktop.email, seededCreds.admin.desktop.password);
        const studentToken = await loginAs(request, seededCreds.student.desktop.email, seededCreds.student.desktop.password);

        const planCode = `E2E-PHASE2-${Date.now()}`;
        let planId = '';

        const summaryBeforeRes = await request.get(`/api/${ADMIN_PATH}/dashboard/summary`, {
            headers: adminHeaders(adminToken),
        });
        expect(summaryBeforeRes.ok()).toBeTruthy();
        const summaryBefore = await summaryBeforeRes.json();
        const unreadBefore = Number(summaryBefore?.supportCenter?.unreadMessages || 0);

        try {
            const createPlan = await request.post(`/api/${ADMIN_PATH}/subscription-plans`, {
                headers: adminHeaders(adminToken),
                data: {
                    code: planCode,
                    name: `E2E Plan ${Date.now()}`,
                    type: 'paid',
                    priceBDT: 999,
                    durationDays: 30,
                    enabled: true,
                    isFeatured: false,
                    features: ['Phase2 coverage'],
                    tags: ['e2e'],
                },
            });
            expect(createPlan.ok(), await createPlan.text()).toBeTruthy();
            const createPlanBody = await createPlan.json();
            planId = String(createPlanBody?.item?._id || createPlanBody?.item?.id || '');
            expect(planId).not.toBe('');

            const adminPlanRes = await request.get(`/api/${ADMIN_PATH}/subscription-plans/${planId}`, {
                headers: adminHeaders(adminToken),
            });
            expect(adminPlanRes.ok(), await adminPlanRes.text()).toBeTruthy();
            const adminPlanBody = await adminPlanRes.json();
            const createdCode = String(adminPlanBody?.item?.code || '');
            expect(createdCode.toLowerCase()).toBe(planCode.toLowerCase());

            const publicPlansRes = await request.get('/api/subscription-plans');
            expect(publicPlansRes.ok()).toBeTruthy();

            const ticketMarker = `E2E Ticket ${Date.now()}`;
            const createTicket = await request.post('/api/student/support-tickets', {
                headers: { Authorization: `Bearer ${studentToken}` },
                data: {
                    subject: ticketMarker,
                    message: 'Phase2 unread simulation ticket',
                    category: 'technical',
                    priority: 'medium',
                },
            });
            expect(createTicket.ok(), await createTicket.text()).toBeTruthy();

            const summaryAfterRes = await request.get(`/api/${ADMIN_PATH}/dashboard/summary`, {
                headers: adminHeaders(adminToken),
            });
            expect(summaryAfterRes.ok()).toBeTruthy();
            const summaryAfter = await summaryAfterRes.json();
            const unreadAfter = Number(summaryAfter?.supportCenter?.unreadMessages || 0);
            expect(unreadAfter).toBeGreaterThanOrEqual(unreadBefore);
        } finally {
            if (planId) {
                await request.delete(`/api/${ADMIN_PATH}/subscription-plans/${planId}`, {
                    headers: adminHeaders(adminToken),
                });
            }
        }
    });
});
