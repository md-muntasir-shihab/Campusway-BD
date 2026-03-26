import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import Exam from '../models/Exam';
import ExamResult from '../models/ExamResult';
import ExamSession from '../models/ExamSession';
import University from '../models/University';
import Notification from '../models/Notification';
import StudentDashboardConfig from '../models/StudentDashboardConfig';
import StudentBadge from '../models/StudentBadge';
import StudentApplication from '../models/StudentApplication';
import StudentDueLedger from '../models/StudentDueLedger';
import UserSubscription from '../models/UserSubscription';
import { getExamCardMetrics } from './examCardMetricsService';
import { getExternalExamAttemptCountsForStudent } from './externalExamAttemptService';
import { getSecurityConfig } from './securityConfigService';

type LeanStudentProfile = Record<string, unknown> & {
    _id: mongoose.Types.ObjectId;
    full_name?: string;
    profile_photo_url?: string;
    profile_completion_percentage?: number;
    user_unique_id?: string;
    phone?: string;
    phone_number?: string;
    guardian_phone?: string;
    ssc_batch?: string;
    hsc_batch?: string;
    department?: string;
    college_name?: string;
    college_address?: string;
    dob?: Date | string;
    groupIds?: mongoose.Types.ObjectId[];
    guardianPhoneVerificationStatus?: 'unverified' | 'pending' | 'verified';
    guardianPhoneVerifiedAt?: Date | string | null;
};

export type ExamCardStatus = 'upcoming' | 'live' | 'completed' | 'closed';

export interface DashboardExamCard {
    _id: string;
    title: string;
    universityNameBn: string;
    subject: string;
    subjectBn: string;
    examDateTime: string;
    startDate: string;
    endDate: string;
    duration: number;
    daysRemaining: number;
    examType: 'mcq_only' | 'written_optional';
    maxAttemptsAllowed: number;
    attemptsUsed: number;
    attemptsLeft: number;
    negativeMarking: boolean;
    negativeMarkValue: number;
    bannerImageUrl: string;
    logoUrl: string;
    groupName: string;
    shareUrl: string;
    totalParticipants: number;
    attemptedUsers: number;
    remainingUsers: number;
    activeUsers: number;
    statusBadge: 'upcoming' | 'live' | 'completed' | 'draft';
    subscriptionRequired?: boolean;
    subscriptionActive?: boolean;
    accessDeniedReason?: string;
    status: ExamCardStatus;
    canTakeExam: boolean;
    externalExamUrl: string;
}

export type StudentLiveAlertType =
    | 'exam_soon'
    | 'application_closing'
    | 'payment_pending'
    | 'result_published';

export interface StudentLiveAlertItem {
    id: string;
    type: StudentLiveAlertType;
    title: string;
    message: string;
    dateIso: string;
    severity: 'info' | 'warning' | 'danger' | 'success';
    ctaLabel: string;
    ctaUrl: string;
}

async function ensureDashboardConfig() {
    let config = await StudentDashboardConfig.findOne().lean();
    if (!config) {
        await StudentDashboardConfig.create({});
        config = await StudentDashboardConfig.findOne().lean();
    }
    return config;
}

function normalizeDepartment(value?: string): string {
    return String(value || '').trim().toLowerCase();
}

function matchFilterList(filterList: unknown, value?: string): boolean {
    const normalizedValue = normalizeDepartment(value);
    const list = Array.isArray(filterList)
        ? filterList.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
        : [];
    if (list.length === 0) return true;
    return list.includes(normalizedValue);
}

function normalizeObjectIdArray(input: unknown): string[] {
    if (!Array.isArray(input)) return [];
    return input
        .map((item) => {
            if (!item) return '';
            if (typeof item === 'string') return item;
            if (typeof item === 'object' && '_id' in (item as Record<string, unknown>)) {
                return String((item as Record<string, unknown>)._id || '');
            }
            return String(item);
        })
        .map((item) => item.trim())
        .filter(Boolean);
}

