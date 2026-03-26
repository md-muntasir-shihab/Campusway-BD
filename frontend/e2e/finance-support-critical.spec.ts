import { APIRequestContext, expect, test } from '@playwright/test';

const adminCredsCandidates = [
    {
        email: process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
        password: process.env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
    },
    {
        email: process.env.E2E_ADMIN_MOBILE_EMAIL || 'e2e_admin_mobile@campusway.local',
        password: process.env.E2E_ADMIN_MOBILE_PASSWORD || 'E2E_Admin#12345',
    },
];

type LoginResult = {
    token: string;
    user: {
        _id: string;
        role: string;
        email: string;
    };
};

test.describe('Finance + Support Critical Flows', () => {
    test.describe.configure({ mode: 'serial' });

    let adminToken = '';
    let studentId = '';
    let studentEmail = '';
    let studentPassword = '';
    let studentPhone = '';
    let planCode = '';
    let backupJobId = '';
    let modulesAvailable = true;

    test.beforeAll(async ({ request }, workerInfo) => {
        test.skip(workerInfo.project.name.includes('mobile'), 'Finance/support critical suite is desktop-only.');
        const loginResult = await apiLoginWithFallback(request, adminCredsCandidates);
        const login = loginResult.login;
        adminToken = login.token;
        const probe = await request.get('/api/campusway-secure-admin/finance/summary', {
            headers: authHeader(adminToken),
        });
        modulesAvailable = probe.status() !== 404;
    });

    test('admin creates student account and assigns subscription plan', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        const now = Date.now();
        planCode = `E2EPLAN${now}`;
        studentEmail = `e2e_finance_${now}@campusway.local`;
        studentPassword = `E2E_Stu#${String(now).slice(-6)}`;
        studentPhone = `017${String(now).slice(-8)}`;

        const createPlan = await request.post('/api/campusway-secure-admin/subscription-plans', {
            headers: authHeader(adminToken),
            data: {
                name: `E2E Finance Plan ${now}`,
                code: planCode,
                durationDays: 90,
                description: 'E2E finance/support plan',
            },
        });
        expect([200, 201]).toContain(createPlan.status());

        const createStudent = await request.post('/api/campusway-secure-admin/students', {
            headers: authHeader(adminToken),
            data: {
                fullName: `E2E Finance Student ${now}`,
                username: `e2e_fin_stu_${String(now).slice(-6)}`,
                email: studentEmail,
                password: studentPassword,
                phoneNumber: studentPhone,
                status: 'active',
            },
        });
        expect(createStudent.status()).toBe(201);
        const studentBody = await createStudent.json();
        studentId = String(studentBody?.student?._id || '');
        expect(studentId).toBeTruthy();

        const nowIso = new Date().toISOString();
        const expiryIso = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
        const assignPlan = await request.put(`/api/campusway-secure-admin/students/${studentId}/subscription`, {
            headers: authHeader(adminToken),
            data: {
                planCode,
                isActive: true,
                startDate: nowIso,
                expiryDate: expiryIso,
            },
        });
        expect(assignPlan.status()).toBe(200);
    });

    test('student password reveal endpoint stays disabled', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        expect(studentId).toBeTruthy();

        const revealRes = await request.post(`/api/campusway-secure-admin/students/${studentId}/password/reveal`, {
            headers: authHeader(adminToken),
            data: {
                reason: 'E2E validation for disabled password reveal endpoint',
            },
        });
        expect([404, 410]).toContain(revealRes.status());
    });

    test('manual payment and expense entries are accepted', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        expect(studentId).toBeTruthy();
        expect(planCode).toBeTruthy();

        const plansRes = await request.get('/api/campusway-secure-admin/subscription-plans', {
            headers: authHeader(adminToken),
        });
        expect(plansRes.status()).toBe(200);
        const plansBody = await plansRes.json();
        const planId = String((plansBody?.items || []).find((item: any) => item.code === planCode)?._id || '');

        const paymentRes = await request.post('/api/campusway-secure-admin/payments', {
            headers: authHeader(adminToken),
            data: {
                studentId,
                subscriptionPlanId: planId || undefined,
                amount: 2500,
                method: 'bkash',
                entryType: 'subscription',
                date: new Date().toISOString(),
                reference: 'E2E-PMT-001',
                notes: 'E2E payment entry',
            },
        });
        expect(paymentRes.status()).toBe(201);

        const expenseRes = await request.post('/api/campusway-secure-admin/expenses', {
            headers: authHeader(adminToken),
            data: {
                category: 'tools',
                amount: 650,
                date: new Date().toISOString(),
                vendor: 'E2E Vendor',
                notes: 'E2E expense entry',
            },
        });
        expect(expenseRes.status()).toBe(201);

        const summaryRes = await request.get('/api/campusway-secure-admin/finance/summary', {
            headers: authHeader(adminToken),
        });
        expect(summaryRes.status()).toBe(200);
        const summaryBody = await summaryRes.json();
        expect(Number(summaryBody.totalIncome || 0)).toBeGreaterThan(0);
    });

    test('due ledger update and reminder flow works', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        expect(studentId).toBeTruthy();
        const dueUpdate = await request.patch(`/api/campusway-secure-admin/dues/${studentId}`, {
            headers: authHeader(adminToken),
            data: {
                computedDue: 1000,
                manualAdjustment: 200,
                waiverAmount: 50,
                note: 'E2E due update',
            },
        });
        expect(dueUpdate.status()).toBe(200);

        const remind = await request.post(`/api/campusway-secure-admin/dues/${studentId}/remind`, {
            headers: authHeader(adminToken),
            data: {},
        });
        expect(remind.status()).toBe(200);

        const duesList = await request.get('/api/campusway-secure-admin/dues?status=due', {
            headers: authHeader(adminToken),
        });
        expect(duesList.status()).toBe(200);
    });

    test('student can create support ticket and admin can update it', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        expect(studentEmail).toBeTruthy();
        expect(studentPassword).toBeTruthy();
        const studentLogin = await apiLogin(request, studentEmail, studentPassword);

        const ticketSubject = `E2E Ticket ${Date.now()}`;
        const createTicket = await request.post('/api/student/support-tickets', {
            headers: authHeader(studentLogin.token),
            data: {
                subject: ticketSubject,
                message: 'Need support from admin for manual payment verification.',
                priority: 'high',
            },
        });
        expect(createTicket.status()).toBe(201);
        const ticketBody = await createTicket.json();
        const ticketId = String(ticketBody?.item?._id || '');
        expect(ticketId).toBeTruthy();

        const ticketsRes = await request.get('/api/campusway-secure-admin/support-tickets', {
            headers: authHeader(adminToken),
            params: { search: ticketSubject },
        });
        expect(ticketsRes.status()).toBe(200);

        const statusRes = await request.patch(`/api/campusway-secure-admin/support-tickets/${ticketId}/status`, {
            headers: authHeader(adminToken),
            data: { status: 'in_progress' },
        });
        expect(statusRes.status()).toBe(200);

        const replyRes = await request.post(`/api/campusway-secure-admin/support-tickets/${ticketId}/reply`, {
            headers: authHeader(adminToken),
            data: { message: 'Received. Please check your dashboard notice.' },
        });
        expect(replyRes.status()).toBe(200);
    });

    test('backup run is successful and restore guard requires typed confirmation', async ({ request }) => {
        test.skip(!modulesAvailable, 'Finance/support/backup endpoints are not available in current backend runtime.');
        const runBackup = await request.post('/api/campusway-secure-admin/backups/run', {
            headers: authHeader(adminToken),
            data: { type: 'incremental', storage: 'local' },
        });
        expect([200, 201]).toContain(runBackup.status());
        const backupBody = await runBackup.json();
        backupJobId = String(backupBody?.item?._id || '');
        expect(backupJobId).toBeTruthy();

        const listBackups = await request.get('/api/campusway-secure-admin/backups', {
            headers: authHeader(adminToken),
        });
        expect(listBackups.status()).toBe(200);

        const invalidRestore = await request.post(`/api/campusway-secure-admin/backups/${backupJobId}/restore`, {
            headers: authHeader(adminToken),
            data: { confirmation: 'WRONG CONFIRMATION' },
        });
        expect(invalidRestore.status()).toBe(400);
    });
});

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function apiLoginWithFallback(
    request: APIRequestContext,
    candidates: Array<{ email: string; password: string }>,
): Promise<{ login: LoginResult; creds: { email: string; password: string } }> {
    let lastStatus = 0;
    let lastBody: unknown = null;

    for (const creds of candidates) {
        const response = await request.post('/api/auth/login', {
            data: { identifier: creds.email, password: creds.password },
        });
        lastStatus = response.status();
        lastBody = await response.json().catch(async () => ({ message: await response.text() }));
        if (response.status() === 200) {
            const login = lastBody as LoginResult;
            expect(login.token).toBeTruthy();
            return { login, creds };
        }
    }

    expect(lastStatus, `Login failed for admin candidates. Last response: ${JSON.stringify(lastBody)}`).toBe(200);
    return {
        login: lastBody as LoginResult,
        creds: candidates[0],
    };
}

async function apiLogin(request: APIRequestContext, identifier: string, password: string): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as LoginResult;
    expect(body.token).toBeTruthy();
    return body;
}
