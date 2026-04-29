import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import Exam from '../models/Exam';
import { autoPick, createExamDraft, AutoPickConfig } from '../services/ExamBuilderService';

/**
 * Feature: exam-management-system
 * Property 14: Auto-Pick Difficulty Distribution
 *
 * **Validates: Requirements 4.3**
 *
 * For any auto-pick configuration specifying count N and difficulty distribution
 * (e.g., easy 30%, medium 50%, hard 20%), the selected questions should total
 * exactly N (or less if pool is insufficient), and the count of questions at each
 * difficulty level should match the specified percentages within ±1 question
 * (rounding tolerance). Distribution percentages that don't sum to 100 are rejected.
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
    await QuestionBankQuestion.deleteMany({});
    await Exam.deleteMany({});
});

// ─── Generators ──────────────────────────────────────────────────────────────

const optionsArb = fc.constant([
    { key: 'A' as const, text_en: 'Option A', text_bn: 'বিকল্প ক', isCorrect: true },
    { key: 'B' as const, text_en: 'Option B', text_bn: 'বিকল্প খ' },
    { key: 'C' as const, text_en: 'Option C', text_bn: 'বিকল্প গ' },
    { key: 'D' as const, text_en: 'Option D', text_bn: 'বিকল্প ঘ' },
]);

/**
 * Build a QuestionBankQuestion payload for a given difficulty.
 * group_id is set so the autoPick filter matches.
 */
function questionPayloadArb(
    difficulty: 'easy' | 'medium' | 'hard',
    groupId: mongoose.Types.ObjectId,
) {
    return fc.record({
        question_en: fc.string({ minLength: 5, maxLength: 60 }).map((s) => s.trim() || 'Q text'),
        question_bn: fc.constant('প্রশ্ন'),
        subject: fc.constant('Physics'),
        moduleCategory: fc.constant('Mechanics'),
        difficulty: fc.constant(difficulty),
        correctKey: fc.constant('A' as const),
        options: optionsArb,
        marks: fc.constant(1),
        isActive: fc.constant(true),
        isArchived: fc.constant(false),
        status: fc.constant('published' as const),
        group_id: fc.constant(groupId),
    });
}

/**
 * Generate a difficulty distribution that sums to exactly 100.
 * We pick easy in [0..100], then medium in [0..(100-easy)], hard = remainder.
 */
const validDistributionArb = fc
    .integer({ min: 0, max: 100 })
    .chain((easy) =>
        fc.integer({ min: 0, max: 100 - easy }).map((medium) => ({
            easy,
            medium,
            hard: 100 - easy - medium,
        })),
    );

/**
 * Generate a difficulty distribution that does NOT sum to 100.
 */
const invalidDistributionArb = fc
    .record({
        easy: fc.integer({ min: 0, max: 100 }),
        medium: fc.integer({ min: 0, max: 100 }),
        hard: fc.integer({ min: 0, max: 100 }),
    })
    .filter((d) => d.easy + d.medium + d.hard !== 100);

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Seed the database with a known number of questions per difficulty,
 * all matching the given groupId.
 */
