/**
 * Unit tests for DoubtSolverService
 *
 * Tests doubt thread creation, pagination, replies, voting with voter
 * tracking, pin/unpin, and thread resolution against an in-memory MongoDB.
 *
 * Validates: Requirements 26.1, 26.2, 26.3, 26.4, 26.5, 26.6
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import DoubtThread from '../models/DoubtThread';
import QuestionBankQuestion from '../models/QuestionBankQuestion';
import {
    createDoubt,
    getDoubtsForQuestion,
    addReply,
    voteReply,
    pinReply,
    resolveThread,
} from '../services/DoubtSolverService';

let mongoServer: MongoMemoryServer;

// Shared test IDs
const userId1 = new mongoose.Types.ObjectId().toString();
const userId2 = new mongoose.Types.ObjectId().toString();
const userId3 = new mongoose.Types.ObjectId().toString();
let questionId: string;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Seed a question for doubt threads to reference
    const question = await QuestionBankQuestion.create({
        subject: 'Physics',
        moduleCategory: 'Science',
        question_en: 'What is Newton\'s second law?',
        question_bn: 'নিউটনের দ্বিতীয় সূত্র কী?',
        options: [
            { key: 'A', text_en: 'F = ma', text_bn: 'F = ma', isCorrect: true },
            { key: 'B', text_en: 'E = mc²', text_bn: 'E = mc²', isCorrect: false },
            { key: 'C', text_en: 'V = IR', text_bn: 'V = IR', isCorrect: false },
            { key: 'D', text_en: 'P = IV', text_bn: 'P = IV', isCorrect: false },
        ],
        correctKey: 'A',
        marks: 1,
        negativeMarks: 0.25,
        difficulty: 'easy',
        languageMode: 'both',
        tags: ['mechanics'],
        isActive: true,
        isArchived: false,
        contentHash: 'test-hash-001',
        versionNo: 1,
    });
    questionId = question._id.toString();
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

beforeEach(async () => {
    await DoubtThread.deleteMany({});
});

describe('DoubtSolverService', () => {
    // ─── createDoubt ────────────────────────────────────────

    describe('createDoubt', () => {
        it('creates a doubt thread linked to a question', async () => {
            const thread = await createDoubt(questionId, userId1);

            expect(thread.question.toString()).toBe(questionId);
            expect(thread.createdBy.toString()).toBe(userId1);
            expect(thread.status).toBe('open');
            expect(thread.replyCount).toBe(0);
            expect(thread.replies).toHaveLength(0);
        });

        it('generates an AI explanation (fallback when no API key)', async () => {
            const thread = await createDoubt(questionId, userId1);

            // Without GEMINI_API_KEY, the fallback message is returned
            expect(thread.aiExplanation).toBeDefined();
            expect(typeof thread.aiExplanation).toBe('string');
            expect(thread.aiExplanation!.length).toBeGreaterThan(0);
        });

        it('creates thread even if question is not found', async () => {
            const fakeQuestionId = new mongoose.Types.ObjectId().toString();
            const thread = await createDoubt(fakeQuestionId, userId1);

            expect(thread.question.toString()).toBe(fakeQuestionId);
            expect(thread.aiExplanation).toBeUndefined();
        });
    });

    // ─── getDoubtsForQuestion ───────────────────────────────

    describe('getDoubtsForQuestion', () => {
        it('returns paginated doubt threads for a question', async () => {
            // Create 3 threads
            await createDoubt(questionId, userId1);
            await createDoubt(questionId, userId2);
            await createDoubt(questionId, userId3);

            const result = await getDoubtsForQuestion(questionId);

            expect(result.total).toBe(3);
            expect(result.threads).toHaveLength(3);
            expect(result.page).toBe(1);
            expect(result.totalPages).toBe(1);
        });

        it('returns empty result for question with no doubts', async () => {
            const fakeQuestionId = new mongoose.Types.ObjectId().toString();
            const result = await getDoubtsForQuestion(fakeQuestionId);

            expect(result.total).toBe(0);
            expect(result.threads).toHaveLength(0);
            expect(result.totalPages).toBe(1);
        });

        it('paginates correctly', async () => {
            // Create 12 threads (more than default page size of 10)
            for (let i = 0; i < 12; i++) {
                await createDoubt(questionId, userId1);
            }

            const page1 = await getDoubtsForQuestion(questionId, 1);
            const page2 = await getDoubtsForQuestion(questionId, 2);

            expect(page1.total).toBe(12);
            expect(page1.threads).toHaveLength(10);
            expect(page1.totalPages).toBe(2);

            expect(page2.threads).toHaveLength(2);
            expect(page2.page).toBe(2);
        });
    });

    // ─── addReply ───────────────────────────────────────────

    describe('addReply', () => {
        it('adds a reply and increments replyCount', async () => {
            const thread = await createDoubt(questionId, userId1);
            const updated = await addReply(thread._id.toString(), userId2, 'Great explanation!');

            expect(updated.replies).toHaveLength(1);
            expect(updated.replyCount).toBe(1);
            expect(updated.replies[0].content).toBe('Great explanation!');
            expect(updated.replies[0].author.toString()).toBe(userId2);
            expect(updated.replies[0].upvotes).toBe(0);
            expect(updated.replies[0].downvotes).toBe(0);
            expect(updated.replies[0].isPinned).toBe(false);
        });

        it('adds multiple replies and tracks count correctly', async () => {
            const thread = await createDoubt(questionId, userId1);
            const threadId = thread._id.toString();

            await addReply(threadId, userId1, 'Reply 1');
            await addReply(threadId, userId2, 'Reply 2');
            const updated = await addReply(threadId, userId3, 'Reply 3');

            expect(updated.replies).toHaveLength(3);
            expect(updated.replyCount).toBe(3);
        });

        it('throws for non-existent thread', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(addReply(fakeId, userId1, 'test')).rejects.toThrow('Doubt thread not found');
        });
    });

    // ─── voteReply ──────────────────────────────────────────

    describe('voteReply', () => {
        it('upvotes a reply', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Good answer');

            const updated = await voteReply(thread._id.toString(), 0, userId1, 'up');

            expect(updated.replies[0].upvotes).toBe(1);
            expect(updated.replies[0].downvotes).toBe(0);
            expect(updated.replies[0].voters).toHaveLength(1);
            expect(updated.replies[0].voters[0].vote).toBe('up');
        });

        it('downvotes a reply', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Bad answer');

            const updated = await voteReply(thread._id.toString(), 0, userId1, 'down');

            expect(updated.replies[0].upvotes).toBe(0);
            expect(updated.replies[0].downvotes).toBe(1);
        });

        it('toggles off same-direction vote', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Answer');
            const threadId = thread._id.toString();

            // Upvote then upvote again = toggle off
            await voteReply(threadId, 0, userId1, 'up');
            const updated = await voteReply(threadId, 0, userId1, 'up');

            expect(updated.replies[0].upvotes).toBe(0);
            expect(updated.replies[0].voters).toHaveLength(0);
        });

        it('switches vote direction', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Answer');
            const threadId = thread._id.toString();

            // Upvote then downvote = switch
            await voteReply(threadId, 0, userId1, 'up');
            const updated = await voteReply(threadId, 0, userId1, 'down');

            expect(updated.replies[0].upvotes).toBe(0);
            expect(updated.replies[0].downvotes).toBe(1);
            expect(updated.replies[0].voters).toHaveLength(1);
            expect(updated.replies[0].voters[0].vote).toBe('down');
        });

        it('tracks multiple voters independently', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId1, 'Answer');
            const threadId = thread._id.toString();

            await voteReply(threadId, 0, userId1, 'up');
            await voteReply(threadId, 0, userId2, 'up');
            const updated = await voteReply(threadId, 0, userId3, 'down');

            expect(updated.replies[0].upvotes).toBe(2);
            expect(updated.replies[0].downvotes).toBe(1);
            expect(updated.replies[0].voters).toHaveLength(3);
        });

        it('throws for out-of-range reply index', async () => {
            const thread = await createDoubt(questionId, userId1);
            const threadId = thread._id.toString();

            await expect(voteReply(threadId, 0, userId1, 'up')).rejects.toThrow('out of range');
        });

        it('throws for non-existent thread', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(voteReply(fakeId, 0, userId1, 'up')).rejects.toThrow('Doubt thread not found');
        });
    });

    // ─── pinReply ───────────────────────────────────────────

    describe('pinReply', () => {
        it('pins a reply as best answer', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Best answer');

            const updated = await pinReply(thread._id.toString(), 0);

            expect(updated.replies[0].isPinned).toBe(true);
        });

        it('toggles pin off on second call', async () => {
            const thread = await createDoubt(questionId, userId1);
            await addReply(thread._id.toString(), userId2, 'Answer');
            const threadId = thread._id.toString();

            await pinReply(threadId, 0);
            const updated = await pinReply(threadId, 0);

            expect(updated.replies[0].isPinned).toBe(false);
        });

        it('throws for out-of-range reply index', async () => {
            const thread = await createDoubt(questionId, userId1);
            await expect(pinReply(thread._id.toString(), 5)).rejects.toThrow('out of range');
        });
    });

    // ─── resolveThread ──────────────────────────────────────

    describe('resolveThread', () => {
        it('marks a thread as resolved', async () => {
            const thread = await createDoubt(questionId, userId1);
            expect(thread.status).toBe('open');

            const updated = await resolveThread(thread._id.toString());
            expect(updated.status).toBe('resolved');
        });

        it('throws for non-existent thread', async () => {
            const fakeId = new mongoose.Types.ObjectId().toString();
            await expect(resolveThread(fakeId)).rejects.toThrow('Doubt thread not found');
        });
    });
});
