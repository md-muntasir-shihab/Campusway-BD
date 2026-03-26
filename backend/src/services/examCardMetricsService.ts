import mongoose from 'mongoose';
import ExamResult from '../models/ExamResult';
import ExamSession from '../models/ExamSession';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import UserSubscription from '../models/UserSubscription';

export type ExamCardMetrics = {
    examId: string;
    totalParticipants: number;
    attemptedUsers: number;
    remainingUsers: number;
    activeUsers: number;
};

type ExamAccessSource = {
    _id?: mongoose.Types.ObjectId | string;
    accessControl?: {
        allowedGroupIds?: Array<mongoose.Types.ObjectId | string>;
        allowedPlanCodes?: string[];
        allowedUserIds?: Array<mongoose.Types.ObjectId | string>;
    };
    allowedUsers?: Array<mongoose.Types.ObjectId | string>;
    allowed_user_ids?: Array<mongoose.Types.ObjectId | string>;
};

type AttemptedAggregateRow = {
    _id: mongoose.Types.ObjectId;
    attemptedUsers: number;
};

type ActiveAggregateRow = {
    _id: mongoose.Types.ObjectId;
    activeUsers: number;
};

function normalizeId(value: unknown): string {
    return String(value || '').trim();
}

function uniqueStringArray(values: unknown[]): string[] {
    const set = new Set<string>();
    for (const value of values) {
        const next = normalizeId(value);
        if (next) set.add(next);
    }
    return Array.from(set);
}

function normalizeObjectIdArray(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return uniqueStringArray(values);
}

function normalizePlanCodes(values: unknown): string[] {
    if (!Array.isArray(values)) return [];
    return Array.from(
        new Set(
            values
                .map((value) => String(value || '').trim().toLowerCase())
                .filter(Boolean),
        ),
    );
}

function intersectSets(base: Set<string>, filter: Set<string>): Set<string> {
    if (base.size === 0 || filter.size === 0) return new Set<string>();
    const next = new Set<string>();
    for (const id of base) {
        if (filter.has(id)) next.add(id);
    }
    return next;
}

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
    return ids
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
}

function getStudentPlanCode(user: Record<string, unknown>): string {
    const subscription = (user.subscription as Record<string, unknown> | undefined) || {};
    return String(subscription.planCode || subscription.plan || '').trim().toLowerCase();
}

function buildSetIndexMap(values: Map<string, Set<string>>, key: string): Set<string> {
    return values.get(key) || new Set<string>();
}

