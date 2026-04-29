/**
 * Property 20: Import/Export Round-Trip
 *
 * After importing valid questions via importJSON, reading them back from the
 * database produces equivalent question data — the same questionText, options,
 * correctOption, difficulty, explanation, tags, year, and source are preserved.
 *
 * **Validates: Requirements 10.8**
 *
 * Sub-properties tested:
 *   1. Every successfully imported row is persisted in QuestionBankQuestion
 *   2. question_en matches the original questionText
 *   3. Options text matches option1–option4 from the import row
 *   4. correctKey matches the correctOption mapping (1→A, 2→B, 3→C, 4→D)
 *   5. difficulty is preserved
 *   6. explanation_en matches the original explanation
 *   7. tags, yearOrSession, and sourceLabel are preserved
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import { importJSON } from '../services/ImportPipelineService';
import type { RawImportRow } from '../services/ImportPipelineService';
import QuestionBankQuestion from '../models/QuestionBankQuestion';

// ─── Test DB Setup ──────────────────────────────────────────

let mongoServer: MongoMemoryServer;
const adminId = new mongoose.Types.ObjectId().toString();

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

afterEach(async () => {
    await QuestionBankQuestion.deleteMany({});
});

// ─── Constants ──────────────────────────────────────────────

const CORRECT_OPTION_TO_KEY: Record<string, 'A' | 'B' | 'C' | 'D'> = {
    '1': 'A',
    '2': 'B',
    '3': 'C',
    '4': 'D',
};

// ─── Helpers ────────────────────────────────────────────────

/**
 * Import rows and return DB documents in insertion order.
 * Since processRows inserts sequentially, sorting by _id (monotonic ObjectId)
 * preserves the original row order.
 */
async function importAndReadBack(rows: RawImportRow[]) {
    const buffer = Buffer.from(JSON.stringify(rows), 'utf-8');
    const result = await importJSON(buffer, adminId);
    const dbQuestions = await QuestionBankQuestion.find({})
        .sort({ _id: 1 })
        .lean();
    return { result, dbQuestions };
}

// ─── Arbitrary Generators ───────────────────────────────────

/**
 * Generate a non-empty, trimmed string suitable for question/option text.
 */
const nonEmptyTrimmedStr = (maxLen = 60): fc.Arbitrary<string> =>
    fc
        .string({ minLength: 1, maxLength: maxLen })
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

/**
 * Generate a simple tag string (no commas, non-empty after trim).
 */
const tagWordArb: fc.Arbitrary<string> = fc
    .string({ minLength: 1, maxLength: 15 })
    .map((s) => s.replace(/,/g, '').trim())
    .filter((s) => s.length > 0);

/**
 * Generate a valid RawImportRow that will pass validation and import successfully.
 * No hierarchy refs (topic/category/group) to avoid DB lookup failures.
 */
const validImportRowArb: fc.Arbitrary<RawImportRow> = fc
    .record({
        questionText: nonEmptyTrimmedStr(80),
        option1: nonEmptyTrimmedStr(40),
        option2: nonEmptyTrimmedStr(40),
        option3: nonEmptyTrimmedStr(40),
        option4: nonEmptyTrimmedStr(40),
        correctOption: fc.constantFrom('1', '2', '3', '4'),
        explanation: fc.option(nonEmptyTrimmedStr(60), { nil: undefined }),
        difficulty: fc.constantFrom('easy', 'medium', 'hard'),
        tags: fc.option(
            fc
                .array(tagWordArb, { minLength: 1, maxLength: 3 })
                .map((arr) => arr.join(',')),
            { nil: undefined },
        ),
        year: fc.option(
            fc.constantFrom('2020', '2021', '2022', '2023', '2024'),
            { nil: undefined },
        ),
        source: fc.option(nonEmptyTrimmedStr(20), { nil: undefined }),
    })
    .map((r) => ({
        ...r,
        // Exclude hierarchy refs to avoid DB lookup failures
        topic: undefined,
        category: undefined,
        group: undefined,
    }));

/**
 * Generate an array of 1–8 valid import rows for round-trip testing.
 */
const validRowsArb = fc.array(validImportRowArb, { minLength: 1, maxLength: 8 });

// ─── Property Tests ─────────────────────────────────────────

