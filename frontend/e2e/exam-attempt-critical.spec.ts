import { APIRequestContext, expect, test } from '@playwright/test';

const ATTEMPT_EXAM_TITLE = 'E2E Attempt Flow Regression Exam';
const LOCK_EXAM_TITLE = 'E2E Attempt Lock Policy Exam';

const adminCreds = {
    email: process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
    password: process.env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
};

const studentDesktopCreds = {
    email: process.env.E2E_STUDENT_DESKTOP_EMAIL || 'e2e_student_desktop@campusway.local',
    password: process.env.E2E_STUDENT_DESKTOP_PASSWORD || 'E2E_Student#12345',
};

const studentSessionCreds = {
    email: process.env.E2E_STUDENT_SESSION_EMAIL || 'e2e_student_session@campusway.local',
    password: process.env.E2E_STUDENT_SESSION_PASSWORD || 'E2E_Student#12345',
};

type LoginResult = {
    token: string;
    user: {
        _id: string;
        role: string;
        email: string;
    };
};

type StartAttemptResponse = {
    session: {
        sessionId: string;
        attemptRevision?: number;
    };
    serverNow?: string;
    serverOffsetMs?: number;
    autosaveIntervalSec?: number;
    questions: Array<{
        _id: string;
    }>;
};

test.describe('Exam Attempt Critical Flows', () => {
    test.describe.configure({ mode: 'serial' });

    let adminToken = '';
    let examId = '';
    let lockExamId = '';

    test.beforeAll(async ({ request }, workerInfo) => {
        test.skip(workerInfo.project.name.includes('mobile'), 'Critical attempt suite is desktop-only.');

        const adminLogin = await apiLogin(request, adminCreds.email, adminCreds.password);
        adminToken = adminLogin.token;
        examId = await ensureCriticalFlowExam(request, adminToken, {
            titlePrefix: ATTEMPT_EXAM_TITLE,
            security_policies: {
                tab_switch_limit: 3,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: false,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
        });
        lockExamId = await ensureCriticalFlowExam(request, adminToken, {
            titlePrefix: LOCK_EXAM_TITLE,
            security_policies: {
                tab_switch_limit: 1,
                copy_paste_violations: 2,
                camera_enabled: false,
                require_fullscreen: false,
                auto_submit_on_violation: false,
                violation_action: 'lock',
            },
        });
    });

    test('student start and autosave API flow works for active attempt', async ({ request }) => {
        const studentLogin = await apiLogin(request, studentDesktopCreds.email, studentDesktopCreds.password);
        const studentToken = studentLogin.token;

        const detailsResponse = await request.get(`/api/exams/${examId}/details`, {
            headers: authHeader(studentToken),
        });
        const detailsStatus = detailsResponse.status();
        let detailsBody: { exam?: { _id?: string; title?: string } } | null = null;
        if (detailsStatus === 404) {
            const fallbackResponse = await request.get(`/api/exams/${examId}`, {
                headers: authHeader(studentToken),
            });
            expect(fallbackResponse.status(), await fallbackResponse.text()).toBe(200);
            detailsBody = (await fallbackResponse.json()) as { exam?: { _id?: string; title?: string } };
        } else {
            expect(detailsStatus, await detailsResponse.text()).toBe(200);
            detailsBody = (await detailsResponse.json()) as { exam?: { _id?: string; title?: string } };
        }
        expect(String(detailsBody.exam?._id || '')).toBe(examId);

        const startResponse = await request.post(`/api/exams/${examId}/start`, {
            headers: authHeader(studentToken),
        });
        expect(startResponse.status()).toBe(200);
        const startBody = (await startResponse.json()) as StartAttemptResponse;
        const attemptId = String(startBody.session.sessionId || '');
        const initialRevision = Number(startBody.session.attemptRevision || 0);
        const questionId = String(startBody.questions[0]?._id || '');
        expect(attemptId).toBeTruthy();
        expect(questionId).toBeTruthy();
        if (startBody.serverNow !== undefined) {
            expect(startBody.serverNow).toBeTruthy();
        }
        if (startBody.autosaveIntervalSec !== undefined) {
            expect(Number(startBody.autosaveIntervalSec || 0)).toBeGreaterThan(0);
        }

        const autosaveResponse = await request.post(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: initialRevision,
                answers: [
                    {
                        questionId,
                        selectedAnswer: 'A',
                    },
                ],
            },
        });
        expect(autosaveResponse.status()).toBe(200);
        const autosaveBody = (await autosaveResponse.json()) as { saved?: boolean; attemptRevision?: number };
        expect(autosaveBody.saved).toBeTruthy();
        expect(Number(autosaveBody.attemptRevision || 0)).toBeGreaterThan(initialRevision);
    });

    test('attempt API handles stale revision, anti-cheat event, and submit', async ({ request }) => {
        const studentLogin = await apiLogin(request, studentSessionCreds.email, studentSessionCreds.password);
        const studentToken = studentLogin.token;

        const startResponse = await request.post(`/api/exams/${examId}/start`, {
            headers: authHeader(studentToken),
        });
        expect(startResponse.status()).toBe(200);
        const startBody = (await startResponse.json()) as StartAttemptResponse;
        const attemptId = String(startBody.session.sessionId || '');
        const initialRevision = Number(startBody.session.attemptRevision || 0);
        const questionId = String(startBody.questions[0]?._id || '');
        expect(attemptId).toBeTruthy();
        expect(questionId).toBeTruthy();

        const firstSaveResponse = await request.post(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: initialRevision,
                answers: [
                    {
                        questionId,
                        selectedAnswer: 'A',
                    },
                ],
            },
        });
        expect(firstSaveResponse.status()).toBe(200);
        const firstSaveBody = (await firstSaveResponse.json()) as { saved?: boolean; attemptRevision?: number };
        expect(firstSaveBody.saved).toBeTruthy();
        const updatedRevision = Number(firstSaveBody.attemptRevision || 0);
        expect(updatedRevision).toBeGreaterThan(initialRevision);

        const staleSaveResponse = await request.post(`/api/exams/${examId}/attempt/${attemptId}/answer`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: initialRevision,
                answers: [
                    {
                        questionId,
                        selectedAnswer: 'B',
                    },
                ],
            },
        });
        expect(staleSaveResponse.status()).toBe(409);
        const staleBody = (await staleSaveResponse.json()) as { latestRevision?: number; message?: string };
        expect(Number(staleBody.latestRevision || -1)).toBe(updatedRevision);
        expect(String(staleBody.message || '')).toMatch(/stale/i);

        const antiCheatResponse = await request.post(`/api/exams/${examId}/attempt/${attemptId}/event`, {
            headers: authHeader(studentToken),
            data: {
                eventType: 'tab_switch',
                attemptRevision: updatedRevision,
                metadata: {
                    increment: 1,
                    source: 'playwright_test',
                },
                timestamp: new Date().toISOString(),
            },
        });
        expect(antiCheatResponse.status()).toBe(200);
        const antiCheatBody = (await antiCheatResponse.json()) as {
            logged?: boolean;
            tabSwitchCount?: number;
            action?: string;
            attemptRevision?: number;
        };
        expect(antiCheatBody.logged).toBeTruthy();
        expect(Number(antiCheatBody.tabSwitchCount || 0)).toBeGreaterThanOrEqual(1);
        expect(['logged', 'warning']).toContain(String(antiCheatBody.action || 'logged'));
        expect(['warn', 'submit', 'lock']).toContain(String((antiCheatBody as any).violationAction || 'warn'));

        const revisionBeforeSubmit = Number(antiCheatBody.attemptRevision || updatedRevision);
        const submitResponse = await request.post(`/api/exams/${examId}/attempt/${attemptId}/submit`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: revisionBeforeSubmit,
                submissionType: 'manual',
                answers: [
                    {
                        questionId,
                        selectedAnswer: 'A',
                    },
                ],
            },
        });
        expect(submitResponse.status()).toBe(200);
        const submitBody = (await submitResponse.json()) as {
            submitted?: boolean;
            message?: string;
            resultId?: string;
        };
        expect(submitBody.submitted).toBeTruthy();
        expect(submitBody.resultId).toBeTruthy();
        expect(String(submitBody.message || '')).toMatch(/submitted/i);
    });

    test('lock policy prevents save and submit after violation threshold', async ({ request }) => {
        const studentLogin = await apiLogin(request, studentSessionCreds.email, studentSessionCreds.password);
        const studentToken = studentLogin.token;

        const startResponse = await request.post(`/api/exams/${lockExamId}/start`, {
            headers: authHeader(studentToken),
        });
        expect(startResponse.status()).toBe(200);
        const startBody = (await startResponse.json()) as StartAttemptResponse;
        const attemptId = String(startBody.session.sessionId || '');
        const initialRevision = Number(startBody.session.attemptRevision || 0);
        const questionId = String(startBody.questions[0]?._id || '');
        expect(attemptId).toBeTruthy();
        expect(questionId).toBeTruthy();

        const saveResponse = await request.post(`/api/exams/${lockExamId}/attempt/${attemptId}/answer`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: initialRevision,
                answers: [
                    {
                        questionId,
                        selectedAnswer: 'A',
                    },
                ],
            },
        });
        expect(saveResponse.status()).toBe(200);
        const saveBody = (await saveResponse.json()) as { attemptRevision?: number };
        const revision = Number(saveBody.attemptRevision || 0);
        expect(revision).toBeGreaterThan(initialRevision);

        const lockEventResponse = await request.post(`/api/exams/${lockExamId}/attempt/${attemptId}/event`, {
            headers: authHeader(studentToken),
            data: {
                eventType: 'tab_switch',
                attemptRevision: revision,
                metadata: { increment: 2, source: 'playwright_lock_flow' },
            },
        });
        expect(lockEventResponse.status()).toBe(423);
        const lockEventBody = (await lockEventResponse.json()) as { action?: string; lockReason?: string };
        expect(lockEventBody.action).toBe('locked');
        expect(String(lockEventBody.lockReason || '')).toMatch(/policy_lock/i);

        const blockedSave = await request.post(`/api/exams/${lockExamId}/attempt/${attemptId}/answer`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: revision + 1,
                answers: [{ questionId, selectedAnswer: 'B' }],
            },
        });
        expect(blockedSave.status()).toBe(423);

        const blockedSubmit = await request.post(`/api/exams/${lockExamId}/attempt/${attemptId}/submit`, {
            headers: authHeader(studentToken),
            data: {
                attemptRevision: revision + 1,
                answers: [{ questionId, selectedAnswer: 'A' }],
            },
        });
        expect(blockedSubmit.status()).toBe(423);
    });

    test('admin live action endpoint can warn and force-submit an active attempt', async ({ request }) => {
        const studentLogin = await apiLogin(request, studentSessionCreds.email, studentSessionCreds.password);
        const studentToken = studentLogin.token;

        const startResponse = await request.post(`/api/exams/${examId}/start`, {
            headers: authHeader(studentToken),
        });
        expect(startResponse.status()).toBe(200);
        const startBody = (await startResponse.json()) as StartAttemptResponse;
        const attemptId = String(startBody.session.sessionId || '');
        expect(attemptId).toBeTruthy();

        const warnResponse = await request.post(`/api/campusway-secure-admin/live/attempts/${attemptId}/action`, {
            headers: authHeader(adminToken),
            data: {
                action: 'warn',
                message: 'E2E proctor warning',
            },
        });
        expect(warnResponse.status()).toBe(200);
        const warnBody = (await warnResponse.json()) as { action?: string; status?: string };
        expect(warnBody.action).toBe('warn');
        expect(warnBody.status).toBe('ok');

        const forceResponse = await request.post(`/api/campusway-secure-admin/live/attempts/${attemptId}/action`, {
            headers: authHeader(adminToken),
            data: {
                action: 'force_submit',
            },
        });
        expect(forceResponse.status()).toBe(200);
        const forceBody = (await forceResponse.json()) as { action?: string; status?: string };
        expect(forceBody.action).toBe('force_submit');
        expect(forceBody.status).toBe('ok');
    });
});

