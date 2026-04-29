import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';
import User from '../models/User';
import LeaderboardEntry from '../models/LeaderboardEntry';
import { publishResults, gradeWrittenAnswer } from '../services/ResultEngineService';

/**
 * Integration tests for ResultEngineService — publishResults and gradeWrittenAnswer
 *
 * Validates: Requirements 7.5, 7.6, 7.7, 29.3, 29.4, 29.5, 29.6
 */

let mongoServer: MongoMemoryServer;

const studentId = new mongoose.Types.ObjectId();
const graderId = new mongoose.Types.ObjectId();

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
    await ExamResult.deleteMany({});
    await User.deleteMany({});
    await LeaderboardEntry.deleteMany({});
});

// ─── Helper: create a minimal exam ─────────────────────────

async function createExam(overrides: Record<string, unknown> = {}) {
    return Exam.create({
        title: 'Test Exam',
        subject: 'Math',
        duration: 60,
        totalQuestions: 10,
        totalMarks: 10,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        resultPublishDate: new Date('2025-12-31'),
        isPublished: false,
        resultPublishMode: 'manual',
        defaultMarksPerQuestion: 1,
        status: 'draft',
        createdBy: graderId,
        ...overrides,
    });
}

// ─── Helper: create an ExamResult ──────────────────────────

interface ExamResultAnswer {
    question: mongoose.Types.ObjectId;
    questionType: 'mcq' | 'written';
    selectedAnswer: string;
    writtenAnswerUrl?: string;
    isCorrect: boolean;
    timeTaken: number;
    marks: number;
    marksObtained: number;
    explanation: string;
    correctWrongIndicator: 'correct' | 'wrong' | 'unanswered';
    topic: string;
}

async function createResult(
    examId: mongoose.Types.ObjectId,
    answers: ExamResultAnswer[],
    overrides: Record<string, unknown> = {},
) {
    return ExamResult.create({
        exam: examId,
        student: studentId,
        attemptNo: 1,
        answers,
        totalMarks: answers.reduce((sum, a) => sum + (a.marks || 0), 0),
        obtainedMarks: 0,
        correctCount: 0,
        wrongCount: 0,
        unansweredCount: answers.length,
        percentage: 0,
        pointsEarned: 0,
        timeTaken: 120,
        deviceInfo: 'test',
        browserInfo: 'test',
        ipAddress: '127.0.0.1',
        tabSwitchCount: 0,
        submittedAt: new Date(),
        isAutoSubmitted: false,
        status: 'pending_evaluation',
        ...overrides,
    });
}

// ═══════════════════════════════════════════════════════════
// publishResults
// ═══════════════════════════════════════════════════════════

describe('publishResults', () => {
    it('sets exam isPublished to true and updates resultPublishDate', async () => {
        const exam = await createExam();
        expect(exam.isPublished).toBe(false);

        await publishResults(exam._id.toString());

        const updated = await Exam.findById(exam._id);
        expect(updated!.isPublished).toBe(true);
        expect(updated!.resultPublishDate).toBeDefined();
        // resultPublishDate should be recent (within last 5 seconds)
        const diff = Date.now() - updated!.resultPublishDate.getTime();
        expect(diff).toBeLessThan(5000);
    });

    it('triggers rank computation for exam results', async () => {
        // Create student users for leaderboard name lookup
        await User.create({
            _id: studentId,
            full_name: 'Test Student',
            username: 'teststudent',
            email: 'test@example.com',
            password: 'hashedpassword123',
            role: 'student',
        });

        const student2 = new mongoose.Types.ObjectId();
        await User.create({
            _id: student2,
            full_name: 'Another Student',
            username: 'anotherstudent',
            email: 'another@example.com',
            password: 'hashedpassword123',
            role: 'student',
        });

        const exam = await createExam();

        // Create two results with different scores
        await ExamResult.create({
            exam: exam._id,
            student: studentId,
            attemptNo: 1,
            answers: [],
            totalMarks: 10,
            obtainedMarks: 8,
            correctCount: 8,
            wrongCount: 2,
            unansweredCount: 0,
            percentage: 80,
            pointsEarned: 0,
            timeTaken: 100,
            deviceInfo: 'test',
            browserInfo: 'test',
            ipAddress: '127.0.0.1',
            tabSwitchCount: 0,
            submittedAt: new Date(),
            isAutoSubmitted: false,
            status: 'evaluated',
        });

        await ExamResult.create({
            exam: exam._id,
            student: student2,
            attemptNo: 1,
            answers: [],
            totalMarks: 10,
            obtainedMarks: 6,
            correctCount: 6,
            wrongCount: 4,
            unansweredCount: 0,
            percentage: 60,
            pointsEarned: 0,
            timeTaken: 150,
            deviceInfo: 'test',
            browserInfo: 'test',
            ipAddress: '127.0.0.1',
            tabSwitchCount: 0,
            submittedAt: new Date(),
            isAutoSubmitted: false,
            status: 'evaluated',
        });

        await publishResults(exam._id.toString());

        // Verify ranks were assigned
        const result1 = await ExamResult.findOne({ student: studentId, exam: exam._id });
        const result2 = await ExamResult.findOne({ student: student2, exam: exam._id });
        expect(result1!.rank).toBe(1); // higher score
        expect(result2!.rank).toBe(2);

        // Verify leaderboard entries were created
        const entries = await LeaderboardEntry.find({ exam: exam._id }).sort({ rank: 1 });
        expect(entries).toHaveLength(2);
        expect(entries[0].rank).toBe(1);
        expect(entries[1].rank).toBe(2);
    });

    it('throws error for non-existent exam', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(publishResults(fakeId)).rejects.toThrow('Exam not found');
    });
});

