/**
 * Centralized Group Membership Service
 *
 * Single source of truth for all group lifecycle and membership mutations.
 * Every controller/route that modifies group membership MUST go through
 * this service to maintain consistency between:
 *   - StudentProfile.groupIds  (operational read model)
 *   - GroupMembership          (audited write layer)
 *   - StudentGroup.memberCountCached (denormalised counter)
 */
import mongoose from 'mongoose';
import StudentGroup, { IStudentGroup } from '../models/StudentGroup';
import GroupMembership, { MembershipStatus } from '../models/GroupMembership';
import StudentProfile from '../models/StudentProfile';

// ─── Types ──────────────────────────────────────────────────

export interface AddMembershipInput {
    groupId: string | mongoose.Types.ObjectId;
    studentId: string | mongoose.Types.ObjectId;
    adminId?: string | mongoose.Types.ObjectId;
    note?: string;
}

export interface RemoveMembershipInput {
    groupId: string | mongoose.Types.ObjectId;
    studentId: string | mongoose.Types.ObjectId;
    adminId?: string | mongoose.Types.ObjectId;
    note?: string;
}

export interface BulkMembershipResult {
    added: number;
    removed: number;
    skipped: number;
    errors: string[];
}

export interface GroupValidationResult {
    valid: boolean;
    group?: IStudentGroup;
    reason?: string;
}

// ─── Validation ─────────────────────────────────────────────

export async function validateGroup(groupId: string | mongoose.Types.ObjectId): Promise<GroupValidationResult> {
    const group = await StudentGroup.findById(groupId);
    if (!group) return { valid: false, reason: 'Group not found' };
    if (!group.isActive) return { valid: false, reason: 'Group is inactive' };
    return { valid: true, group: group as IStudentGroup };
}

export async function validateGroups(groupIds: (string | mongoose.Types.ObjectId)[]): Promise<{
    validIds: mongoose.Types.ObjectId[];
    invalidIds: string[];
}> {
    const activeGroups = await StudentGroup.find({
        _id: { $in: groupIds },
        isActive: true,
    }).select('_id').lean();

    const activeSet = new Set(activeGroups.map(g => g._id.toString()));
    const validIds: mongoose.Types.ObjectId[] = [];
    const invalidIds: string[] = [];

    for (const id of groupIds) {
        const str = id.toString();
        if (activeSet.has(str)) {
            validIds.push(new mongoose.Types.ObjectId(str));
        } else {
            invalidIds.push(str);
        }
    }
    return { validIds, invalidIds };
}

// ─── Single membership mutations ────────────────────────────

export async function addMembership(input: AddMembershipInput): Promise<boolean> {
    const gid = new mongoose.Types.ObjectId(input.groupId.toString());
    const sid = new mongoose.Types.ObjectId(input.studentId.toString());

    // Check if already active
    const existing = await GroupMembership.findOne({
        groupId: gid,
        studentId: sid,
        membershipStatus: 'active',
    });
    if (existing) return false; // already a member

    // Reactivate archived row or create new
    const archived = await GroupMembership.findOneAndUpdate(
        { groupId: gid, studentId: sid, membershipStatus: { $in: ['removed', 'archived'] } },
        {
            $set: {
                membershipStatus: 'active' as MembershipStatus,
                joinedAtUTC: new Date(),
                removedAtUTC: undefined,
                addedByAdminId: input.adminId ? new mongoose.Types.ObjectId(input.adminId.toString()) : undefined,
                note: input.note || '',
            },
        },
        { new: true }
    );

    if (!archived) {
        await GroupMembership.create({
            groupId: gid,
            studentId: sid,
            membershipStatus: 'active',
            joinedAtUTC: new Date(),
            addedByAdminId: input.adminId ? new mongoose.Types.ObjectId(input.adminId.toString()) : undefined,
            note: input.note || '',
        });
    }

    // Sync profile
    await StudentProfile.updateOne(
        { user_id: sid },
        { $addToSet: { groupIds: gid } }
    );

    // Update cached count
    await syncGroupCount(gid);

    return true;
}

export async function removeMembership(input: RemoveMembershipInput): Promise<boolean> {
    const gid = new mongoose.Types.ObjectId(input.groupId.toString());
    const sid = new mongoose.Types.ObjectId(input.studentId.toString());

    const result = await GroupMembership.updateOne(
        { groupId: gid, studentId: sid, membershipStatus: 'active' },
        {
            $set: {
                membershipStatus: 'removed' as MembershipStatus,
                removedAtUTC: new Date(),
                note: input.note || '',
            },
        }
    );

    if (result.modifiedCount === 0) return false;

    // Sync profile
    await StudentProfile.updateOne(
        { user_id: sid },
        { $pull: { groupIds: gid } }
    );

    // Update cached count
    await syncGroupCount(gid);

    return true;
}

// ─── Bulk operations ────────────────────────────────────────

