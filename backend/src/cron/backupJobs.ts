import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { runBackup, enforceRetentionPolicy, getBackupConfig } from '../services/backupService';
import { runJobWithRetry } from '../services/jobRunLogService';
import { uploadBuffer as uploadBackupToB2 } from '../services/integrations/backupHelper';
import { isIntegrationReady } from '../services/integrations/featureGate';

/**
 * Best-effort mirror of a successful local backup to Backblaze B2.
 * Reads the backup file from disk and uploads it under
 * `campusway-backups/<basename>`. Silently no-ops when the integration
 * is disabled or any step fails.
 */
async function mirrorBackupToB2(localPath: string | undefined): Promise<void> {
    if (!localPath) return;
    if (!(await isIntegrationReady('b2_backup'))) return;

    try {
        const buffer = await fs.readFile(localPath);
        const remotePath = `campusway-backups/${path.basename(localPath)}`;
        const ok = await uploadBackupToB2(remotePath, buffer, 'application/json');
        if (ok) {
            console.log(`[CRON] Backup mirrored to B2: ${remotePath} (${buffer.length} bytes)`);
        } else {
            console.warn(`[CRON] B2 mirror returned false for ${remotePath}`);
        }
    } catch (err) {
        console.warn('[CRON] B2 mirror failed (best-effort):', (err as Error).message);
    }
}

/**
 * Starts the automated daily backup cron job.
 * - Runs a full backup at the configured schedule (default: 2 AM daily)
 * - Retries once on failure via runJobWithRetry (maxRetries: 1)
 * - Enforces the retention policy after each successful backup
 * - Best-effort mirrors the backup file to Backblaze B2 when configured
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

                    // Best-effort mirror to B2 (no-op when disabled)
                    await mirrorBackupToB2(result.localPath);

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
