import JobRunLog, { IJobRunLog } from '../models/JobRunLog';

type JobWorkResult = {
    summary?: Record<string, unknown>;
};

export interface JobRunnerOptions {
    maxRetries?: number;       // default: 3
    backoffBase?: number;      // default: 1000ms (exponential: 1s, 4s, 16s)
    onConsecutiveFailures?: (jobName: string, count: number) => void;
}

/** Visible for testing — override in tests to avoid real delays. */
export const _delays = {
    sleep: (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms)),
};

export async function runJobWithLog(
    jobName: string,
    worker: () => Promise<void | JobWorkResult>,
): Promise<void> {
    const startedAt = new Date();
    const doc = await JobRunLog.create({
        jobName,
        startedAt,
        status: 'running',
    });

    try {
        const result = await worker();
        const endedAt = new Date();
        await JobRunLog.findByIdAndUpdate(doc._id, {
            $set: {
                status: 'success',
                endedAt,
                durationMs: endedAt.getTime() - startedAt.getTime(),
                summary: result?.summary || {},
            },
        });
    } catch (error) {
        const endedAt = new Date();
        const message = error instanceof Error ? error.message : String(error || 'Unknown error');
        const stack = error instanceof Error ? String(error.stack || '') : '';
        await JobRunLog.findByIdAndUpdate(doc._id, {
            $set: {
                status: 'failed',
                endedAt,
                durationMs: endedAt.getTime() - startedAt.getTime(),
                errorMessage: message,
                errorStackSnippet: stack.slice(0, 2000),
            },
        });
        throw error;
    }
}

/**
 * Wraps a job worker with retry logic and exponential backoff.
 * Retries up to `maxRetries` times (default 3) with delays of backoffBase × 4^attempt.
 * Persists a single JobRunLog entry with the final outcome and retryCount.
 * Emits a warning log after 3 consecutive failures.
 */
export async function runJobWithRetry(
    jobName: string,
    worker: () => Promise<void | JobWorkResult>,
    options?: JobRunnerOptions,
): Promise<void> {
    const maxRetries = options?.maxRetries ?? 3;
    const backoffBase = options?.backoffBase ?? 1000;

    const startedAt = new Date();
    const doc = await JobRunLog.create({
        jobName,
        startedAt,
        status: 'running',
        retryCount: 0,
    });

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = backoffBase * Math.pow(4, attempt - 1);
                await _delays.sleep(delay);
            }

            const result = await worker();
            const endedAt = new Date();
            await JobRunLog.findByIdAndUpdate(doc._id, {
                $set: {
                    status: 'success',
                    endedAt,
                    durationMs: endedAt.getTime() - startedAt.getTime(),
                    retryCount: attempt,
                    summary: result?.summary || {},
                },
            });
            return;
        } catch (error) {
            lastError = error;
        }
    }

    // All attempts exhausted — persist failure
    const endedAt = new Date();
    const message = lastError instanceof Error ? lastError.message : String(lastError || 'Unknown error');
    const stack = lastError instanceof Error ? String(lastError.stack || '') : '';
    await JobRunLog.findByIdAndUpdate(doc._id, {
        $set: {
            status: 'failed',
            endedAt,
            durationMs: endedAt.getTime() - startedAt.getTime(),
            retryCount: maxRetries,
            errorMessage: message,
            errorStackSnippet: stack.slice(0, 2000),
        },
    });

    // Emit warning after 3 consecutive failures
    if (maxRetries >= 3) {
        console.warn(
            `[JOB_RUNNER] WARNING: Job "${jobName}" failed ${maxRetries + 1} consecutive times (${maxRetries} retries exhausted). Last error: ${message}`,
        );
        options?.onConsecutiveFailures?.(jobName, maxRetries + 1);
    }

    throw lastError;
}

export async function getRecentJobRuns(limit = 100): Promise<IJobRunLog[]> {
    return JobRunLog.find({})
        .sort({ startedAt: -1 })
        .limit(Math.max(1, Math.min(limit, 500)));
}

export async function getJobHealthWindow(hours = 24): Promise<{
    hours: number;
    totals: {
        success: number;
        failed: number;
        running: number;
    };
    byJob: Array<{
        jobName: string;
        success: number;
        failed: number;
        running: number;
        lastRunAt?: Date;
    }>;
}> {
    const safeHours = Math.max(1, Math.min(hours, 168));
    const from = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    const rows = await JobRunLog.aggregate([
        { $match: { startedAt: { $gte: from } } },
        {
            $group: {
                _id: '$jobName',
                success: {
                    $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
                },
                failed: {
                    $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                },
                running: {
                    $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] },
                },
                lastRunAt: { $max: '$startedAt' },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const byJob = rows.map((row) => ({
        jobName: String(row._id || ''),
        success: Number(row.success || 0),
        failed: Number(row.failed || 0),
        running: Number(row.running || 0),
        lastRunAt: row.lastRunAt ? new Date(row.lastRunAt) : undefined,
    }));

    return {
        hours: safeHours,
        totals: {
            success: byJob.reduce((sum, row) => sum + row.success, 0),
            failed: byJob.reduce((sum, row) => sum + row.failed, 0),
            running: byJob.reduce((sum, row) => sum + row.running, 0),
        },
        byJob,
    };
}
