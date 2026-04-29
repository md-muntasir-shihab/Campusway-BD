// Feature: exam-management-system, Property 11: Filter Correctness

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import fc from 'fast-check';
import { setupTestDb, teardownTestDb, clearTestDb } from './helpers/mongoTestSetup';
import {
    createQuestion,
    listQuestions,
    CreateQuestionDto,
    QuestionFilters,
} from '../services/QuestionBankService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

/**
 * Feature: exam-management-system, Property 11: Filter Correctness
 *
 * *For any* combination of filter criteria (difficulty, question_type, status,
 * review_status, tags, subject, chapter, topic, year, source) applied to a
 * question listing query, every returned question must match all specified
 * filter values.
 *
 * **Validates: Requirements 2.6**
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const QUESTION_TYPES = ['mcq', 'true_false'] as const;
const STATUSES = ['draft', 'published'] as const;
const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
const SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology'] as const;
const CHAPTERS = ['Chapter 1', 'Chapter 2', 'Chapter 3'] as const;
const TOPICS = ['Algebra', 'Calculus', 'Mechanics', 'Optics'] as const;
const YEARS = ['2023', '2024', '2025'] as const;
const SOURCES = ['Board Exam', 'Mock Test', 'Practice Set'] as const;
const TAG_POOL = ['important', 'easy-marks', 'tricky', 'formula', 'conceptual'] as const;

// ─── Arbitraries ─────────────────────────────────────────────────────────────

/** Describes a question with all filterable fields for test generation */
interface TestQuestionSpec {
    dto: CreateQuestionDto;
    review_status: string;
}

/** Generate a question spec with randomized filterable fields */
const questionSpecArb = fc
    .record({
        difficulty: fc.constantFrom(...DIFFICULTIES),
        question_type: fc.constantFrom(...QUESTION_TYPES),
        status: fc.constantFrom(...STATUSES),
        review_status: fc.constantFrom(...REVIEW_STATUSES),
        subject: fc.constantFrom(...SUBJECTS),
        chapter: fc.constantFrom(...CHAPTERS),
        topic: fc.constantFrom(...TOPICS),
        year: fc.constantFrom(...YEARS),
        source: fc.constantFrom(...SOURCES),
        tags: fc.subarray([...TAG_POOL], { minLength: 0, maxLength: 3 }),
        question_en: fc.string({ minLength: 3, maxLength: 40 }).filter((s) => s.trim().length >= 3),
    })
    .map(
        (fields): TestQuestionSpec => ({
            dto: {
                question_type: fields.question_type,
                question_en: fields.question_en,
                options: [
                    { key: 'A', text_en: 'Option A', isCorrect: true },
                    { key: 'B', text_en: 'Option B', isCorrect: false },
                    { key: 'C', text_en: 'Option C', isCorrect: false },
                    { key: 'D', text_en: 'Option D', isCorrect: false },
                ],
                correctKey: 'A',
                subject: fields.subject,
                moduleCategory: 'General',
                difficulty: fields.difficulty,
                marks: 1,
                tags: fields.tags,
                sourceLabel: fields.source,
                chapter: fields.chapter,
                topic: fields.topic,
                yearOrSession: fields.year,
                status: fields.status,
            },
            review_status: fields.review_status,
        }),
    );

/** Generate a non-empty subset of filter criteria to apply */
const filterArb = fc.record(
    {
        difficulty: fc.constantFrom(...DIFFICULTIES),
        question_type: fc.constantFrom(...QUESTION_TYPES),
        status: fc.constantFrom(...STATUSES),
        review_status: fc.constantFrom(...REVIEW_STATUSES),
        subject: fc.constantFrom(...SUBJECTS),
        chapter: fc.constantFrom(...CHAPTERS),
        topic: fc.constantFrom(...TOPICS),
        year: fc.constantFrom(...YEARS),
        source: fc.constantFrom(...SOURCES),
        tags: fc.subarray([...TAG_POOL], { minLength: 1, maxLength: 2 }),
    },
    { requiredKeys: [] },
);

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a QuestionFilters object from the generated raw filter (only defined keys) */
function buildFilters(rawFilters: Record<string, unknown>): QuestionFilters {
    const filters: QuestionFilters = {};
    if (rawFilters.difficulty !== undefined) filters.difficulty = rawFilters.difficulty as string;
    if (rawFilters.question_type !== undefined) filters.question_type = rawFilters.question_type as string;
    if (rawFilters.status !== undefined) filters.status = rawFilters.status as string;
    if (rawFilters.review_status !== undefined) filters.review_status = rawFilters.review_status as string;
    if (rawFilters.subject !== undefined) filters.subject = rawFilters.subject as string;
    if (rawFilters.chapter !== undefined) filters.chapter = rawFilters.chapter as string;
    if (rawFilters.topic !== undefined) filters.topic = rawFilters.topic as string;
    if (rawFilters.year !== undefined) filters.year = rawFilters.year as string;
    if (rawFilters.source !== undefined) filters.source = rawFilters.source as string;
    if (rawFilters.tags !== undefined) {
        const tags = rawFilters.tags as string[];
        if (tags.length > 0) filters.tags = tags;
    }
    return filters;
}

