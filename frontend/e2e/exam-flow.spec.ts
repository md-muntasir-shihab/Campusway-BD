import { APIRequestContext, Page, expect, test } from '@playwright/test';
import { attachHealthTracker, expectPageHealthy, loginAsStudent } from './helpers';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

test.describe('Student Exam Flow', () => {
    let seededExamId = '';

    test.beforeAll(async ({ request }) => {
        const adminLogin = await apiLogin(
            request,
            env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
            env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
        );
        seededExamId = await ensureStudentFlowExam(request, adminLogin.token);
    });

    test.beforeEach(async ({ page }) => {
        await loginAsStudent(page);
        await page.goto('/exams');
        await expect(page.getByRole('heading', { name: /(Exam Portal|Exams|Welcome)/i }).first()).toBeVisible({ timeout: 20000 });
    });

    test('full exam lifecycle: landing, taking, auto-save, and results', async ({ page }) => {
        const tracker = attachHealthTracker(page);
        await dismissPopupIfPresent(page);

        // 1. Open the first available exam CTA from landing list
        const takeExamBtn = page
            .locator(`a[href*="/exam/${seededExamId}"]`)
            .filter({ hasText: /^Start$/i })
            .first();
        await expect(takeExamBtn).toBeVisible({ timeout: 20000 });
        await dismissPopupIfPresent(page);
        await takeExamBtn.click({ force: true });

        // 2. Landing/taking mode verification
        await page.waitForURL(/\/exam(\/take)?\//, { timeout: 15000 });

        const startBtn = page.getByRole('button', { name: /^Start Exam$/i });
        await dismissPopupIfPresent(page);
        const hasStartCta = await startBtn
            .waitFor({ state: 'visible', timeout: 15000 })
            .then(() => true)
            .catch(() => false);
        if (hasStartCta) {
            await startBtn.click({ force: true });
        }

        // Some environments render the CTA after route settle; click once more if it remains visible.
        if (await startBtn.isVisible().catch(() => false)) {
            await startBtn.click({ force: true });
        }

        await dismissPopupIfPresent(page);

        // 3. Active exam UI verification and answer at least one question
        const questionCards = page.locator('[id^="exam-question-"]');
        await expect(questionCards.first()).toBeVisible({ timeout: 30000 });
        await dismissPopupIfPresent(page);
        await questionCards.first().locator('button[type="button"]').nth(1).click({ force: true });

        // Let auto-save trigger
        await page.waitForTimeout(2000);

        // 4. Navigate and answer more questions if available
        const paletteTwo = page.getByRole('button', { name: /^2$/ }).first();
        if (await paletteTwo.isVisible().catch(() => false)) {
            await dismissPopupIfPresent(page);
            await paletteTwo.click({ force: true });
            await dismissPopupIfPresent(page);
            await questionCards.nth(1).locator('button[type="button"]').nth(1).click({ force: true });
        }

        const paletteThree = page.getByRole('button', { name: /^3$/ }).first();
        if (await paletteThree.isVisible().catch(() => false)) {
            await dismissPopupIfPresent(page);
            await paletteThree.click({ force: true });
            await dismissPopupIfPresent(page);
            await questionCards.nth(2).locator('button[type="button"]').nth(1).click({ force: true });
        }

        // 5. Submit Exam
        await expect(page.getByText(/Saved|Saving/i).first()).toBeAttached({ timeout: 15000 });
        await dismissPopupIfPresent(page);
        await page.getByRole('button', { name: /^Submit$/i }).first().click({ force: true });
        await expect(page.getByRole('heading', { name: /Submit Exam/i })).toBeVisible();
        await dismissPopupIfPresent(page);
        await page.getByRole('button', { name: /Confirm Submit/i }).click({ force: true });

        // In case of stale revision race, the UI asks for a second submit attempt.
        await page.waitForTimeout(1500);
        if (!/\/exam\/[^/]+\/result/.test(page.url())) {
            const submitAgain = page.getByRole('button', { name: /Confirm Submit/i });
            if (await submitAgain.isVisible().catch(() => false)) {
                await dismissPopupIfPresent(page);
                await submitAgain.click({ force: true });
            }
        }

        // 6. Result Page Verification
        await page.waitForURL(/\/exam\/[^/]+\/result/, { timeout: 20000 });
        await expect(page.getByText(/Result Published|Result not published yet/i).first()).toBeVisible({ timeout: 20000 });

        await expectPageHealthy(page, tracker);
        tracker.detach();
    });
});

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function apiLogin(
    request: APIRequestContext,
    identifier: string,
    password: string,
): Promise<{ token: string }> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as { token?: string };
    expect(String(body.token || '')).toBeTruthy();
    return { token: String(body.token) };
}

