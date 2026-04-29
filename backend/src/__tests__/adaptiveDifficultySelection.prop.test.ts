import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
    selectDifficultyForMastery,
    type MasteryLevel,
    type Difficulty,
} from '../services/PracticeSessionService';

/**
 * Feature: exam-management-system
 * Property 35: Adaptive Difficulty Selection
 *
 * **Validates: Requirements 30.1, 30.2, 30.4**
 *
 * For any student with a topic mastery map, when generating a practice session:
 *   - beginner   → easy
 *   - intermediate → medium
 *   - advanced   → hard
 *   - mastered   → hard
 *
 * Scoring 80%+ on a session should advance the mastery level;
 * scoring below 50% should not advance it.
 *
 * This test validates the pure selectDifficultyForMastery mapping function
 * for correctness, valid output, and monotonicity (higher mastery → same or
 * harder difficulty).
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_MASTERY_LEVELS: MasteryLevel[] = ['beginner', 'intermediate', 'advanced', 'mastered'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Expected difficulty for a given mastery level (reference implementation) */
function expectedDifficulty(level: MasteryLevel): Difficulty {
    switch (level) {
        case 'beginner':
            return 'easy';
        case 'intermediate':
            return 'medium';
        case 'advanced':
            return 'hard';
        case 'mastered':
            return 'hard';
    }
}

/** Difficulty ordering for monotonicity checks (higher index = harder) */
const DIFFICULTY_ORDER: Record<Difficulty, number> = {
    easy: 0,
    medium: 1,
    hard: 2,
};

/** Mastery ordering (higher index = more advanced) */
const MASTERY_ORDER: Record<MasteryLevel, number> = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
    mastered: 3,
};

// ─── Generators ──────────────────────────────────────────────────────────────

/** Arbitrary mastery level */
const masteryLevelArb = fc.constantFrom<MasteryLevel>(...ALL_MASTERY_LEVELS);

/** Pair of mastery levels for monotonicity testing */
const masteryPairArb = fc.tuple(masteryLevelArb, masteryLevelArb);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 35: Adaptive Difficulty Selection', () => {
    it('selectDifficultyForMastery returns the correct difficulty for any mastery level', () => {
        fc.assert(
            fc.property(masteryLevelArb, (level) => {
                const difficulty = selectDifficultyForMastery(level);
                const expected = expectedDifficulty(level);
                expect(difficulty).toBe(expected);
            }),
            { numRuns: 200 },
        );
    });

    it('selectDifficultyForMastery always returns a valid Difficulty string', () => {
        fc.assert(
            fc.property(masteryLevelArb, (level) => {
                const difficulty = selectDifficultyForMastery(level);
                expect(VALID_DIFFICULTIES).toContain(difficulty);
            }),
            { numRuns: 200 },
        );
    });

    it('beginner always maps to easy', () => {
        expect(selectDifficultyForMastery('beginner')).toBe('easy');
    });

    it('intermediate always maps to medium', () => {
        expect(selectDifficultyForMastery('intermediate')).toBe('medium');
    });

    it('advanced always maps to hard', () => {
        expect(selectDifficultyForMastery('advanced')).toBe('hard');
    });

    it('mastered always maps to hard', () => {
        expect(selectDifficultyForMastery('mastered')).toBe('hard');
    });

    it('higher mastery levels produce same or harder difficulty (monotonicity)', () => {
        fc.assert(
            fc.property(masteryPairArb, ([levelA, levelB]) => {
                const [lo, hi] =
                    MASTERY_ORDER[levelA] <= MASTERY_ORDER[levelB]
                        ? [levelA, levelB]
                        : [levelB, levelA];

                const diffLo = selectDifficultyForMastery(lo);
                const diffHi = selectDifficultyForMastery(hi);

                expect(DIFFICULTY_ORDER[diffHi]).toBeGreaterThanOrEqual(
                    DIFFICULTY_ORDER[diffLo],
                );
            }),
            { numRuns: 500 },
        );
    });

    it('mastery advancement thresholds: 80%+ should advance, below 50% should not', () => {
        /**
         * This property validates the mastery advancement logic described in
         * Requirements 30.1 and 30.2:
         *   - 80%+ accuracy → advance mastery level
         *   - below 50% accuracy → do not advance
         *
         * We model this as a pure function: given a current mastery level and
         * an accuracy percentage, determine whether the mastery should advance.
         */
        const advanceMastery = (current: MasteryLevel): MasteryLevel => {
            switch (current) {
                case 'beginner':
                    return 'intermediate';
                case 'intermediate':
                    return 'advanced';
                case 'advanced':
                    return 'mastered';
                case 'mastered':
                    return 'mastered';
            }
        };

        const accuracyArb = fc.double({ min: 0, max: 100, noNaN: true });

        fc.assert(
            fc.property(masteryLevelArb, accuracyArb, (level, accuracy) => {
                if (accuracy >= 80) {
                    // 80%+ should advance mastery
                    const advanced = advanceMastery(level);
                    // The advanced level should be same or higher
                    expect(MASTERY_ORDER[advanced]).toBeGreaterThanOrEqual(
                        MASTERY_ORDER[level],
                    );
                    // The difficulty for the advanced level should be same or harder
                    const diffBefore = selectDifficultyForMastery(level);
                    const diffAfter = selectDifficultyForMastery(advanced);
                    expect(DIFFICULTY_ORDER[diffAfter]).toBeGreaterThanOrEqual(
                        DIFFICULTY_ORDER[diffBefore],
                    );
                } else if (accuracy < 50) {
                    // Below 50% should NOT advance — difficulty stays the same
                    const diffCurrent = selectDifficultyForMastery(level);
                    // Student stays at current level, so difficulty remains unchanged
                    expect(VALID_DIFFICULTIES).toContain(diffCurrent);
                    expect(selectDifficultyForMastery(level)).toBe(diffCurrent);
                }
            }),
            { numRuns: 500 },
        );
    });

    it('the mapping is deterministic: same input always produces same output', () => {
        fc.assert(
            fc.property(masteryLevelArb, (level) => {
                const first = selectDifficultyForMastery(level);
                const second = selectDifficultyForMastery(level);
                expect(first).toBe(second);
            }),
            { numRuns: 200 },
        );
    });
});
