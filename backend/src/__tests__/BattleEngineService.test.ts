import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { setupTestDb, clearTestDb, teardownTestDb } from './helpers/mongoTestSetup';
import {
    determineBattleWinner,
    createChallenge,
    acceptChallenge,
    submitBattleAnswer,
    completeBattle,
    getBattleHistory,
} from '../services/BattleEngineService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import BattleSession from '../models/BattleSession';

/**
 * Unit and integration tests for BattleEngineService.
 *
 * Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7
 */

// ─── Pure function tests (no DB needed) ─────────────────────

describe('determineBattleWinner', () => {
    it('returns challenger_win when challenger has higher score', () => {
        expect(determineBattleWinner(7, 5, 100000, 90000)).toBe('challenger_win');
    });

    it('returns opponent_win when opponent has higher score', () => {
        expect(determineBattleWinner(3, 8, 50000, 120000)).toBe('opponent_win');
    });

    it('returns challenger_win when scores equal but challenger is faster', () => {
        expect(determineBattleWinner(5, 5, 80000, 120000)).toBe('challenger_win');
    });

    it('returns opponent_win when scores equal but opponent is faster', () => {
        expect(determineBattleWinner(5, 5, 150000, 90000)).toBe('opponent_win');
    });

    it('returns draw when scores and times are equal', () => {
        expect(determineBattleWinner(5, 5, 100000, 100000)).toBe('draw');
    });

    it('returns draw when both scores are 0 and times are 0', () => {
        expect(determineBattleWinner(0, 0, 0, 0)).toBe('draw');
    });

    it('returns challenger_win when challenger has score 1 and opponent has 0', () => {
        expect(determineBattleWinner(1, 0, 200000, 100000)).toBe('challenger_win');
    });
});

// ─── Integration tests (require in-memory MongoDB) ──────────

