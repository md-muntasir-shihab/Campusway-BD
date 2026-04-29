/**
 * Unit tests for QuestionBankService — review workflow and bulk actions
 *
 * Feature: exam-management-system
 * Task: 6.8
 *
 * Tests: approveQuestion, rejectQuestion, bulkArchive, bulkStatusChange, detectDuplicates
 *
 * **Validates: Requirements 2.11, 2.12, 2.13**
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import QuestionBankQuestion from '../src/models/QuestionBankQuestion';
import {
    createQuestion,
    approveQuestion,
    rejectQuestion,
    bulkArchive,
    bulkStatusChange,
    detectDuplicates,
    CreateQuestionDto,
} from '../src/services/QuestionBankService';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
        instance: { launchTimeout: 60000 },
    });
    await mongoose.connect(mongoServer.getUri());
}, 120000);

afterEach(async () => {
    await QuestionBankQuestion.deleteMany({});
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

// ─── Helper ─────────────────────────────────────────────────

function makeQuestionDto(overrides: Partial<CreateQuestionDto> = {}): CreateQuestionDto {
    return {
        question_en: 'What is 2 + 2?',
        question_bn: '২ + ২ = কত?',
        question_type: 'mcq',
        options: [
            { key: 'A', text_en: '3', isCorrect: false },
            { key: 'B', text_en: '4', isCorrect: true },
            { key: 'C', text_en: '5', isCorrect: false },
            { key: 'D', text_en: '6', isCorrect: false },
        ],
        correctKey: 'B',
        subject: 'Math',
        moduleCategory: 'Arithmetic',
        difficulty: 'easy',
        ...overrides,
    };
}

// ─── approveQuestion ────────────────────────────────────────

describe('approveQuestion', () => {
    it('sets review_status to approved for a pending question', async () => {
        const q = await createQuestion(makeQuestionDto());
        expect(q.review_status).toBe('pending');

        await approveQuestion(q._id.toString(), 'reviewer-1');

        const updated = await QuestionBankQuestion.findById(q._id).lean();
        expect(updated!.review_status).toBe('approved');
        expect(updated!.updatedByAdminId).toBe('reviewer-1');
    });

    it('throws when question does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(approveQuestion(fakeId, 'reviewer-1')).rejects.toThrow(/not found/i);
    });

    it('throws when question is already approved', async () => {
        const q = await createQuestion(makeQuestionDto());
        await approveQuestion(q._id.toString(), 'reviewer-1');

        await expect(approveQuestion(q._id.toString(), 'reviewer-2')).rejects.toThrow(/already approved/i);
    });
});

// ─── rejectQuestion ─────────────────────────────────────────

describe('rejectQuestion', () => {
    it('sets review_status to rejected for a pending question', async () => {
        const q = await createQuestion(makeQuestionDto());

        await rejectQuestion(q._id.toString(), 'reviewer-1', 'Duplicate content');

        const updated = await QuestionBankQuestion.findById(q._id).lean();
        expect(updated!.review_status).toBe('rejected');
        expect(updated!.updatedByAdminId).toBe('reviewer-1');
    });

    it('throws when question does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        await expect(rejectQuestion(fakeId, 'reviewer-1', 'Bad')).rejects.toThrow(/not found/i);
    });

    it('throws when question is already rejected', async () => {
        const q = await createQuestion(makeQuestionDto());
        await rejectQuestion(q._id.toString(), 'reviewer-1', 'Bad');

        await expect(rejectQuestion(q._id.toString(), 'reviewer-2', 'Still bad')).rejects.toThrow(/already rejected/i);
    });

    it('throws when reason is empty', async () => {
        const q = await createQuestion(makeQuestionDto());
        await expect(rejectQuestion(q._id.toString(), 'reviewer-1', '')).rejects.toThrow(/reason is required/i);
    });

    it('throws when reason is whitespace only', async () => {
        const q = await createQuestion(makeQuestionDto());
        await expect(rejectQuestion(q._id.toString(), 'reviewer-1', '   ')).rejects.toThrow(/reason is required/i);
    });
});

// ─── bulkArchive ────────────────────────────────────────────

describe('bulkArchive', () => {
    it('archives multiple questions and returns correct counts', async () => {
        const q1 = await createQuestion(makeQuestionDto({ question_en: 'Q1' }));
        const q2 = await createQuestion(makeQuestionDto({ question_en: 'Q2' }));
        const q3 = await createQuestion(makeQuestionDto({ question_en: 'Q3' }));

        const result = await bulkArchive([
            q1._id.toString(),
            q2._id.toString(),
            q3._id.toString(),
        ]);

        expect(result.success).toBe(3);
        expect(result.failed).toBe(0);

        // Verify all are archived
        for (const id of [q1._id, q2._id, q3._id]) {
            const doc = await QuestionBankQuestion.findById(id).lean();
            expect(doc!.isArchived).toBe(true);
            expect(doc!.status).toBe('archived');
        }
    });

    it('counts already-archived questions as failed', async () => {
        const q = await createQuestion(makeQuestionDto());
        // Archive it first
        await bulkArchive([q._id.toString()]);

        // Try to archive again
        const result = await bulkArchive([q._id.toString()]);
        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
    });

    it('counts invalid ObjectIds as failed', async () => {
        const result = await bulkArchive(['not-a-valid-id', 'also-invalid']);
        expect(result.success).toBe(0);
        expect(result.failed).toBe(2);
    });

    it('handles mixed valid and invalid IDs', async () => {
        const q = await createQuestion(makeQuestionDto());
        const fakeId = new mongoose.Types.ObjectId().toString();

        const result = await bulkArchive([q._id.toString(), fakeId, 'bad-id']);
        expect(result.success).toBe(1);
        expect(result.failed).toBe(2);
    });

    it('returns zero counts for empty array', async () => {
        const result = await bulkArchive([]);
        expect(result.success).toBe(0);
        expect(result.failed).toBe(0);
    });
});

// ─── bulkStatusChange ───────────────────────────────────────

describe('bulkStatusChange', () => {
    it('changes status of multiple questions', async () => {
        const q1 = await createQuestion(makeQuestionDto({ question_en: 'Q1', status: 'draft' }));
        const q2 = await createQuestion(makeQuestionDto({ question_en: 'Q2', status: 'draft' }));

        const result = await bulkStatusChange(
            [q1._id.toString(), q2._id.toString()],
            'published',
        );

        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);

        const doc1 = await QuestionBankQuestion.findById(q1._id).lean();
        const doc2 = await QuestionBankQuestion.findById(q2._id).lean();
        expect(doc1!.status).toBe('published');
        expect(doc2!.status).toBe('published');
    });

    it('sets isArchived flag when status is archived', async () => {
        const q = await createQuestion(makeQuestionDto());

        await bulkStatusChange([q._id.toString()], 'archived');

        const doc = await QuestionBankQuestion.findById(q._id).lean();
        expect(doc!.status).toBe('archived');
        expect(doc!.isArchived).toBe(true);
    });

    it('throws for invalid status value', async () => {
        const q = await createQuestion(makeQuestionDto());
        await expect(
            bulkStatusChange([q._id.toString()], 'invalid_status'),
        ).rejects.toThrow(/Invalid status/i);
    });

    it('counts non-existent IDs as failed', async () => {
        const fakeId = new mongoose.Types.ObjectId().toString();
        const result = await bulkStatusChange([fakeId], 'published');
        expect(result.success).toBe(0);
        expect(result.failed).toBe(1);
    });

    it('handles empty array', async () => {
        const result = await bulkStatusChange([], 'published');
        expect(result.success).toBe(0);
        expect(result.failed).toBe(0);
    });
});

// ─── detectDuplicates ───────────────────────────────────────

describe('detectDuplicates', () => {
    it('returns empty array for empty input', async () => {
        const result = await detectDuplicates('');
        expect(result).toEqual([]);
    });

    it('returns empty array for whitespace-only input', async () => {
        const result = await detectDuplicates('   ');
        expect(result).toEqual([]);
    });

    it('detects similar questions by text similarity', async () => {
        // Create a question in the bank
        await createQuestion(makeQuestionDto({
            question_en: 'What is the capital of Bangladesh?',
        }));

        // Search for a very similar question
        const duplicates = await detectDuplicates('What is the capital of Bangladesh?');
        expect(duplicates.length).toBeGreaterThanOrEqual(1);
        expect(duplicates[0].question_en).toBe('What is the capital of Bangladesh?');
    });

    it('does not return archived questions', async () => {
        const q = await createQuestion(makeQuestionDto({
            question_en: 'What is the speed of light?',
        }));

        // Archive the question
        await QuestionBankQuestion.updateOne(
            { _id: q._id },
            { $set: { isArchived: true, status: 'archived' } },
        );

        const duplicates = await detectDuplicates('What is the speed of light?');
        const ids = duplicates.map((d) => d._id.toString());
        expect(ids).not.toContain(q._id.toString());
    });

    it('returns empty array when no similar questions exist', async () => {
        await createQuestion(makeQuestionDto({
            question_en: 'What is photosynthesis?',
        }));

        const duplicates = await detectDuplicates('Explain quantum entanglement in detail');
        expect(duplicates.length).toBe(0);
    });
});
