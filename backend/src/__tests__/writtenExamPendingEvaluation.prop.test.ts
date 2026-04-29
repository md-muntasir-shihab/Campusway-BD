import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import ExamResult from '../models/ExamResult';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import { computeResult } from '../services/ResultEngineService';

/**
 * Feature: exam-management-system
 * Property 34: Written Exam Pending Evaluation Status
 *
 * **Validates: Requirements 29.3**
 *
 * When a Written/CQ exam is submitted, the Result_Engine marks it as
 * "pending_evaluation" instead of auto-scoring. Written questions get
 * marksObtained = 0 (not auto-scored). When an exam has ONLY MCQ questions,
 * the result status is "evaluated".
 */

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await Exam.deleteMany({});
    await ExamSession.deleteMany({});
    await ExamResult.deleteMany({});
    await QuestionBankQuestion.deleteMany({});
});

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a question type — either MCQ or written_cq */
const questionTypeArb = fc.constantFrom('mcq', 'written_cq') as fc.Arbitrary<'mcq' | 'written_cq'>;

/** Generate an answer key for MCQ questions */
const answerKeyArb = fc.constantFrom('A', 'B', 'C', 'D') as fc.Arbitrary<'A' | 'B' | 'C' | 'D'>;

/**
 * Generate an array guaranteed to have at least one written_cq question.
 * Inserts a written_cq between two random-length arrays of mixed types.
 */
const questionTypesWithWrittenArb = fc
    .tuple(
        fc.array(questionTypeArb, { minLength: 0, maxLength: 5 }),
        fc.array(questionTypeArb, { minLength: 0, maxLength: 5 }),
    )
    .map(([before, after]) => [...before, 'written_cq' as const, ...after]);

/** Generate an array of only MCQ questions (1–8 questions) */
const questionTypesOnlyMcqArb = fc.array(fc.constant('mcq' as const), { minLength: 1, maxLength: 8 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

const adminId = new mongoose.Types.ObjectId();

/**
 * Set up a complete exam scenario: create QuestionBankQuestion docs, an Exam,
 * and a submitted ExamSession. Returns the session ID for computeResult.
 */
async function setupExamScenario(
    questionTypes: ('mcq' | 'written_cq')[],
    mcqCorrectKey: 'A' | 'B' | 'C' | 'D',
) {
    const studentId = new mongoose.Types.ObjectId();

    // Create QuestionBankQuestion documents
    const questionDocs = await Promise.all(
        questionTypes.map((qType, idx) =>
            QuestionBankQuestion.create({
                subject: 'Math',
                moduleCategory: 'Algebra',
                question_en: `Question ${idx + 1}`,
                question_type: qType,
                difficulty: 'medium',
                options:
                    qType === 'mcq'
                        ? [
                            { key: 'A', text_en: 'Option A', isCorrect: mcqCorrectKey === 'A' },
                            { key: 'B', text_en: 'Option B', isCorrect: mcqCorrectKey === 'B' },
                            { key: 'C', text_en: 'Option C', isCorrect: mcqCorrectKey === 'C' },
                            { key: 'D', text_en: 'Option D', isCorrect: mcqCorrectKey === 'D' },
                        ]
                        : [],
                correctKey: mcqCorrectKey,
                marks: 1,
                negativeMarks: 0,
                contentHash: `hash-${new mongoose.Types.ObjectId().toString()}`,
                isActive: true,
                isArchived: false,
                status: 'published',
                review_status: 'approved',
            }),
        ),
    );

    const questionIds = questionDocs.map((q) => q._id);

    // Create Exam
    const exam = await Exam.create({
        title: 'Property Test Exam',
        subject: 'Math',
        duration: 60,
        totalQuestions: questionDocs.length,
        totalMarks: questionDocs.length,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        resultPublishDate: new Date('2025-12-31'),
        isPublished: true,
        defaultMarksPerQuestion: 1,
        negativeMarking: false,
        negativeMarkValue: 0,
        status: 'scheduled',
        createdBy: adminId,
        questionOrder: questionIds,
    });

    // Build session answers — MCQ questions get an answer, written_cq get empty
    const sessionAnswers = questionDocs.map((q, idx) => ({
        questionId: q._id.toString(),
        selectedAnswer: questionTypes[idx] === 'mcq' ? mcqCorrectKey : '',
        savedAt: new Date(),
        answerHistory: [],
        changeCount: 0,
    }));

    // Create submitted ExamSession
    const session = await ExamSession.create({
        exam: exam._id,
        student: studentId,
        attemptNo: 1,
        startedAt: new Date(Date.now() - 600_000), // 10 min ago
        submittedAt: new Date(),
        status: 'submitted',
        answers: sessionAnswers,
        expiresAt: new Date(Date.now() + 3_600_000),
    });

    return { sessionId: session._id.toString(), questionDocs };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 34: Written Exam Pending Evaluation Status', () => {
    it('exams with at least one written_cq question get "pending_evaluation" status', async () => {
        await fc.assert(
            fc.asyncProperty(
                questionTypesWithWrittenArb,
                answerKeyArb,
                async (questionTypes, correctKey) => {
                    // Clean up between iterations
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await ExamResult.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});

                    const { sessionId } = await setupExamScenario(questionTypes, correctKey);
                    const result = await computeResult(sessionId);

                    // Property: status must be 'pending_evaluation' when written questions exist
                    expect(result.status).toBe('pending_evaluation');
                },
            ),
            { numRuns: 15 },
        );
    });

    it('written_cq questions have marksObtained = 0 (not auto-scored)', async () => {
        await fc.assert(
            fc.asyncProperty(
                questionTypesWithWrittenArb,
                answerKeyArb,
                async (questionTypes, correctKey) => {
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await ExamResult.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});

                    const { sessionId } = await setupExamScenario(questionTypes, correctKey);
                    const result = await computeResult(sessionId);

                    // Property: every written answer in the result has marksObtained = 0
                    const writtenAnswers = result.answers.filter(
                        (a) => a.questionType === 'written',
                    );
                    expect(writtenAnswers.length).toBeGreaterThan(0);

                    for (const wa of writtenAnswers) {
                        expect(wa.marksObtained).toBe(0);
                    }
                },
            ),
            { numRuns: 15 },
        );
    });

    it('exams with ONLY MCQ questions get "evaluated" status', async () => {
        await fc.assert(
            fc.asyncProperty(
                questionTypesOnlyMcqArb,
                answerKeyArb,
                async (questionTypes, correctKey) => {
                    await Exam.deleteMany({});
                    await ExamSession.deleteMany({});
                    await ExamResult.deleteMany({});
                    await QuestionBankQuestion.deleteMany({});

                    const { sessionId } = await setupExamScenario(questionTypes, correctKey);
                    const result = await computeResult(sessionId);

                    // Property: status must be 'evaluated' when no written questions
                    expect(result.status).toBe('evaluated');
                },
            ),
            { numRuns: 15 },
        );
    });
});
