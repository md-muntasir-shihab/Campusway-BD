import { Response } from 'express';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import BackupJob, { BackupStorage, BackupType } from '../models/BackupJob';
import AuditLog from '../models/AuditLog';
import AnnouncementNotice from '../models/AnnouncementNotice';
import ExpenseEntry from '../models/ExpenseEntry';
import ManualPayment from '../models/ManualPayment';
import StaffPayout from '../models/StaffPayout';
import StudentDueLedger from '../models/StudentDueLedger';
import SubscriptionPlan from '../models/SubscriptionPlan';
import SupportTicket from '../models/SupportTicket';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import { AuthRequest } from '../middlewares/auth';
import { getClientIp } from '../utils/requestMeta';

const DEFAULT_BACKUP_DIR = path.resolve(process.cwd(), 'backup-snapshots');

function asObjectId(value: unknown): mongoose.Types.ObjectId | null {
    const raw = String(value || '').trim();
    if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
    return new mongoose.Types.ObjectId(raw);
}

function getBackupDir(): string {
    return process.env.BACKUP_DIR ? path.resolve(process.env.BACKUP_DIR) : DEFAULT_BACKUP_DIR;
}

function safeBaseName(input: string): string {
    return input.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
}

function toCompactTimestamp(value: unknown): string {
    const date = value ? new Date(value as string) : new Date();
    if (Number.isNaN(date.getTime())) return String(Date.now());
    return date.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
}

function buildBackupDownloadName(item: { type?: string; createdAt?: unknown }, filePath: string): string {
    const ext = path.extname(filePath) || '.json';
    const type = safeBaseName(String(item.type || 'full').toLowerCase());
    const timestamp = toCompactTimestamp(item.createdAt);
    return safeBaseName(`campusway-backup-${type}-${timestamp}${ext}`);
}

async function createAudit(req: AuthRequest, action: string, details?: Record<string, unknown>): Promise<void> {
    if (!req.user || !mongoose.Types.ObjectId.isValid(req.user._id)) return;
    await AuditLog.create({
        actor_id: new mongoose.Types.ObjectId(req.user._id),
        actor_role: req.user.role,
        action,
        target_type: 'backup',
        ip_address: getClientIp(req),
        details: details || {},
    });
}

async function buildBackupSnapshot(type: BackupType) {
    const now = new Date();
    const [
        users,
        profiles,
        plans,
        payments,
        expenses,
        payouts,
        dues,
        tickets,
        notices,
    ] = await Promise.all([
        User.find().lean(),
        StudentProfile.find().lean(),
        SubscriptionPlan.find().lean(),
        ManualPayment.find().lean(),
        ExpenseEntry.find().lean(),
        StaffPayout.find().lean(),
        StudentDueLedger.find().lean(),
        SupportTicket.find().lean(),
        AnnouncementNotice.find().lean(),
    ]);

    return {
        metadata: {
            generatedAt: now.toISOString(),
            type,
            mongoDatabase: mongoose.connection.name,
            collectionCounts: {
                users: users.length,
                studentProfiles: profiles.length,
                subscriptionPlans: plans.length,
                manualPayments: payments.length,
                expenses: expenses.length,
                staffPayouts: payouts.length,
                dueLedgers: dues.length,
                supportTickets: tickets.length,
                notices: notices.length,
            },
        },
        data: {
            users,
            studentProfiles: profiles,
            subscriptionPlans: plans,
            manualPayments: payments,
            expenses,
            staffPayouts: payouts,
            dueLedgers: dues,
            supportTickets: tickets,
            notices,
        },
    };
}

function checksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
}

export async function adminRunBackup(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const requestedBy = asObjectId(req.user._id);
        if (!requestedBy) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }

        const body = req.body as Record<string, unknown>;
        const typeRaw = String(body.type || 'full').trim();
        const type: BackupType = typeRaw === 'incremental' ? 'incremental' : 'full';

        const storageRaw = String(body.storage || 'local').trim();
        const storage: BackupStorage = storageRaw === 's3' || storageRaw === 'both' ? storageRaw : 'local';

        const job = await BackupJob.create({
            type,
            storage,
            status: 'running',
            requestedBy,
        });

        try {
            const backupDir = getBackupDir();
            await fs.mkdir(backupDir, { recursive: true });

            const snapshot = await buildBackupSnapshot(type);
            const fileName = safeBaseName(`campusway-backup-${type}-${Date.now()}.json`);
            const filePath = path.join(backupDir, fileName);
            const serialized = JSON.stringify(snapshot);
            const digest = checksum(serialized);

            await fs.writeFile(filePath, serialized, 'utf8');

            job.status = 'completed';
            job.localPath = filePath;
            job.checksum = digest;
            job.restoreMeta = {
                generatedAt: snapshot.metadata.generatedAt,
                collectionCounts: snapshot.metadata.collectionCounts,
                warning: 'Restore is destructive and requires typed confirmation token.',
            };
            await job.save();

            await createAudit(req, 'backup_run_completed', {
                backupJobId: String(job._id),
                type,
                storage,
                localPath: filePath,
                checksum: digest,
            });

            res.status(201).json({
                message: 'Backup completed successfully',
                item: job,
            });
        } catch (error) {
            job.status = 'failed';
            job.error = (error as Error).message;
            await job.save();
            throw error;
        }
    } catch (error) {
        console.error('adminRunBackup error:', error);
        res.status(500).json({ message: 'Failed to run backup' });
    }
}

