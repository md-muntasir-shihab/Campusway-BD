import mongoose from 'mongoose';
import cron from 'node-cron';
import Notification from '../models/Notification';
import Exam from '../models/Exam';
import Badge from '../models/Badge';
import StudentBadge from '../models/StudentBadge';
import ExamResult from '../models/ExamResult';
import University from '../models/University';
import StudentDueLedger from '../models/StudentDueLedger';
import StudentProfile from '../models/StudentProfile';
import User from '../models/User';
import AuditLog from '../models/AuditLog';
import { readNotificationAutomationSettings } from '../controllers/notificationAutomationController';
import { broadcastStudentDashboardEvent } from '../realtime/studentDashboardStream';
import { runJobWithLog } from '../services/jobRunLogService';

let cachedCronActorId: string | null = null;

async function resolveCronActorId(): Promise<string | null> {
    if (cachedCronActorId) return cachedCronActorId;
    const admin = await User.findOne({ role: { $in: ['superadmin', 'admin'] } }).select('_id').lean();
    cachedCronActorId = admin?._id ? String(admin._id) : null;
    return cachedCronActorId;
}

async function writeCronLog(action: string, details: Record<string, unknown>): Promise<void> {
    const actorId = await resolveCronActorId();
    if (!actorId) return;
    await AuditLog.create({
        actor_id: actorId,
        actor_role: 'system',
        action,
        target_type: 'cron',
        ip_address: '127.0.0.1',
        details,
    });
}

async function syncNotificationSchedules() {
    const now = new Date();
    await Notification.updateMany(
        { isActive: true, expireAt: { $exists: true, $ne: null, $lt: now } },
        { $set: { isActive: false } }
    );
}

function applyTemplate(template: string, replacements: Record<string, string | number>): string {
    let output = String(template || '');
    Object.entries(replacements).forEach(([key, value]) => {
        output = output.split(`{{${key}}}`).join(String(value));
    });
    return output;
}

function activeWindow(now: Date, targetDate: Date, hoursBefore: number): boolean {
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs < 0) return false;
    const lower = Math.max(0, (hoursBefore - 1) * 3600000);
    const upper = hoursBefore * 3600000;
    return diffMs <= upper && diffMs >= lower;
}

export function normalizeObjectIdString(value: unknown, visited: Set<unknown> = new Set()): string | null {
    if (value == null) return null;

    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^[a-fA-F0-9]{24}$/.test(trimmed)) return trimmed;

        // Handle malformed serialized payloads like: `[ { "$oid": "..." } ]`
        const match = trimmed.match(/[a-fA-F0-9]{24}/);
        return match ? match[0] : null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const normalized = normalizeObjectIdString(item, visited);
            if (normalized) return normalized;
        }
        return null;
    }

    if (typeof value === 'object') {
        if (visited.has(value)) return null;
        visited.add(value);
        const rec = value as Record<string, unknown>;
        return (
            normalizeObjectIdString(rec.$oid, visited)
            || normalizeObjectIdString(rec['"$oid"'], visited)
            || normalizeObjectIdString(rec.oid, visited)
            || normalizeObjectIdString(rec._id, visited)
        );
    }

    return null;
}

export function normalizeObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const normalized = normalizeObjectIdString(value);
    return normalized ? new mongoose.Types.ObjectId(normalized) : null;
}

async function createExamReminderNotifications() {
    const settings = await readNotificationAutomationSettings();
    if (!settings.examStartsSoon.enabled) return;

    const now = new Date();
    const maxHours = Math.max(1, ...settings.examStartsSoon.hoursBefore);
    const inMax = new Date(now.getTime() + maxHours * 60 * 60 * 1000);

    const exams = await Exam.find({
        isPublished: true,
        startDate: { $gte: now, $lte: inMax },
    }).select('_id title startDate').lean();

    for (const exam of exams) {
        const startAt = new Date(exam.startDate);
        for (const hoursBefore of settings.examStartsSoon.hoursBefore) {
            const hour = Math.max(0, Number(hoursBefore || 0));
            if (!activeWindow(now, startAt, hour === 0 ? 1 : hour)) continue;

            const reminderKey = `exam:${String(exam._id)}:${hour}:${startAt.toISOString()}`;
            const message = applyTemplate(settings.templates.examStartsSoon, {
                examTitle: exam.title,
                hoursBefore: hour,
                startAt: startAt.toISOString(),
            });

            await Notification.updateOne(
                { reminderKey },
                {
                    $setOnInsert: {
                        reminderKey,
                        title: `Upcoming Exam: ${exam.title}`,
                        message,
                        category: 'exam',
                        targetRole: 'student',
                        publishAt: now,
                        expireAt: new Date(startAt.getTime() + 2 * 60 * 60 * 1000),
                        isActive: true,
                        linkUrl: '/dashboard',
                    },
                },
                { upsert: true },
            );
        }
    }
}

