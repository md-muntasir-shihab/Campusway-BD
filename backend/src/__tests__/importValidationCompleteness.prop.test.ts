/**
 * Property 19: Import Validation Completeness
 *
 * For any import file with T total rows, the sum of successful imports and
 * failed imports should equal T, and every failed row should have a
 * corresponding error detail entry with row number and error description.
 *
 * **Validates: Requirements 10.4, 10.5**
 *
 * Sub-properties tested:
 *   1. success + failed = total for any mix of valid/invalid rows
 *   2. errors.length = failed (every failed row has an error detail)
 *   3. Every error has a non-empty error message and a valid row number (1-indexed, within range)
 *   4. No duplicate row numbers in errors
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fc from 'fast-check';
import {
    importJSON,
    validateImportRow,
} from '../services/ImportPipelineService';
import type { RawImportRow, ImportResult } from '../services/ImportPipelineService';
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

// ─── Arbitrary Generators ───────────────────────────────────

/**
 * Generate a valid RawImportRow that will pass validateImportRow.
 * Uses constrained values to ensure correctOption references a non-empty option.
 */
const validRowArb: fc.Arbitrary<RawImportRow> = fc
    .record({
        questionText: fc.string({ minLength: 1, maxLength: 60 }).filter((s) => s.trim().length > 0),
        option1: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        option2: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        option3: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        option4: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0),
        correctOption: fc.constantFrom('1', '2', '3', '4'),
        explanation: fc.string({ minLength: 0, maxLength: 40 }),
        difficulty: fc.constantFrom('easy', 'medium', 'hard'),
    })
    .map((r) => ({
        ...r,
        // No hierarchy refs — avoids DB lookup failures for valid rows
        topic: undefined,
        category: undefined,
        group: undefined,
        tags: undefined,
        year: undefined,
        source: undefined,
    }));

/**
 * Generate an invalid RawImportRow that will fail validateImportRow.
 * Randomly picks one of several invalid patterns.
 */
const invalidRowArb: fc.Arbitrary<RawImportRow> = fc.oneof(
    // Missing questionText
    fc.constant<RawImportRow>({
        questionText: '',
        option1: 'A',
        option2: 'B',
        correctOption: '1',
    }),
    // Missing option1
    fc.constant<RawImportRow>({
        questionText: 'Some question',
        option1: '',
        option2: 'B',
        correctOption: '1',
    }),
    // Missing option2
    fc.constant<RawImportRow>({
        questionText: 'Some question',
        option1: 'A',
        option2: '',
        correctOption: '1',
    }),
    // Invalid correctOption
    fc.constant<RawImportRow>({
        questionText: 'Some question',
        option1: 'A',
        option2: 'B',
        option3: 'C',
        option4: 'D',
        correctOption: '9',
    }),
    // correctOption references empty option
    fc.constant<RawImportRow>({
        questionText: 'Some question',
        option1: 'A',
        option2: 'B',
        option3: '',
        correctOption: '3',
    }),
    // Invalid difficulty
    fc.constant<RawImportRow>({
        questionText: 'Some question',
        option1: 'A',
        option2: 'B',
        correctOption: '1',
        difficulty: 'extreme',
    }),
);

/**
 * Generate an array of RawImportRow mixing valid and invalid rows.
 * Each element is tagged so we know the expected outcome.
 */
const mixedRowsArb = fc.array(
    fc.oneof(
        validRowArb.map((row) => ({ row, expectedValid: true })),
        invalidRowArb.map((row) => ({ row, expectedValid: false })),
    ),
    { minLength: 1, maxLength: 15 },
);

// ─── Property Tests ─────────────────────────────────────────

describe('Property 19: Import Validation Completeness', () => {
    it('success + failed = total for any mix of valid/invalid rows', async () => {
        await fc.assert(
            fc.asyncProperty(mixedRowsArb, async (taggedRows) => {
                // Clean up from previous iteration
                await QuestionBankQuestion.deleteMany({});

                const rows = taggedRows.map((t) => t.row);
                const buffer = Buffer.from(JSON.stringify(rows), 'utf-8');

                const result: ImportResult = await importJSON(buffer, adminId);

                // Core invariant: success + failed = total
                expect(result.success + result.failed).toBe(result.total);
                expect(result.total).toBe(rows.length);
            }),
            { numRuns: 30 },
        );
    });

    it('errors.length equals failed count — every failed row has an error detail', async () => {
        await fc.assert(
            fc.asyncProperty(mixedRowsArb, async (taggedRows) => {
                await QuestionBankQuestion.deleteMany({});

                const rows = taggedRows.map((t) => t.row);
                const buffer = Buffer.from(JSON.stringify(rows), 'utf-8');

                const result: ImportResult = await importJSON(buffer, adminId);

                // Every failed row must have a corresponding error entry
                expect(result.errors.length).toBe(result.failed);
            }),
            { numRuns: 30 },
        );
    });

    it('every error has a non-empty message and a valid 1-indexed row number', async () => {
        await fc.assert(
            fc.asyncProperty(mixedRowsArb, async (taggedRows) => {
                await QuestionBankQuestion.deleteMany({});

                const rows = taggedRows.map((t) => t.row);
                const buffer = Buffer.from(JSON.stringify(rows), 'utf-8');

                const result: ImportResult = await importJSON(buffer, adminId);

                for (const err of result.errors) {
                    // Row number must be 1-indexed and within range
                    expect(err.row).toBeGreaterThanOrEqual(1);
                    expect(err.row).toBeLessThanOrEqual(rows.length);

                    // Error message must be a non-empty string
                    expect(typeof err.error).toBe('string');
                    expect(err.error.trim().length).toBeGreaterThan(0);
                }
            }),
            { numRuns: 30 },
        );
    });

    it('no duplicate row numbers in errors', async () => {
        await fc.assert(
            fc.asyncProperty(mixedRowsArb, async (taggedRows) => {
                await QuestionBankQuestion.deleteMany({});

                const rows = taggedRows.map((t) => t.row);
                const buffer = Buffer.from(JSON.stringify(rows), 'utf-8');

                const result: ImportResult = await importJSON(buffer, adminId);

                // Each row should appear at most once in the errors array
                const rowNumbers = result.errors.map((e) => e.row);
                const uniqueRowNumbers = new Set(rowNumbers);
                expect(uniqueRowNumbers.size).toBe(rowNumbers.length);
            }),
            { numRuns: 30 },
        );
    });

    it('validateImportRow correctly classifies valid vs invalid rows', () => {
        // Supplementary pure-function property: valid rows return null, invalid rows return string
        fc.assert(
            fc.property(validRowArb, (row) => {
                const result = validateImportRow(row);
                expect(result).toBeNull();
            }),
            { numRuns: 50 },
        );

        fc.assert(
            fc.property(invalidRowArb, (row) => {
                const result = validateImportRow(row);
                expect(typeof result).toBe('string');
                expect(result!.trim().length).toBeGreaterThan(0);
            }),
            { numRuns: 50 },
        );
    });
});