export async function adminListBackups(req: AuthRequest, res: Response): Promise<void> {
    try {
        const page = Math.max(1, Number((req.query as Record<string, unknown>).page || 1));
        const limit = Math.max(1, Math.min(200, Number((req.query as Record<string, unknown>).limit || 20)));
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            BackupJob.find()
                .populate('requestedBy', 'username full_name role')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BackupJob.countDocuments(),
        ]);

        res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
        console.error('adminListBackups error:', error);
        res.status(500).json({ message: 'Failed to load backup jobs' });
    }
}

export async function adminDownloadBackup(req: AuthRequest, res: Response): Promise<void> {
    try {
        const item = await BackupJob.findById(req.params.id).lean();
        if (!item || !item.localPath) {
            res.status(404).json({ message: 'Backup file not found' });
            return;
        }

        const filePath = path.resolve(item.localPath);
        try {
            await fs.access(filePath);
        } catch {
            res.status(404).json({ message: 'Backup file is unavailable on disk' });
            return;
        }

        const downloadName = buildBackupDownloadName(
            { type: item.type as string, createdAt: item.createdAt as unknown },
            filePath,
        );
        res.download(filePath, downloadName);
    } catch (error) {
        console.error('adminDownloadBackup error:', error);
        res.status(500).json({ message: 'Failed to download backup file' });
    }
}

export async function adminRestoreBackup(req: AuthRequest, res: Response): Promise<void> {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Authentication required' });
            return;
        }

        const body = req.body as Record<string, unknown>;
        const confirmation = String(body.confirmation || '').trim();
        const expected = `RESTORE ${req.params.id}`;
        if (confirmation !== expected) {
            res.status(400).json({ message: `Invalid confirmation text. Use: ${expected}` });
            return;
        }

        const item = await BackupJob.findById(req.params.id);
        if (!item || !item.localPath) {
            res.status(404).json({ message: 'Backup job not found' });
            return;
        }

        const filePath = path.resolve(item.localPath);
        const content = await fs.readFile(filePath, 'utf8');
        const parsed = JSON.parse(content) as {
            metadata?: Record<string, unknown>;
            data?: Record<string, unknown[]>;
        };

        const data = parsed.data || {};
        const requestedBy = asObjectId(req.user._id);
        if (!requestedBy) {
            res.status(400).json({ message: 'Invalid actor id' });
            return;
        }

        // pre-restore safety snapshot
        const preRestore = await BackupJob.create({
            type: 'full',
            storage: 'local',
            status: 'running',
            requestedBy,
            restoreMeta: {
                reason: 'auto_pre_restore_snapshot',
                sourceRestoreJobId: String(item._id),
            },
        });

        try {
            const backupDir = getBackupDir();
            await fs.mkdir(backupDir, { recursive: true });
            const snapshot = await buildBackupSnapshot('full');
            const preSerialized = JSON.stringify(snapshot);
            const prePath = path.join(backupDir, safeBaseName(`campusway-pre-restore-${Date.now()}.json`));
            await fs.writeFile(prePath, preSerialized, 'utf8');

            preRestore.status = 'completed';
            preRestore.localPath = prePath;
            preRestore.checksum = checksum(preSerialized);
            await preRestore.save();
        } catch (error) {
            preRestore.status = 'failed';
            preRestore.error = (error as Error).message;
            await preRestore.save();
            throw error;
        }

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await Promise.all([
                User.deleteMany({}, { session }),
                StudentProfile.deleteMany({}, { session }),
                SubscriptionPlan.deleteMany({}, { session }),
                ManualPayment.deleteMany({}, { session }),
                ExpenseEntry.deleteMany({}, { session }),
                StaffPayout.deleteMany({}, { session }),
                StudentDueLedger.deleteMany({}, { session }),
                SupportTicket.deleteMany({}, { session }),
                AnnouncementNotice.deleteMany({}, { session }),
            ]);

            if (Array.isArray(data.users) && data.users.length > 0) {
                await User.insertMany(data.users, { session, ordered: false });
            }
            if (Array.isArray(data.studentProfiles) && data.studentProfiles.length > 0) {
                await StudentProfile.insertMany(data.studentProfiles, { session, ordered: false });
            }
            if (Array.isArray(data.subscriptionPlans) && data.subscriptionPlans.length > 0) {
                await SubscriptionPlan.insertMany(data.subscriptionPlans, { session, ordered: false });
            }
            if (Array.isArray(data.manualPayments) && data.manualPayments.length > 0) {
                await ManualPayment.insertMany(data.manualPayments, { session, ordered: false });
            }
            if (Array.isArray(data.expenses) && data.expenses.length > 0) {
                await ExpenseEntry.insertMany(data.expenses, { session, ordered: false });
            }
            if (Array.isArray(data.staffPayouts) && data.staffPayouts.length > 0) {
                await StaffPayout.insertMany(data.staffPayouts, { session, ordered: false });
            }
            if (Array.isArray(data.dueLedgers) && data.dueLedgers.length > 0) {
                await StudentDueLedger.insertMany(data.dueLedgers, { session, ordered: false });
            }
            if (Array.isArray(data.supportTickets) && data.supportTickets.length > 0) {
                await SupportTicket.insertMany(data.supportTickets, { session, ordered: false });
            }
            if (Array.isArray(data.notices) && data.notices.length > 0) {
                await AnnouncementNotice.insertMany(data.notices, { session, ordered: false });
            }

            await session.commitTransaction();
            session.endSession();
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

        await createAudit(req, 'backup_restore_completed', {
            restoreJobId: String(item._id),
            preRestoreSnapshotId: String(preRestore._id),
            metadata: parsed.metadata || {},
        });

        res.json({
            message: 'Restore completed successfully',
            restoredFrom: String(item._id),
            preRestoreSnapshotId: String(preRestore._id),
        });
    } catch (error) {
        console.error('adminRestoreBackup error:', error);
        res.status(500).json({ message: 'Failed to restore backup' });
    }
}