async function createApplicationClosingNotifications() {
    const settings = await readNotificationAutomationSettings();
    if (!settings.applicationClosingSoon.enabled) return;

    const now = new Date();
    const maxHours = Math.max(1, ...settings.applicationClosingSoon.hoursBefore);
    const inMax = new Date(now.getTime() + maxHours * 3600000);

    const rows = await University.find({
        isActive: true,
        isArchived: { $ne: true },
        applicationEndDate: { $gte: now, $lte: inMax },
    }).select('_id name shortForm slug applicationEndDate').lean();

    for (const row of rows) {
        const endAt = row.applicationEndDate ? new Date(row.applicationEndDate) : null;
        if (!endAt || Number.isNaN(endAt.getTime())) continue;

        for (const hoursBefore of settings.applicationClosingSoon.hoursBefore) {
            const hour = Math.max(0, Number(hoursBefore || 0));
            if (!activeWindow(now, endAt, hour === 0 ? 1 : hour)) continue;

            const reminderKey = `application:${String(row._id)}:${hour}:${endAt.toISOString()}`;
            const message = applyTemplate(settings.templates.applicationClosingSoon, {
                universityName: row.shortForm || row.name,
                hoursBefore: hour,
                endAt: endAt.toISOString(),
            });

            await Notification.updateOne(
                { reminderKey },
                {
                    $setOnInsert: {
                        reminderKey,
                        title: `${row.shortForm || row.name} Application Closing`,
                        message,
                        category: 'update',
                        targetRole: 'student',
                        publishAt: now,
                        expireAt: new Date(endAt.getTime() + 2 * 60 * 60 * 1000),
                        isActive: true,
                        linkUrl: row.slug ? `/universities/${row.slug}` : '/universities',
                    },
                },
                { upsert: true },
            );
        }
    }
}

async function createPaymentPendingNotifications() {
    const settings = await readNotificationAutomationSettings();
    if (!settings.paymentPendingReminder.enabled) return;

    const todayKey = new Date().toISOString().slice(0, 10);
    const rows = await StudentDueLedger.find({ netDue: { $gt: 0 } }).select('studentId netDue').limit(1000).lean();

    for (const row of rows) {
        const studentObjectId = normalizeObjectId((row as { studentId?: unknown }).studentId);
        if (!studentObjectId) continue;
        const studentId = String(studentObjectId);

        for (const hoursBefore of settings.paymentPendingReminder.hoursBefore) {
            const hour = Math.max(0, Number(hoursBefore || 0));
            const reminderKey = `payment:${studentId}:${todayKey}:${hour}`;
            const message = applyTemplate(settings.templates.paymentPendingReminder, {
                amount: Number(row.netDue || 0),
                hoursBefore: hour,
            });

            await Notification.updateOne(
                { reminderKey },
                {
                    $setOnInsert: {
                        reminderKey,
                        title: 'Payment Reminder',
                        message,
                        category: 'update',
                        targetRole: 'student',
                        targetUserIds: [studentObjectId],
                        publishAt: new Date(),
                        expireAt: new Date(Date.now() + 36 * 60 * 60 * 1000),
                        isActive: true,
                        linkUrl: '/payments',
                    },
                },
                { upsert: true },
            );
        }
    }
}

async function createResultPublishedNotifications() {
    const settings = await readNotificationAutomationSettings();
    if (!settings.resultPublished.enabled) return;

    const now = new Date();
    const lookback = new Date(now.getTime() - 48 * 3600000);
    const exams = await Exam.find({
        isPublished: true,
        resultPublishDate: { $gte: lookback, $lte: now },
    }).select('_id title resultPublishDate').lean();

    for (const exam of exams) {
        const publishAt = new Date(exam.resultPublishDate);
        if (Number.isNaN(publishAt.getTime())) continue;

        for (const hoursBefore of settings.resultPublished.hoursBefore) {
            const offsetHours = Math.max(0, Number(hoursBefore || 0));
            const triggerAt = new Date(publishAt.getTime() + offsetHours * 3600000);
            if (now < triggerAt || now.getTime() - triggerAt.getTime() > 3600000) continue;

            const reminderKey = `result:${String(exam._id)}:${offsetHours}:${publishAt.toISOString()}`;
            const message = applyTemplate(settings.templates.resultPublished, {
                examTitle: exam.title,
                publishedAt: publishAt.toISOString(),
            });

            await Notification.updateOne(
                { reminderKey },
                {
                    $setOnInsert: {
                        reminderKey,
                        title: `${exam.title} Result Published`,
                        message,
                        category: 'exam',
                        targetRole: 'student',
                        publishAt: now,
                        expireAt: new Date(now.getTime() + 72 * 3600000),
                        isActive: true,
                        linkUrl: `/results/${String(exam._id)}`,
                    },
                },
                { upsert: true },
            );
        }
    }
}

