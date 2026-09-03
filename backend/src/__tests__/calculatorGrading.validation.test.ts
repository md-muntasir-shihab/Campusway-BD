/**
 * Unit tests for the CalculatorGrading table validation.
 * These are pure-function tests (no DB): they lock in the rules that decide
 * whether an admin grading-table save is accepted — including the O/A-Level
 * "marks unused" 0/0 rows that previously made every save fail with 400.
 */
import { describe, it, expect } from 'vitest';
import { isValidTable, TABLE_KEYS } from '../controllers/calculatorGradingController';
import { DEFAULT_GRADING } from '../models/CalculatorGrading';

const row = (minMark: number, maxMark: number, grade: string, point: number) => ({ minMark, maxMark, grade, point });

describe('isValidTable — shipped defaults', () => {
    it('accepts all four default tables exactly as seeded (regression: OA 0/0 rows)', () => {
        for (const key of TABLE_KEYS) {
            expect(isValidTable(DEFAULT_GRADING[key])).toBe(true);
        }
    });

    it('accepts an OA table made entirely of 0/0 marks-unused rows', () => {
        expect(isValidTable([
            row(0, 0, 'A*', 5),
            row(0, 0, 'A', 5),
            row(0, 0, 'B', 4),
        ])).toBe(true);
    });
});

describe('isValidTable — rejections', () => {
    it('rejects non-arrays and empty tables', () => {
        expect(isValidTable(null)).toBe(false);
        expect(isValidTable([])).toBe(false);
    });

    it('rejects rows with empty grades or negative points', () => {
        expect(isValidTable([row(50, 100, '', 4)])).toBe(false);
        expect(isValidTable([row(50, 100, 'A', -1)])).toBe(false);
    });

    it('rejects inverted or zero-width mark ranges (except the 0/0 OA case)', () => {
        expect(isValidTable([row(80, 70, 'A', 4)])).toBe(false);
        expect(isValidTable([row(50, 50, 'A', 4)])).toBe(false);
    });

    it('rejects overlapping mark ranges — ambiguous mapping', () => {
        expect(isValidTable([
            row(33, 60, 'C', 2),
            row(50, 79, 'B', 3),
        ])).toBe(false);
    });

    it('rejects marks out of the 0-100 range', () => {
        expect(isValidTable([row(0, 120, 'A', 4)])).toBe(false);
        expect(isValidTable([row(-5, 40, 'D', 1)])).toBe(false);
    });

    it('still rejects a table that mixes a 0/0 row with real overlaps', () => {
        expect(isValidTable([
            row(0, 0, 'A*', 5),
            row(50, 79, 'B', 3),
            row(60, 100, 'A', 4),
        ])).toBe(false);
    });
});

describe('isValidTable — acceptances', () => {
    it('accepts adjacent (touching) ranges when they do not overlap', () => {
        expect(isValidTable([
            row(80, 100, 'A+', 5),
            row(70, 79, 'A', 4),
            row(33, 69, 'D', 1),
        ])).toBe(true);
    });

    it('accepts gaps between ranges (a mark in a gap simply yields no grade)', () => {
        expect(isValidTable([
            row(80, 100, 'A+', 5),
            row(60, 70, 'B', 3),
        ])).toBe(true);
    });
});