describe('Property 20: Import/Export Round-Trip', () => {
    it('every successfully imported row is persisted and retrievable from the database', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { result, dbQuestions } = await importAndReadBack(rows);

                // All valid rows should import successfully
                expect(result.success).toBe(rows.length);
                expect(result.failed).toBe(0);

                // The DB should contain exactly as many questions as we imported
                expect(dbQuestions.length).toBe(rows.length);
            }),
            { numRuns: 20 },
        );
    });

    it('question_en matches the original questionText after round-trip', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { dbQuestions } = await importAndReadBack(rows);

                // Positional match: row i corresponds to dbQuestions[i]
                for (let i = 0; i < rows.length; i++) {
                    const expectedText = rows[i].questionText!.trim();
                    expect(dbQuestions[i].question_en).toBe(expectedText);
                }
            }),
            { numRuns: 20 },
        );
    });

    it('options text matches option1–option4 from the import row', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { dbQuestions } = await importAndReadBack(rows);

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const opts = dbQuestions[i].options;

                    // Option A text matches option1
                    const optA = opts.find((o) => o.key === 'A');
                    expect(optA).toBeDefined();
                    expect(optA!.text_en).toBe(row.option1!.trim());

                    // Option B text matches option2
                    const optB = opts.find((o) => o.key === 'B');
                    expect(optB).toBeDefined();
                    expect(optB!.text_en).toBe(row.option2!.trim());

                    // Option C text matches option3 (if provided)
                    if (row.option3 && row.option3.trim()) {
                        const optC = opts.find((o) => o.key === 'C');
                        expect(optC).toBeDefined();
                        expect(optC!.text_en).toBe(row.option3.trim());
                    }

                    // Option D text matches option4 (if provided)
                    if (row.option4 && row.option4.trim()) {
                        const optD = opts.find((o) => o.key === 'D');
                        expect(optD).toBeDefined();
                        expect(optD!.text_en).toBe(row.option4.trim());
                    }
                }
            }),
            { numRuns: 20 },
        );
    });

    it('correctKey matches the correctOption mapping (1→A, 2→B, 3→C, 4→D)', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { dbQuestions } = await importAndReadBack(rows);

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const doc = dbQuestions[i];

                    const expectedKey =
                        CORRECT_OPTION_TO_KEY[String(row.correctOption).trim()];
                    expect(doc.correctKey).toBe(expectedKey);

                    // The correct option should also be marked isCorrect
                    const correctOpt = doc.options.find(
                        (o) => o.key === expectedKey,
                    );
                    expect(correctOpt).toBeDefined();
                    expect(correctOpt!.isCorrect).toBe(true);
                }
            }),
            { numRuns: 20 },
        );
    });

    it('difficulty is preserved through import round-trip', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { dbQuestions } = await importAndReadBack(rows);

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const expectedDifficulty = row.difficulty
                        ? row.difficulty.trim().toLowerCase()
                        : 'medium';
                    expect(dbQuestions[i].difficulty).toBe(expectedDifficulty);
                }
            }),
            { numRuns: 20 },
        );
    });

    it('explanation, tags, year, and source are preserved through import round-trip', async () => {
        await fc.assert(
            fc.asyncProperty(validRowsArb, async (rows) => {
                await QuestionBankQuestion.deleteMany({});

                const { dbQuestions } = await importAndReadBack(rows);

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    const doc = dbQuestions[i];

                    // Explanation round-trip
                    const expectedExplanation = row.explanation
                        ? String(row.explanation).trim()
                        : '';
                    expect(doc.explanation_en).toBe(expectedExplanation);

                    // Tags round-trip
                    if (row.tags) {
                        const expectedTags = String(row.tags)
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean);
                        expect(doc.tags).toEqual(expectedTags);
                    } else {
                        expect(doc.tags).toEqual([]);
                    }

                    // Year round-trip
                    const expectedYear = row.year
                        ? String(row.year).trim()
                        : '';
                    expect(doc.yearOrSession).toBe(expectedYear);

                    // Source round-trip
                    const expectedSource = row.source
                        ? String(row.source).trim()
                        : '';
                    expect(doc.sourceLabel).toBe(expectedSource);
                }
            }),
            { numRuns: 20 },
        );
    });
});
