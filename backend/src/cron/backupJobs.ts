import cron from 'node-cron';
import { runBackup, enforceRetentionPolicy, getBackupConfig } from '../services/backupService';
import { runJobWithRetry } from '../services/jobRunLogService';

/**
 * Starts the automated daily backup cron job.
 * - Runs a full backup at the configured schedule (default: 2 AM daily)
 * - Retries once on failure via runJobWithRetry (maxRetries: 1)
 * - Enforces the retention policy after each successful backup
 */
export function startBackupCronJobs(): void {
    const config = getBackupConfig();

    cron.schedule(config.schedule, async () => {
        try {
            await runJobWithRetry(
                'backup.automated_daily',
                async () => {
                    const result = await runBackup('full');
                    console.log(
                        `[CRON] Backup completed: ${result.collections} collections, ${result.documents} docs, verified=${result.verified}`,
                    );

                    // Enforce retention policy after successful backup
                    const retention = await enforceRetentionPolicy();
                    console.log(`[CRON] Retention enforced: kept=${retention.kept}, removed=${retention.removed}`);

                    return {
                        summary: {
                            type: result.type,
                            collections: result.collections,
                            documents: result.documents,
                            sizeBytes: result.sizeBytes,
                            verified: result.verified,
                            retentionKept: retention.kept,
                            retentionRemoved: retention.removed,
                        },
                    };
                },
                { maxRetries: 1 }, // Retry once on failure per Requirement 19.5
            );
        } catch (error) {
            console.error('[CRON] Automated backup failed after retry:', error);
        }
    });

    console.log(`[cron] Backup job scheduled: "${config.schedule}"`);
}
