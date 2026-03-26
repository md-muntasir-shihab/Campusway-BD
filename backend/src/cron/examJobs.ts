import cron from 'node-cron';
import ExamSession from '../models/ExamSession';
import ExamEvent from '../models/ExamEvent';
import { finalizeExamSession } from '../services/examFinalizationService';
import { runJobWithLog } from '../services/jobRunLogService';

async function autoSubmitExpiredSession(session: any): Promise<void> {
    try {
        const result = await finalizeExamSession({
            examId: String(session.exam),
            studentId: String(session.student),
            attemptId: String(session._id),
            submissionType: 'auto_expired',
            isAutoSubmit: true,
            now: new Date(),
            requestMeta: {
                ipAddress: String(session.ipAddress || ''),
                userAgent: 'CampusWay-Cron',
            },
        });

        if (!result.ok) {
            if (Number(result.statusCode || 0) === 423) {
                console.info(`[CRON] Skipped locked attempt ${session._id}`);
                return;
            }
            console.warn(`[CRON] Skipped attempt ${session._id} -> ${result.statusCode}: ${result.message}`);
            return;
        }

        await ExamEvent.create({
            attempt: session._id,
            student: String(session.student),
            exam: String(session.exam),
            eventType: 'submit',
            metadata: {
                action: 'auto_submit_cron',
                score: result.obtainedMarks,
                percentage: result.percentage,
            },
            ip: String(session.ipAddress || ''),
            userAgent: 'CampusWay-Cron',
        });

        console.log(`[CRON] Auto-submitted expired ExamSession: ${session._id} for student ${session.student}`);
    } catch (error) {
        console.error(`[CRON] Error auto-submitting session ${session._id}:`, error);
    }
}

export function startExamCronJobs(): void {
    console.log('[cron] Starting exam auto-submit worker (every minute).');

    cron.schedule('* * * * *', async () => {
        try {
            await runJobWithLog('exam.autosubmit_expired_sessions', async () => {
                const now = new Date();
                const bufferTime = new Date(now.getTime() - 5000);

                const expiredSessions = await ExamSession.find({
                    isActive: true,
                    sessionLocked: { $ne: true },
                    expiresAt: { $lt: bufferTime },
                    status: { $in: ['in_progress', 'expired'] },
                }).select('_id exam student attemptNo expiresAt status ipAddress').lean();

                if (expiredSessions.length === 0) {
                    return { summary: { expiredSessions: 0, processed: 0 } };
                }

                console.log(`[CRON] Found ${expiredSessions.length} expired exam sessions. Processing...`);
                await Promise.all(expiredSessions.map((session) => autoSubmitExpiredSession(session)));
                return { summary: { expiredSessions: expiredSessions.length, processed: expiredSessions.length } };
            });
        } catch (error) {
            console.error('[CRON] Error in auto-submit cron job:', error);
        }
    });
}
