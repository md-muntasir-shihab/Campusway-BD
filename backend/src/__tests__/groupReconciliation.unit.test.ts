import { describe, it, expect } from 'vitest';

/**
 * Unit test for fix C-1 (group membership dual source of truth).
 *
 * computeGroupMembershipReconciliation is a pure function (no DB) that decides
 * how to make the mirror (StudentProfile.groupIds) and the canonical store
 * (GroupMembership) converge without dropping a legitimately-assigned group.
 *
 * Obligations:
 *   1. Mirror-only group that still EXISTS → materialise canonical membership
 *      (do NOT drop the assignment).
 *   2. Canonical-only group → add to the mirror ($addToSet).
 *   3. Mirror reference to a DELETED group → pull from the mirror (must not
 *      keep granting exam access).
 *   4. Groups present on both sides, or not present at all → no-op.
 *   5. A deleted group that is canonical-only and mirror-only is dropped.
 */
import { computeGroupMembershipReconciliation } from '../utils/groupReconciliation';

describe('computeGroupMembershipReconciliation (fix C-1)', () => {
    it('materialises a mirror-only group that still exists (no data loss)', () => {
        const result = computeGroupMembershipReconciliation({
            mirrorGroupIds: ['g1', 'g2'],
            canonicalActiveGroupIds: ['g1'], // g2 assigned at create, never materialised
            existingGroupIds: new Set(['g1', 'g2']),
        });
        expect(result.toMaterialize).toEqual(['g2']);
        expect(result.toAddToMirror).toEqual([]);
        expect(result.toPullFromMirror).toEqual([]);
    });

    it('adds a canonical-only group to the mirror (rule-engine add)', () => {
        const result = computeGroupMembershipReconciliation({
            mirrorGroupIds: ['g1'],
            canonicalActiveGroupIds: ['g1', 'g3'],
            existingGroupIds: new Set(['g1', 'g3']),
        });
        expect(result.toAddToMirror).toEqual(['g3']);
        expect(result.toMaterialize).toEqual([]);
        expect(result.toPullFromMirror).toEqual([]);
    });

    it('pulls a mirror reference to a deleted group (over-grant fix)', () => {
        const result = computeGroupMembershipReconciliation({
            mirrorGroupIds: ['g1', 'g2'],
            canonicalActiveGroupIds: ['g1'], // g2 was deleted
            existingGroupIds: new Set(['g1']),
        });
        expect(result.toPullFromMirror).toEqual(['g2']);
        expect(result.toMaterialize).toEqual([]);
        expect(result.toAddToMirror).toEqual([]);
    });

    it('leaves groups present on both sides untouched', () => {
        const result = computeGroupMembershipReconciliation({
            mirrorGroupIds: ['g1'],
            canonicalActiveGroupIds: ['g1'],
            existingGroupIds: new Set(['g1']),
        });
        expect(result).toEqual({ toMaterialize: [], toAddToMirror: [], toPullFromMirror: [] });
    });

    it('handles a group on neither side (no-op)', () => {
        const result = computeGroupMembershipReconciliation({
            mirrorGroupIds: [],
            canonicalActiveGroupIds: [],
            existingGroupIds: new Set(['g9']),
        });
        expect(result).toEqual({ toMaterialize: [], toAddToMirror: [], toPullFromMirror: [] });
    });
});
