/**
 * Dynamic Rule Engine Service
 *
 * Evaluates dynamic group rules against StudentProfile attributes to compute
 * resolved member sets. Supports AND-logic combination of all specified rule
 * fields, rule validation, preview with bounded samples, and membership refresh.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.7
 */
import mongoose, { FilterQuery } from 'mongoose';
import StudentProfile, { IStudentProfile } from '../models/StudentProfile';
import StudentGroup from '../models/StudentGroup';
import GroupMembership from '../models/GroupMembership';

// ─── Interfaces ─────────────────────────────────────────────

export interface DynamicRuleSet {
    batches?: string[];
    sscBatches?: string[];
    departments?: string[];
    statuses?: string[];
    planCodes?: string[];
    planIds?: string[];
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasGuardian?: boolean;
    paymentDue?: boolean;
    renewalThresholdDays?: number;
    profileScoreRange?: { min?: number; max?: number };
}

export interface RuleEvaluationResult {
    matchedCount: number;
    sampleProfiles: Array<{
        _id: string;
        full_name: string;
        phone?: string;
        department?: string;
    }>;
}

export interface RuleValidationResult {
    valid: boolean;
    errors: string[];
}

// ─── Rule Validation ────────────────────────────────────────

/**
 * Validates a DynamicRuleSet for field value correctness.
 * Returns { valid: false, errors: [...] } when any field is invalid.
 */
export function validateRules(rules: DynamicRuleSet): RuleValidationResult {
    const errors: string[] = [];

    // Array fields must be non-empty when specified
    const arrayFields: (keyof DynamicRuleSet)[] = [
        'batches', 'sscBatches', 'departments', 'statuses', 'planCodes', 'planIds',
    ];
    for (const field of arrayFields) {
        const value = rules[field];
        if (value !== undefined && value !== null) {
            if (!Array.isArray(value) || value.length === 0) {
                errors.push(`${field} must be a non-empty array when specified`);
            }
        }
    }

    // renewalThresholdDays must be non-negative
    if (rules.renewalThresholdDays !== undefined && rules.renewalThresholdDays !== null) {
        if (typeof rules.renewalThresholdDays !== 'number' || rules.renewalThresholdDays < 0) {
            errors.push('renewalThresholdDays must be a non-negative number');
        }
    }

    // profileScoreRange validation
    if (rules.profileScoreRange !== undefined && rules.profileScoreRange !== null) {
        const { min, max } = rules.profileScoreRange;

        if (min !== undefined && min !== null && (typeof min !== 'number' || min < 0)) {
            errors.push('profileScoreRange.min must be a non-negative number');
        }
        if (max !== undefined && max !== null && (typeof max !== 'number' || max < 0)) {
            errors.push('profileScoreRange.max must be a non-negative number');
        }
        if (
            min !== undefined && min !== null &&
            max !== undefined && max !== null &&
            typeof min === 'number' && typeof max === 'number' &&
            min > max
        ) {
            errors.push('profileScoreRange.min must be less than or equal to profileScoreRange.max');
        }
    }

    return { valid: errors.length === 0, errors };
}

// ─── Query Builder ──────────────────────────────────────────

/**
 * Converts a DynamicRuleSet into a MongoDB filter using AND logic.
 * Only specified (non-undefined) fields are included in the query.
 *
 * Field mapping to StudentProfile / User:
 * - batches       → StudentProfile.hsc_batch $in
 * - sscBatches    → StudentProfile.ssc_batch $in
 * - departments   → StudentProfile.department $in
 * - statuses      → User.status $in (via aggregation $lookup)
 * - planCodes     → User.subscription.planCode $in
 * - planIds       → User.subscription.planId $in
 * - hasPhone      → StudentProfile.phone $exists & $ne ''
 * - hasEmail      → StudentProfile.email $exists & $ne ''
 * - hasGuardian   → StudentProfile.guardian_phone $exists & $ne ''
 * - paymentDue    → User.subscription.expiryDate <= now
 * - renewalThresholdDays → User.subscription.expiryDate within N days
 * - profileScoreRange → StudentProfile.profile_completion_percentage between min/max
 */
