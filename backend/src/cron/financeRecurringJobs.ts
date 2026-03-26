import cron from 'node-cron';
import { processDueRecurringRules, getOrCreateFinanceSettings, logFinanceAudit } from '../services/financeCenterService';
import User from '../models/User';

let cachedSystemAdminId: string | null = null;

async function resolveSystemAdminId(): Promise<string> {
    if (cachedSystemAdminId) return cachedSystemAdminId;
    const admin = await User.findOne({ role: { $in: ['superadmin', 'admin'] } }).select('_id').lean();
    cachedSystemAdminId = admin?._id ? String(admin._id) : 'system';
    return cachedSystemAdminId;
}

export function startFinanceRecurringCronJobs(): void {
    // Run every hour at minute 15 — process any recurring rules that are due
    cron.schedule('15 * * * *', async () => {
        try {
            const settings = await getOrCreateFinanceSettings();
            if (!settings.enableRecurringEngine) return;

            const adminId = await resolveSystemAdminId();
            const processed = await processDueRecurringRules();
            if (processed > 0) {
                console.log(`[finance-cron] Processed ${processed} recurring rules`);
                await logFinanceAudit({
                    actorId: adminId,
                    action: 'finance.recurring.cron-run',
                    targetType: 'FinanceRecurringRule',
                    details: { processed },
                    ip: '127.0.0.1',
                });
            }
        } catch (err) {
            console.error('[finance-cron] recurring rules error:', err);
        }
    });

    console.log('[finance-cron] Recurring engine cron registered');
}
