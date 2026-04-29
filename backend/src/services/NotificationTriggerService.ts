/**
 * Notification Trigger Service
 *
 * Wires event-driven notification triggers for the exam management system.
 * Each trigger creates a Notification document with appropriate category,
 * priority, type, and targetUserIds. Respects per-student channel preferences.
 *
 * Supported triggers:
 * - exam_published: notify group members when an exam is published
 * - exam_starting_soon: notify group members 30 min before exam start
 * - result_published: notify all participants when results are published
 * - streak_warning: warn student at 8 PM if no activity today
 * - battle_challenge: notify opponent of a new challenge
 * - payment_confirmation: confirm payment to student
 * - routine_reminder: remind student about study routine item
 * - doubt_reply: notify thread creator of a new reply
 *
 * Requirements: 24.1, 24.2, 24.3, 24.6
 */
import mongoose from 'mongoose';
import Notification, {
    type NotificationType,
    type NotificationCategory,
    type NotificationPriority,
} from '../models/Notification';
import GroupMembership from '../models/GroupMembership';
import Exam from '../models/Exam';
import DoubtThread from '../models/DoubtThread';
import StreakRecord from '../models/StreakRecord';
import { triggerWorkflow as triggerNovuWorkflow } from './integrations/notificationHelper';

// ─── Types ──────────────────────────────────────────────────

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'sms';

export interface ChannelPreferences {
    in_app: boolean;
    push: boolean;
    email: boolean;
    sms: boolean;
}

export interface PaymentDetails {
    amount: number;
    method: string;
    transactionId?: string;
    description?: string;
}

export interface RoutineItem {
    subject: string;
    topic?: string;
    goal: string;
}

interface CreateNotificationParams {
    title: string;
    message: string;
    type: NotificationType;
    category: NotificationCategory;
    priority: NotificationPriority;
    targetUserIds: mongoose.Types.ObjectId[];
    sourceType?: string;
    sourceId?: string;
    targetRoute?: string;
    targetEntityId?: string;
    actorUserId?: mongoose.Types.ObjectId;
    dedupeKey?: string;
}

// ─── Helpers ────────────────────────────────────────────────

function toObjectId(id: string | mongoose.Types.ObjectId): mongoose.Types.ObjectId {
    if (typeof id === 'string') {
        return new mongoose.Types.ObjectId(id);
    }
    return id;
}

/**
 * Retrieve per-student channel preferences for a given notification type.
 * Currently returns defaults (all channels enabled) since a dedicated
 * NotificationPreference model does not yet exist. When one is added,
 * this function should query it and merge with defaults.
 *
 * @requirement 24.6 — Respect per-student notification preferences
 */
async function getStudentChannelPreferences(
    _studentId: mongoose.Types.ObjectId,
    _notificationType: NotificationType,
): Promise<ChannelPreferences> {
    // TODO: Query a NotificationPreference collection when available.
    // For now, all channels are enabled by default.
    return {
        in_app: true,
        push: true,
        email: true,
        sms: true,
    };
}

/**
 * Filter target user IDs to only those whose channel preferences include
 * in-app notifications (the primary channel for Notification documents).
 *
 * @requirement 24.6 — Respect per-student notification preferences
 */
async function filterByChannelPreference(
    userIds: mongoose.Types.ObjectId[],
    notificationType: NotificationType,
): Promise<mongoose.Types.ObjectId[]> {
    const results = await Promise.all(
        userIds.map(async (uid) => {
            const prefs = await getStudentChannelPreferences(uid, notificationType);
            return prefs.in_app ? uid : null;
        }),
    );
    return results.filter((uid): uid is mongoose.Types.ObjectId => uid !== null);
}

/**
 * Resolve all active student IDs belonging to the given group IDs.
 */
async function resolveGroupMemberIds(
    groupIds: mongoose.Types.ObjectId[],
): Promise<mongoose.Types.ObjectId[]> {
    if (groupIds.length === 0) return [];

    const memberships = await GroupMembership.find({
        groupId: { $in: groupIds },
        membershipStatus: 'active',
    }).select('studentId').lean();

    // Deduplicate student IDs (a student may belong to multiple groups)
    const seen = new Set<string>();
    const uniqueIds: mongoose.Types.ObjectId[] = [];
    for (const m of memberships) {
        const key = m.studentId.toString();
        if (!seen.has(key)) {
            seen.add(key);
            uniqueIds.push(m.studentId);
        }
    }
    return uniqueIds;
}

/**
 * Create a Notification document with the given parameters.
 */
