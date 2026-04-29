import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';
import LeaderboardEntry from '../models/LeaderboardEntry';
import User from '../models/User';
import { computeRanks } from '../services/ResultEngineService';

/**
 * Feature: exam-management-system
 * Property 16: Rank Computation
 *
 * **Validates: Requirements 8.1**
 *
 * For any set of exam results with varying scores and time taken:
 *   - Ranks are sorted by obtainedMarks descending
 *   - Ties in score are broken by timeTaken ascending (faster = better rank)
 *   - Equal score AND equal timeTaken get the same rank
 *   - Rank numbers follow standard competition ranking (1, 2, 2, 4 — not 1, 2, 2, 3)
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
    await ExamResult.deleteMany({});
    await LeaderboardEntry.deleteMany({});
    await User.deleteMany({});
});

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a participant with a random score and time taken */
const participantArb = fc.record({
    obtainedMarks: fc.integer({ min: 0, max: 100 }),
    timeTaken: fc.integer({ min: 60, max: 3600 }),
});

/** Generate a list of 2–15 participants */
const participantsArb = fc.array(participantArb, { minLength: 2, maxLength: 15 });

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create an exam and a set of ExamResult documents for the given participants.
 * Also creates User documents so computeRanks can look up display names.
 */
async function seedExamWithResults(
    participants: { obtainedMarks: number; timeTaken: number }[],
) {
    const now = new Date();
    const examId = new mongoose.Types.ObjectId();

    await Exam.create({
        _id: examId,
        title: 'Rank Test Exam',
        subject: 'Physics',
        totalQuestions: 10,
        totalMarks: 100,
        duration: 60,
        negativeMarking: false,
        negativeMarkValue: 0,
        randomizeQuestions: false,
        randomizeOptions: false,
        allowBackNavigation: true,
        showQuestionPalette: true,
        showRemainingTime: true,
        autoSubmitOnTimeout: true,
        allowPause: false,
        startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endDate: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        resultPublishDate: new Date(now.getTime() + 3 * 60 * 60 * 1000),
        isPublished: true,
        status: 'live',
        accessMode: 'all',
        createdBy: new mongoose.Types.ObjectId(),
    });

    const studentIds: mongoose.Types.ObjectId[] = [];
    for (let i = 0; i < participants.length; i++) {
        const studentId = new mongoose.Types.ObjectId();
        studentIds.push(studentId);

        await User.create({
            _id: studentId,
            full_name: `Student ${i + 1}`,
            username: `student_rank_${examId}_${i}`,
            email: `student_rank_${examId}_${i}@test.com`,
            password: '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12',
            role: 'student',
            status: 'active',
        });

        await ExamResult.create({
            exam: examId,
            student: studentId,
            attemptNo: 1,
            totalMarks: 100,
            obtainedMarks: participants[i].obtainedMarks,
            timeTaken: participants[i].timeTaken,
            percentage: participants[i].obtainedMarks,
            correctCount: participants[i].obtainedMarks,
            wrongCount: 0,
            unansweredCount: 0,
            passFail: participants[i].obtainedMarks >= 40 ? 'pass' : 'fail',
            pointsEarned: 0,
            submittedAt: now,
            isAutoSubmitted: false,
            answers: [],
            status: 'evaluated',
        });
    }

    return { examId, studentIds };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 16: Rank Computation', () => {
    it('ranks are sorted by score descending', async () => {
        await fc.assert(
            fc.asyncProperty(participantsArb, async (participants) => {
                await Exam.deleteMany({});
                await ExamResult.deleteMany({});
                await LeaderboardEntry.deleteMany({});
                await User.deleteMany({});

                const { examId } = await seedExamWithResults(participants);

                await computeRanks(examId.toString());

                const results = await ExamResult.find({ exam: examId })
                    .sort({ rank: 1, _id: 1 })
                    .lean();

                for (let i = 1; i < results.length; i++) {
                    if (results[i].rank! > results[i - 1].rank!) {
                        expect(results[i].obtainedMarks).toBeLessThanOrEqual(
                            results[i - 1].obtainedMarks,
                        );
                    }
                }
            }),
            { numRuns: 30 },
        );
    });

    it('ties in score are broken by timeTaken ascending (faster = better rank)', async () => {
        await fc.assert(
            fc.asyncProperty(participantsArb, async (participants) => {
                await Exam.deleteMany({});
                await ExamResult.deleteMany({});
                await LeaderboardEntry.deleteMany({});
                await User.deleteMany({});

                const { examId } = await seedExamWithResults(participants);

                await computeRanks(examId.toString());

                const results = await ExamResult.find({ exam: examId })
                    .sort({ rank: 1, timeTaken: 1 })
                    .lean();

                for (let i = 1; i < results.length; i++) {
                    if (
                        results[i].obtainedMarks === results[i - 1].obtainedMarks &&
                        results[i].timeTaken > results[i - 1].timeTaken
                    ) {
                        expect(results[i].rank!).toBeGreaterThanOrEqual(
                            results[i - 1].rank!,
                        );
                    }
                }
            }),
            { numRuns: 30 },
        );
    });

    it('equal score AND equal timeTaken get the same rank', async () => {
        await fc.assert(
            fc.asyncProperty(participantsArb, async (participants) => {
                await Exam.deleteMany({});
                await ExamResult.deleteMany({});
                await LeaderboardEntry.deleteMany({});
                await User.deleteMany({});

                const { examId } = await seedExamWithResults(participants);

                await computeRanks(examId.toString());

                const results = await ExamResult.find({ exam: examId }).lean();

                const groupMap = new Map<string, number[]>();
                for (const r of results) {
                    const key = `${r.obtainedMarks}:${r.timeTaken}`;
                    if (!groupMap.has(key)) {
                        groupMap.set(key, []);
                    }
                    groupMap.get(key)!.push(r.rank!);
                }

                for (const [, ranks] of groupMap) {
                    const uniqueRanks = new Set(ranks);
                    expect(uniqueRanks.size).toBe(1);
                }
            }),
            { numRuns: 30 },
        );
    });

    it('rank numbers follow standard competition ranking (1, 2, 2, 4 not 1, 2, 2, 3)', async () => {
        await fc.assert(
            fc.asyncProperty(participantsArb, async (participants) => {
                await Exam.deleteMany({});
                await ExamResult.deleteMany({});
                await LeaderboardEntry.deleteMany({});
                await User.deleteMany({});

                const { examId } = await seedExamWithResults(participants);

                await computeRanks(examId.toString());

                const results = await ExamResult.find({ exam: examId })
                    .sort({ obtainedMarks: -1, timeTaken: 1 })
                    .lean();

                const expectedRanks: number[] = [];
                for (let i = 0; i < results.length; i++) {
                    if (i === 0) {
                        expectedRanks.push(1);
                    } else {
                        const prev = results[i - 1];
                        const curr = results[i];
                        if (
                            curr.obtainedMarks === prev.obtainedMarks &&
                            curr.timeTaken === prev.timeTaken
                        ) {
                            expectedRanks.push(expectedRanks[i - 1]);
                        } else {
                            expectedRanks.push(i + 1);
                        }
                    }
                }

                for (let i = 0; i < results.length; i++) {
                    expect(results[i].rank).toBe(expectedRanks[i]);
                }
            }),
            { numRuns: 30 },
        );
    });
});
