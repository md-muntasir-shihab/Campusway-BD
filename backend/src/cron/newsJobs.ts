import cron from 'node-cron';
import { purgeExpiredTrashNews, runDueSourceIngestion, runScheduledNewsPublish } from '../controllers/newsV2Controller';
import { runJobWithLog } from '../services/jobRunLogService';

export function startNewsV2CronJobs(): void {
    cron.schedule('* * * * *', async () => {
        try {
            await runJobWithLog('news.rss_fetch_publish', async () => {
                await runDueSourceIngestion();
                await runScheduledNewsPublish();
                await purgeExpiredTrashNews();
                return {
                    summary: {
                        message: 'RSS ingestion and scheduled publish completed.',
                    },
                };
            });
        } catch (error) {
            console.error('[CRON] news v2 jobs failed:', error);
        }
    });
}
