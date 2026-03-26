import cron from 'node-cron';
import { processQueuedNotificationJobs } from '../services/notificationOrchestrationService';

export function startNotificationJobCron(): void {
    cron.schedule('* * * * *', async () => {
        try {
            await processQueuedNotificationJobs(10);
        } catch (error) {
            console.error('[CRON] notification jobs failed:', error);
        }
    });
}