describe('BattleEngineService (integration)', () => {
    const challengerId = new mongoose.Types.ObjectId().toString();
    const opponentId = new mongoose.Types.ObjectId().toString();
    let topicId: string;

    beforeAll(async () => {
        await setupTestDb();
        topicId = new mongoose.Types.ObjectId().toString();

        // Seed 10+ MCQ questions for the topic
        const questions = Array.from({ length: 12 }, (_, i) => ({
            subject: 'Physics',
            moduleCategory: 'Mechanics',
            topic: 'Newton Laws',
            difficulty: 'medium' as const,
            question_en: `Question ${i + 1}`,
            question_bn: `প্রশ্ন ${i + 1}`,
            options: [
                { key: 'A', text_en: 'Option A', isCorrect: i % 4 === 0 },
                { key: 'B', text_en: 'Option B', isCorrect: i % 4 === 1 },
                { key: 'C', text_en: 'Option C', isCorrect: i % 4 === 2 },
                { key: 'D', text_en: 'Option D', isCorrect: i % 4 === 3 },
            ],
            correctKey: (['A', 'B', 'C', 'D'] as const)[i % 4],
            marks: 1,
            negativeMarks: 0,
            contentHash: `hash-battle-${i}`,
            topic_id: new mongoose.Types.ObjectId(topicId),
            question_type: 'mcq' as const,
            isActive: true,
            isArchived: false,
            status: 'published' as const,
            review_status: 'approved' as const,
        }));

        await QuestionBankQuestion.insertMany(questions);
    });

    afterEach(async () => {
        // Only clear battle sessions between tests, keep questions
        await BattleSession.deleteMany({});
    });

    afterAll(async () => {
        await teardownTestDb();
    });

    describe('createChallenge', () => {
        it('creates a pending battle with 10 questions from the topic', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);

            expect(battle.status).toBe('pending');
            expect(battle.challenger.toString()).toBe(challengerId);
            expect(battle.opponent.toString()).toBe(opponentId);
            expect(battle.questions.length).toBeLessThanOrEqual(10);
            expect(battle.questions.length).toBeGreaterThan(0);
            expect(battle.challengerScore).toBe(0);
            expect(battle.opponentScore).toBe(0);
            expect(battle.result).toBe('pending');
            expect(battle.duration).toBe(300);
        });

        it('throws when challenging yourself', async () => {
            await expect(
                createChallenge(challengerId, challengerId, topicId),
            ).rejects.toThrow('Cannot challenge yourself');
        });

        it('throws when no questions available for topic', async () => {
            const emptyTopicId = new mongoose.Types.ObjectId().toString();
            await expect(
                createChallenge(challengerId, opponentId, emptyTopicId),
            ).rejects.toThrow('No MCQ questions available for the selected topic');
        });
    });

    describe('acceptChallenge', () => {
        it('activates a pending battle and sets startedAt', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            const accepted = await acceptChallenge(battle._id.toString(), opponentId);

            expect(accepted.status).toBe('active');
            expect(accepted.startedAt).toBeDefined();
            expect(accepted.startedAt).toBeInstanceOf(Date);
        });

        it('throws when wrong opponent tries to accept', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            const wrongId = new mongoose.Types.ObjectId().toString();

            await expect(
                acceptChallenge(battle._id.toString(), wrongId),
            ).rejects.toThrow('Only the challenged opponent can accept this battle');
        });

        it('throws when battle is not pending', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            await expect(
                acceptChallenge(battle._id.toString(), opponentId),
            ).rejects.toThrow("Cannot accept battle with status 'active'");
        });

        it('throws when battle not found', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(
                acceptChallenge(fakeId, opponentId),
            ).rejects.toThrow('Battle not found');
        });
    });

    describe('submitBattleAnswer', () => {
        it('records a correct answer and increments score', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            // Get the first question and its correct key
            const questionId = battle.questions[0].toString();
            const question = await QuestionBankQuestion.findById(questionId).lean();
            expect(question).not.toBeNull();

            const progress = await submitBattleAnswer(
                battle._id.toString(),
                challengerId,
                questionId,
                question!.correctKey,
            );

            expect(progress.isCorrect).toBe(true);
            expect(progress.challengerScore).toBe(1);
            expect(progress.challengerAnswered).toBe(1);
            expect(progress.opponentAnswered).toBe(0);
        });

        it('records an incorrect answer without incrementing score', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            const questionId = battle.questions[0].toString();
            const question = await QuestionBankQuestion.findById(questionId).lean();
            const wrongAnswer = question!.correctKey === 'A' ? 'B' : 'A';

            const progress = await submitBattleAnswer(
                battle._id.toString(),
                challengerId,
                questionId,
                wrongAnswer,
            );

            expect(progress.isCorrect).toBe(false);
            expect(progress.challengerScore).toBe(0);
            expect(progress.challengerAnswered).toBe(1);
        });

        it('throws when player already answered the question', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            const questionId = battle.questions[0].toString();
            await submitBattleAnswer(battle._id.toString(), challengerId, questionId, 'A');

            await expect(
                submitBattleAnswer(battle._id.toString(), challengerId, questionId, 'B'),
            ).rejects.toThrow('Question already answered');
        });

        it('throws when player is not a participant', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            const outsiderId = new mongoose.Types.ObjectId().toString();
            const questionId = battle.questions[0].toString();

            await expect(
                submitBattleAnswer(battle._id.toString(), outsiderId, questionId, 'A'),
            ).rejects.toThrow('Player is not a participant in this battle');
        });

        it('throws when question is not part of the battle', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            const fakeQuestionId = new mongoose.Types.ObjectId().toString();

            await expect(
                submitBattleAnswer(battle._id.toString(), challengerId, fakeQuestionId, 'A'),
            ).rejects.toThrow('Question is not part of this battle');
        });

        it('throws when battle is not active', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            const questionId = battle.questions[0].toString();

            await expect(
                submitBattleAnswer(battle._id.toString(), challengerId, questionId, 'A'),
            ).rejects.toThrow("Cannot submit answer for battle with status 'pending'");
        });
    });

    describe('completeBattle', () => {
        it('determines winner and sets status to completed', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);

            // Challenger answers first question correctly
            const q1Id = battle.questions[0].toString();
            const q1 = await QuestionBankQuestion.findById(q1Id).lean();
            await submitBattleAnswer(battle._id.toString(), challengerId, q1Id, q1!.correctKey);

            // Opponent answers first question incorrectly
            const wrongAnswer = q1!.correctKey === 'A' ? 'B' : 'A';
            await submitBattleAnswer(battle._id.toString(), opponentId, q1Id, wrongAnswer);

            const result = await completeBattle(battle._id.toString());

            expect(result.result).toBe('challenger_win');
            expect(result.challengerScore).toBe(1);
            expect(result.opponentScore).toBe(0);
            expect(result.winner).toBe(challengerId);
            expect(result.xpAwarded.challenger).toBeGreaterThan(0);
            expect(result.xpAwarded.opponent).toBeGreaterThan(0);
            expect(result.coinsAwarded.challenger).toBeGreaterThan(0);
            expect(result.coinsAwarded.opponent).toBeGreaterThan(0);
            expect(result.completedAt).toBeInstanceOf(Date);
        });

        it('throws when battle is already completed', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);
            await acceptChallenge(battle._id.toString(), opponentId);
            await completeBattle(battle._id.toString());

            await expect(
                completeBattle(battle._id.toString()),
            ).rejects.toThrow('Battle is already completed');
        });

        it('throws when battle is not active', async () => {
            const battle = await createChallenge(challengerId, opponentId, topicId);

            await expect(
                completeBattle(battle._id.toString()),
            ).rejects.toThrow("Cannot complete battle with status 'pending'");
        });
    });

    describe('getBattleHistory', () => {
        it('returns paginated battle history for a student', async () => {
            // Create 3 battles
            for (let i = 0; i < 3; i++) {
                await createChallenge(challengerId, opponentId, topicId);
            }

            const history = await getBattleHistory(challengerId, 1);

            expect(history.data.length).toBe(3);
            expect(history.total).toBe(3);
            expect(history.page).toBe(1);
            expect(history.limit).toBe(10);
            expect(history.totalPages).toBe(1);
        });

        it('returns battles where student is opponent', async () => {
            await createChallenge(challengerId, opponentId, topicId);

            const history = await getBattleHistory(opponentId, 1);
            expect(history.data.length).toBe(1);
        });

        it('returns empty result for student with no battles', async () => {
            const unknownId = new mongoose.Types.ObjectId().toString();
            const history = await getBattleHistory(unknownId, 1);

            expect(history.data.length).toBe(0);
            expect(history.total).toBe(0);
            expect(history.totalPages).toBe(0);
        });

        it('paginates correctly with page size 10', async () => {
            // Create 12 battles
            for (let i = 0; i < 12; i++) {
                await createChallenge(challengerId, opponentId, topicId);
            }

            const page1 = await getBattleHistory(challengerId, 1);
            expect(page1.data.length).toBe(10);
            expect(page1.total).toBe(12);
            expect(page1.totalPages).toBe(2);

            const page2 = await getBattleHistory(challengerId, 2);
            expect(page2.data.length).toBe(2);
            expect(page2.page).toBe(2);
        });

        it('handles page < 1 by defaulting to page 1', async () => {
            await createChallenge(challengerId, opponentId, topicId);

            const history = await getBattleHistory(challengerId, 0);
            expect(history.page).toBe(1);
            expect(history.data.length).toBe(1);
        });
    });
});