function hasAnyIntersection(left: string[], right: string[]): boolean {
    if (left.length === 0 || right.length === 0) return false;
    const rightSet = new Set(right);
    return left.some((item) => rightSet.has(item));
}

function toStatus(startDate: Date, endDate: Date, attemptsLeft: number): ExamCardStatus {
    const now = new Date();
    if (attemptsLeft <= 0) return 'closed';
    if (now < startDate) return 'upcoming';
    if (now >= startDate && now <= endDate) return 'live';
    return 'completed';
}

export async function getOverallRankForStudent(studentId: string): Promise<number | null> {
    const board = await ExamResult.aggregate([
        { $match: { status: 'evaluated' } },
        {
            $group: {
                _id: '$student',
                avgPercentage: { $avg: '$percentage' },
                attempts: { $sum: 1 },
                totalObtained: { $sum: '$obtainedMarks' },
            }
        },
        { $sort: { avgPercentage: -1, attempts: -1, totalObtained: -1 } },
    ]);

    const idx = board.findIndex((item) => String(item._id) === String(studentId));
    if (idx === -1) return null;
    return idx + 1;
}

export async function getStudentDashboardHeader(studentId: string) {
    const [user, profile, config, overallRank, security, activeSubscription] = await Promise.all([
        User.findById(studentId).select('_id username email full_name profile_photo subscription').lean(),
        StudentProfile.findOne({ user_id: studentId }).lean() as unknown as Promise<LeanStudentProfile | null>,
        ensureDashboardConfig(),
        getOverallRankForStudent(studentId),
        getSecurityConfig(true),
        UserSubscription.findOne({
            userId: studentId,
            status: 'active',
            expiresAtUTC: { $gt: new Date() },
        })
            .populate('planId', 'name code slug ctaLabel ctaUrl ctaMode')
            .lean(),
    ]);

    if (!user || !profile) {
        throw new Error('Student not found');
    }

    const persistedCompletion = Number(profile.profile_completion_percentage);
    const completion = Number.isFinite(persistedCompletion) ? persistedCompletion : 0;
    const messageTemplate = String(config?.welcomeMessageTemplate || 'স্বাগতম, {{name}}!');
    const welcomeMessage = messageTemplate
        .replace('{{name}}', String(profile.full_name || user.full_name || user.username))
        .replace('{{completion}}', String(completion));

    const persistedSubscription = ((user.subscription as Record<string, unknown> | undefined) || {});
    const activePlan = (activeSubscription?.planId as unknown as Record<string, unknown> | null) || null;
    const expiryDate = activeSubscription?.expiresAtUTC
        ? new Date(activeSubscription.expiresAtUTC).toISOString()
        : (persistedSubscription.expiryDate ? new Date(persistedSubscription.expiryDate as string | Date).toISOString() : null);
    const expiryTime = expiryDate ? new Date(expiryDate).getTime() : 0;
    const subscriptionIsActive = Boolean(
        activeSubscription || (
            persistedSubscription.isActive &&
            Number.isFinite(expiryTime) &&
            expiryTime > Date.now()
        )
    );
    const subscription = {
        isActive: subscriptionIsActive,
        planId: activeSubscription?.planId ? String(activeSubscription.planId) : String(persistedSubscription.planId || ''),
        planSlug: String(activePlan?.slug || persistedSubscription.planSlug || ''),
        planCode: String(activePlan?.code || persistedSubscription.planCode || persistedSubscription.plan || ''),
        planName: String(activePlan?.name || persistedSubscription.planName || persistedSubscription.plan || ''),
        expiryDate,
        daysLeft: expiryDate
            ? Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000))
            : null,
        ctaLabel: String(activePlan?.ctaLabel || persistedSubscription.ctaLabel || (subscriptionIsActive ? 'Renew Plan' : 'View Plans')),
        ctaUrl: String(activePlan?.ctaUrl || persistedSubscription.ctaUrl || '/subscription-plans'),
        ctaMode: String(activePlan?.ctaMode || persistedSubscription.ctaMode || 'contact'),
    };

    // Calculate Group Rank if student is in any groups
    let groupRank: number | null = null;
    if (profile?.groupIds && Array.isArray(profile.groupIds) && profile.groupIds.length > 0) {
        const groupId = profile.groupIds[0];
        const groupBoard = await ExamResult.aggregate([
            { $match: { status: 'evaluated' } },
            {
                $lookup: {
                    from: 'studentprofiles',
                    localField: 'student',
                    foreignField: 'user_id',
                    as: 'studentProfile'
                }
            },
            { $match: { 'studentProfile.groupIds': groupId } },
            {
                $group: {
                    _id: '$student',
                    avgPercentage: { $avg: '$percentage' }
                }
            },
            { $sort: { avgPercentage: -1 } }
        ]);
        const gIdx = groupBoard.findIndex(item => String(item._id) === String(studentId));
        if (gIdx !== -1) groupRank = gIdx + 1;
    }

    const profileThreshold = security.examProtection.requireProfileScoreForExam
        ? Number(security.examProtection.profileScoreThreshold || 70)
        : Number(config?.profileCompletionThreshold || 70);

    return {
        userId: String(user._id),
        userUniqueId: profile.user_unique_id || '',
        name: profile.full_name || user.full_name || user.username,
        email: user.email,
        profilePicture: profile.profile_photo_url || (user as Record<string, unknown>).profile_photo || '',
        profileCompletionPercentage: completion,
        profileCompletionThreshold: profileThreshold,
        isProfileEligible: completion >= profileThreshold,
        overallRank,
        groupRank,
        welcomeMessage,
        subscription,
        guardian_phone_verification_status: profile.guardianPhoneVerificationStatus || 'unverified',
        guardian_phone_verified_at: profile.guardianPhoneVerifiedAt || null,
        profile: {
            phone: profile.phone || profile.phone_number || '',
            guardian_phone: profile.guardian_phone || '',
            ssc_batch: profile.ssc_batch || '',
            hsc_batch: profile.hsc_batch || '',
            department: profile.department || '',
            college_name: profile.college_name || '',
            college_address: profile.college_address || '',
            dob: profile.dob || null,
        },
        missingFields: ((): string[] => {
            const missing: string[] = [];
            if (!profile.profile_photo_url && !(user as Record<string, unknown>).profile_photo) missing.push('Profile Photo');
            if (!profile.phone && !profile.phone_number) missing.push('Phone Number');
            if (!profile.guardian_phone) missing.push('Guardian Phone');
            if (!profile.dob) missing.push('Date of Birth');
            if (!profile.ssc_batch) missing.push('SSC Batch');
            if (!profile.hsc_batch) missing.push('HSC Batch');
            if (!profile.department) missing.push('Department');
            if (!profile.college_name) missing.push('College Name');
            return missing;
        })(),
        config: {
            enableRealtime: Boolean(config?.enableRealtime),
            enableDeviceLock: Boolean(config?.enableDeviceLock),
            enableCheatFlags: Boolean(config?.enableCheatFlags),
            enableBadges: Boolean(config?.enableBadges),
            enableProgressCharts: Boolean(config?.enableProgressCharts),
            featuredOrderingMode: (config?.featuredOrderingMode as 'manual' | 'adaptive') || 'manual',
        },
        lastUpdatedAt: new Date().toISOString(),
    };
}

