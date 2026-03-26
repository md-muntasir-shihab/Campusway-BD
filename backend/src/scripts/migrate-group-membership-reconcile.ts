/**
 * Migration: Reconcile group membership across three sources
 *
 * Ensures consistency between:
 *   1. StudentProfile.groupIds  (operational read model)
 *   2. GroupMembership collection (audited write layer)
 *   3. StudentGroup.manualStudents (deprecated, frozen after migration)
 *
 * Safe to run multiple times (idempotent).
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentProfile from '../models/StudentProfile';
import StudentGroup from '../models/StudentGroup';
import GroupMembership from '../models/GroupMembership';

dotenv.config();

interface ReconcileStats {
    profilesScanned: number;
    groupsScanned: number;
    membershipsCreated: number;
    profileGroupIdsAdded: number;
    orphanMembershipsArchived: number;
    cachedCountsFixed: number;
}

async function reconcile(): Promise<ReconcileStats> {
    const stats: ReconcileStats = {
        profilesScanned: 0,
        groupsScanned: 0,
        membershipsCreated: 0,
        profileGroupIdsAdded: 0,
        orphanMembershipsArchived: 0,
        cachedCountsFixed: 0,
    };

    // ──────────────────────────────────────────────
    // Step 1: For every StudentProfile.groupIds entry,
    //         ensure an active GroupMembership exists
    // ──────────────────────────────────────────────
    const profilesCursor = StudentProfile.find({ groupIds: { $exists: true, $ne: [] } })
        .select('user_id groupIds')
        .lean()
        .cursor();

    for await (const profile of profilesCursor) {
        stats.profilesScanned++;
        for (const gid of profile.groupIds ?? []) {
            const exists = await GroupMembership.findOne({
                groupId: gid,
                studentId: profile.user_id,
                membershipStatus: 'active',
            });
            if (!exists) {
                await GroupMembership.create({
                    groupId: gid,
                    studentId: profile.user_id,
                    membershipStatus: 'active',
                    joinedAtUTC: new Date(),
                    note: 'Back-filled by reconciliation migration',
                });
                stats.membershipsCreated++;
            }
        }
    }
    console.log('[reconcile] Step 1 done – profiles→memberships synced.');

    // ──────────────────────────────────────────────
    // Step 2: For every StudentGroup.manualStudents entry,
    //         ensure both GroupMembership + StudentProfile.groupIds
    // ──────────────────────────────────────────────
    const groupsCursor = StudentGroup.find({
        type: 'manual',
        manualStudents: { $exists: true, $ne: [] },
    })
        .select('_id manualStudents')
        .lean()
        .cursor();

    for await (const group of groupsCursor) {
        stats.groupsScanned++;
        for (const sid of group.manualStudents ?? []) {
            // Ensure membership row
            const exists = await GroupMembership.findOne({
                groupId: group._id,
                studentId: sid,
                membershipStatus: 'active',
            });
            if (!exists) {
                await GroupMembership.create({
                    groupId: group._id,
                    studentId: sid,
                    membershipStatus: 'active',
                    joinedAtUTC: new Date(),
                    note: 'Back-filled from manualStudents by reconciliation',
                });
                stats.membershipsCreated++;
            }
            // Ensure profile.groupIds contains this group
            const updated = await StudentProfile.updateOne(
                { user_id: sid, groupIds: { $ne: group._id } },
                { $addToSet: { groupIds: group._id } }
            );
            if (updated.modifiedCount > 0) stats.profileGroupIdsAdded++;
        }
    }
    console.log('[reconcile] Step 2 done – manualStudents→memberships+profiles synced.');

    // ──────────────────────────────────────────────
    // Step 3: For every active GroupMembership,
    //         ensure StudentProfile.groupIds contains the group
    // ──────────────────────────────────────────────
    const membershipCursor = GroupMembership.find({ membershipStatus: 'active' })
        .select('groupId studentId')
        .lean()
        .cursor();

    for await (const m of membershipCursor) {
        const updated = await StudentProfile.updateOne(
            { user_id: m.studentId, groupIds: { $ne: m.groupId } },
            { $addToSet: { groupIds: m.groupId } }
        );
        if (updated.modifiedCount > 0) stats.profileGroupIdsAdded++;
    }
    console.log('[reconcile] Step 3 done – memberships→profiles synced.');

    // ──────────────────────────────────────────────
    // Step 4: Archive orphan memberships
    //         (GroupMembership rows where the group no longer exists or is inactive)
    // ──────────────────────────────────────────────
    const activeGroupIds = (await StudentGroup.find({ isActive: true }).select('_id').lean()).map(g => g._id);
    const archiveResult = await GroupMembership.updateMany(
        { membershipStatus: 'active', groupId: { $nin: activeGroupIds } },
        { $set: { membershipStatus: 'archived', removedAtUTC: new Date(), note: 'Group inactive/deleted — archived by reconciliation' } }
    );
    stats.orphanMembershipsArchived = archiveResult.modifiedCount;
    console.log('[reconcile] Step 4 done – orphan memberships archived:', archiveResult.modifiedCount);

    // ──────────────────────────────────────────────
    // Step 5: Fix cached counts on every active group
    // ──────────────────────────────────────────────
    const allGroups = await StudentGroup.find({ isActive: true }).select('_id memberCountCached').lean();
    for (const g of allGroups) {
        const liveCount = await GroupMembership.countDocuments({ groupId: g._id, membershipStatus: 'active' });
        if (liveCount !== g.memberCountCached) {
            await StudentGroup.updateOne({ _id: g._id }, { $set: { memberCountCached: liveCount, studentCount: liveCount } });
            stats.cachedCountsFixed++;
        }
    }
    console.log('[reconcile] Step 5 done – cached counts fixed:', stats.cachedCountsFixed);

    return stats;
}

async function main() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is required');

    await mongoose.connect(uri);
    console.log('[reconcile] Connected to MongoDB');

    const stats = await reconcile();
    console.log('[reconcile] ✔ Complete', stats);

    await mongoose.disconnect();
}

main().catch(err => {
    console.error('[reconcile] ✘ Failed', err);
    process.exit(1);
});
