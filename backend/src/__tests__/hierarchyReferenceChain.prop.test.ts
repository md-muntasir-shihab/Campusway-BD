// Feature: exam-management-system, Property 8: Question Hierarchy Reference Chain Validity

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import mongoose from 'mongoose';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import { createQuestion, CreateQuestionDto } from '../services/QuestionBankService';
import QuestionGroup from '../models/QuestionGroup';
import QuestionSubGroup from '../models/QuestionSubGroup';
import QuestionCategory from '../models/QuestionCategory';
import QuestionChapter from '../models/QuestionChapter';
import QuestionTopic from '../models/QuestionTopic';

/**
 * Feature: exam-management-system, Property 8: Question Hierarchy Reference Chain Validity
 *
 * *For any* question being created with hierarchy references (group_id, sub_group_id,
 * subject_id, chapter_id, topic_id), the referenced nodes must exist and form a valid
 * parent chain. If the chain is invalid, creation should be rejected.
 *
 * **Validates: Requirements 2.3**
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Seed a complete valid hierarchy chain and return all IDs. */
async function seedValidHierarchy() {
    const group = await QuestionGroup.create({
        code: 'grp-' + new mongoose.Types.ObjectId().toHexString().slice(0, 8),
        title: { en: 'Test Group', bn: 'টেস্ট গ্রুপ' },
        order: 0,
        isActive: true,
    });

    const subGroup = await QuestionSubGroup.create({
        group_id: group._id,
        code: 'sg-' + new mongoose.Types.ObjectId().toHexString().slice(0, 8),
        title: { en: 'Test SubGroup', bn: 'টেস্ট সাবগ্রুপ' },
        order: 0,
        isActive: true,
    });

    const subject = await QuestionCategory.create({
        group_id: group._id,
        parent_id: subGroup._id,
        code: 'subj-' + new mongoose.Types.ObjectId().toHexString().slice(0, 8),
        title: { en: 'Test Subject', bn: 'টেস্ট বিষয়' },
        order: 0,
        isActive: true,
    });

    const chapter = await QuestionChapter.create({
        subject_id: subject._id,
        group_id: group._id,
        code: 'ch-' + new mongoose.Types.ObjectId().toHexString().slice(0, 8),
        title: { en: 'Test Chapter', bn: 'টেস্ট অধ্যায়' },
        order: 0,
        isActive: true,
    });

    const topic = await QuestionTopic.create({
        category_id: subject._id,
        group_id: group._id,
        parent_id: chapter._id,
        code: 'tp-' + new mongoose.Types.ObjectId().toHexString().slice(0, 8),
        title: { en: 'Test Topic', bn: 'টেস্ট টপিক' },
        order: 0,
        isActive: true,
    });

    return {
        group_id: (group._id as mongoose.Types.ObjectId).toString(),
        sub_group_id: (subGroup._id as mongoose.Types.ObjectId).toString(),
        subject_id: (subject._id as mongoose.Types.ObjectId).toString(),
        chapter_id: (chapter._id as mongoose.Types.ObjectId).toString(),
        topic_id: (topic._id as mongoose.Types.ObjectId).toString(),
    };
}

