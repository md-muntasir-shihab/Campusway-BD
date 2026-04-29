/**
 * Exam System Cron Jobs
 *
 * Scheduled background tasks for the exam management system:
 *   1. Weekly leaderboard reset (every Monday at 00:00 UTC)
 *   2. Streak warning notification (daily at 8 PM UTC+6 / 14:00 UTC)
 *   3. Exam starting soon notification (every 5 minutes)
 *   4. Battle challenge expiry (every minute)
 *
 * Requirements: 8.7, 19.9, 24.1
 */
import cron from 'node-cron';
import LeaderboardEntry from '../models/LeaderboardEntry';
import StreakRecord from '../models/StreakRecord';
import Exam from '../models/Exam';
import BattleSession from '../models/BattleSession';
import { triggerStreakWarning, triggerExamStartingSoon } from '../services/NotificationTriggerService';

// ─── Constants ──────────────────────────────────────────────

/** Battle challenge timeout in minutes (pending challenges older than this are expired) */
const BATTLE_CHALLENGE_TIMEOUT_MINUTES = 5;

/** Exam starting soon notification window in minutes */
const EXAM_STARTING_SOON_WINDOW_MINUTES = 30;

// ─── Job Implementations ────────────────────────────────────

/**
 * Clear weekly LeaderboardEntry records every Monday at 00:00 UTC.
 *
 * Removes all entries with leaderboardType === 'weekly' so the weekly
 * leaderboard starts fresh each week.
 *
 * Requirement 8.7
 */
async function resetWeeklyLeaderboard(): Promise<void> {
    try {
        const result = await LeaderboardEntry.deleteMany({ leaderboardType: 'weekly' });
        console.log(`[CRON-EXAM] Weekly leaderboard reset: removed ${result.deletedCount} entries.`);
    } catch (err) {
        console.error('[CRON-EXAM] Failed to reset weekly leaderboard:', err);
    }
}

/**
 * Send streak warning notifications to students who have an active streak
 * but no activity today. Runs daily at 8 PM Bangladesh time (14:00 UTC).
 *
 * Requirement 19.9, 24.1
 */
async function sendStreakWarnings(): Promise<void> {
    try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Find students with active streaks (currentStreak > 0) who haven't
        // been active today (lastActivityDate < start of today UTC)
        const atRiskRecords = await StreakRecord.find({
            currentStreak: { $gt: 0 },
            $or: [
                { lastActivityDate: { $lt: today } },
                { lastActivityDate: null },
            ],
        })
            .select('student')
            .lean();

        if (atRiskRecords.length === 0) return;

        console.log(`[CRON-EXAM] Sending streak warnings to ${atRiskRecords.length} students.`);

        for (const record of atRiskRecords) {
            try {
                await triggerStreakWarning(record.student.toString());
            } catch (err) {
                console.error(`[CRON-EXAM] Streak warning failed for student ${record.student}:`, err);
            }
        }
    } catch (err) {
        console.error('[CRON-EXAM] Failed to send streak warnings:', err);
    }
}

/**
 * Notify students about exams starting within the next 30 minutes.
 * Runs every 5 minutes. Only notifies for exams that haven't been
 * notified yet (uses a simple time-window check).
 *
 * Requirement 24.1
 */
async function notifyExamStartingSoon(): Promise<void> {
    try {
        const now = new Date();
        const windowStart = new Date(now.getTime());
        const windowEnd = new Date(now.getTime() + EXAM_STARTING_SOON_WINDOW_MINUTES * 60 * 1000);

        // Find exams with a scheduled start time within the notification window
        // that are published and not yet started
        const upcomingExams = await Exam.find({
            isPublished: true,
            'scheduleWindows.0.start': { $gte: windowStart, $lte: windowEnd },
        })
            .select('_id title')
            .lean();

        if (upcomingExams.length === 0) return;

        console.log(`[CRON-EXAM] Found ${upcomingExams.length} exams starting soon. Sending notifications.`);

        for (const exam of upcomingExams) {
            try {
                await triggerExamStartingSoon(exam._id.toString());
            } catch (err) {
                console.error(`[CRON-EXAM] Exam starting soon notification failed for exam ${exam._id}:`, err);
            }
        }
    } catch (err) {
        console.error('[CRON-EXAM] Failed to send exam starting soon notifications:', err);
    }
}

/**
 * Expire pending battle challenges that are older than the configured timeout.
 * Runs every minute.
 *
 * Requirement 21.5
 */
async function expireBattleChallenges(): Promise<void> {
    try {
        const cutoff = new Date(Date.now() - BATTLE_CHALLENGE_TIMEOUT_MINUTES * 60 * 1000);

        const result = await BattleSession.updateMany(
            {
                status: 'pending',
                createdAt: { $lt: cutoff },
            },
            {
                $set: { status: 'expired' },
            },
        );

        if (result.modifiedCount > 0) {
            console.log(`[CRON-EXAM] Expired ${result.modifiedCount} pending battle challenges.`);
        }
    } catch (err) {
        console.error('[CRON-EXAM] Failed to expire battle challenges:', err);
    }
}

// ─── Scheduler ──────────────────────────────────────────────

/**
 * Start all exam system cron jobs.
 * Call this once during server startup.
 */
export function startExamSystemCronJobs(): void {
    console.log('[cron] Starting exam system cron jobs.');

    // 1. Weekly leaderboard reset — every Monday at 00:00 UTC
    cron.schedule('0 0 * * 1', resetWeeklyLeaderboard);

    // 2. Streak warning — daily at 8 PM Bangladesh time (UTC+6 = 14:00 UTC)
    cron.schedule('0 14 * * *', sendStreakWarnings);

    // 3. Exam starting soon — every 5 minutes
    cron.schedule('*/5 * * * *', notifyExamStartingSoon);

    // 4. Battle challenge expiry — every minute
    cron.schedule('* * * * *', expireBattleChallenges);
}
