/**
 * Contract-level Jest tests for exam APIs.
 * Runs with mongodb-memory-server (see setup.ts).
 */
import mongoose from "mongoose";
import { ExamModel } from "../../src/models/exam.model";
import { ExamQuestionModel } from "../../src/models/examQuestion.model";
import { ExamSessionModel } from "../../src/models/examSession.model";
import { ResultModel } from "../../src/models/result.model";
import { AnswerModel } from "../../src/models/answer.model";
import { UserModel } from "../../src/models/user.model";
import { buildAccessPayload } from "../../src/services/examAccessService";
import { startSession, getSessionQuestions, saveSessionAnswers, submitSession } from "../../src/services/examSessionService";

// ─── Helpers ───
async function createTestUser(overrides: Record<string, unknown> = {}) {
    const uid = String(overrides.userId ?? "TEST001");
    const doc = await UserModel.create({
        userId: uid,
        username: "testuser",
        fullName: "Test User",
        phone: "01700000000",
        email: "test@campus.com",
        role: "student",
        profileScore: 80,
        passwordHash: "$2b$10$placeholder",
        ...overrides,
    });
    return { _id: doc._id, userId: uid };
}

async function createTestExam(overrides: Record<string, unknown> = {}) {
    const now = new Date();
    const future = new Date(now.getTime() + 3_600_000);
    return ExamModel.create({
        title: "Test Exam",
        subject: "Math",
        examCategory: "Weekly",
        durationMinutes: 30,
        examWindowStartUTC: now.toISOString(),
        examWindowEndUTC: future.toISOString(),
        resultPublishAtUTC: future.toISOString(),
        status: "live",
        paymentRequired: false,
        subscriptionRequired: false,
        attemptLimit: 1,
        allowReAttempt: false,
        negativeMarkingEnabled: false,
        negativePerWrong: 0,
        answerChangeLimit: null,
        shuffleQuestions: false,
        shuffleOptions: false,
        showTimer: true,
        showQuestionPalette: true,
        autoSubmitOnTimeout: true,
        solutionsEnabled: true,
        solutionReleaseRule: "after_result_publish",
        ...overrides,
    });
}

async function seedQuestionsForExam(examId: string, count = 3, overrides: Record<string, unknown> = {}) {
    const questions = [];
    for (let i = 0; i < count; i++) {
        questions.push(
            ExamQuestionModel.create({
                examId,
                question_en: `Question ${i + 1}?`,
                question_bn: `প্রশ্ন ${i + 1}?`,
                options: [
                    { key: "A", text_en: "Option A" },
                    { key: "B", text_en: "Option B" },
                    { key: "C", text_en: "Option C" },
                    { key: "D", text_en: "Option D" },
                ],
                correctKey: "B",
                marks: 1,
                negativeMarks: null,
                orderIndex: i,
                ...overrides,
            }),
        );
    }
    return Promise.all(questions);
}

async function startTestSession(examId: string, userId: string) {
    const result = await startSession(examId, userId, {});
    if ("blocked" in result) throw new Error("Session unexpectedly blocked in test");
    return result;
}

// ═══════════════════════════════════════════════
// ACCESS / GATING
// ═══════════════════════════════════════════════
describe("Exam access gating", () => {
    test("returns allowed for eligible user", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        const access = await buildAccessPayload(exam, user.userId);
        expect(access.accessStatus).toBe("allowed");
        expect(access.blockReasons).toEqual([]);
    });

    test("blocks PROFILE_BELOW_70 when score < 70", async () => {
        const user = await createTestUser({ profileScore: 50 });
        const exam = await createTestExam();
        const access = await buildAccessPayload(exam, user.userId);
        expect(access.accessStatus).toBe("blocked");
        expect(access.blockReasons).toContain("PROFILE_BELOW_70");
    });

    test("blocks EXAM_NOT_IN_WINDOW when outside schedule", async () => {
        const user = await createTestUser();
        const past = new Date(Date.now() - 7_200_000);
        const pastEnd = new Date(Date.now() - 3_600_000);
        const exam = await createTestExam({
            examWindowStartUTC: past.toISOString(),
            examWindowEndUTC: pastEnd.toISOString(),
            status: "ended",
        });
        const access = await buildAccessPayload(exam, user.userId);
        expect(access.accessStatus).toBe("blocked");
        expect(access.blockReasons).toContain("EXAM_NOT_IN_WINDOW");
    });

    test("blocks ATTEMPT_LIMIT_REACHED after max attempts", async () => {
        const user = await createTestUser();
        const exam = await createTestExam({ attemptLimit: 1 });
        // Create a completed session with the same userId used by the service
        await ExamSessionModel.create({
            examId: exam._id,
            userId: user.userId,
            attemptNo: 1,
            status: "submitted",
            questionOrder: [],
            optionOrderMap: {},
            startedAtUTC: new Date().toISOString(),
            expiresAtUTC: new Date().toISOString(),
        });
        const access = await buildAccessPayload(exam, user.userId);
        expect(access.accessStatus).toBe("blocked");
        expect(access.blockReasons).toContain("ATTEMPT_LIMIT_REACHED");
    });
});