/**
 * Assert that a question document matches all specified filter values.
 * Uses the same field mapping as listQuestions.
 */
function assertQuestionMatchesFilters(
    q: Record<string, unknown>,
    filters: QuestionFilters,
): void {
    if (filters.difficulty) {
        expect(q.difficulty).toBe(filters.difficulty);
    }
    if (filters.question_type) {
        expect(q.question_type).toBe(filters.question_type);
    }
    if (filters.status) {
        expect(q.status).toBe(filters.status);
    }
    if (filters.review_status) {
        expect(q.review_status).toBe(filters.review_status);
    }
    if (filters.subject) {
        expect(q.subject).toBe(filters.subject);
    }
    if (filters.chapter) {
        expect(q.chapter).toBe(filters.chapter);
    }
    if (filters.topic) {
        expect(q.topic).toBe(filters.topic);
    }
    if (filters.year) {
        // listQuestions maps filters.year → query.yearOrSession
        expect(q.yearOrSession).toBe(filters.year);
    }
    if (filters.source) {
        // listQuestions maps filters.source → query.sourceLabel
        expect(q.sourceLabel).toBe(filters.source);
    }
    if (filters.tags) {
        const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        const qTags = q.tags as string[];
        for (const tag of filterTags) {
            expect(qTags).toContain(tag);
        }
    }
}

/**
 * Create a question from a spec, then update review_status directly
 * (since createQuestion doesn't accept review_status).
 */
async function createTestQuestion(spec: TestQuestionSpec): Promise<string> {
    const created = await createQuestion(spec.dto);
    if (spec.review_status !== 'pending') {
        await QuestionBankQuestion.findByIdAndUpdate(created._id, {
            review_status: spec.review_status,
        });
    }
    return created._id.toString();
}

/**
 * Check if a question spec would match the given filters.
 */
function specMatchesFilters(spec: TestQuestionSpec, filters: QuestionFilters): boolean {
    const dto = spec.dto;
    if (filters.difficulty && (dto.difficulty || 'medium') !== filters.difficulty) return false;
    if (filters.question_type && (dto.question_type || 'mcq') !== filters.question_type) return false;
    if (filters.status && (dto.status || 'draft') !== filters.status) return false;
    if (filters.review_status && spec.review_status !== filters.review_status) return false;
    if (filters.subject && (dto.subject || 'General') !== filters.subject) return false;
    if (filters.chapter && (dto.chapter || '') !== filters.chapter) return false;
    if (filters.topic && (dto.topic || '') !== filters.topic) return false;
    if (filters.year && (dto.yearOrSession || '') !== filters.year) return false;
    if (filters.source && (dto.sourceLabel || '') !== filters.source) return false;
    if (filters.tags) {
        const filterTags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
        const dtoTags = dto.tags || [];
        for (const tag of filterTags) {
            if (!dtoTags.includes(tag)) return false;
        }
    }
    return true;
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 11: Filter Correctness', () => {
    it(
        'every returned question matches all specified filter values',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(questionSpecArb, { minLength: 3, maxLength: 8 }),
                    filterArb,
                    async (specs, rawFilters) => {
                        // Clean slate for each property run
                        await QuestionBankQuestion.deleteMany({});

                        // Create all questions
                        for (const spec of specs) {
                            await createTestQuestion(spec);
                        }

                        const filters = buildFilters(rawFilters);

                        // Skip if no filters were generated
                        if (Object.keys(filters).length === 0) return;

                        // Query with filters
                        const result = await listQuestions(filters, { page: 1, limit: 100 });

                        // Every returned question must match ALL specified filters
                        for (const q of result.data) {
                            assertQuestionMatchesFilters(q as unknown as Record<string, unknown>, filters);
                        }
                    },
                ),
                { numRuns: 25 },
            );
        },
    );

    it(
        'result count matches manual count of matching questions',
        { timeout: 120_000 },
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.array(questionSpecArb, { minLength: 3, maxLength: 8 }),
                    filterArb,
                    async (specs, rawFilters) => {
                        // Clean slate
                        await QuestionBankQuestion.deleteMany({});

                        // Create all questions
                        for (const spec of specs) {
                            await createTestQuestion(spec);
                        }

                        const filters = buildFilters(rawFilters);
                        if (Object.keys(filters).length === 0) return;

                        // Manually count how many created questions should match
                        const expectedCount = specs.filter((spec) =>
                            specMatchesFilters(spec, filters),
                        ).length;

                        const result = await listQuestions(filters, { page: 1, limit: 100 });

                        // Total count from service must match our manual count
                        expect(result.total).toBe(expectedCount);
                        expect(result.data.length).toBe(expectedCount);
                    },
                ),
                { numRuns: 25 },
            );
        },
    );
});
