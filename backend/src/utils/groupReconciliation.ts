/**
 * Pure reconciliation decision logic for the group-membership dual source of
 * truth (fix C-1).
 *
 * `StudentProfile.groupIds` is an operational read model (mirror) and
 * `GroupMembership` is the canonical audited write layer. They can drift:
 *   - a group deleted via the safe-deletion service is soft-removed from
 *     GroupMembership but left in the mirror (over-grants exam access);
 *   - a student created in bulk with a group id writes the mirror but never
 *     creates a GroupMembership row (under-provisions the canonical store);
 *   - a membership added via the rule engine is canonical-only until the
 *     mirror is synced.
 *
 * This function computes, per student, the exact set of writes needed to make
 * the two stores converge to the same set of (still-existing) groups WITHOUT
 * removing a group that was legitimately assigned on one side only. It has no
 * DB access, so it can be unit-tested without mongod.
 *
 * Rule (for each group id in the union of mirror + canonical):
 *   - If the group no longer exists (deleted) and it is in the mirror → pull
 *     it from the mirror (stale reference must not keep granting access).
 *   - If the group exists and is canonical (active) but missing from the
 *     mirror → add it to the mirror.
 *   - If the group exists and is only in the mirror (assigned at creation /
 *     import, never materialised) → create/reactivate a canonical membership
 *     so the canonical store reflects the assignment.
 */

export interface GroupMembershipReconciliation {
    /** groupIds to materialise as canonical GroupMembership (were mirror-only). */
    toMaterialize: string[];
    /** groupIds to $addToSet into StudentProfile.groupIds (canonical-only). */
    toAddToMirror: string[];
    /** groupIds to $pull from StudentProfile.groupIds (group was deleted). */
    toPullFromMirror: string[];
}

export function computeGroupMembershipReconciliation(input: {
    /** groupIds currently stored in StudentProfile.groupIds. */
    mirrorGroupIds: string[];
    /** groupIds with an active membership in GroupMembership. */
    canonicalActiveGroupIds: string[];
    /** set of group ids that still exist as StudentGroup documents. */
    existingGroupIds: Set<string>;
}): GroupMembershipReconciliation {
    const { mirrorGroupIds, canonicalActiveGroupIds, existingGroupIds } = input;

    const mirrorSet = new Set(mirrorGroupIds);
    const canonicalSet = new Set(canonicalActiveGroupIds);

    const toMaterialize: string[] = [];
    const toAddToMirror: string[] = [];
    const toPullFromMirror: string[] = [];

    const allGroupIds = new Set([...mirrorSet, ...canonicalSet]);

    for (const gid of allGroupIds) {
        const exists = existingGroupIds.has(gid);
        const inMirror = mirrorSet.has(gid);
        const inCanonical = canonicalSet.has(gid);

        if (!exists) {
            // Deleted group: a stale mirror reference must not keep granting
            // access. (Canonical rows are already soft-removed by the delete.)
            if (inMirror) toPullFromMirror.push(gid);
            continue;
        }

        if (inCanonical && !inMirror) {
            // Canonical says the student is a member, but the mirror is stale
            // (e.g. a rule-engine add, or an earlier failed sync). Repair it.
            toAddToMirror.push(gid);
        } else if (inMirror && !inCanonical) {
            // Assigned in the mirror (creation/import) but never materialised in
            // the canonical store. Preserve the assignment by materialising it.
            toMaterialize.push(gid);
        }
    }

    return { toMaterialize, toAddToMirror, toPullFromMirror };
}
