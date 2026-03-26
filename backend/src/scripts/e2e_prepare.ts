import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User, { IUserPermissions } from '../models/User';
import StudentProfile from '../models/StudentProfile';
import SiteSettings from '../models/Settings';
import SecuritySettings from '../models/SecuritySettings';
import ActiveSession from '../models/ActiveSession';
import ExamResult from '../models/ExamResult';
import ExamSession from '../models/ExamSession';
import { resolvePermissions } from '../utils/permissions';
import { seedContentPipeline } from './seed-content-pipeline';

type SeedUser = {
    email: string;
    username: string;
    fullName: string;
    password: string;
    role: 'admin' | 'student';
};

const SEEDED_ADMINS: SeedUser[] = [
    {
        email: process.env.E2E_ADMIN_DESKTOP_EMAIL || 'e2e_admin_desktop@campusway.local',
        username: process.env.E2E_ADMIN_DESKTOP_USERNAME || 'e2e_admin_desktop',
        fullName: process.env.E2E_ADMIN_DESKTOP_FULL_NAME || 'E2E Admin Desktop',
        password: process.env.E2E_ADMIN_DESKTOP_PASSWORD || 'E2E_Admin#12345',
        role: 'admin',
    },
    {
        email: process.env.E2E_ADMIN_MOBILE_EMAIL || 'e2e_admin_mobile@campusway.local',
        username: process.env.E2E_ADMIN_MOBILE_USERNAME || 'e2e_admin_mobile',
        fullName: process.env.E2E_ADMIN_MOBILE_FULL_NAME || 'E2E Admin Mobile',
        password: process.env.E2E_ADMIN_MOBILE_PASSWORD || 'E2E_Admin#12345',
        role: 'admin',
    },
];

const SEEDED_STUDENTS: SeedUser[] = [
    {
        email: process.env.E2E_STUDENT_DESKTOP_EMAIL || 'e2e_student_desktop@campusway.local',
        username: process.env.E2E_STUDENT_DESKTOP_USERNAME || 'e2e_student_desktop',
        fullName: process.env.E2E_STUDENT_DESKTOP_FULL_NAME || 'E2E Student Desktop',
        password: process.env.E2E_STUDENT_DESKTOP_PASSWORD || 'E2E_Student#12345',
        role: 'student',
    },
    {
        email: process.env.E2E_STUDENT_MOBILE_EMAIL || 'e2e_student_mobile@campusway.local',
        username: process.env.E2E_STUDENT_MOBILE_USERNAME || 'e2e_student_mobile',
        fullName: process.env.E2E_STUDENT_MOBILE_FULL_NAME || 'E2E Student Mobile',
        password: process.env.E2E_STUDENT_MOBILE_PASSWORD || 'E2E_Student#12345',
        role: 'student',
    },
    {
        email: process.env.E2E_STUDENT_SESSION_EMAIL || 'e2e_student_session@campusway.local',
        username: process.env.E2E_STUDENT_SESSION_USERNAME || 'e2e_student_session',
        fullName: process.env.E2E_STUDENT_SESSION_FULL_NAME || 'E2E Student Session',
        password: process.env.E2E_STUDENT_SESSION_PASSWORD || 'E2E_Student#12345',
        role: 'student',
    },
];

const BACKUP_PATH = path.resolve(process.cwd(), '.e2e-security-backup.json');

async function normalizeLegacyUserIdIndex(): Promise<void> {
    const db = mongoose.connection.db;
    if (!db) return;

    const users = db.collection('users');
    const indexes = await users.indexes();
    const userIdIndex = indexes.find((index) => index.name === 'userId_1');
    if (!userIdIndex) return;

    const isUnique = Boolean(userIdIndex.unique);
    const isSparse = Boolean((userIdIndex as { sparse?: boolean }).sparse);
    if (isUnique && isSparse) return;

    await users.dropIndex('userId_1').catch(() => undefined);
    await users.createIndex(
        { userId: 1 },
        {
            name: 'userId_1',
            unique: true,
            sparse: true,
            background: true,
        },
    );
}

function makeDeterministicPhone(seedKey: string, variant: 'student' | 'guardian'): string {
    const normalized = `${seedKey}:${variant}`.toLowerCase();
    let hash = 0;
    for (const ch of normalized) {
        hash = (hash * 33 + ch.charCodeAt(0)) % 1_000_000_000;
    }
    return `01${String(hash).padStart(9, '0')}`.slice(0, 11);
}