export async function getUpcomingExamCards(studentId: string): Promise<DashboardExamCard[]> {
    const [profile, config, user, activeSubscription, exams, results, activeSessions, security] = await Promise.all([
        StudentProfile.findOne({ user_id: studentId }).lean() as unknown as Promise<LeanStudentProfile | null>,
        ensureDashboardConfig(),
        User.findById(studentId).select('subscription').lean(),
        UserSubscription.findOne({
            userId: studentId,
            status: 'active',
            expiresAtUTC: { $gt: new Date() },
        })
            .populate('planId', 'code')
            .lean(),
        Exam.find({ isPublished: true }).sort({ startDate: 1 }).lean(),
        ExamResult.find({ student: studentId }).select('exam attemptNo').lean(),
        ExamSession.find({ student: studentId, isActive: true }).select('exam sessionLocked').lean(),
        getSecurityConfig(true),
    ]);

    if (!profile) return [];

    const completion = Number(profile.profile_completion_percentage || 0);
    const threshold = security.examProtection.requireProfileScoreForExam
        ? Number(security.examProtection.profileScoreThreshold || 70)
        : Number(config?.profileCompletionThreshold || 70);
    const now = new Date();
    const activePlan = activeSubscription?.planId as unknown as Record<string, unknown> | null;
    const studentGroupIds = Array.isArray(profile.groupIds) ? profile.groupIds.map((id) => String(id)) : [];
    const studentPlanCode = String(
        activePlan?.code ||
        (user?.subscription as Record<string, unknown> | undefined)?.planCode ||
        (user?.subscription as Record<string, unknown> | undefined)?.plan ||
        '',
    ).toLowerCase();
    const subscriptionExpiryTime = activeSubscription?.expiresAtUTC
        ? new Date(activeSubscription.expiresAtUTC).getTime()
        : ((user?.subscription as Record<string, unknown> | undefined)?.expiryDate
            ? new Date(String((user?.subscription as Record<string, unknown> | undefined)?.expiryDate)).getTime()
            : 0);
    const subscriptionActive = Boolean(
        activeSubscription
        || (
            (user?.subscription as Record<string, unknown> | undefined)?.isActive &&
            Number.isFinite(subscriptionExpiryTime) &&
            subscriptionExpiryTime > Date.now()
        )
    );
    const examIds = exams.map((exam) => String(exam._id || '')).filter(Boolean);
    const [metricsMap, externalAttemptCountMap] = await Promise.all([
        getExamCardMetrics(exams as unknown as Array<Record<string, unknown>>),
        getExternalExamAttemptCountsForStudent(studentId, examIds),
    ]);
    const resultCounts = new Map<string, number>();
    for (const r of results) {
        const examId = String(r.exam);
        resultCounts.set(examId, (resultCounts.get(examId) || 0) + 1);
    }
    for (const [examId, count] of externalAttemptCountMap.entries()) {
        resultCounts.set(examId, Math.max(Number(resultCounts.get(examId) || 0), Number(count || 0)));
    }

    const lockedExamSet = new Set(
        activeSessions
            .filter((s) => Boolean((s as Record<string, unknown>).sessionLocked))
            .map((s) => String(s.exam))
    );

    const cards: DashboardExamCard[] = [];
    for (const exam of exams) {
        const examId = String(exam._id);
        if (exam.accessMode === 'specific') {
            const allowedUsers = Array.isArray(exam.allowedUsers) ? exam.allowedUsers : [];
            const allowed = allowedUsers.some((id: mongoose.Types.ObjectId) => String(id) === String(studentId));
            if (!allowed) continue;
        }
        if (!matchFilterList((exam as Record<string, unknown>).branchFilters, profile.department)) continue;
        if (!matchFilterList((exam as Record<string, unknown>).batchFilters, profile.hsc_batch as string)) continue;

        const startDate = new Date(exam.startDate);
        const endDate = new Date(exam.endDate);
        const attemptsUsed = resultCounts.get(examId) || 0;
        const attemptLimit = Number(exam.attemptLimit || 1);
        const attemptsLeft = Math.max(0, attemptLimit - attemptsUsed);
        let status = toStatus(startDate, endDate, attemptsLeft);

        // Auto-hide completed/expired from the upcoming stream.
        if (status === 'completed' && !exam.externalExamUrl) continue;

        const sessionLocked = lockedExamSet.has(examId);
        if (sessionLocked) status = 'closed';
        const accessControl = (exam.accessControl && typeof exam.accessControl === 'object')
            ? (exam.accessControl as Record<string, unknown>)
            : {};
        const requiredUserIds = normalizeObjectIdArray(accessControl.allowedUserIds);
        const requiredGroupIds = normalizeObjectIdArray(accessControl.allowedGroupIds);
        const requiredPlanCodes = Array.isArray(accessControl.allowedPlanCodes)
            ? (accessControl.allowedPlanCodes as unknown[]).map((code) => String(code).toLowerCase())
            : [];
        const visibilityMode = String((exam as Record<string, unknown>).visibilityMode || 'all_students');
        const targetGroupIds = normalizeObjectIdArray((exam as Record<string, unknown>).targetGroupIds || []);
        const subscriptionRequired = Boolean((exam as Record<string, unknown>).subscriptionRequired)
            || Boolean((exam as Record<string, unknown>).requiresActiveSubscription)
            || visibilityMode === 'subscription_only'
            || requiredPlanCodes.length > 0;
        let accessDeniedReason = '';
        if (requiredUserIds.length > 0 && !requiredUserIds.includes(String(studentId))) {
            accessDeniedReason = 'access_user_restricted';
        } else if (requiredGroupIds.length > 0 && !hasAnyIntersection(requiredGroupIds, studentGroupIds)) {
            accessDeniedReason = 'access_group_restricted';
        } else if ((visibilityMode === 'group_only' || visibilityMode === 'custom')
            && targetGroupIds.length > 0
            && !hasAnyIntersection(targetGroupIds, studentGroupIds)) {
            accessDeniedReason = 'access_group_restricted';
        } else if (requiredPlanCodes.length > 0 && !requiredPlanCodes.includes(studentPlanCode)) {
            accessDeniedReason = 'access_plan_restricted';
        } else if (subscriptionRequired && !subscriptionActive) {
            accessDeniedReason = 'subscription_required';
        }
        const metrics = metricsMap.get(examId) || {
            totalParticipants: 0,
            attemptedUsers: 0,
            remainingUsers: 0,
            activeUsers: 0,
        };
        const canTakeExam = (
            !sessionLocked &&
            !accessDeniedReason &&
            completion >= threshold &&
            attemptsLeft > 0 &&
            status === 'live'
        );

        cards.push({
            _id: examId,
            title: exam.title,
            universityNameBn: String((exam as Record<string, unknown>).universityNameBn || exam.title),
            subject: String(exam.subject || ''),
            subjectBn: String((exam as Record<string, unknown>).subjectBn || exam.subject || ''),
            examDateTime: startDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            duration: Number(exam.duration || 0),
            daysRemaining: Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / 86400000)),
            examType: ((exam as Record<string, unknown>).examType as 'mcq_only' | 'written_optional') || 'mcq_only',
            maxAttemptsAllowed: attemptLimit,
            attemptsUsed,
            attemptsLeft,
            negativeMarking: Boolean(exam.negativeMarking),
            negativeMarkValue: Number(exam.negativeMarkValue || 0),
            bannerImageUrl: String(exam.bannerImageUrl || ''),
            logoUrl: String((exam as Record<string, unknown>).logoUrl || ''),
            groupName: String((exam as Record<string, unknown>).group_category || 'Custom'),
            shareUrl: (exam as Record<string, unknown>).share_link ? `/exam/take/${String((exam as Record<string, unknown>).share_link)}` : '',
            totalParticipants: Number(metrics.totalParticipants || 0),
            attemptedUsers: Number(metrics.attemptedUsers || 0),
            remainingUsers: Number(metrics.remainingUsers || 0),
            activeUsers: Number(metrics.activeUsers || 0),
            statusBadge: status === 'closed' ? 'draft' : (status === 'completed' ? 'completed' : status),
            subscriptionRequired,
            subscriptionActive,
            accessDeniedReason: accessDeniedReason || undefined,
            status,
            canTakeExam,
            externalExamUrl: String(exam.externalExamUrl || ''),
        });
    }

    cards.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    return cards;
}

