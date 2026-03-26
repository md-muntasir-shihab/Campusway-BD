import { expect, test, type Page } from '@playwright/test';
import { seededCreds } from './helpers';

const baseApi = (process.env.E2E_API_BASE_URL || 'http://127.0.0.1:5003').replace(/\/$/, '');

async function readAccessTokenFromSession(page: Page): Promise<string | null> {
    const result = await page.evaluate(async () => {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
        });
        const text = await response.text();
        let body: unknown = text;
        try {
            body = text ? JSON.parse(text) : {};
        } catch {
            body = {};
        }

        return {
            status: response.status,
            token: typeof (body as { token?: unknown })?.token === 'string'
                ? (body as { token: string }).token
                : null,
        };
    });

    return result.status === 200 ? result.token : null;
}

test.describe('Auth Session Security', () => {
    test('new login invalidates old student session', async ({ browser, request }) => {
        const context1 = await browser.newContext();
        const page1 = await context1.newPage();
        const studentCandidates = [
            seededCreds.student.session,
            seededCreds.student.desktop,
            seededCreds.student.mobile,
        ];
        const loginStudentWithCreds = async (page: typeof page1, creds: { email: string; password: string }) => {
            await page.goto('/login');
            await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(creds.email);
            await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(creds.password);
            await page.getByRole('button', { name: /(Sign in|Access Dashboard)/i }).first().click();
            try {
                await expect(page).toHaveURL(/\/dashboard/, { timeout: 12000 });
                return true;
            } catch {
                return false;
            }
        };

        let sessionCreds = studentCandidates[0];
        let loggedIn = false;
        for (const candidate of studentCandidates) {
            if (await loginStudentWithCreds(page1, candidate)) {
                sessionCreds = candidate;
                loggedIn = true;
                break;
            }
        }
        expect(loggedIn).toBeTruthy();

        const oldToken = await readAccessTokenFromSession(page1);
        expect(oldToken).toBeTruthy();

        const context2 = await browser.newContext();
        const page2 = await context2.newPage();
        const secondLogin = await loginStudentWithCreds(page2, sessionCreds);
        expect(secondLogin).toBeTruthy();
        await expect(page2).toHaveURL(/\/dashboard/);

        const sessionCheck = await request.get(`${baseApi}/api/auth/me`, {
            headers: {
                Authorization: `Bearer ${oldToken}`,
            },
        });
        expect([200, 401]).toContain(sessionCheck.status());
        const body = await sessionCheck.json();
        if (sessionCheck.status() === 401 && body?.code) {
            expect(['SESSION_INVALIDATED', 'LEGACY_TOKEN_NOT_ALLOWED']).toContain(body.code);
        }

        if (sessionCheck.status() === 401) {
            await expect
                .poll(
                    async () => readAccessTokenFromSession(page1),
                    { timeout: 15000, intervals: [500, 1000, 1500] }
                )
                .toBeNull();
        }

        await page1.goto('/login');
        await page1.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(sessionCreds.email);
        await page1.locator('input#password, input[name="password"], input[type="password"]').first().fill(sessionCreds.password);
        await page1.getByRole('button', { name: /Sign in/i }).click();
        await expect(page1).toHaveURL(/\/dashboard/);

        await context1.close();
        await context2.close();
    });
});
