import { expect, test, type APIRequestContext } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { seededCreds } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type LoginResult = {
    token: string;
};

async function apiLogin(
    request: APIRequestContext,
    identifier: string,
    password: string,
): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as LoginResult;
    expect(String(body.token || '')).not.toBe('');
    return body;
}

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

function sensitiveExportHeaders(token: string): Record<string, string> {
    return {
        ...authHeader(token),
        'x-sensitive-reason': 'release gate verification export check',
        'x-current-password': seededCreds.admin.desktop.password,
    };
}

test.describe('Import / Export / Bulk Verification', () => {
    test.describe.configure({ mode: 'serial' });

    let adminToken = '';
    let createdUniversityId = '';

    test.beforeAll(async ({ request }) => {
        const login = await apiLogin(
            request,
            seededCreds.admin.desktop.email,
            seededCreds.admin.desktop.password,
        );
        adminToken = login.token;
    });

    test.afterAll(async ({ request }) => {
        if (createdUniversityId) {
            await request.delete(`/api/${ADMIN_PATH}/universities/${createdUniversityId}`, {
                headers: authHeader(adminToken),
            }).catch(() => undefined);
        }
    });

    test('major import templates and export endpoints respond successfully', async ({ request }) => {
        const templateEndpoints = [
            `/api/${ADMIN_PATH}/universities/import/template?format=csv`,
            `/api/${ADMIN_PATH}/students/import/template`,
            `/api/${ADMIN_PATH}/question-bank/v2/import/template`,
            `/api/${ADMIN_PATH}/fc/import-template`,
        ];

        for (const endpoint of templateEndpoints) {
            const response = await request.get(endpoint, {
                headers: authHeader(adminToken),
            });
            expect(response.status(), `Template endpoint failed: ${endpoint}`).toBe(200);
            const templateBody = await response.body();
            expect(templateBody.length, `Template endpoint returned empty body: ${endpoint}`).toBeGreaterThan(0);
        }

        const exportEndpoints = [
            `/api/${ADMIN_PATH}/universities/export?format=csv`,
            `/api/${ADMIN_PATH}/subscription-plans/export?format=csv`,
            `/api/${ADMIN_PATH}/question-bank/v2/export?format=csv`,
            `/api/${ADMIN_PATH}/news/export?format=csv`,
        ];

        for (const endpoint of exportEndpoints) {
            const response = await request.get(endpoint, {
                headers: sensitiveExportHeaders(adminToken),
            });
            expect(response.status(), `Export endpoint failed: ${endpoint}`).toBe(200);
            const disposition = String(response.headers()['content-disposition'] || '');
            expect(disposition.toLowerCase(), `Expected attachment on ${endpoint}`).toContain('attachment');
        }
    });

    test('bulk update changes university state and persists', async ({ request }) => {
        const marker = `e2e-bulk-${Date.now()}`;
        const createUniversity = await request.post(`/api/${ADMIN_PATH}/universities`, {
            headers: authHeader(adminToken),
            data: {
                name: `E2E Bulk University ${marker}`,
                shortForm: `EB${String(Date.now()).slice(-4)}`,
                category: 'Science & Technology',
                clusterGroup: 'E2E Cluster',
                isActive: true,
                featured: false,
            },
        });
        expect(createUniversity.status(), await createUniversity.text()).toBe(201);
        const createBody = await createUniversity.json();
        createdUniversityId = String(createBody?.university?._id || '');
        expect(createdUniversityId).not.toBe('');

        const bulkUpdate = await request.patch(`/api/${ADMIN_PATH}/universities/bulk-update`, {
            headers: authHeader(adminToken),
            data: {
                ids: [createdUniversityId],
                updates: {
                    featured: true,
                    featuredOrder: 91,
                    clusterGroup: 'E2E Updated Cluster',
                },
            },
        });
        expect(bulkUpdate.status(), await bulkUpdate.text()).toBe(200);

        const readBack = await request.get(`/api/${ADMIN_PATH}/universities/${createdUniversityId}`, {
            headers: authHeader(adminToken),
        });
        expect(readBack.status(), await readBack.text()).toBe(200);
        const readBody = await readBack.json();
        expect(Boolean(readBody?.university?.featured)).toBeTruthy();
        expect(Number(readBody?.university?.featuredOrder)).toBe(91);
        expect(String(readBody?.university?.clusterGroup || '')).toBe('E2E Updated Cluster');
    });

    test('question-bank import preview endpoint accepts file payload and returns non-crashing response', async ({ request }) => {
        const csv = [
            'question_en,option_a,option_b,option_c,option_d,correct_option,subject,moduleCategory,topic,difficulty',
            'What is 2 + 2?,3,4,5,6,B,General,General,Arithmetic,easy',
        ].join('\n');

        const preview = await request.post(`/api/${ADMIN_PATH}/question-bank/v2/import/preview`, {
            headers: authHeader(adminToken),
            multipart: {
                file: {
                    name: 'qbank-import.csv',
                    mimeType: 'text/csv',
                    buffer: Buffer.from(csv, 'utf-8'),
                },
            },
        });

        expect([200, 400], `Unexpected status for import preview: ${preview.status()}`).toContain(preview.status());
        const body = await preview.json().catch(() => ({}));
        if (preview.status() === 400) {
            expect(String((body as Record<string, unknown>)?.message || (body as Record<string, unknown>)?.error || '')).not.toBe('');
        } else {
            expect(typeof body).toBe('object');
        }
    });

    test('question-bank bulk tag update works for an existing item', async ({ request }) => {
        const listResponse = await request.get(`/api/${ADMIN_PATH}/question-bank/v2/questions?limit=1`, {
            headers: authHeader(adminToken),
        });
        expect(listResponse.status(), await listResponse.text()).toBe(200);
        const listBody = await listResponse.json();
        const firstItem = Array.isArray(listBody?.data?.items) ? listBody.data.items[0] : null;
        const firstId = String(firstItem?._id || '');
        test.skip(!firstId, 'No question-bank v2 records available to test bulk tag update.');

        const markerTag = `e2e-bulk-tag-${Date.now()}`;
        const update = await request.post(`/api/${ADMIN_PATH}/question-bank/v2/bulk/tags`, {
            headers: authHeader(adminToken),
            data: {
                ids: [firstId],
                tags: [markerTag],
                mode: 'add',
            },
        });
        expect(update.status(), await update.text()).toBe(200);

        const readBack = await request.get(`/api/${ADMIN_PATH}/question-bank/v2/questions/${firstId}`, {
            headers: authHeader(adminToken),
        });
        expect(readBack.status(), await readBack.text()).toBe(200);
        const readBody = await readBack.json();
        const tags = Array.isArray(readBody?.data?.tags) ? readBody.data.tags : [];
        expect(tags.map((item: unknown) => String(item))).toContain(markerTag);
    });
});
