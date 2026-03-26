import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SiteSettings from '../models/Settings';
import User from '../models/User';
import ManualPayment from '../models/ManualPayment';
import ExpenseEntry from '../models/ExpenseEntry';
import StaffPayout from '../models/StaffPayout';
import StudentDueLedger from '../models/StudentDueLedger';
import SupportTicket from '../models/SupportTicket';
import AnnouncementNotice from '../models/AnnouncementNotice';
import CredentialVault from '../models/CredentialVault';
import BackupJob from '../models/BackupJob';

dotenv.config();

async function runMigration() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(uri);
    console.log('[migrate:finance-v1] connected');

    await Promise.all([
        ManualPayment.createCollection().catch(() => null),
        ExpenseEntry.createCollection().catch(() => null),
        StaffPayout.createCollection().catch(() => null),
        StudentDueLedger.createCollection().catch(() => null),
        SupportTicket.createCollection().catch(() => null),
        AnnouncementNotice.createCollection().catch(() => null),
        CredentialVault.createCollection().catch(() => null),
        BackupJob.createCollection().catch(() => null),
    ]);

    const users = await User.find().select('_id role permissions');
    for (const user of users) {
        const p = user.permissions || ({} as typeof user.permissions);
        let changed = false;

        if (p.canManageFinance === undefined) {
            p.canManageFinance = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canManagePlans === undefined) {
            p.canManagePlans = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canManageTickets === undefined) {
            p.canManageTickets = ['superadmin', 'admin', 'moderator'].includes(user.role);
            changed = true;
        }
        if (p.canManageBackups === undefined) {
            p.canManageBackups = user.role === 'superadmin' || user.role === 'admin';
            changed = true;
        }
        if (p.canRevealPasswords === undefined) {
            p.canRevealPasswords = user.role === 'superadmin';
            changed = true;
        }

        if (changed) {
            user.permissions = p;
            await user.save();
        }
    }

    await SiteSettings.findOneAndUpdate(
        {},
        {
            $setOnInsert: {
                featureFlags: {
                    studentRegistrationEnabled: false,
                    financeDashboardV1: false,
                    smsReminderEnabled: false,
                    emailReminderEnabled: true,
                    backupS3MirrorEnabled: false,
                    nextAdminEnabled: false,
                    nextStudentEnabled: false,
                },
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[migrate:finance-v1] completed');
    await mongoose.disconnect();
}

runMigration().catch(async (error) => {
    console.error('[migrate:finance-v1] failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