async function createProfileScoreGateNotifications() {
    const settings = await readNotificationAutomationSettings();
    if (!settings.profileScoreGate.enabled) return;

    const now = new Date();
    const maxHours = Math.max(1, ...settings.profileScoreGate.hoursBefore);
    const inMax = new Date(now.getTime() + maxHours * 3600000);
    const upcomingExam = await Exam.findOne({
        isPublished: true,
        startDate: { $gte: now, $lte: inMax },
    }).sort({ startDate: 1 }).select('_id title startDate').lean();

    if (!upcomingExam) return;

    const students = await User.find({ role: 'student', isActive: { $ne: false } }).select('_id').limit(3000).lean();
    const studentIds = students.map((row) => row._id);
    const profiles = await StudentProfile.find({
        user_id: { $in: studentIds },
        profile_completion_percentage: { $lt: settings.profileScoreGate.minScore },
    }).select('user_id profile_completion_percentage').limit(3000).lean();

    const startAt = new Date(upcomingExam.startDate);
    for (const profile of profiles) {
        const profileUserId = normalizeObjectId((profile as { user_id?: unknown }).user_id);
        if (!profileUserId) continue;

        for (const hoursBefore of settings.profileScoreGate.hoursBefore) {
            const hour = Math.max(0, Number(hoursBefore || 0));
            if (!activeWindow(now, startAt, hour === 0 ? 1 : hour)) continue;

            const reminderKey = `profile-gate:${String(profileUserId)}:${String(upcomingExam._id)}:${hour}:${startAt.toISOString()}`;
            const message = applyTemplate(settings.templates.profileScoreGate, {
                examTitle: upcomingExam.title,
                score: Number(profile.profile_completion_percentage || 0),
                minScore: settings.profileScoreGate.minScore,
                hoursBefore: hour,
            });

            await Notification.updateOne(
                { reminderKey },
                {
                    $setOnInsert: {
                        reminderKey,
                        title: 'Profile Score Requirement',
                        message,
                        category: 'exam',
                        targetRole: 'student',
                        targetUserIds: [profileUserId],
                        publishAt: now,
                        expireAt: new Date(startAt.getTime() + 3600000),
                        isActive: true,
                        linkUrl: '/profile',
                    },
                },
                { upsert: true },
            );
        }
    }
}

async function autoAssignBadges() {
    const autoBadges = await Badge.find({ isActive: true, criteriaType: 'auto' }).lean();
    if (autoBadges.length === 0) return;

    const board = await ExamResult.aggregate([
        { $match: { status: 'evaluated' } },
        {
            $group: {
                _id: '$student',
                avgPercentage: { $avg: '$percentage' },
                completedExams: { $sum: 1 },
            }
        }
    ]);

    for (const stat of board) {
        for (const badge of autoBadges) {
            const minAvg = Number(badge.minAvgPercentage || 0);
            const minCompleted = Number(badge.minCompletedExams || 0);
            if (stat.avgPercentage >= minAvg && stat.completedExams >= minCompleted) {
                await StudentBadge.updateOne(
                    { student: stat._id, badge: badge._id },
                    {
                        $setOnInsert: {
                            source: 'auto',
                            awardedAt: new Date(),
                        }
                    },
                    { upsert: true }
                );
            }
        }
    }
}

export function startStudentDashboardCronJobs() {
    cron.schedule('*/5 * * * *', async () => {
        try {
            await runJobWithLog('dashboard.notification_dispatch', async () => {
                await syncNotificationSchedules();
                await createExamReminderNotifications();
                await createApplicationClosingNotifications();
                await createPaymentPendingNotifications();
                await createResultPublishedNotifications();
                await createProfileScoreGateNotifications();
                broadcastStudentDashboardEvent({ type: 'notification_updated', meta: { source: 'cron' } });
                await writeCronLog('student_notification_cron_run', { timestamp: new Date().toISOString() });
                return { summary: { ranAt: new Date().toISOString() } };
            });
        } catch (error) {
            console.error('[CRON] student dashboard notification jobs failed:', error);
        }
    });

    cron.schedule('0 * * * *', async () => {
        try {
            await runJobWithLog('dashboard.badge_assignment', async () => {
                await autoAssignBadges();
                broadcastStudentDashboardEvent({ type: 'profile_updated', meta: { source: 'badge_cron' } });
                await writeCronLog('student_badge_cron_run', { timestamp: new Date().toISOString() });
                return { summary: { ranAt: new Date().toISOString() } };
            });
        } catch (error) {
            console.error('[CRON] student dashboard badge jobs failed:', error);
        }
    });
}
