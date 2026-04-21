import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { isValidFooterLink } from '../controllers/homeSettingsAdminController';

/**
 * Feature: legal-pages-footer-founder, Property 7: Footer link validation
 *
 * Validates: Requirements 7.3
 *
 * For any link entry, the footer configuration validation SHALL accept it if and only if
 * the label is a non-empty string (after trimming) AND the URL is either a valid relative
 * path (starting with `/`) or a valid absolute URL (starting with `http://` or `https://`).
 * All other entries SHALL be rejected.
 */

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Non-empty label (after trimming) */
const validLabelArb = fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0);

/** Valid relative URL starting with `/` */
const relativeUrlArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .map((s) => '/' + s.replace(/\s/g, ''));

/** Valid absolute URL starting with `http://` */
const httpUrlArb = fc
    .webUrl({ withFragments: false, withQueryParameters: false })
    .filter((u) => u.startsWith('http://'));

/** Valid absolute URL starting with `https://` */
const httpsUrlArb = fc
    .webUrl({ withFragments: false, withQueryParameters: false })
    .filter((u) => u.startsWith('https://'));

/** Any valid URL (relative or absolute) */
const validUrlArb = fc.oneof(relativeUrlArb, httpUrlArb, httpsUrlArb);

/** Invalid label: empty or whitespace-only */
const invalidLabelArb = fc.oneof(
    fc.constant(''),
    fc
        .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 })
        .map((chars) => chars.join('')),
);

/** Invalid URL: does not start with `/`, `http://`, or `https://` */
const invalidUrlArb = fc
    .string({ minLength: 1, maxLength: 200 })
    .filter((s) => {
        const trimmed = s.trim();
        return (
            !trimmed.startsWith('/') &&
            !trimmed.startsWith('http://') &&
            !trimmed.startsWith('https://')
        );
    });

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 7: Footer link validation', () => {
    it('accepts links with non-empty label and valid URL', () => {
        fc.assert(
            fc.property(validLabelArb, validUrlArb, (label, url) => {
                expect(isValidFooterLink({ label, url })).toBe(true);
            }),
            { numRuns: 100 },
        );
    });

    it('rejects links with empty/whitespace-only label', () => {
        fc.assert(
            fc.property(invalidLabelArb, validUrlArb, (label, url) => {
                expect(isValidFooterLink({ label, url })).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('rejects links with invalid URL', () => {
        fc.assert(
            fc.property(validLabelArb, invalidUrlArb, (label, url) => {
                expect(isValidFooterLink({ label, url })).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it('rejects links with both invalid label and invalid URL', () => {
        fc.assert(
            fc.property(invalidLabelArb, invalidUrlArb, (label, url) => {
                expect(isValidFooterLink({ label, url })).toBe(false);
            }),
            { numRuns: 100 },
        );
    });
});
