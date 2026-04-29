import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { maskDisplayName } from '../services/LeaderboardService';

/**
 * Feature: exam-management-system
 * Property 17: Name Masking for Privacy
 *
 * **Validates: Requirements 8.10**
 *
 * For any student name displayed on a leaderboard (where the student has not
 * opted in to full name display), the displayed name should not contain the
 * student's full last name. It should show at most the first character of the
 * last name followed by a period.
 */

// ─── Generators ──────────────────────────────────────────────────────────────

/** Generate a single non-empty word (no whitespace) with at least 2 chars */
const wordArb = fc
    .stringMatching(/^[A-Za-z\u0980-\u09FF]{2,15}$/)
    .filter((s) => s.length >= 2);

/** Generate a first name (single word, 2-15 chars) */
const firstNameArb = wordArb;

/** Generate a last name (single word, 2-15 chars) */
const lastNameArb = wordArb;

/** Generate a multi-word full name (first + last, possibly with middle names) */
const multiWordNameArb = fc
    .tuple(
        firstNameArb,
        fc.array(wordArb, { minLength: 0, maxLength: 2 }),
        lastNameArb,
    )
    .map(([first, middles, last]) => [first, ...middles, last].join(' '));

/** Generate a single-word name */
const singleWordNameArb = wordArb;

/** Generate empty or whitespace-only strings */
const emptyOrWhitespaceArb = fc.constantFrom('', ' ', '  ', '\t', '\n', '  \t  ');

/** Generate Bengali-style names (multi-word) */
const bengaliNameArb = fc
    .tuple(
        fc.constantFrom('রহিম', 'করিম', 'সালমা', 'ফাতেমা', 'আব্দুল', 'মোহাম্মদ', 'নাসরিন', 'তানভীর'),
        fc.constantFrom('খান', 'আহমেদ', 'হোসেন', 'বেগম', 'রহমান', 'ইসলাম', 'আলী', 'চৌধুরী'),
    )
    .map(([first, last]) => `${first} ${last}`);

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: exam-management-system, Property 17: Name Masking for Privacy', () => {
    it('multi-word names: masked name does NOT contain the full last name', () => {
        fc.assert(
            fc.property(multiWordNameArb, (fullName) => {
                const masked = maskDisplayName(fullName);
                const parts = fullName.trim().split(/\s+/);
                const lastName = parts[parts.length - 1];

                // The masked name should not contain the full last name
                expect(masked).not.toContain(lastName);
            }),
            { numRuns: 200 },
        );
    });

    it('multi-word names: masked name shows firstName + last initial + period', () => {
        fc.assert(
            fc.property(multiWordNameArb, (fullName) => {
                const masked = maskDisplayName(fullName);
                const parts = fullName.trim().split(/\s+/);
                const firstName = parts[0];
                const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();

                // The masked name should be "FirstName X." format
                expect(masked).toBe(`${firstName} ${lastInitial}.`);
            }),
            { numRuns: 200 },
        );
    });

    it('single-word names: masked name equals the original name', () => {
        fc.assert(
            fc.property(singleWordNameArb, (name) => {
                const masked = maskDisplayName(name);

                expect(masked).toBe(name);
            }),
            { numRuns: 200 },
        );
    });

    it('empty or whitespace-only names: returns "Anonymous"', () => {
        fc.assert(
            fc.property(emptyOrWhitespaceArb, (name) => {
                const masked = maskDisplayName(name);

                expect(masked).toBe('Anonymous');
            }),
            { numRuns: 50 },
        );
    });

    it('Bengali multi-word names: masked name does NOT contain the full last name', () => {
        fc.assert(
            fc.property(bengaliNameArb, (fullName) => {
                const masked = maskDisplayName(fullName);
                const parts = fullName.trim().split(/\s+/);
                const lastName = parts[parts.length - 1];

                // The masked name should not contain the full last name
                expect(masked).not.toContain(lastName);

                // Should follow "FirstName X." format
                const firstName = parts[0];
                const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
                expect(masked).toBe(`${firstName} ${lastInitial}.`);
            }),
            { numRuns: 100 },
        );
    });
});
