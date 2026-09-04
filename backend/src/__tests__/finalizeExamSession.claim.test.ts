import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Validates the atomic submit guard introduced in step 1.1 (fix A-1 / B-1).
 *
 * These tests use vi.doMock to stub every mongoose model used by
 * finalizeExamSession, so the logic runs WITHOUT a real database connection.
 * They assert the most important behavioural guarantees:
 *   1. The session is "claimed" with a single atomic findOneAndUpdate that
 *      sets isActive=false (only one of two concurrent submits can win).
 *   2. A concurrent loser (claim returns null) does NOT create a second
 *      ExamResult and is told the attempt was already submitted.
 *   3. An in-flight concurrent submit (claimed, result not yet flushed) yields
 *      a 409 instead of a duplicate/500.
 */

const examSession = {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
};
const examResult = {
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
};
const question = {
    findByIdAndUpdate: vi.fn(),
    find: vi.fn(),
};
const studentProfile = {
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
};
const exam = {
    findById: vi.fn(),
};

vi.doMock('../models/ExamSession', () => ({ default: examSession }));
vi.doMock('../models/ExamResult', () => ({ default: examResult }));
vi.doMock('../models/Question', () => ({ default: question }));
vi.doMock('../models/StudentProfile', () => ({ default: studentProfile }));
vi.doMock('../models/Exam', () => ({ default: exam }));
vi.doMock('../services/examProfileSyncEngine', () => ({
    syncExamResultToStudentProfile: vi.fn().mockResolvedValue(undefined),
}));

const { finalizeExamSession } = await import('../services/examFinalizationService');

function fakeExam() {
    return {
        _id: 'exam1',
        exam: 'exam1',
        attemptLimit: 2,
        totalMarks: 100,
        duration: 60,
        negativeMarking: false,
        negativeMarkValue: 0,
        answerEditLimitPerQuestion: 10,
        toObject: () => ({}),
    } as any;
}

const baseSession = {
    _id: 'sess1',
    exam: 'exam1',
    student: 'stu1',
    attemptNo: 1,
    attemptRevision: 0,
    isActive: true,
    sessionLocked: false,
    status: 'in_progress',
    submittedAt: undefined,
    answers: [],
    toObject: () => ({
        _id: 'sess1',
        exam: 'exam1',
        student: 'stu1',
        attemptNo: 1,
        attemptRevision: 0,
        isActive: true,
        sessionLocked: false,
        status: 'in_progress',
        answers: [],
    }),
};

const existingResult = {
    _id: 'res1',
    exam: 'exam1',
    student: 'stu1',
    attemptNo: 1,
    obtainedMarks: 50,
    percentage: 50,
    correctCount: 5,
    wrongCount: 5,
    unansweredCount: 0,
    isAutoSubmitted: false,
    submittedAt: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
    vi.clearAllMocks();
    exam.findById.mockResolvedValue(fakeExam());
    const claimedDoc = { ...baseSession, isActive: false, attemptRevision: 1 } as any;
    claimedDoc.save = vi.fn().mockResolvedValue(claimedDoc);
    examSession.findOneAndUpdate.mockResolvedValue(claimedDoc);
    // findOne().sort() is chainable; resolve the chain to `null` by default.
    examSession.findOne.mockReturnValue(chainable(null));
    examResult.findOne.mockReturnValue(chainable(null));
    examResult.find.mockReturnValue(chainable([]));
    examResult.create.mockImplementation(async (doc: any) => ({ ...doc, _id: 'newres', toObject: () => doc }));
    question.findByIdAndUpdate.mockResolvedValue({});
    question.find.mockReturnValue(chainable([]));
    studentProfile.findOneAndUpdate.mockResolvedValue({});
    studentProfile.find.mockReturnValue(chainable([]));
});

/** Build a minimal mongoose-query-like object that resolves to `value`
 *  regardless of how .sort()/.lean() are chained (.find().sort(),
 *  .findOne().sort().lean(), etc.). */
function chainable(value: any) {
    const query: any = {};
    const resolve = () => Promise.resolve(value);
    query.sort = () => query;
    query.lean = () => query;
    query.select = () => query;
    query.then = (onFulfilled: any, onRejected: any) => resolve().then(onFulfilled, onRejected);
    return query;
}

describe('finalizeExamSession atomic submit guard (fix A-1 / B-1)', () => {
    it('claims the session atomically before creating a result', async () => {
        const result = await finalizeExamSession({
            examId: 'exam1',
            studentId: 'stu1',
            submissionType: 'manual',
            isAutoSubmit: false,
            now: new Date('2026-06-01T00:00:00Z'),
            requestMeta: { ipAddress: '1.2.3.4', userAgent: 'test' },
            incomingAnswers: [],
        } as any);

        // The claim must be a single atomic update, not a find-then-save.
        expect(examSession.findOneAndUpdate).toHaveBeenCalledTimes(1);
        const [filter, update] = examSession.findOneAndUpdate.mock.calls[0];
        expect(filter.isActive).toBe(true);
        expect(update.$set.isActive).toBe(false);
        expect(update.$inc.attemptRevision).toBe(1);

        // Only one result is ever created for this single submit.
        expect(examResult.create).toHaveBeenCalledTimes(1);
        expect(result.ok).toBe(true);
        expect(result.alreadySubmitted).toBe(false);
    });

    it('returns alreadySubmitted (no second result) when the claim loses the race', async () => {
        // Simulate a concurrent submit that already claimed the session.
        examSession.findOneAndUpdate.mockResolvedValue(null);
        const claimedSession = { ...baseSession, isActive: false, attemptRevision: 1 };
        examSession.findOne
            .mockReturnValueOnce(chainable(claimedSession as any)) // claim re-query
            .mockReturnValueOnce(chainable(claimedSession as any)); // existingResult re-query
        examResult.findOne.mockReturnValue(chainable(existingResult as any));

        const result = await finalizeExamSession({
            examId: 'exam1',
            studentId: 'stu1',
            submissionType: 'manual',
            isAutoSubmit: false,
            now: new Date('2026-06-01T00:00:00Z'),
            requestMeta: { ipAddress: '1.2.3.4', userAgent: 'test' },
            incomingAnswers: [],
        } as any);

        expect(examSession.findOneAndUpdate).toHaveBeenCalledTimes(1); // the losing claim
        expect(examResult.create).not.toHaveBeenCalled(); // no duplicate result
        expect(result.ok).toBe(true);
        expect(result.alreadySubmitted).toBe(true);
        expect(Number((result.result as any).obtainedMarks)).toBe(50);
    });

    it('returns 409 when claim lost but the result is still flushing', async () => {
        examSession.findOneAndUpdate.mockResolvedValue(null);
        // Claim re-query finds the session still active (claimed, not finalized).
        examSession.findOne.mockReturnValue(chainable({ ...baseSession, isActive: true, attemptRevision: 1 } as any));
        examResult.findOne.mockReturnValue(chainable(null));

        const result = await finalizeExamSession({
            examId: 'exam1',
            studentId: 'stu1',
            submissionType: 'manual',
            isAutoSubmit: false,
            now: new Date('2026-06-01T00:00:00Z'),
            requestMeta: { ipAddress: '1.2.3.4', userAgent: 'test' },
            incomingAnswers: [],
        } as any);

        expect(result.ok).toBe(false);
        expect(result.statusCode).toBe(409);
        expect(examResult.create).not.toHaveBeenCalled();
    });
});
