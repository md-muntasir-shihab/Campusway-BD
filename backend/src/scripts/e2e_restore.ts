import fs from 'fs/promises';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import SiteSettings from '../models/Settings';
import SecuritySettings from '../models/SecuritySettings';
import User from '../models/User';
import ActiveSession from '../models/ActiveSession';

const BACKUP_PATH = path.resolve(process.cwd(), '.e2e-security-backup.json');

const SEEDED_EMAILS = [
    process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
    process.env.E2E_ADMIN_MOBILE_EMAIL || 'e2e_admin_mobile@campusway.local',
    process.env.E2E_STUDENT_DESKTOP_EMAIL || 'e2e_student_desktop@campusway.local',
    process.env.E2E_STUDENT_MOBILE_EMAIL || 'e2e_student_mobile@campusway.local',
    process.env.E2E_STUDENT_SESSION_EMAIL || 'e2e_student_session@campusway.local',
].map((item) => item.toLowerCase());

function shouldDeactivateUsers(): boolean {
    return process.argv.includes('--deactivate-users') || process.env.E2E_DEACTIVATE_USERS === 'true';
}

async function restoreSecurity(): Promise<{ restored: boolean; reason?: string }> {
    try {
        const raw = await fs.readFile(BACKUP_PATH, 'utf-8');
        const parsed = JSON.parse(raw) as {
            security?: Record<string, unknown> | null;
            securitySettings?: Record<string, unknown> | null;
        };

        if (!parsed.security) {
            return { restored: false, reason: 'No security snapshot found in backup file.' };
        }

        await SiteSettings.findOneAndUpdate(
            {},
            { $set: { security: parsed.security } },
            { upsert: true }
        );

        if (parsed.securitySettings) {
            await SecuritySettings.findOneAndUpdate(
                { key: 'global' },
                { $set: parsed.securitySettings },
                { upsert: true }
            );
        }

        await fs.unlink(BACKUP_PATH).catch(() => { /* ignore */ });
        return { restored: true };
    } catch {
        return { restored: false, reason: 'Backup file missing or invalid JSON.' };
    }
}

async function deactivateSeededUsers(): Promise<number> {
    const users = await User.find({ email: { $in: SEEDED_EMAILS } }).select('_id').lean();
    const ids = users.map((u) => u._id);
    if (!ids.length) return 0;

    const updateResult = await User.updateMany(
        { _id: { $in: ids } },
        { $set: { status: 'suspended' } }
    );

    await ActiveSession.updateMany(
        { user_id: { $in: ids }, status: 'active' },
        {
            $set: {
                status: 'terminated',
                terminated_reason: 'e2e_restore_deactivate',
                terminated_at: new Date(),
                termination_meta: { trigger: 'e2e_restore' },
            },
        }
    );

    return Number(updateResult.modifiedCount || 0);
}

async function run(): Promise<void> {
    try {
        await connectDB();
        const restore = await restoreSecurity();

        let deactivatedUsers = 0;
        if (shouldDeactivateUsers()) {
            deactivatedUsers = await deactivateSeededUsers();
        }

        // eslint-disable-next-line no-console
        console.log(
            JSON.stringify(
                {
                    ok: true,
                    message: 'E2E environment restored.',
                    securityRestored: restore.restored,
                    securityRestoreReason: restore.reason,
                    deactivatedUsers,
                },
                null,
                2
            )
        );
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_restore] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
