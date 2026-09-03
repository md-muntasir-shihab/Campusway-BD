/**
 * Regression tests for the university create/update validation schemas.
 *
 * Bug background: validateBody() replaces req.body with the Zod-parsed output,
 * and Zod strips keys that are not declared in the schema. updateUniversitySchema
 * was missing `description` (and several other admin-editable fields), so the
 * admin panel could edit them but the values were silently dropped before
 * reaching adminUpdateUniversity — the public university details page kept
 * showing stale info.
 *
 * These tests pin the contract: every field the admin university form sends and
 * the controller persists must survive schema parsing unchanged.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
    createUniversitySchema,
    updateUniversitySchema,
} from '../validators/university.validator';

/** Fields the admin panel edits that MUST NOT be stripped by the schemas. */
const MUTABLE_FIELDS = [
    'description',
    'establishedYear',
    'isActive',
    'featuredOrder',
    'examCenters',
    'clusterDateOverrides',
    'categorySyncLocked',
    'clusterSyncLocked',
    'unitLayout',
] as const;

type MutableField = (typeof MUTABLE_FIELDS)[number];

/** Arbitrary values per mutable field, matching what the admin form can send. */
const fieldArb: Record<MutableField, fc.Arbitrary<unknown>> = {
    description: fc.string(),
    establishedYear: fc.option(fc.integer({ min: 1800, max: 2100 }), { nil: null }),
    isActive: fc.boolean(),
    featuredOrder: fc.integer({ min: 0, max: 1000 }),
    examCenters: fc.array(
        fc.oneof(
            fc.string(),
            fc.record({ city: fc.string(), address: fc.option(fc.string(), { nil: undefined }) }),
        ),
        { maxLength: 5 },
    ),
    clusterDateOverrides: fc.option(
        fc.record({
            applicationStartDate: fc.option(fc.string(), { nil: null }),
            applicationEndDate: fc.option(fc.string(), { nil: null }),
            scienceExamDate: fc.string(),
            artsExamDate: fc.string(),
            businessExamDate: fc.string(),
        }),
        { nil: null },
    ),
    categorySyncLocked: fc.boolean(),
    clusterSyncLocked: fc.boolean(),
    unitLayout: fc.constantFrom('compact', 'stacked', 'carousel'),
};

describe('University update/create schemas preserve admin-editable fields', () => {
    it('updateUniversitySchema keeps every mutable field for arbitrary payloads', () => {
        fc.assert(
            fc.property(
                fc.record(fieldArb, { withNullPrototype: false }),
                (payload) => {
                    const result = updateUniversitySchema.safeParse(payload);
                    expect(result.success).toBe(true);
                    if (!result.success) return;
                    for (const field of MUTABLE_FIELDS) {
                        expect(result.data[field]).toEqual(payload[field]);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('createUniversitySchema keeps every mutable field for arbitrary payloads', () => {
        fc.assert(
            fc.property(
                fc.record(
                    { ...fieldArb, name: fc.constant('Test University') },
                    { withNullPrototype: false },
                ),
                (payload) => {
                    const result = createUniversitySchema.safeParse(payload);
                    expect(result.success).toBe(true);
                    if (!result.success) return;
                    for (const field of MUTABLE_FIELDS) {
                        expect(result.data[field]).toEqual(payload[field]);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });

    it('specific regression: full description text survives update parsing (the reported bug)', () => {
        const longBengaliDescription = 'ঢাকা বিশ্ববিদ্যালয় বাংলাদেশের ঢাকাতে অবস্থিত একটি পাবলিক বিশ্ববিদ্যালয়। ১৯২১ সালে প্রতিষ্ঠিত।';
        const result = updateUniversitySchema.safeParse({
            name: 'University of Dhaka',
            description: longBengaliDescription,
        });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.description).toBe(longBengaliDescription);
    });

    it('specific regression: description is not stripped when the admin clears it', () => {
        const result = updateUniversitySchema.safeParse({ description: '' });
        expect(result.success).toBe(true);
        if (!result.success) return;
        expect(result.data.description).toBe('');
    });
});
