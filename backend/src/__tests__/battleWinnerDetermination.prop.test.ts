import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { determineBattleWinner } from '../services/BattleEngineService';

/**
 * Feature: exam-management-system
 * Property 29: Battle Winner Determination
 *
 * **Validates: Requirements 21.4**
 *
 * For any completed battle session between two players, the winner should be
 * the player with the higher score. If scores are equal, the winner should be
 * the player who completed in less time. If both score and time are equal,
 * the result should be "draw".
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Score: non-negative integer (0–10 questions, each worth 1 point) */
const scoreArb = fc.integer({ min: 0, max: 10 });

/** Time in milliseconds: non-negative integer (0 to 5 minutes = 300000ms) */
const timeArb = fc.integer({ min: 0, max: 300_000 });

/** Two distinct scores where the first is strictly greater than the second */
const distinctScoresArb = fc
    .tuple(scoreArb, scoreArb)
    .filter(([a, b]) => a !== b)
    .map(([a, b]) => (a > b ? { higher: a, lower: b } : { higher: b, lower: a }));

/** Two distinct times where the first is strictly less than the second */
const distinctTimesArb = fc
    .tuple(timeArb, timeArb)
    .filter(([a, b]) => a !== b)
    .map(([a, b]) => (a < b ? { faster: a, slower: b } : { faster: b, slower: a }));

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 29: Battle Winner Determination', () => {
    it('challenger wins when challengerScore > opponentScore (regardless of time)', () => {
        fc.assert(
            fc.property(distinctScoresArb, timeArb, timeArb, ({ higher, lower }, cTime, oTime) => {
                const result = determineBattleWinner(higher, lower, cTime, oTime);
                expect(result).toBe('challenger_win');
            }),
            { numRuns: 200 },
        );
    });

    it('opponent wins when opponentScore > challengerScore (regardless of time)', () => {
        fc.assert(
            fc.property(distinctScoresArb, timeArb, timeArb, ({ higher, lower }, cTime, oTime) => {
                const result = determineBattleWinner(lower, higher, cTime, oTime);
                expect(result).toBe('opponent_win');
            }),
            { numRuns: 200 },
        );
    });

    it('challenger wins when scores equal and challengerTime < opponentTime', () => {
        fc.assert(
            fc.property(scoreArb, distinctTimesArb, (score, { faster, slower }) => {
                const result = determineBattleWinner(score, score, faster, slower);
                expect(result).toBe('challenger_win');
            }),
            { numRuns: 200 },
        );
    });

    it('opponent wins when scores equal and opponentTime < challengerTime', () => {
        fc.assert(
            fc.property(scoreArb, distinctTimesArb, (score, { faster, slower }) => {
                const result = determineBattleWinner(score, score, slower, faster);
                expect(result).toBe('opponent_win');
            }),
            { numRuns: 200 },
        );
    });

    it('draw when scores equal and times equal', () => {
        fc.assert(
            fc.property(scoreArb, timeArb, (score, time) => {
                const result = determineBattleWinner(score, score, time, time);
                expect(result).toBe('draw');
            }),
            { numRuns: 200 },
        );
    });

    it('result is always one of the three valid values', () => {
        fc.assert(
            fc.property(scoreArb, scoreArb, timeArb, timeArb, (cScore, oScore, cTime, oTime) => {
                const result = determineBattleWinner(cScore, oScore, cTime, oTime);
                expect(['challenger_win', 'opponent_win', 'draw']).toContain(result);
            }),
            { numRuns: 200 },
        );
    });

    it('symmetry: swapping challenger/opponent swaps the result', () => {
        fc.assert(
            fc.property(scoreArb, scoreArb, timeArb, timeArb, (cScore, oScore, cTime, oTime) => {
                const original = determineBattleWinner(cScore, oScore, cTime, oTime);
                const swapped = determineBattleWinner(oScore, cScore, oTime, cTime);

                if (original === 'challenger_win') {
                    expect(swapped).toBe('opponent_win');
                } else if (original === 'opponent_win') {
                    expect(swapped).toBe('challenger_win');
                } else {
                    expect(swapped).toBe('draw');
                }
            }),
            { numRuns: 200 },
        );
    });
});