// ═══════════════════════════════════════════════
// SESSION LIFECYCLE
// ═══════════════════════════════════════════════
describe("Exam session lifecycle", () => {
    test("startSession creates a session and returns sessionId", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        await seedQuestionsForExam(String(exam._id));

        const result = await startTestSession(String(exam._id), user.userId);
        expect(result.sessionId).toBeDefined();
        expect(typeof result.sessionId).toBe("string");
        expect(result.serverNowUTC).toBeDefined();

        const session = await ExamSessionModel.findById(result.sessionId);
        expect(session).not.toBeNull();
        expect(session!.status).toBe("in_progress");
    });

    test("getSessionQuestions returns questions with shuffled order preserved", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        const questions = await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);
        const data = await getSessionQuestions(String(exam._id), sessionId, user.userId);

        expect(data.questions).toHaveLength(questions.length);
        expect(data.exam.expiresAtUTC).toBeDefined();
        expect(data.answers).toEqual([]);
        data.questions.forEach((q: any) => {
            expect(q.id).toBeDefined();
            expect(q.options).toBeDefined();
            expect(q.options.length).toBeGreaterThan(0);
        });
    });

    test("saveSessionAnswers persists answer and returns updated response", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        const questions = await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);
        const questionsData = await getSessionQuestions(String(exam._id), sessionId, user.userId);
        const questionId = questionsData.questions[0].id;

        const result = await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [{ questionId, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() }],
        });

        expect(result.updated).toHaveLength(1);
        expect(result.updated[0].questionId).toBe(questionId);
        expect(result.serverSavedAtUTC).toBeDefined();

        const answer = await AnswerModel.findOne({ sessionId, questionId });
        expect(answer).not.toBeNull();
        expect(answer!.selectedKey).toBe("A");
    });

    test("saveSessionAnswers enforces answer change limit", async () => {
        const user = await createTestUser();
        const exam = await createTestExam({ answerChangeLimit: 1 });
        const questions = await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);
        const questionsData = await getSessionQuestions(String(exam._id), sessionId, user.userId);
        const questionId = questionsData.questions[0].id;

        // First answer
        await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [{ questionId, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() }],
        });

        // First change (should succeed, changeCount becomes 1)
        await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [{ questionId, selectedKey: "B", clientUpdatedAtUTC: new Date().toISOString() }],
        });

        // Second change (should be rejected, limit is 1)
        await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [{ questionId, selectedKey: "C", clientUpdatedAtUTC: new Date().toISOString() }],
        });

        // The answer should still be B, not C
        const answer = await AnswerModel.findOne({ sessionId, questionId });
        expect(answer!.selectedKey).toBe("B");
    });
});

// ═══════════════════════════════════════════════
// SUBMIT & RESULTS
// ═══════════════════════════════════════════════
describe("Exam submit and results", () => {
    test("submitSession calculates correct score", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        const questions = await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);
        const questionsData = await getSessionQuestions(String(exam._id), sessionId, user.userId);

        // Answer first question correctly (B), second wrong (A), skip third
        await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [
                { questionId: questionsData.questions[0].id, selectedKey: "B", clientUpdatedAtUTC: new Date().toISOString() },
                { questionId: questionsData.questions[1].id, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() },
            ],
        });

        const result = await submitSession(String(exam._id), sessionId, user.userId);
        expect(result.submittedAtUTC).toBeDefined();

        const dbResult = await ResultModel.findOne({ sessionId });
        expect(dbResult).not.toBeNull();
        expect(dbResult!.correctCount).toBe(1);
        expect(dbResult!.wrongCount).toBe(1);
        expect(dbResult!.skippedCount).toBe(1);
        expect(dbResult!.totalMarks).toBe(3);
        expect(dbResult!.obtainedMarks).toBe(1);
    });

    test("submitSession is idempotent", async () => {
        const user = await createTestUser();
        const exam = await createTestExam();
        await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);

        const result1 = await submitSession(String(exam._id), sessionId, user.userId);
        const result2 = await submitSession(String(exam._id), sessionId, user.userId);

        expect(String(result1.submittedAtUTC)).toBe(String(result2.submittedAtUTC));

        const results = await ResultModel.find({ sessionId });
        expect(results).toHaveLength(1);
    });

    test("submitSession with negative marking deducts correctly", async () => {
        const user = await createTestUser();
        const exam = await createTestExam({ negativeMarkingEnabled: true, negativePerWrong: 0.25 });
        await seedQuestionsForExam(String(exam._id));

        const { sessionId } = await startTestSession(String(exam._id), user.userId);
        const questionsData = await getSessionQuestions(String(exam._id), sessionId, user.userId);

        // All wrong answers
        await saveSessionAnswers(String(exam._id), sessionId, user.userId, {
            answers: [
                { questionId: questionsData.questions[0].id, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() },
                { questionId: questionsData.questions[1].id, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() },
                { questionId: questionsData.questions[2].id, selectedKey: "A", clientUpdatedAtUTC: new Date().toISOString() },
            ],
        });

        await submitSession(String(exam._id), sessionId, user.userId);

        const dbResult = await ResultModel.findOne({ sessionId });
        expect(dbResult!.wrongCount).toBe(3);
        // Negative: 3 * 0.25 = 0.75 deducted, obtainedMarks = 0 - 0.75 = -0.75
        expect(dbResult!.obtainedMarks).toBeLessThan(0);
    });
});