async function createNotification(params: CreateNotificationParams): Promise<void> {
    if (params.targetUserIds.length === 0) return;

    await Notification.create({
        title: params.title,
        message: params.message,
        type: params.type,
        category: params.category,
        priority: params.priority,
        targetRole: 'student',
        targetUserIds: params.targetUserIds,
        isActive: true,
        sourceType: params.sourceType ?? '',
        sourceId: params.sourceId ?? '',
        targetRoute: params.targetRoute ?? '',
        targetEntityId: params.targetEntityId ?? '',
        actorUserId: params.actorUserId ?? null,
        dedupeKey: params.dedupeKey ?? undefined,
    });

    // Best-effort Novu fan-out (no-op when integration disabled). Each
    // recipient is triggered as an individual subscriber; failures are
    // swallowed so the in-app Notification document remains the source of
    // truth.
    void Promise.all(
        params.targetUserIds.map((uid) =>
            triggerNovuWorkflow(
                params.type,
                { subscriberId: uid.toString() },
                {
                    title: params.title,
                    message: params.message,
                    category: params.category,
                    priority: params.priority,
                    targetRoute: params.targetRoute ?? '',
                    targetEntityId: params.targetEntityId ?? '',
                    sourceType: params.sourceType ?? '',
                    sourceId: params.sourceId ?? '',
                },
            ),
        ),
    ).catch(() => {
        /* swallow — Novu is optional */
    });
}

// ─── Trigger Functions ──────────────────────────────────────

/**
 * Notify all members of the exam's assigned groups when an exam is published.
 *
 * @requirement 24.1 — Event-driven trigger: new exam published (group-specific)
 * @requirement 24.3 — Send notifications to all active group members within 60 seconds
 */
export async function triggerExamPublished(examId: string): Promise<void> {
    const exam = await Exam.findById(examId).lean();
    if (!exam) return;

    const groupIds = (exam.targetGroupIds ?? []).map(toObjectId);
    const memberIds = await resolveGroupMemberIds(groupIds);
    const filteredIds = await filterByChannelPreference(memberIds, 'exam_published');

    await createNotification({
        title: 'নতুন পরীক্ষা প্রকাশিত',
        message: `"${exam.title}" পরীক্ষাটি প্রকাশিত হয়েছে। এখনই অংশগ্রহণ করুন!`,
        type: 'exam_published',
        category: 'exam',
        priority: 'high',
        targetUserIds: filteredIds,
        sourceType: 'exam',
        sourceId: examId,
        targetRoute: `/exams/${examId}`,
        targetEntityId: examId,
        dedupeKey: `exam_published_${examId}`,
    });
}

/**
 * Notify group members 30 minutes before an exam starts.
 *
 * @requirement 24.1 — Event-driven trigger: exam starting in 30 minutes
 */
export async function triggerExamStartingSoon(examId: string): Promise<void> {
    const exam = await Exam.findById(examId).lean();
    if (!exam) return;

    const groupIds = (exam.targetGroupIds ?? []).map(toObjectId);
    const memberIds = await resolveGroupMemberIds(groupIds);
    const filteredIds = await filterByChannelPreference(memberIds, 'exam_starting_soon');

    await createNotification({
        title: 'পরীক্ষা শীঘ্রই শুরু হচ্��ে',
        message: `"${exam.title}" পরীক্ষা ৩০ মিনিটের মধ্যে শুরু হবে। প্রস্তুত হোন!`,
        type: 'exam_starting_soon',
        category: 'exam',
        priority: 'urgent',
        targetUserIds: filteredIds,
        sourceType: 'exam',
        sourceId: examId,
        targetRoute: `/exams/${examId}`,
        targetEntityId: examId,
        dedupeKey: `exam_starting_soon_${examId}`,
    });
}

/**
 * Notify all participants when exam results are published.
 *
 * @requirement 24.1 — Event-driven trigger: result published
 */
export async function triggerResultPublished(examId: string): Promise<void> {
    const exam = await Exam.findById(examId).lean();
    if (!exam) return;

    const groupIds = (exam.targetGroupIds ?? []).map(toObjectId);
    const memberIds = await resolveGroupMemberIds(groupIds);
    const filteredIds = await filterByChannelPreference(memberIds, 'result_published');

    await createNotification({
        title: 'ফলাফল প্রকাশিত',
        message: `"${exam.title}" পরীক্ষার ফলাফল প্রকাশিত হয়েছে। আপনার ফলাফল দেখুন!`,
        type: 'result_published',
        category: 'exam',
        priority: 'high',
        targetUserIds: filteredIds,
        sourceType: 'exam',
        sourceId: examId,
        targetRoute: `/exams/${examId}/result`,
        targetEntityId: examId,
        dedupeKey: `result_published_${examId}`,
    });
}

/**
 * Warn a student at 8 PM if they have no activity today (streak about to break).
 *
 * @requirement 24.1 — Event-driven trigger: streak about to break
 */
export async function triggerStreakWarning(studentId: string): Promise<void> {
    const studentOid = toObjectId(studentId);

    // Verify the student actually has an active streak worth warning about
    const streak = await StreakRecord.findOne({ student: studentOid }).lean();
    if (!streak || streak.currentStreak === 0) return;

    // Check if the student already had activity today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (streak.lastActivityDate && new Date(streak.lastActivityDate) >= today) {
        return; // Already active today, no warning needed
    }

    const filteredIds = await filterByChannelPreference([studentOid], 'streak_warning');

    await createNotification({
        title: 'স্ট্রিক সতর্কতা ⚠️',
        message: `আপনার ${streak.currentStreak} দিনের স্ট্রিক ভেঙে যেতে পারে! আজকে অন্তত একটি পরীক্ষা বা অনুশীলন সম্পন্ন করুন।`,
        type: 'streak_warning',
        category: 'general',
        priority: 'high',
        targetUserIds: filteredIds,
        sourceType: 'streak',
        sourceId: studentId,
        targetRoute: '/dashboard',
        dedupeKey: `streak_warning_${studentId}_${today.toISOString().slice(0, 10)}`,
    });
}