async function upsertSeedUser(seed: SeedUser): Promise<string> {
    const hashed = await bcrypt.hash(seed.password, 12);
    const permissions: IUserPermissions = resolvePermissions(seed.role);
    const now = new Date();

    const baseUpdate: Record<string, unknown> = {
        full_name: seed.fullName,
        username: seed.username,
        email: seed.email,
        role: seed.role,
        status: 'active',
        password: hashed,
        permissions,
        mustChangePassword: false,
        twoFactorEnabled: false,
        two_factor_method: null,
        loginAttempts: 0,
        lockUntil: null,
        subscription: seed.role === 'student'
            ? {
                plan: 'E2E Unlimited',
                planCode: 'e2e_unlimited',
                planName: 'E2E Unlimited',
                isActive: true,
                startDate: now,
                expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
                assignedAt: now,
            }
            : undefined,
    };

    const user = await User.findOneAndUpdate(
        { email: seed.email.toLowerCase() },
        { $set: baseUpdate },
        { upsert: true, new: true, runValidators: true }
    );

    await ActiveSession.updateMany(
        { user_id: user._id, status: 'active' },
        {
            $set: {
                status: 'terminated',
                terminated_reason: 'e2e_prepare',
                terminated_at: new Date(),
                termination_meta: { trigger: 'e2e_prepare' },
            },
        }
    );

    if (seed.role === 'student') {
        const phoneNumber = makeDeterministicPhone(seed.username || seed.email, 'student');
        const guardianPhone = makeDeterministicPhone(seed.username || seed.email, 'guardian');
        await StudentProfile.findOneAndUpdate(
            { user_id: user._id },
            {
                $set: {
                    full_name: seed.fullName,
                    username: seed.username,
                    email: seed.email,
                    phone_number: phoneNumber,
                    guardian_phone: guardianPhone,
                    department: 'science',
                    ssc_batch: '2022',
                    hsc_batch: '2024',
                    college_name: 'E2E College',
                    college_address: 'Dhaka',
                    profile_completion_percentage: 100,
                    guardianPhoneVerificationStatus: 'verified',
                    guardianPhoneVerifiedAt: new Date(),
                },
            },
            { upsert: true, new: true, runValidators: true }
        );
    }

    return String(user._id);
}

async function backupAndPatchSecurity(): Promise<void> {
    const settings = await SiteSettings.findOne();
    const securitySnapshot = settings?.security || null;
    const securitySettingsDoc = await SecuritySettings.findOne({ key: 'global' }).lean();
    const securitySettingsSnapshot = securitySettingsDoc
        ? {
            passwordPolicy: securitySettingsDoc.passwordPolicy,
            loginProtection: securitySettingsDoc.loginProtection,
            session: securitySettingsDoc.session,
            adminAccess: securitySettingsDoc.adminAccess,
            siteAccess: securitySettingsDoc.siteAccess,
            examProtection: securitySettingsDoc.examProtection,
            logging: securitySettingsDoc.logging,
            rateLimit: securitySettingsDoc.rateLimit,
        }
        : null;

    await fs.writeFile(
        BACKUP_PATH,
        JSON.stringify(
            {
                capturedAt: new Date().toISOString(),
                security: securitySnapshot,
                securitySettings: securitySettingsSnapshot,
            },
            null,
            2
        ),
        'utf-8'
    );

    await SiteSettings.findOneAndUpdate(
        {},
        {
            $set: {
                'security.enable2faAdmin': false,
                'security.enable2faStudent': false,
                'security.force2faSuperAdmin': false,
                'security.default2faMethod': 'email',
                'security.singleBrowserLogin': true,
                'security.forceLogoutOnNewLogin': true,
                'security.strictTokenHashValidation': false,
            },
        },
        { upsert: true }
    );

    await SecuritySettings.findOneAndUpdate(
        { key: 'global' },
        {
            $set: {
                'adminAccess.require2FAForAdmins': false,
                'adminAccess.adminPanelEnabled': true,
            },
            $setOnInsert: { key: 'global' },
        },
        { upsert: true }
    );
}

async function run(): Promise<void> {
    try {
        await connectDB();
        await normalizeLegacyUserIdIndex();

        const adminResults = await Promise.all(SEEDED_ADMINS.map(async (seed) => ({
            id: await upsertSeedUser(seed),
            email: seed.email,
            password: seed.password,
        })));

        const studentResults = await Promise.all(SEEDED_STUDENTS.map(async (seed) => ({
            id: await upsertSeedUser(seed),
            email: seed.email,
            password: seed.password,
        })));

        const studentObjectIds = studentResults.map((item) => new mongoose.Types.ObjectId(item.id));
        await Promise.all([
            ExamResult.deleteMany({ student: { $in: studentObjectIds } }),
            ExamSession.deleteMany({ student: { $in: studentObjectIds } }),
        ]);

        await backupAndPatchSecurity();
        const contentSeed = await seedContentPipeline({ runLabel: 'e2e_prepare' });

        const output = {
            ok: true,
            message: 'E2E environment prepared.',
            admins: adminResults,
            students: studentResults,
            contentSeed,
            backupPath: BACKUP_PATH,
            baseUrl: process.env.E2E_BASE_URL || 'http://localhost:5175',
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[e2e_prepare] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
