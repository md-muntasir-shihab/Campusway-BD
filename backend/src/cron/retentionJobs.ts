import cron from 'node-cron';
import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog';
import EventLog from '../models/EventLog';
import ExamSession from '../models/ExamSession';
import { getRetentionSettings } from '../services/securityCenterService';
import { runJobWithLog } from '../services/jobRunLogService';

type ArchiveResult = {
    scanned: number;
    archived: number;
    deleted: number;
};

async function archiveBatch(
    sourceCollectionName: string,
    archiveCollectionName: string,
    dateField: string,
    cutoffDate: Date,
    limit = 1000,
): Promise<ArchiveResult> {
    const source = mongoose.connection.collection(sourceCollectionName);
    const archive = mongoose.connection.collection(archiveCollectionName);

    const docs = await source
        .find({ [dateField]: { $lt: cutoffDate } })
        .limit(limit)
        .toArray();

    if (docs.length === 0) {
        return { scanned: 0, archived: 0, deleted: 0 };
    }

    const archivedDocs = docs.map((doc) => ({
        ...doc,
        archivedAt: new Date(),
        archivedFrom: sourceCollectionName,
    }));

    let archived = 0;
    try {
        const insertResult = await archive.insertMany(archivedDocs, { ordered: false });
        archived = Number(insertResult.insertedCount || 0);
    } catch (error: any) {
        // Duplicate key (already archived) is acceptable for idempotency.
        if (error?.writeErrors?.length) {
            archived = Math.max(0, docs.length - Number(error.writeErrors.length || 0));
        } else {
            throw error;
        }
    }

    const ids = docs.map((doc) => doc._id).filter(Boolean);
    const deleteResult = ids.length > 0 ? await source.deleteMany({ _id: { $in: ids } }) : { deletedCount: 0 };
    return {
        scanned: docs.length,
        archived,
        deleted: Number(deleteResult.deletedCount || 0),
    };
}

async function runRetentionArchiverOnce(): Promise<{ summary: Record<string, unknown> }> {
    const retention = await getRetentionSettings(false);
    if (!retention.enabled) {
        return {
            summary: {
                enabled: false,
                message: 'Retention policy disabled.',
            },
        };
    }

    const now = Date.now();
    const examCutoff = new Date(now - retention.examSessionsDays * 24 * 60 * 60 * 1000);
    const auditCutoff = new Date(now - retention.auditLogsDays * 24 * 60 * 60 * 1000);
    const eventCutoff = new Date(now - retention.eventLogsDays * 24 * 60 * 60 * 1000);

    const [exam, audit, event] = await Promise.all([
        archiveBatch(ExamSession.collection.name, 'archive_exam_sessions', 'createdAt', examCutoff),
        archiveBatch(AuditLog.collection.name, 'archive_audit_logs', 'timestamp', auditCutoff),
        archiveBatch(EventLog.collection.name, 'archive_event_logs', 'createdAt', eventCutoff),
    ]);

    return {
        summary: {
            enabled: true,
            examSessions: exam,
            auditLogs: audit,
            eventLogs: event,
            cutoff: {
                examCutoff: examCutoff.toISOString(),
                auditCutoff: auditCutoff.toISOString(),
                eventCutoff: eventCutoff.toISOString(),
            },
        },
    };
}

export function startRetentionCronJobs(): void {
    cron.schedule('15 2 * * *', async () => {
        try {
            await runJobWithLog('retention.archiver', runRetentionArchiverOnce);
        } catch (error) {
            console.error('[CRON] retention archiver failed:', error);
        }
    });
}

export async function runRetentionArchiverManual(): Promise<{ summary: Record<string, unknown> }> {
    return runRetentionArchiverOnce();
}