export async function getFeaturedUniversities() {
    const [config, rows] = await Promise.all([
        ensureDashboardConfig(),
        University.find({ isActive: true, featured: true })
            .sort({ featuredOrder: 1, name: 1 })
            .select('name shortDescription logoUrl slug featuredOrder')
            .lean(),
    ]);

    const orderingMode = (config?.featuredOrderingMode as 'manual' | 'adaptive') || 'manual';

    let sortedRows = [...rows];
    if (orderingMode === 'adaptive' && rows.length > 0) {
        const applicationStats = await StudentApplication.aggregate([
            {
                $group: {
                    _id: '$university_id',
                    applicationCount: { $sum: 1 },
                    lastAppliedAt: { $max: '$createdAt' },
                }
            }
        ]);

        const scoreByUniversity = new Map<string, { applicationCount: number; lastAppliedAt: number }>();
        for (const stat of applicationStats) {
            scoreByUniversity.set(String(stat._id), {
                applicationCount: Number(stat.applicationCount || 0),
                lastAppliedAt: stat.lastAppliedAt ? new Date(stat.lastAppliedAt).getTime() : 0,
            });
        }

        const hasSignal = rows.some((row) => (scoreByUniversity.get(String(row._id))?.applicationCount || 0) > 0);
        if (hasSignal) {
            sortedRows = [...rows].sort((a, b) => {
                const aScore = scoreByUniversity.get(String(a._id)) || { applicationCount: 0, lastAppliedAt: 0 };
                const bScore = scoreByUniversity.get(String(b._id)) || { applicationCount: 0, lastAppliedAt: 0 };
                if (bScore.applicationCount !== aScore.applicationCount) {
                    return bScore.applicationCount - aScore.applicationCount;
                }
                if (bScore.lastAppliedAt !== aScore.lastAppliedAt) {
                    return bScore.lastAppliedAt - aScore.lastAppliedAt;
                }
                const aOrder = Number(a.featuredOrder || 0);
                const bOrder = Number(b.featuredOrder || 0);
                if (aOrder !== bOrder) return aOrder - bOrder;
                return String(a.name || '').localeCompare(String(b.name || ''));
            });
        }
    }

    return {
        items: sortedRows.map((u) => ({
            _id: String(u._id),
            name: u.name,
            shortDescription: u.shortDescription || '',
            logoUrl: u.logoUrl || '',
            slug: u.slug,
            featuredOrder: Number(u.featuredOrder || 0),
            link: `/university/${u.slug}`,
        })),
        lastUpdatedAt: new Date().toISOString(),
    };
}