// ═══════════════════════════════════════════════════════════
// gradeWrittenAnswer
// ═══════════════════════════════════════════════════════════

describe('gradeWrittenAnswer', () => {
    const q1 = new mongoose.Types.ObjectId();
    const q2 = new mongoose.Types.ObjectId();
    const q3 = new mongoose.Types.ObjectId();

    function makeWrittenAnswer(qId: mongoose.Types.ObjectId, marks: number): ExamResultAnswer {
        return {
            question: qId,
            questionType: 'written',
            selectedAnswer: '',
            writtenAnswerUrl: 'https://example.com/answer.jpg',
            isCorrect: false,
            timeTaken: 0,
            marks,
            marksObtained: 0,
            explanation: '',
            correctWrongIndicator: 'unanswered',
            topic: 'Math',
        };
    }

    function makeMcqAnswer(qId: mongoose.Types.ObjectId, marks: number, correct: boolean): ExamResultAnswer {
        return {
            question: qId,
            questionType: 'mcq',
            selectedAnswer: 'A',
            isCorrect: correct,
            timeTaken: 10,
            marks,
            marksObtained: correct ? marks : 0,
            explanation: '',
            correctWrongIndicator: correct ? 'correct' : 'wrong',
            topic: 'Math',
        };
    }

    it('grades a single written answer and stores in writtenGrades', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
            makeWrittenAnswer(q2, 10),
        ]);

        const updated = await gradeWrittenAnswer(
            result._id.toString(),
            q1.toString(),
            7,
            'Good attempt',
            graderId.toString(),
        );

        expect(updated.writtenGrades).toHaveLength(1);
        expect(updated.writtenGrades![0].marks).toBe(7);
        expect(updated.writtenGrades![0].maxMarks).toBe(10);
        expect(updated.writtenGrades![0].feedback).toBe('Good attempt');
        expect(updated.writtenGrades![0].gradedBy.toString()).toBe(graderId.toString());
        // Status should still be pending since q2 is not graded yet
        expect(updated.status).toBe('pending_evaluation');
    });

    it('transitions to evaluated when all written questions are graded', async () => {
        const exam = await createExam({
            certificateSettings: { minPercentage: 40 },
        });
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
            makeWrittenAnswer(q2, 10),
        ]);

        // Grade first question
        await gradeWrittenAnswer(
            result._id.toString(),
            q1.toString(),
            8,
            'Excellent',
            graderId.toString(),
        );

        // Grade second question — should trigger evaluation
        const final = await gradeWrittenAnswer(
            result._id.toString(),
            q2.toString(),
            6,
            'Good',
            graderId.toString(),
        );

        expect(final.status).toBe('evaluated');
        expect(final.obtainedMarks).toBe(14); // 8 + 6
        expect(final.totalMarks).toBe(20);    // 10 + 10
        expect(final.percentage).toBe(70);     // (14/20) * 100
        expect(final.passFail).toBe('pass');   // 70 >= 40
        expect(final.correctCount).toBe(2);    // both got marks > 0
        expect(final.wrongCount).toBe(0);
    });

    it('correctly computes mixed MCQ + written results on final grade', async () => {
        const exam = await createExam({
            certificateSettings: { minPercentage: 50 },
        });
        const result = await createResult(exam._id, [
            makeMcqAnswer(q1, 5, true),     // MCQ correct: 5 marks
            makeMcqAnswer(q2, 5, false),    // MCQ wrong: 0 marks
            makeWrittenAnswer(q3, 10),       // Written: pending
        ], {
            obtainedMarks: 5,
            correctCount: 1,
            wrongCount: 1,
            unansweredCount: 1,
        });

        const final = await gradeWrittenAnswer(
            result._id.toString(),
            q3.toString(),
            7,
            'Well done',
            graderId.toString(),
        );

        expect(final.status).toBe('evaluated');
        expect(final.obtainedMarks).toBe(12); // 5 (MCQ) + 7 (written)
        expect(final.totalMarks).toBe(20);    // 5 + 5 + 10
        expect(final.percentage).toBe(60);     // (12/20) * 100
        expect(final.passFail).toBe('pass');   // 60 >= 50
        expect(final.correctCount).toBe(2);    // 1 MCQ correct + 1 written with marks
        expect(final.wrongCount).toBe(1);      // 1 MCQ wrong
        expect(final.unansweredCount).toBe(0);
    });

    it('allows re-grading an already graded question', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
            makeWrittenAnswer(q2, 10),
        ]);

        // Grade first question
        await gradeWrittenAnswer(
            result._id.toString(),
            q1.toString(),
            5,
            'Initial grade',
            graderId.toString(),
        );

        // Re-grade first question with different marks (q2 still ungraded, so status stays pending)
        const updated = await gradeWrittenAnswer(
            result._id.toString(),
            q1.toString(),
            8,
            'Revised grade',
            graderId.toString(),
        );

        // Should still have only 1 grade entry (upserted, not duplicated)
        expect(updated.writtenGrades).toHaveLength(1);
        expect(updated.writtenGrades![0].marks).toBe(8);
        expect(updated.writtenGrades![0].feedback).toBe('Revised grade');
        // Status should still be pending since q2 is not graded yet
        expect(updated.status).toBe('pending_evaluation');
    });

    it('rejects grading for non-existent result', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(
            gradeWrittenAnswer(fakeId, q1.toString(), 5, 'test', graderId.toString()),
        ).rejects.toThrow('Exam result not found');
    });

    it('rejects grading for result not in pending_evaluation status', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
        ], { status: 'evaluated' });

        await expect(
            gradeWrittenAnswer(result._id.toString(), q1.toString(), 5, 'test', graderId.toString()),
        ).rejects.toThrow('Result is not in pending_evaluation status');
    });

    it('rejects grading for non-written question', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeMcqAnswer(q1, 5, true),
            makeWrittenAnswer(q2, 10),
        ]);

        await expect(
            gradeWrittenAnswer(result._id.toString(), q1.toString(), 3, 'test', graderId.toString()),
        ).rejects.toThrow('Written question not found in this result');
    });

    it('rejects marks exceeding maxMarks', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
        ]);

        await expect(
            gradeWrittenAnswer(result._id.toString(), q1.toString(), 15, 'test', graderId.toString()),
        ).rejects.toThrow('Marks (15) cannot exceed max marks (10) for this question');
    });

    it('rejects negative marks', async () => {
        const exam = await createExam();
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
        ]);

        await expect(
            gradeWrittenAnswer(result._id.toString(), q1.toString(), -1, 'test', graderId.toString()),
        ).rejects.toThrow('Marks cannot be negative');
    });

    it('handles zero marks correctly (student gets 0 on written question)', async () => {
        const exam = await createExam({
            certificateSettings: { minPercentage: 40 },
        });
        const result = await createResult(exam._id, [
            makeWrittenAnswer(q1, 10),
        ]);

        const updated = await gradeWrittenAnswer(
            result._id.toString(),
            q1.toString(),
            0,
            'Incorrect answer',
            graderId.toString(),
        );

        expect(updated.status).toBe('evaluated');
        expect(updated.obtainedMarks).toBe(0);
        expect(updated.percentage).toBe(0);
        expect(updated.passFail).toBe('fail');
        expect(updated.wrongCount).toBe(1);
    });
});