function authHeader(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}` };
}

async function apiLogin(request: APIRequestContext, identifier: string, password: string): Promise<LoginResult> {
    const response = await request.post('/api/auth/login', {
        data: { identifier, password },
    });
    expect(response.status(), `Login failed for ${identifier}`).toBe(200);
    const body = (await response.json()) as LoginResult;
    expect(body.token).toBeTruthy();
    expect(body.user?._id).toBeTruthy();
    return body;
}

async function ensureCriticalFlowExam(
    request: APIRequestContext,
    token: string,
    options?: {
        titlePrefix?: string;
        security_policies?: {
            tab_switch_limit: number;
            copy_paste_violations: number;
            camera_enabled: boolean;
            require_fullscreen: boolean;
            auto_submit_on_violation: boolean;
            violation_action: 'warn' | 'submit' | 'lock';
        };
    },
): Promise<string> {
    const now = new Date();
    const startDate = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const endDate = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
    const resultPublishDate = new Date(now.getTime() - 60 * 1000).toISOString();
    const uniqueTitle = `${options?.titlePrefix || ATTEMPT_EXAM_TITLE} ${now.getTime()}`;
    const createResponse = await request.post('/api/campusway-secure-admin/exams', {
        headers: authHeader(token),
        data: {
            title: uniqueTitle,
            subject: 'E2E QA',
            description: 'Playwright critical exam attempt flow test.',
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
            security_policies: options?.security_policies || {
                tab_switch_limit: 3,
                copy_paste_violations: 3,
                camera_enabled: false,
                require_fullscreen: false,
                auto_submit_on_violation: false,
                violation_action: 'warn',
            },
        },
    });
    expect(createResponse.status()).toBe(201);
    const createBody = (await createResponse.json()) as { exam?: { _id?: string } };
    const targetExamId = String(createBody.exam?._id || '');
    expect(targetExamId).toBeTruthy();

    const fixtures = [
        {
            question: 'E2E Q1: Which option is correct?',
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
            question: 'E2E Q2: Select the expected answer.',
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
            question: 'E2E Q3: Pick the valid choice.',
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
        const createQuestionResponse = await request.post(`/api/campusway-secure-admin/exams/${targetExamId}/questions`, {
            headers: authHeader(token),
            data: fixture,
        });
        expect([200, 201]).toContain(createQuestionResponse.status());
    }

    const publishResponse = await request.patch(`/api/campusway-secure-admin/exams/${targetExamId}/publish`, {
        headers: authHeader(token),
    });
    expect(publishResponse.status(), await publishResponse.text()).toBe(200);

    const verifyPublishedResponse = await request.get(`/api/campusway-secure-admin/exams/${targetExamId}`, {
        headers: authHeader(token),
    });
    expect(verifyPublishedResponse.status(), await verifyPublishedResponse.text()).toBe(200);
    const verifyBody = (await verifyPublishedResponse.json()) as { exam?: { isPublished?: boolean } };
    expect(Boolean(verifyBody?.exam?.isPublished)).toBeTruthy();

    return targetExamId;
}