/**
 * Notify the opponent when they receive a battle challenge.
 *
 * @requirement 24.1 — Event-driven trigger: battle/challenge invitation
 */
export async function triggerBattleChallenge(
    challengerId: string,
    opponentId: string,
    battleId: string,
): Promise<void> {
    const opponentOid = toObjectId(opponentId);
    const challengerOid = toObjectId(challengerId);

    const filteredIds = await filterByChannelPreference([opponentOid], 'battle_challenge');

    await createNotification({
        title: 'ব্রেইন ক্ল্যাশ চ্যালেঞ্জ! 🎯',
        message: 'আপনাকে একটি ব্রেইন ক্ল্যাশ ম্যাচে চ্যালেঞ্জ করা হয়েছে। চ্যালেঞ্জ গ্রহণ করুন!',
        type: 'battle_challenge',
        category: 'general',
        priority: 'high',
        targetUserIds: filteredIds,
        sourceType: 'battle',
        sourceId: battleId,
        targetRoute: `/battles/${battleId}`,
        targetEntityId: battleId,
        actorUserId: challengerOid,
        dedupeKey: `battle_challenge_${battleId}`,
    });
}

/**
 * Confirm a payment to the student.
 *
 * @requirement 24.1 — Event-driven trigger: payment confirmation
 */
export async function triggerPaymentConfirmation(
    studentId: string,
    paymentDetails: PaymentDetails,
): Promise<void> {
    const studentOid = toObjectId(studentId);
    const filteredIds = await filterByChannelPreference([studentOid], 'payment_confirmation');

    const description = paymentDetails.description ?? 'পেমেন্ট';
    const txnSuffix = paymentDetails.transactionId
        ? ` (TXN: ${paymentDetails.transactionId})`
        : '';

    await createNotification({
        title: 'পেমেন্ট নিশ্চিত ✅',
        message: `${description} — ৳${paymentDetails.amount} (${paymentDetails.method}) সফলভাবে সম্পন্ন হয়েছে।${txnSuffix}`,
        type: 'payment_confirmation',
        category: 'update',
        priority: 'normal',
        targetUserIds: filteredIds,
        sourceType: 'payment',
        sourceId: paymentDetails.transactionId ?? '',
        targetRoute: '/payments',
        dedupeKey: paymentDetails.transactionId
            ? `payment_confirmation_${paymentDetails.transactionId}`
            : undefined,
    });
}

/**
 * Remind a student about a study routine item.
 *
 * @requirement 24.1 — Event-driven trigger: routine reminder
 */
export async function triggerRoutineReminder(
    studentId: string,
    routineItem: RoutineItem,
): Promise<void> {
    const studentOid = toObjectId(studentId);
    const filteredIds = await filterByChannelPreference([studentOid], 'routine_reminder');

    const topicSuffix = routineItem.topic ? ` — ${routineItem.topic}` : '';

    await createNotification({
        title: 'পড়াশোনার সময় হয়েছে 📚',
        message: `${routineItem.subject}${topicSuffix}: ${routineItem.goal}`,
        type: 'routine_reminder',
        category: 'general',
        priority: 'normal',
        targetUserIds: filteredIds,
        sourceType: 'routine',
        targetRoute: '/study-routine',
    });
}

/**
 * Notify the doubt thread creator when someone replies to their thread.
 *
 * @requirement 24.1 — Event-driven trigger: doubt reply
 */
export async function triggerDoubtReply(
    threadId: string,
    replyAuthorId: string,
): Promise<void> {
    const thread = await DoubtThread.findById(threadId).lean();
    if (!thread) return;

    // Don't notify the thread creator if they replied to their own thread
    const replyAuthorOid = toObjectId(replyAuthorId);
    if (thread.createdBy.toString() === replyAuthorOid.toString()) return;

    const creatorOid = toObjectId(thread.createdBy);
    const filteredIds = await filterByChannelPreference([creatorOid], 'doubt_reply');

    await createNotification({
        title: 'আপনার প্রশ্নে নতুন উত্তর 💬',
        message: 'আপনার ডাউট থ্রেডে একটি নতুন উত্তর পোস্ট করা হয়েছে।',
        type: 'doubt_reply',
        category: 'general',
        priority: 'normal',
        targetUserIds: filteredIds,
        sourceType: 'doubt_thread',
        sourceId: threadId,
        targetRoute: `/doubts/${threadId}`,
        targetEntityId: threadId,
        actorUserId: replyAuthorOid,
        dedupeKey: `doubt_reply_${threadId}_${replyAuthorId}`,
    });
}