async function ensureStudentFlowExam(request: APIRequestContext, adminToken: string): Promise<string> {
    const now = Date.now();
    const startDate = new Date(now - 60 * 60 * 1000).toISOString();
    const endDate = new Date(now + 6 * 60 * 60 * 1000).toISOString();
    const resultPublishDate = new Date(now - 5 * 60 * 1000).toISOString();

    const createResponse = await request.post('/api/campusway-secure-admin/exams', {
        headers: authHeader(adminToken),
        data: {
            title: `E2E Deterministic Student Flow ${now}`,
            subject: 'E2E QA',
            description: 'Deterministic seed exam for student flow Playwright test.',
            duration: 20,
            totalQuestions: 3,
            totalMarks: 3,
            startDate,
            endDate,
            resultPublishDate,
            attemptLimit: 999,
            negativeMarking: false,
            randomizeQuestions: false,
            randomizeOptions: false,
            allowBackNavigation: true,
            showQuestionPalette: true,
            showRemainingTime: true,
            autoSubmitOnTimeout: true,
            instructions: 'Read all instructions before starting the exam.',
            require_instructions_agreement: true,
            security_policies: {
                tab_switch_limit: 3,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: false,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
        },
    });
    expect(createResponse.status(), await createResponse.text()).toBe(201);
    const createBody = (await createResponse.json()) as { exam?: { _id?: string } };
    const examId = String(createBody.exam?._id || '');
    expect(examId).toBeTruthy();

    const fixtures = [
        {
            question: 'E2E Flow Q1: Which option is correct?',
            optionA: 'Alpha',
            optionB: 'Beta',
            optionC: 'Gamma',
            optionD: 'Delta',
            correctAnswer: 'A',
            marks: 1,
            difficulty: 'easy',
            order: 1,
            questionType: 'mcq',
        },
        {
            question: 'E2E Flow Q2: Pick the expected answer.',
            optionA: 'One',
            optionB: 'Two',
            optionC: 'Three',
            optionD: 'Four',
            correctAnswer: 'B',
            marks: 1,
            difficulty: 'easy',
            order: 2,
            questionType: 'mcq',
        },
        {
            question: 'E2E Flow Q3: Select the valid choice.',
            optionA: 'North',
            optionB: 'South',
            optionC: 'East',
            optionD: 'West',
            correctAnswer: 'C',
            marks: 1,
            difficulty: 'easy',
            order: 3,
            questionType: 'mcq',
        },
    ];

    for (const fixture of fixtures) {
        const questionResponse = await request.post(`/api/campusway-secure-admin/exams/${examId}/questions`, {
            headers: authHeader(adminToken),
            data: fixture,
        });
        expect([200, 201]).toContain(questionResponse.status());
    }

    const publishResponse = await request.patch(`/api/campusway-secure-admin/exams/${examId}/publish`, {
        headers: authHeader(adminToken),
    });
    expect(publishResponse.status(), await publishResponse.text()).toBe(200);

    return examId;
}

async function dismissPopupIfPresent(page: Page): Promise<void> {
    const closePopup = page.getByRole('button', { name: /Close popup/i }).first();
    for (let i = 0; i < 3; i += 1) {
        const visible = await closePopup.isVisible().catch(() => false);
        if (!visible) return;
        await closePopup.click({ force: true }).catch(() => undefined);
    }
}