export async function bulkAddMembers(
    groupId: string | mongoose.Types.ObjectId,
    studentIds: (string | mongoose.Types.ObjectId)[],
    adminId?: string | mongoose.Types.ObjectId,
    note?: string
): Promise<BulkMembershipResult> {
    const result: BulkMembershipResult = { added: 0, removed: 0, skipped: 0, errors: [] };

    for (const sid of studentIds) {
        try {
            const added = await addMembership({ groupId, studentId: sid, adminId, note });
            if (added) result.added++;
            else result.skipped++;
        } catch (err: unknown) {
            result.errors.push(`Failed to add ${sid}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return result;
}

export async function bulkRemoveMembers(
    groupId: string | mongoose.Types.ObjectId,
    studentIds: (string | mongoose.Types.ObjectId)[],
    adminId?: string | mongoose.Types.ObjectId,
    note?: string
): Promise<BulkMembershipResult> {
    const result: BulkMembershipResult = { added: 0, removed: 0, skipped: 0, errors: [] };

    for (const sid of studentIds) {
        try {
            const removed = await removeMembership({ groupId, studentId: sid, adminId, note });
            if (removed) result.removed++;
            else result.skipped++;
        } catch (err: unknown) {
            result.errors.push(`Failed to remove ${sid}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return result;
}

/**
 * Set a student's groups to exactly the provided list.
 * Computes diff from current memberships and applies add/remove.
 */
export async function setStudentGroups(
    studentId: string | mongoose.Types.ObjectId,
    desiredGroupIds: (string | mongoose.Types.ObjectId)[],
    adminId?: string | mongoose.Types.ObjectId,
    note?: string
): Promise<{ added: string[]; removed: string[] }> {
    const sid = new mongoose.Types.ObjectId(studentId.toString());
    const desiredSet = new Set(desiredGroupIds.map(id => id.toString()));

    // Current active memberships
    const currentMemberships = await GroupMembership.find({
        studentId: sid,
        membershipStatus: 'active',
    }).select('groupId').lean();

    const currentSet = new Set(currentMemberships.map(m => m.groupId.toString()));

    const toAdd = [...desiredSet].filter(id => !currentSet.has(id));
    const toRemove = [...currentSet].filter(id => !desiredSet.has(id));

    for (const gid of toAdd) {
        await addMembership({ groupId: gid, studentId: sid, adminId, note });
    }
    for (const gid of toRemove) {
        await removeMembership({ groupId: gid, studentId: sid, adminId, note });
    }

    return { added: toAdd, removed: toRemove };
}

/**
 * Move students from one group to another.
 */
export async function moveMembers(
    fromGroupId: string | mongoose.Types.ObjectId,
    toGroupId: string | mongoose.Types.ObjectId,
    studentIds: (string | mongoose.Types.ObjectId)[],
    adminId?: string | mongoose.Types.ObjectId,
    note?: string
): Promise<BulkMembershipResult> {
    const result: BulkMembershipResult = { added: 0, removed: 0, skipped: 0, errors: [] };

    for (const sid of studentIds) {
        try {
            const removed = await removeMembership({ groupId: fromGroupId, studentId: sid, adminId, note: note || 'Moved to another group' });
            if (removed) result.removed++;

            const added = await addMembership({ groupId: toGroupId, studentId: sid, adminId, note: note || 'Moved from another group' });
            if (added) result.added++;
        } catch (err: unknown) {
            result.errors.push(`Failed to move ${sid}: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
    return result;
}

// ─── Count sync ─────────────────────────────────────────────

export async function syncGroupCount(groupId: mongoose.Types.ObjectId): Promise<number> {
    const count = await GroupMembership.countDocuments({ groupId, membershipStatus: 'active' });
    await StudentGroup.updateOne(
        { _id: groupId },
        { $set: { memberCountCached: count, studentCount: count } }
    );
    return count;
}

export async function syncAllGroupCounts(): Promise<number> {
    const groups = await StudentGroup.find({ isActive: true }).select('_id').lean();
    let fixed = 0;
    for (const g of groups) {
        const count = await GroupMembership.countDocuments({ groupId: g._id, membershipStatus: 'active' });
        const result = await StudentGroup.updateOne(
            { _id: g._id, memberCountCached: { $ne: count } },
            { $set: { memberCountCached: count, studentCount: count } }
        );
        if (result.modifiedCount > 0) fixed++;
    }
    return fixed;
}

// ─── Query helpers ──────────────────────────────────────────

export async function getStudentGroupIds(studentId: string | mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> {
    const profile = await StudentProfile.findOne({ user_id: studentId }).select('groupIds').lean();
    return (profile?.groupIds as mongoose.Types.ObjectId[]) ?? [];
}

export async function getGroupMembers(
    groupId: string | mongoose.Types.ObjectId,
    options: { status?: MembershipStatus; skip?: number; limit?: number } = {}
) {
    const { status = 'active', skip = 0, limit = 50 } = options;
    return GroupMembership.find({ groupId, membershipStatus: status })
        .sort({ joinedAtUTC: -1 })
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'full_name email phone')
        .lean();
}

export async function getGroupMemberCount(
    groupId: string | mongoose.Types.ObjectId,
    status: MembershipStatus = 'active'
): Promise<number> {
    return GroupMembership.countDocuments({ groupId, membershipStatus: status });
}

/**
 * Check if deleting a group is safe (not linked to exams, campaigns, etc.)
 */
export async function canDeleteGroup(groupId: string | mongoose.Types.ObjectId): Promise<{
    safe: boolean;
    blockers: string[];
}> {
    const blockers: string[] = [];

    // Check active members
    const memberCount = await GroupMembership.countDocuments({ groupId, membershipStatus: 'active' });
    if (memberCount > 0) {
        blockers.push(`${memberCount} active member(s)`);
    }

    // Check exam references — import lazily to avoid circular deps
    try {
        const Exam = (await import('../models/Exam')).default;
        const examCount = await Exam.countDocuments({
            $or: [
                { 'accessControl.allowedGroupIds': groupId },
                { targetGroupIds: groupId },
            ],
        });
        if (examCount > 0) blockers.push(`${examCount} exam(s) targeting this group`);
    } catch { /* Exam model may not exist yet */ }

    return { safe: blockers.length === 0, blockers };
}