/** Build a valid question DTO with hierarchy refs and a correct MCQ option. */
function buildDto(hierarchyRefs: Partial<{
    group_id: string;
    sub_group_id: string;
    subject_id: string;
    chapter_id: string;
    topic_id: string;
}>): CreateQuestionDto {
    return {
        question_type: 'mcq',
        question_en: 'What is 1 + 1?',
        options: [
            { key: 'A', text_en: '2', isCorrect: true },
            { key: 'B', text_en: '3', isCorrect: false },
            { key: 'C', text_en: '4', isCorrect: false },
            { key: 'D', text_en: '5', isCorrect: false },
        ],
        correctKey: 'A',
        subject: 'Mathematics',
        moduleCategory: 'Arithmetic',
        difficulty: 'easy',
        marks: 1,
        ...hierarchyRefs,
    };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(async () => {
    await setupTestDb();
});

afterEach(async () => {
    await clearTestDb();
});

afterAll(async () => {
    await teardownTestDb();
});

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 8: Question Hierarchy Reference Chain Validity', () => {
    it('rejects question creation when a hierarchy reference is non-existent', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(fc.constant(null), async () => {
                const fakeId = new mongoose.Types.ObjectId().toHexString();
                // Provide a non-existent group_id — should be rejected
                const dto = buildDto({ group_id: fakeId });
                await expect(createQuestion(dto)).rejects.toThrow(/not found/i);
            }),
            { numRuns: 10 },
        );
    });

    it('rejects question creation when hierarchy chain has mismatched parent references', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 1, max: 4 }),
                async (level) => {
                    // Seed two independent valid hierarchy chains
                    const valid = await seedValidHierarchy();
                    const other = await seedValidHierarchy();

                    let corruptedRefs: Partial<{
                        group_id: string;
                        sub_group_id: string;
                        subject_id: string;
                        chapter_id: string;
                        topic_id: string;
                    }>;

                    switch (level) {
                        case 1: {
                            // sub_group from a different group
                            corruptedRefs = {
                                group_id: valid.group_id,
                                sub_group_id: other.sub_group_id,
                            };
                            break;
                        }
                        case 2: {
                            // subject from a different sub_group
                            corruptedRefs = {
                                group_id: valid.group_id,
                                sub_group_id: valid.sub_group_id,
                                subject_id: other.subject_id,
                            };
                            break;
                        }
                        case 3: {
                            // chapter from a different subject
                            corruptedRefs = {
                                group_id: valid.group_id,
                                sub_group_id: valid.sub_group_id,
                                subject_id: valid.subject_id,
                                chapter_id: other.chapter_id,
                            };
                            break;
                        }
                        case 4: {
                            // topic from a different chapter
                            corruptedRefs = {
                                group_id: valid.group_id,
                                sub_group_id: valid.sub_group_id,
                                subject_id: valid.subject_id,
                                chapter_id: valid.chapter_id,
                                topic_id: other.topic_id,
                            };
                            break;
                        }
                        default:
                            corruptedRefs = {};
                    }

                    const dto = buildDto(corruptedRefs);
                    await expect(createQuestion(dto)).rejects.toThrow(
                        /not found|does not belong/i,
                    );
                },
            ),
            { numRuns: 12 },
        );
    });

    it('accepts question creation when hierarchy chain is fully valid', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 0, max: 4 }),
                async (depth) => {
                    // Seed a valid hierarchy
                    const valid = await seedValidHierarchy();

                    // Build refs at varying depths (0 = no refs, 1 = group only, ..., 4 = full chain)
                    const refs: Partial<{
                        group_id: string;
                        sub_group_id: string;
                        subject_id: string;
                        chapter_id: string;
                        topic_id: string;
                    }> = {};

                    if (depth >= 1) refs.group_id = valid.group_id;
                    if (depth >= 2) refs.sub_group_id = valid.sub_group_id;
                    if (depth >= 3) refs.subject_id = valid.subject_id;
                    if (depth >= 4) {
                        refs.chapter_id = valid.chapter_id;
                        refs.topic_id = valid.topic_id;
                    }

                    const dto = buildDto(refs);
                    const result = await createQuestion(dto);
                    expect(result).toBeDefined();
                    expect(result._id).toBeDefined();

                    // Verify saved hierarchy refs match what was provided
                    if (refs.group_id) expect(result.group_id?.toString()).toBe(refs.group_id);
                    if (refs.sub_group_id) expect(result.sub_group_id?.toString()).toBe(refs.sub_group_id);
                    if (refs.subject_id) expect(result.subject_id?.toString()).toBe(refs.subject_id);
                    if (refs.chapter_id) expect(result.chapter_id?.toString()).toBe(refs.chapter_id);
                    if (refs.topic_id) expect(result.topic_id?.toString()).toBe(refs.topic_id);
                },
            ),
            { numRuns: 15 },
        );
    });

    it('rejects when child ref is provided without required parent ref', { timeout: 120_000 }, async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(
                    'sub_group_without_group',
                    'subject_without_sub_group',
                    'chapter_without_subject',
                    'topic_without_chapter',
                ),
                async (scenario) => {
                    const valid = await seedValidHierarchy();

                    let refs: Partial<{
                        group_id: string;
                        sub_group_id: string;
                        subject_id: string;
                        chapter_id: string;
                        topic_id: string;
                    }>;

                    switch (scenario) {
                        case 'sub_group_without_group':
                            refs = { sub_group_id: valid.sub_group_id };
                            break;
                        case 'subject_without_sub_group':
                            refs = { group_id: valid.group_id, subject_id: valid.subject_id };
                            break;
                        case 'chapter_without_subject':
                            refs = {
                                group_id: valid.group_id,
                                sub_group_id: valid.sub_group_id,
                                chapter_id: valid.chapter_id,
                            };
                            break;
                        case 'topic_without_chapter':
                            refs = {
                                group_id: valid.group_id,
                                sub_group_id: valid.sub_group_id,
                                subject_id: valid.subject_id,
                                topic_id: valid.topic_id,
                            };
                            break;
                        default:
                            refs = {};
                    }

                    const dto = buildDto(refs);
                    await expect(createQuestion(dto)).rejects.toThrow(/required/i);
                },
            ),
            { numRuns: 12 },
        );
    });
});
