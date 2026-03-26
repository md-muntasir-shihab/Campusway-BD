import { expect, Page } from '@playwright/test';

export type CredentialVariant = 'auto' | 'desktop' | 'mobile' | 'session';

function isMobileViewport(page: Page): boolean {
    return (page.viewportSize()?.width || 0) <= 768;
}

function resolveVariant(page: Page, variant: CredentialVariant): Exclude<CredentialVariant, 'auto'> {
    if (variant !== 'auto') return variant;
    return isMobileViewport(page) ? 'mobile' : 'desktop';
}

export const seededCreds = {
    admin: {
        desktop: {
            email: process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
            password: process.env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
        },
        mobile: {
            email: process.env.E2E_ADMIN_MOBILE_EMAIL || 'e2e_admin_mobile@campusway.local',
            password: process.env.E2E_ADMIN_MOBILE_PASSWORD || 'E2E_Admin#12345',
        },
    },
    student: {
        desktop: {
            email: process.env.E2E_STUDENT_DESKTOP_EMAIL || 'e2e_student_desktop@campusway.local',
            password: process.env.E2E_STUDENT_DESKTOP_PASSWORD || 'E2E_Student#12345',
        },
        mobile: {
            email: process.env.E2E_STUDENT_MOBILE_EMAIL || 'e2e_student_mobile@campusway.local',
            password: process.env.E2E_STUDENT_MOBILE_PASSWORD || 'E2E_Student#12345',
        },
        session: {
            email: process.env.E2E_STUDENT_SESSION_EMAIL || 'e2e_student_session@campusway.local',
            password: process.env.E2E_STUDENT_SESSION_PASSWORD || 'E2E_Student#12345',
        },
    },
};

export function getAdminCreds(page: Page, variant: CredentialVariant = 'auto') {
    const resolved = resolveVariant(page, variant);
    return resolved === 'mobile' ? seededCreds.admin.mobile : seededCreds.admin.desktop;
}

export function getStudentCreds(page: Page, variant: CredentialVariant = 'auto') {
    const resolved = resolveVariant(page, variant);
    if (resolved === 'session') return seededCreds.student.session;
    return resolved === 'mobile' ? seededCreds.student.mobile : seededCreds.student.desktop;
}

export type HealthTracker = {
    pageErrors: string[];
    criticalApiFailures: string[];
    detach: () => void;
};

export function attachHealthTracker(page: Page): HealthTracker {
    const pageErrors: string[] = [];
    const criticalApiFailures: string[] = [];

    const onPageError = (err: Error) => {
        pageErrors.push(err.message);
    };
    const onResponse = (response: { url(): string; status(): number }) => {
        const url = response.url();
        if (!url.includes('/api/')) return;
        if (response.status() >= 500) {
            criticalApiFailures.push(`${response.status()} ${url}`);
        }
    };

    page.on('pageerror', onPageError);
    page.on('response', onResponse);

    return {
        pageErrors,
        criticalApiFailures,
        detach: () => {
            page.off('pageerror', onPageError);
            page.off('response', onResponse);
        },
    };
}

export async function expectPageHealthy(page: Page, tracker: HealthTracker): Promise<void> {
    await expect(page.locator('body')).toBeVisible();
    expect.soft(
        tracker.pageErrors,
        `Unhandled page errors found: ${tracker.pageErrors.join('\n')}`
    ).toEqual([]);
    expect.soft(
        tracker.criticalApiFailures,
        `Critical API failures found: ${tracker.criticalApiFailures.join('\n')}`
    ).toEqual([]);
}

export async function loginAsAdmin(page: Page, variant: CredentialVariant = 'auto'): Promise<void> {
    const primary = getAdminCreds(page, variant);
    const secondary = primary.email === seededCreds.admin.desktop.email
        ? seededCreds.admin.mobile
        : seededCreds.admin.desktop;
    const attempts = [primary, secondary, primary, secondary, primary];

    for (let i = 0; i < attempts.length; i += 1) {
        const creds = attempts[i];
        await page.goto('/__cw_admin__/login', { waitUntil: 'domcontentloaded' });
        await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(creds.email);
        await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(creds.password);
        await page.getByRole('button', { name: /Sign In/i }).first().click();

        try {
            await expect(page).toHaveURL(/\/__cw_admin__\/dashboard/, { timeout: 10000 });
            return;
        } catch {
            const lockVisible = await page.getByText(/Too many login attempts/i).first().isVisible().catch(() => false);
            const rateLimitVisible = await page.getByText(/Too many requests/i).first().isVisible().catch(() => false);
            if ((lockVisible || rateLimitVisible) && i < attempts.length - 1) {
                await page.waitForTimeout(12000);
                continue;
            }
            if (i === attempts.length - 1) {
                throw new Error('Admin login failed: unable to reach /__cw_admin__/dashboard');
            }
        }
    }
}

export async function loginAsStudent(page: Page, variant: CredentialVariant = 'auto'): Promise<void> {
    const creds = getStudentCreds(page, variant);
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.locator('input#identifier, input[name="identifier"], input[type="text"], input[type="email"]').first().fill(creds.email);
    await page.locator('input#password, input[name="password"], input[type="password"]').first().fill(creds.password);
    await page.getByRole('button', { name: /(Sign in|Access Dashboard)/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
}