export function buildMatchQuery(rules: DynamicRuleSet): FilterQuery<IStudentProfile> {
    const conditions: FilterQuery<IStudentProfile>[] = [];

    if (rules.batches && rules.batches.length > 0) {
        conditions.push({ hsc_batch: { $in: rules.batches } });
    }

    if (rules.sscBatches && rules.sscBatches.length > 0) {
        conditions.push({ ssc_batch: { $in: rules.sscBatches } });
    }

    if (rules.departments && rules.departments.length > 0) {
        conditions.push({ department: { $in: rules.departments } });
    }

    if (rules.hasPhone === true) {
        conditions.push({ phone: { $exists: true, $ne: null, $nin: [''] } });
    } else if (rules.hasPhone === false) {
        conditions.push({
            $or: [
                { phone: { $exists: false } },
                { phone: null },
                { phone: '' },
            ],
        });
    }

    if (rules.hasEmail === true) {
        conditions.push({ email: { $exists: true, $ne: null, $nin: [''] } });
    } else if (rules.hasEmail === false) {
        conditions.push({
            $or: [
                { email: { $exists: false } },
                { email: null },
                { email: '' },
            ],
        });
    }

    if (rules.hasGuardian === true) {
        conditions.push({ guardian_phone: { $exists: true, $ne: null, $nin: [''] } });
    } else if (rules.hasGuardian === false) {
        conditions.push({
            $or: [
                { guardian_phone: { $exists: false } },
                { guardian_phone: null },
                { guardian_phone: '' },
            ],
        });
    }

    if (rules.profileScoreRange) {
        const { min, max } = rules.profileScoreRange;
        if (min !== undefined && min !== null) {
            conditions.push({ profile_completion_percentage: { $gte: min } });
        }
        if (max !== undefined && max !== null) {
            conditions.push({ profile_completion_percentage: { $lte: max } });
        }
    }

    // Return combined AND filter, or empty filter if no conditions
    if (conditions.length === 0) {
        return {};
    }
    if (conditions.length === 1) {
        return conditions[0];
    }
    return { $and: conditions };
}

// ─── Rule Evaluation ────────────────────────────────────────

/**
 * Builds an aggregation pipeline that handles fields requiring User $lookup
 * (statuses, planCodes, planIds, paymentDue, renewalThresholdDays).
 * Returns the pipeline stages needed before the final match.
 */
function buildAggregationPipeline(rules: DynamicRuleSet): mongoose.PipelineStage[] {
    const pipeline: mongoose.PipelineStage[] = [];
    const needsUserLookup =
        (rules.statuses && rules.statuses.length > 0) ||
        (rules.planCodes && rules.planCodes.length > 0) ||
        (rules.planIds && rules.planIds.length > 0) ||
        rules.paymentDue !== undefined ||
        rules.renewalThresholdDays !== undefined;

    // Base match from profile-level fields
    const profileMatch = buildMatchQuery(rules);
    if (Object.keys(profileMatch).length > 0) {
        pipeline.push({ $match: profileMatch });
    }

    if (needsUserLookup) {
        // Join with User collection to access subscription and status fields
        pipeline.push({
            $lookup: {
                from: 'users',
                localField: 'user_id',
                foreignField: '_id',
                as: '_user',
            },
        });
        pipeline.push({ $unwind: { path: '$_user', preserveNullAndEmptyArrays: false } });

        const userConditions: Record<string, unknown>[] = [];

        if (rules.statuses && rules.statuses.length > 0) {
            userConditions.push({ '_user.status': { $in: rules.statuses } });
        }

        if (rules.planCodes && rules.planCodes.length > 0) {
            userConditions.push({ '_user.subscription.planCode': { $in: rules.planCodes } });
        }

        if (rules.planIds && rules.planIds.length > 0) {
            const objectIds = rules.planIds.map(id => new mongoose.Types.ObjectId(id));
            userConditions.push({ '_user.subscription.planId': { $in: objectIds } });
        }

        if (rules.paymentDue === true) {
            userConditions.push({
                '_user.subscription.expiryDate': { $lte: new Date() },
            });
        } else if (rules.paymentDue === false) {
            userConditions.push({
                '_user.subscription.expiryDate': { $gt: new Date() },
            });
        }

        if (rules.renewalThresholdDays !== undefined && rules.renewalThresholdDays >= 0) {
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() + rules.renewalThresholdDays);
            userConditions.push({
                '_user.subscription.expiryDate': { $lte: thresholdDate },
            });
        }

        if (userConditions.length > 0) {
            pipeline.push({
                $match: userConditions.length === 1 ? userConditions[0] : { $and: userConditions },
            });
        }
    }

    return pipeline;
}

/**
 * Evaluates rules against StudentProfiles and returns matched count + sample.
 * Sample is limited to 10 profiles, with a 3-second timeout.
 */