export async function getStudentNotifications(studentId: string) {
    const now = new Date();
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const rows = await Notification.find({
        isActive: true,
        targetRole: { $in: ['student', 'all'] },
        $or: [
            { targetUserIds: { $exists: false } },
            { targetUserIds: { $size: 0 } },
            { targetUserIds: studentObjectId },
        ],
        $and: [
            { $or: [{ publishAt: { $exists: false } }, { publishAt: null }, { publishAt: { $lte: now } }] },
            { $or: [{ expireAt: { $exists: false } }, { expireAt: null }, { expireAt: { $gte: now } }] },
        ]
    }).sort({ publishAt: -1, createdAt: -1 }).lean();

    return {
        items: rows.map((n) => ({
            _id: String(n._id),
            title: n.title,
            message: n.message,
            category: n.category,
            publishAt: n.publishAt || n.createdAt,
            expireAt: n.expireAt || null,
            linkUrl: n.linkUrl || '',
            attachmentUrl: n.attachmentUrl || '',
        })),
        lastUpdatedAt: now.toISOString(),
    };
}

export async function getExamHistoryAndProgress(studentId: string) {
    const [results, badges] = await Promise.all([
        ExamResult.find({ student: studentId })
            .populate({ path: 'exam', select: 'title subject subjectBn resultPublishDate totalMarks bannerImageUrl' })
            .sort({ submittedAt: -1 })
            .lean(),
        StudentBadge.find({ student: studentId }).populate({ path: 'badge', select: 'code title description iconUrl' }).sort({ awardedAt: -1 }).lean(),
    ]);

    const history = results.map((r) => {
        const exam = (r.exam as unknown as Record<string, unknown>) || {};
        const writtenUploads = Array.isArray(r.answers)
            ? r.answers
                .map((ans) => (ans as Record<string, unknown>).writtenAnswerUrl)
                .filter(Boolean)
            : [];
        return {
            resultId: String(r._id),
            examId: String(exam._id || r.exam),
            examTitle: String(exam.title || 'Untitled Exam'),
            subject: String((exam as Record<string, unknown>).subjectBn || exam.subject || ''),
            obtainedMarks: r.obtainedMarks,
            totalMarks: r.totalMarks,
            percentage: r.percentage,
            rank: r.rank || null,
            submittedAt: r.submittedAt,
            attemptNo: Number((r as Record<string, unknown>).attemptNo || 1),
            status: (r as Record<string, unknown>).status || 'evaluated',
            writtenUploads,
        };
    });

    const total = history.length;
    const avgScore = total ? Number((history.reduce((sum, x) => sum + Number(x.percentage || 0), 0) / total).toFixed(2)) : 0;
    const bestScore = total ? Math.max(...history.map((x) => Number(x.percentage || 0))) : 0;

    // Identify Weakness: Average score per subject
    const subjectStats: Record<string, { total: number; count: number }> = {};
    for (const h of history) {
        if (!h.subject) continue;
        if (!subjectStats[h.subject]) subjectStats[h.subject] = { total: 0, count: 0 };
        subjectStats[h.subject].total += h.percentage;
        subjectStats[h.subject].count += 1;
    }
    const weaknesses = Object.entries(subjectStats)
        .map(([subject, stats]) => ({ subject, avg: stats.total / stats.count }))
        .filter(s => s.avg < 50) // Threshold for weakness
        .sort((a, b) => a.avg - b.avg)
        .slice(0, 3); // Top 3 weaknesses

    const chart = history
        .slice()
        .reverse()
        .map((item, index) => ({
            x: index + 1,
            label: item.examTitle,
            percentage: item.percentage,
            submittedAt: item.submittedAt,
        }));

    return {
        history,
        progress: {
            totalExams: total,
            avgScore,
            bestScore,
            weaknesses,
            chart,
        },
        badges: badges.map((item) => {
            const badge = (item.badge as unknown as Record<string, unknown>) || {};
            return {
                _id: String(item._id),
                code: String(badge.code || ''),
                title: String(badge.title || ''),
                description: String(badge.description || ''),
                iconUrl: String(badge.iconUrl || ''),
                awardedAt: item.awardedAt,
                source: item.source,
            };
        }),
        lastUpdatedAt: new Date().toISOString(),
    };
}