export async function getExamCardMetrics(exams: ExamAccessSource[]): Promise<Map<string, ExamCardMetrics>> {
    const metricMap = new Map<string, ExamCardMetrics>();
    if (!Array.isArray(exams) || exams.length === 0) {
        return metricMap;
    }

    const examIds = uniqueStringArray(exams.map((exam) => normalizeId(exam._id)));
    const examObjectIds = toObjectIds(examIds);
    if (examObjectIds.length === 0) {
        return metricMap;
    }

    const [attemptedRows, activeRows, activeStudents, profiles] = await Promise.all([
        ExamResult.aggregate<AttemptedAggregateRow>([
            { $match: { exam: { $in: examObjectIds } } },
            { $group: { _id: { exam: '$exam', student: '$student' } } },
            { $group: { _id: '$_id.exam', attemptedUsers: { $sum: 1 } } },
        ]),
        ExamSession.aggregate<ActiveAggregateRow>([
            { $match: { exam: { $in: examObjectIds }, isActive: true, status: 'in_progress' } },
            { $group: { _id: { exam: '$exam', student: '$student' } } },
            { $group: { _id: '$_id.exam', activeUsers: { $sum: 1 } } },
        ]),
        User.find({ role: 'student', status: 'active' }).select('_id subscription').lean(),
        StudentProfile.find({}).select('user_id groupIds').lean(),
    ]);

    const attemptedByExam = new Map<string, number>(
        attemptedRows.map((row) => [String(row._id), Number(row.attemptedUsers || 0)]),
    );
    const activeByExam = new Map<string, number>(
        activeRows.map((row) => [String(row._id), Number(row.activeUsers || 0)]),
    );

    const activeStudentIdSet = new Set<string>();
    const planToStudents = new Map<string, Set<string>>();
    const activeStudentIds = (activeStudents as Array<Record<string, unknown>>)
        .map((user) => normalizeId(user._id))
        .filter(Boolean);
    const activeSubscriptions = activeStudentIds.length > 0
        ? await UserSubscription.find({
            userId: { $in: toObjectIds(activeStudentIds) },
            status: 'active',
            expiresAtUTC: { $gt: new Date() },
        })
            .populate('planId', 'code')
            .select('userId planId')
            .lean()
        : [];
    const studentsWithCanonicalPlans = new Set<string>();
    for (const subscription of activeSubscriptions as Array<Record<string, unknown>>) {
        const studentId = normalizeId(subscription.userId);
        const plan = (subscription.planId as Record<string, unknown> | undefined) || {};
        const planCode = String(plan.code || '').trim().toLowerCase();
        if (!studentId || !planCode) continue;
        studentsWithCanonicalPlans.add(studentId);
        if (!planToStudents.has(planCode)) {
            planToStudents.set(planCode, new Set<string>());
        }
        planToStudents.get(planCode)?.add(studentId);
    }
    for (const user of activeStudents as Array<Record<string, unknown>>) {
        const studentId = normalizeId(user._id);
        if (!studentId) continue;
        activeStudentIdSet.add(studentId);
        if (studentsWithCanonicalPlans.has(studentId)) continue;
        const planCode = getStudentPlanCode(user);
        if (!planCode) continue;
        if (!planToStudents.has(planCode)) {
            planToStudents.set(planCode, new Set<string>());
        }
        planToStudents.get(planCode)?.add(studentId);
    }

    const groupToStudents = new Map<string, Set<string>>();
    for (const profile of profiles as Array<Record<string, unknown>>) {
        const studentId = normalizeId(profile.user_id);
        if (!studentId || !activeStudentIdSet.has(studentId)) continue;
        for (const groupId of normalizeObjectIdArray(profile.groupIds)) {
            if (!groupToStudents.has(groupId)) {
                groupToStudents.set(groupId, new Set<string>());
            }
            groupToStudents.get(groupId)?.add(studentId);
        }
    }

    for (const exam of exams) {
        const examId = normalizeId(exam._id);
        if (!examId) continue;

        const allowedUsers = uniqueStringArray([
            ...normalizeObjectIdArray(exam.allowedUsers),
            ...normalizeObjectIdArray(exam.allowed_user_ids),
            ...normalizeObjectIdArray(exam.accessControl?.allowedUserIds),
        ]);
        const allowedGroupIds = normalizeObjectIdArray(exam.accessControl?.allowedGroupIds);
        const allowedPlanCodes = normalizePlanCodes(exam.accessControl?.allowedPlanCodes);

        let eligibleStudents = new Set<string>();

        if (allowedUsers.length > 0) {
            for (const studentId of allowedUsers) {
                if (activeStudentIdSet.has(studentId)) eligibleStudents.add(studentId);
            }
        } else {
            eligibleStudents = new Set(activeStudentIdSet);
        }

        if (allowedGroupIds.length > 0) {
            const groupEligible = new Set<string>();
            for (const groupId of allowedGroupIds) {
                const groupMembers = buildSetIndexMap(groupToStudents, groupId);
                for (const memberId of groupMembers) {
                    groupEligible.add(memberId);
                }
            }
            eligibleStudents = intersectSets(eligibleStudents, groupEligible);
        }

        if (allowedPlanCodes.length > 0) {
            const planEligible = new Set<string>();
            for (const planCode of allowedPlanCodes) {
                const members = buildSetIndexMap(planToStudents, planCode);
                for (const memberId of members) {
                    planEligible.add(memberId);
                }
            }
            eligibleStudents = intersectSets(eligibleStudents, planEligible);
        }

        const totalParticipants = eligibleStudents.size;
        const attemptedUsers = Number(attemptedByExam.get(examId) || 0);
        const activeUsers = Number(activeByExam.get(examId) || 0);
        const remainingUsers = Math.max(totalParticipants - attemptedUsers, 0);

        metricMap.set(examId, {
            examId,
            totalParticipants,
            attemptedUsers,
            remainingUsers,
            activeUsers,
        });
    }

    return metricMap;
}
