import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import University from '../models/University';
import News from '../models/News';
import Resource from '../models/Resource';
import Exam from '../models/Exam';
import ManualPayment from '../models/ManualPayment';
import ExpenseEntry from '../models/ExpenseEntry';
import SupportTicket from '../models/SupportTicket';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import UserSubscription from '../models/UserSubscription';

type EvidenceResult = {
    ok: true;
    generatedAt: string;
    dbName: string;
    runLabel: string;
    counts: Record<string, number>;
    seededUsers: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        subscriptionActive: boolean;
    }>;
    relationChecks: {
        seededStudentProfiles: number;
        seededSubscriptions: number;
        seededPayments: number;
        seededSupportTickets: number;
        seededAuditLogs: number;
        seededNotifications: number;
    };
    sensitiveChecks: {
        userPasswordHashNonBcrypt: Array<{
            id: string;
            email: string;
            passwordPrefix: string;
        }>;
        plaintextSensitiveFieldHits: Array<{
            collection: string;
            field: string;
            id: string;
        }>;
    };
};

function looksLikeBcrypt(hash: string): boolean {
    return /^\$2[aby]\$\d{2}\$/.test(hash);
}

function isSeededEmail(email: string): boolean {
    const v = String(email || '').toLowerCase();
    return v.includes('@campusway.local') || v.startsWith('e2e_');
}

async function countByModel(): Promise<Record<string, number>> {
    const [
        users,
        profiles,
        universities,
        news,
        resources,
        exams,
        payments,
        expenses,
        supportTickets,
        auditLogs,
        notifications,
        subscriptions,
    ] = await Promise.all([
        User.countDocuments({}),
        StudentProfile.countDocuments({}),
        University.countDocuments({}),
        News.countDocuments({}),
        Resource.countDocuments({}),
        Exam.countDocuments({}),
        ManualPayment.countDocuments({}),
        ExpenseEntry.countDocuments({}),
        SupportTicket.countDocuments({}),
        AuditLog.countDocuments({}),
        Notification.countDocuments({}),
        UserSubscription.countDocuments({}),
    ]);

    return {
        users,
        student_profiles: profiles,
        universities,
        news,
        resources,
        exams,
        manual_payments: payments,
        expenses,
        support_tickets: supportTickets,
        audit_logs: auditLogs,
        notifications,
        user_subscriptions: subscriptions,
    };
}

async function collectSeededUsers() {
    const rows = await User.find({})
        .select('_id email role status subscription')
        .lean<Array<Record<string, unknown>>>();
    return rows
        .filter((row) => isSeededEmail(String(row.email || '')))
        .map((row) => ({
            id: String(row._id || ''),
            email: String(row.email || ''),
            role: String(row.role || ''),
            status: String(row.status || ''),
            subscriptionActive: Boolean((row.subscription as Record<string, unknown> | undefined)?.isActive),
        }));
}

async function collectSensitiveChecks(seedUserIds: string[]) {
    const rows = await User.find({ _id: { $in: seedUserIds } })
        .select('_id email password')
        .lean<Array<Record<string, unknown>>>();

    const userPasswordHashNonBcrypt = rows
        .map((row) => ({
            id: String(row._id || ''),
            email: String(row.email || ''),
            password: String(row.password || ''),
        }))
        .filter((row) => row.password && !looksLikeBcrypt(row.password))
        .map((row) => ({
            id: row.id,
            email: row.email,
            passwordPrefix: row.password.slice(0, 12),
        }));

    const plaintextSensitiveFieldHits: Array<{
        collection: string;
        field: string;
        id: string;
    }> = [];

    const suspiciousFields = ['plainPassword', 'rawPassword', 'passwordPlaintext', 'apiKey', 'secret', 'token'];
    const db = mongoose.connection.db;
    if (!db) {
        return {
            userPasswordHashNonBcrypt,
            plaintextSensitiveFieldHits,
        };
    }
    const collections = await db.listCollections().toArray();

    for (const c of collections) {
        const collectionName = String(c.name || '');
        const collection = db.collection(collectionName);
        const sample = await collection.find({}, { projection: { _id: 1 }, limit: 20 }).toArray();
        if (!sample.length) continue;

        for (const field of suspiciousFields) {
            const hit = await collection.findOne({
                [field]: { $exists: true, $type: 'string', $ne: '' },
            }, {
                projection: { _id: 1, [field]: 1 },
            });
            if (hit) {
                plaintextSensitiveFieldHits.push({
                    collection: collectionName,
                    field,
                    id: String(hit._id || ''),
                });
            }
        }
    }

    return {
        userPasswordHashNonBcrypt,
        plaintextSensitiveFieldHits,
    };
}

async function run(): Promise<void> {
    const runLabel = String(process.env.E2E_EVIDENCE_LABEL || process.env.E2E_RUN_LABEL || 'unspecified');
    try {
        await connectDB();
        const counts = await countByModel();
        const seededUsers = await collectSeededUsers();
        const seededUserIds = seededUsers.map((item) => item.id);

        const [
            seededStudentProfiles,
            seededSubscriptions,
            seededPayments,
            seededSupportTickets,
            seededAuditLogs,
            seededNotifications,
            sensitiveChecks,
        ] = await Promise.all([
            StudentProfile.countDocuments({ user_id: { $in: seededUserIds } }),
            UserSubscription.countDocuments({ userId: { $in: seededUserIds } }),
            ManualPayment.countDocuments({ studentId: { $in: seededUserIds } }),
            SupportTicket.countDocuments({ studentId: { $in: seededUserIds } }),
            AuditLog.countDocuments({ actor_id: { $in: seededUserIds } }),
            Notification.countDocuments({ targetUserIds: { $in: seededUserIds } }),
            collectSensitiveChecks(seededUserIds),
        ]);

        const payload: EvidenceResult = {
            ok: true,
            generatedAt: new Date().toISOString(),
            dbName: String(mongoose.connection.name || ''),
            runLabel,
            counts,
            seededUsers,
            relationChecks: {
                seededStudentProfiles: Number(seededStudentProfiles || 0),
                seededSubscriptions: Number(seededSubscriptions || 0),
                seededPayments: Number(seededPayments || 0),
                seededSupportTickets: Number(seededSupportTickets || 0),
                seededAuditLogs: Number(seededAuditLogs || 0),
                seededNotifications: Number(seededNotifications || 0),
            },
            sensitiveChecks,
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(payload, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_db_evidence] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