export async function getStudentDashboardAggregate(studentId: string) {
    const [header, upcomingExams, featuredUniversities, notifications, examHistory] = await Promise.all([
        getStudentDashboardHeader(studentId),
        getUpcomingExamCards(studentId),
        getFeaturedUniversities(),
        getStudentNotifications(studentId),
        getExamHistoryAndProgress(studentId),
    ]);

    return {
        header,
        upcomingExams,
        featuredUniversities: featuredUniversities.items,
        notifications: notifications.items,
        examHistory: examHistory.history,
        progress: examHistory.progress,
        badges: examHistory.badges,
        lastUpdatedAt: new Date().toISOString(),
    };
}

export async function getStudentLiveAlerts(studentId: string): Promise<{ items: StudentLiveAlertItem[]; lastUpdatedAt: string }> {
    const now = new Date();
    const soonWindow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    const [upcomingExams, closingUniversities, dueLedger, recentResults] = await Promise.all([
        Exam.find({
            isPublished: true,
            startDate: { $gte: now, $lte: soonWindow },
        })
            .sort({ startDate: 1 })
            .limit(6)
            .select('_id title subject startDate')
            .lean(),
        University.find({
            isActive: true,
            isArchived: { $ne: true },
            applicationEndDate: { $gte: now, $lte: soonWindow },
        })
            .sort({ applicationEndDate: 1 })
            .limit(6)
            .select('_id name shortForm slug applicationEndDate')
            .lean(),
        StudentDueLedger.findOne({ studentId })
            .select('netDue updatedAt')
            .lean(),
        ExamResult.find({ student: studentId, status: 'evaluated' })
            .sort({ submittedAt: -1 })
            .limit(5)
            .populate({ path: 'exam', select: 'title subject resultPublishDate resultPublishMode' })
            .lean(),
    ]);

    const alerts: StudentLiveAlertItem[] = [];

    for (const exam of upcomingExams) {
        const startDate = exam.startDate ? new Date(exam.startDate) : null;
        if (!startDate || Number.isNaN(startDate.getTime())) continue;
        const diffDays = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        alerts.push({
            id: `exam-soon-${String(exam._id)}`,
            type: 'exam_soon',
            title: String(exam.title || 'Upcoming Exam'),
            message: `${String(exam.subject || 'General')} exam starts in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
            dateIso: startDate.toISOString(),
            severity: diffDays <= 1 ? 'warning' : 'info',
            ctaLabel: 'Open Exams',
            ctaUrl: '/exams',
        });
    }

    for (const university of closingUniversities) {
        const endDate = (university as { applicationEndDate?: Date }).applicationEndDate
            ? new Date((university as { applicationEndDate?: Date }).applicationEndDate as Date)
            : null;
        if (!endDate || Number.isNaN(endDate.getTime())) continue;
        const diffDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
        alerts.push({
            id: `application-closing-${String(university._id)}`,
            type: 'application_closing',
            title: String((university as { name?: string }).name || 'Application Deadline'),
            message: `Application closes in ${diffDays} day${diffDays === 1 ? '' : 's'}.`,
            dateIso: endDate.toISOString(),
            severity: diffDays <= 2 ? 'danger' : 'warning',
            ctaLabel: 'View Universities',
            ctaUrl: '/universities',
        });
    }

    const pendingDueAmount = Number((dueLedger as { netDue?: number } | null)?.netDue || 0);
    if (pendingDueAmount > 0) {
        alerts.push({
            id: 'payment-pending',
            type: 'payment_pending',
            title: 'Payment Pending',
            message: `You have an outstanding due of ৳${pendingDueAmount.toLocaleString()}.`,
            dateIso: new Date((dueLedger as { updatedAt?: Date } | null)?.updatedAt || now).toISOString(),
            severity: 'danger',
            ctaLabel: 'Open Payments',
            ctaUrl: '/payments',
        });
    }

    for (const result of recentResults) {
        const examRaw = result.exam;
        const exam =
            examRaw &&
            typeof examRaw === 'object' &&
            !(examRaw instanceof mongoose.Types.ObjectId)
                ? (examRaw as Record<string, unknown>)
                : {};
        const submittedAt = (result as { submittedAt?: Date }).submittedAt ? new Date((result as { submittedAt?: Date }).submittedAt as Date) : now;
        alerts.push({
            id: `result-published-${String(result._id)}`,
            type: 'result_published',
            title: String(exam.title || 'Result Published'),
            message: `Your latest evaluated result (${Number(result.percentage || 0).toFixed(1)}%) is available.`,
            dateIso: submittedAt.toISOString(),
            severity: 'success',
            ctaLabel: 'View Results',
            ctaUrl: '/results',
        });
    }

    const severityWeight: Record<StudentLiveAlertItem['severity'], number> = {
        danger: 0,
        warning: 1,
        info: 2,
        success: 3,
    };

    alerts.sort((a, b) => {
        if (severityWeight[a.severity] !== severityWeight[b.severity]) {
            return severityWeight[a.severity] - severityWeight[b.severity];
        }
        return new Date(a.dateIso).getTime() - new Date(b.dateIso).getTime();
    });

    return {
        items: alerts.slice(0, 12),
        lastUpdatedAt: now.toISOString(),
    };
}