export async function evaluateRules(rules: DynamicRuleSet): Promise<RuleEvaluationResult> {
    const pipeline = buildAggregationPipeline(rules);

    // Count pipeline
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Sample pipeline — limit to 10, project only needed fields
    const samplePipeline = [
        ...pipeline,
        { $limit: 10 },
        {
            $project: {
                _id: 1,
                full_name: 1,
                phone: 1,
                department: 1,
            },
        },
    ];

    const [countResult, sampleResult] = await Promise.all([
        StudentProfile.aggregate(countPipeline).option({ maxTimeMS: 3000 }),
        StudentProfile.aggregate(samplePipeline).option({ maxTimeMS: 3000 }),
    ]);

    const matchedCount = countResult.length > 0 ? countResult[0].total : 0;

    return {
        matchedCount,
        sampleProfiles: sampleResult.map((p: Record<string, unknown>) => ({
            _id: String(p._id),
            full_name: String(p.full_name || ''),
            phone: p.phone ? String(p.phone) : undefined,
            department: p.department ? String(p.department) : undefined,
        })),
    };
}

// ─── Dynamic Group Refresh ──────────────────────────────────

/**
 * Refreshes a dynamic group's membership by comparing current GroupMembership
 * records against the rule evaluation result.
 *
 * - Adds memberships for profiles that match rules but aren't members
 * - Removes memberships for profiles that no longer match rules
 * - Updates memberCountCached on the StudentGroup document
 *
 * Returns { added, removed } counts.
 */
export async function refreshDynamicGroup(
    groupId: string
): Promise<{ added: number; removed: number }> {
    const gid = new mongoose.Types.ObjectId(groupId);

    // Fetch the group and validate it's dynamic
    const group = await StudentGroup.findById(gid);
    if (!group) {
        throw new Error(`Group not found: ${groupId}`);
    }
    if (group.type !== 'dynamic') {
        throw new Error(`Group ${groupId} is not a dynamic group`);
    }
    if (!group.rules) {
        throw new Error(`Group ${groupId} has no rules defined`);
    }

    const rules: DynamicRuleSet = group.rules;

    // Get all matching profile user_ids via aggregation
    const pipeline = buildAggregationPipeline(rules);
    pipeline.push({ $project: { user_id: 1 } });

    const matchedProfiles = await StudentProfile.aggregate(pipeline).option({ maxTimeMS: 10000 });
    const matchedUserIds = new Set(
        matchedProfiles.map((p: { user_id: mongoose.Types.ObjectId }) => p.user_id.toString())
    );

    // Get current active memberships for this group
    const currentMemberships = await GroupMembership.find({
        groupId: gid,
        membershipStatus: 'active',
    }).select('studentId').lean();

    const currentMemberIds = new Set(
        currentMemberships.map(m => m.studentId.toString())
    );

    // Compute diff
    const toAdd = [...matchedUserIds].filter(id => !currentMemberIds.has(id));
    const toRemove = [...currentMemberIds].filter(id => !matchedUserIds.has(id));

    let added = 0;
    let removed = 0;

    // Add new memberships in bulk
    if (toAdd.length > 0) {
        const newMemberships = toAdd.map(studentId => ({
            groupId: gid,
            studentId: new mongoose.Types.ObjectId(studentId),
            membershipStatus: 'active' as const,
            joinedAtUTC: new Date(),
            note: 'Added by dynamic rule engine',
        }));

        // Use insertMany with ordered: false to skip duplicates
        try {
            const result = await GroupMembership.insertMany(newMemberships, { ordered: false });
            added = result.length;
        } catch (err: unknown) {
            // Handle duplicate key errors — count successful inserts
            if (err && typeof err === 'object' && 'insertedDocs' in err) {
                added = (err as { insertedDocs: unknown[] }).insertedDocs.length;
            }
        }

        // Sync profile groupIds for added members
        if (added > 0) {
            await StudentProfile.updateMany(
                { user_id: { $in: toAdd.map(id => new mongoose.Types.ObjectId(id)) } },
                { $addToSet: { groupIds: gid } }
            );
        }
    }

    // Remove memberships that no longer match
    if (toRemove.length > 0) {
        const removeResult = await GroupMembership.updateMany(
            {
                groupId: gid,
                studentId: { $in: toRemove.map(id => new mongoose.Types.ObjectId(id)) },
                membershipStatus: 'active',
            },
            {
                $set: {
                    membershipStatus: 'removed',
                    removedAtUTC: new Date(),
                    note: 'Removed by dynamic rule engine — no longer matches rules',
                },
            }
        );
        removed = removeResult.modifiedCount;

        // Sync profile groupIds for removed members
        await StudentProfile.updateMany(
            { user_id: { $in: toRemove.map(id => new mongoose.Types.ObjectId(id)) } },
            { $pull: { groupIds: gid } }
        );
    }

    // Update cached member count
    const activeCount = await GroupMembership.countDocuments({
        groupId: gid,
        membershipStatus: 'active',
    });
    await StudentGroup.updateOne(
        { _id: gid },
        { $set: { memberCountCached: activeCount, studentCount: activeCount } }
    );

    return { added, removed };
}