async function seedQuestions(
    groupId: mongoose.Types.ObjectId,
    counts: { easy: number; medium: number; hard: number },
) {
    const promises: Promise<unknown>[] = [];
    for (const level of ['easy', 'medium', 'hard'] as const) {
        const n = counts[level];
        if (n > 0) {
            const payloads = fc.sample(questionPayloadArb(level, groupId), n);
            promises.push(QuestionBankQuestion.insertMany(payloads));
        }
    }
    await Promise.all(promises);
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 14: Auto-Pick Difficulty Distribution', () => {
    it('selected questions total N and difficulty counts match percentages within ±1', async () => {
        await fc.assert(
            fc.asyncProperty(
                // count: how many questions to auto-pick (small to keep tests fast)
                fc.integer({ min: 1, max: 20 }),
                // valid distribution summing to 100
                validDistributionArb,
                async (count, distribution) => {
                    // Clean slate
                    await QuestionBankQuestion.deleteMany({});
                    await Exam.deleteMany({});

                    const groupId = new mongoose.Types.ObjectId();

                    // Calculate how many questions we need per difficulty.
                    // Seed more than needed so $sample always has enough.
                    const easyTarget = Math.round((distribution.easy / 100) * count);
                    const hardTarget = Math.round((distribution.hard / 100) * count);
                    const mediumTarget = count - easyTarget - hardTarget;

                    // Seed pool: target + buffer to ensure enough for $sample
                    await seedQuestions(groupId, {
                        easy: Math.max(easyTarget + 5, 5),
                        medium: Math.max(mediumTarget + 5, 5),
                        hard: Math.max(hardTarget + 5, 5),
                    });

                    // Create a draft exam with the matching group_id filter
                    const exam = await createExamDraft({
                        title: 'Auto-Pick Test',
                        title_bn: 'অটো-পিক টেস্ট',
                        exam_type: 'Mock',
                        duration: 60,
                        createdBy: new mongoose.Types.ObjectId().toString(),
                        group_id: groupId.toString(),
                    });

                    const config: AutoPickConfig = {
                        count,
                        difficultyDistribution: distribution,
                    };

                    const selectedIds = await autoPick(exam._id as string, config);

                    // ── Property: total count equals N ──
                    expect(selectedIds.length).toBe(count);

                    // ── Property: no duplicates ──
                    expect(new Set(selectedIds).size).toBe(selectedIds.length);

                    // Fetch the selected questions to verify difficulty
                    const selectedQuestions = await QuestionBankQuestion.find({
                        _id: { $in: selectedIds.map((id) => new mongoose.Types.ObjectId(id)) },
                    });

                    const easyCt = selectedQuestions.filter((q) => q.difficulty === 'easy').length;
                    const medCt = selectedQuestions.filter((q) => q.difficulty === 'medium').length;
                    const hardCt = selectedQuestions.filter((q) => q.difficulty === 'hard').length;

                    // ── Property: difficulty counts match percentages within ±1 ──
                    // Expected counts (same rounding as the service)
                    const expectedEasy = Math.round((distribution.easy / 100) * count);
                    const expectedHard = Math.round((distribution.hard / 100) * count);
                    const expectedMedium = count - expectedEasy - expectedHard;

                    expect(easyCt).toBeGreaterThanOrEqual(expectedEasy - 1);
                    expect(easyCt).toBeLessThanOrEqual(expectedEasy + 1);

                    expect(medCt).toBeGreaterThanOrEqual(expectedMedium - 1);
                    expect(medCt).toBeLessThanOrEqual(expectedMedium + 1);

                    expect(hardCt).toBeGreaterThanOrEqual(expectedHard - 1);
                    expect(hardCt).toBeLessThanOrEqual(expectedHard + 1);

                    // ── Property: all difficulties sum to total ──
                    expect(easyCt + medCt + hardCt).toBe(count);
                },
            ),
            { numRuns: 30 },
        );
    });

    it('rejects difficulty distributions that do not sum to 100', async () => {
        await fc.assert(
            fc.asyncProperty(
                invalidDistributionArb,
                async (distribution) => {
                    // Clean slate
                    await Exam.deleteMany({});

                    const groupId = new mongoose.Types.ObjectId();

                    // Create a draft exam
                    const exam = await createExamDraft({
                        title: 'Invalid Dist Test',
                        title_bn: 'ভুল বণ্টন টেস্ট',
                        exam_type: 'Mock',
                        duration: 60,
                        createdBy: new mongoose.Types.ObjectId().toString(),
                        group_id: groupId.toString(),
                    });

                    const config: AutoPickConfig = {
                        count: 10,
                        difficultyDistribution: distribution,
                    };

                    // ── Property: invalid distribution is rejected ──
                    await expect(autoPick(exam._id as string, config)).rejects.toThrow(
                        /must sum to 100/i,
                    );
                },
            ),
            { numRuns: 30 },
        );
    });
});
