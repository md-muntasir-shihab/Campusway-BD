import { expect, test, type APIRequestContext } from '@playwright/test';
import { loginAsStudent, seededCreds } from './helpers';

const ADMIN_PATH = process.env.E2E_ADMIN_PATH || 'campusway-secure-admin';

type LoginResult = {
    token: string;
    user?: {
        _id?: string;
        role?: string;
        email?: string;
    };
};

async function apiLogin(request: APIRequestContext, identifier: string, password: string): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const payload = (await response.json()) as LoginResult;
    expect(String(payload.token || '')).not.toBe('');
    return payload;
}

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

test.describe('Cross-role Permissions', () => {
    test('public direct URLs cannot access protected student/admin pages', async ({ page }) => {
        const protectedStudentRoutes = ['/dashboard', '/student/profile', '/results', '/payments'];
        const protectedAdminRoutes = ['/__cw_admin__/dashboard', '/__cw_admin__/students', '/__cw_admin__/settings/security-center'];

        for (const route of protectedStudentRoutes) {
            await page.goto(route);
            await expect(page).not.toHaveURL(/\/dashboard($|\/)|\/student\/profile|\/results($|\/)|\/payments($|\/)/);
            await expect(page).toHaveURL(/\/login|\/student\/login|\/student-login/);
        }

        for (const route of protectedAdminRoutes) {
            await page.goto(route);
            await expect(page).not.toHaveURL(/\/__cw_admin__\/dashboard|\/__cw_admin__\/students|\/__cw_admin__\/settings\/security-center/);
            await expect(page).toHaveURL(/\/__cw_admin__\/login|\/admin\/login|\/__cw_admin__\/access-denied/);
        }
    });

    test('student cannot reach admin routes by direct URL', async ({ page }) => {
        await loginAsStudent(page);

        await page.goto('/__cw_admin__/dashboard');
        await expect(page).not.toHaveURL(/\/__cw_admin__\/dashboard/);
        await expect(page).toHaveURL(/\/__cw_admin__\/login|\/__cw_admin__\/access-denied|\/login/);

        await page.goto('/__cw_admin__/students');
        await expect(page).not.toHaveURL(/\/__cw_admin__\/students/);
        await expect(page).toHaveURL(/\/__cw_admin__\/login|\/__cw_admin__\/access-denied|\/login/);
    });

    test('student/admin API tokens are blocked from cross-role endpoints', async ({ request }) => {
        const adminLogin = await apiLogin(
            request,
            seededCreds.admin.desktop.email,
            seededCreds.admin.desktop.password,
        );
        const studentLogin = await apiLogin(
            request,
            seededCreds.student.desktop.email,
            seededCreds.student.desktop.password,
        );

        const studentToAdminSummary = await request.get(`/api/${ADMIN_PATH}/dashboard/summary`, {
            headers: authHeader(studentLogin.token),
        });
        expect([401, 403]).toContain(studentToAdminSummary.status());

        const studentToAdminStudents = await request.get(`/api/${ADMIN_PATH}/students?limit=1`, {
            headers: authHeader(studentLogin.token),
        });
        expect([401, 403]).toContain(studentToAdminStudents.status());

        const adminToStudentTickets = await request.get('/api/student/support-tickets', {
            headers: authHeader(adminLogin.token),
        });
        expect([401, 403]).toContain(adminToStudentTickets.status());
    });
});

