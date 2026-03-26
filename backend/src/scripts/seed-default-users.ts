import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import { resolvePermissions } from '../utils/permissions';
import { seedContentPipeline } from './seed-content-pipeline';

dotenv.config();

type SeedRole = 'superadmin' | 'student';

type SeedAccount = {
    username: string;
    email: string;
    fullName: string;
    password: string;
    role: SeedRole;
};

const DEFAULT_ADMIN: SeedAccount = {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'campusway_admin',
    email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@campusway.com',
    fullName: process.env.DEFAULT_ADMIN_FULL_NAME || 'Super Admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123456',
    role: 'superadmin',
};

const DEFAULT_STUDENT: SeedAccount = {
    username: process.env.DEFAULT_STUDENT_USERNAME || 'campusway_student',
    email: process.env.DEFAULT_STUDENT_EMAIL || 'student@campusway.com',
    fullName: process.env.DEFAULT_STUDENT_FULL_NAME || 'Test Student',
    password: process.env.DEFAULT_STUDENT_PASSWORD || 'student123456',
    role: 'student',
};

async function upsertAccount(seed: SeedAccount) {
    const hashedPassword = await bcrypt.hash(seed.password, 12);
    const query = {
        $or: [
            { email: seed.email.toLowerCase() },
            { username: seed.username.toLowerCase() },
        ],
    };

    const baseUpdate: Record<string, unknown> = {
        username: seed.username.toLowerCase(),
        email: seed.email.toLowerCase(),
        full_name: seed.fullName,
        password: hashedPassword,
        role: seed.role,
        status: 'active',
        permissions: resolvePermissions(seed.role),
        mustChangePassword: false,
        loginAttempts: 0,
        lockUntil: undefined,
        twoFactorEnabled: false,
        two_factor_method: null,
    };

    if (seed.role === 'student') {
        const now = new Date();
        baseUpdate.subscription = {
            plan: 'demo',
            planCode: 'demo',
            planName: 'Demo Plan',
            isActive: true,
            startDate: now,
            expiryDate: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
            assignedAt: now,
        };
    }

    const user = await User.findOneAndUpdate(
        query,
        { $set: baseUpdate },
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    return user;
}

async function upsertStudentProfile(studentId: string) {
    await StudentProfile.findOneAndUpdate(
        { user_id: studentId },
        {
            $set: {
                user_id: studentId,
                full_name: DEFAULT_STUDENT.fullName,
                username: DEFAULT_STUDENT.username,
                email: DEFAULT_STUDENT.email,
                phone_number: '01700000000',
                guardian_phone: '01800000000',
                department: 'science',
                ssc_batch: '2022',
                hsc_batch: '2024',
                college_name: 'CampusWay Demo College',
                college_address: 'Dhaka',
                profile_completion_percentage: 100,
                guardianPhoneVerificationStatus: 'verified',
                guardianPhoneVerifiedAt: new Date(),
                admittedAt: new Date(),
            },
        },
        { upsert: true, runValidators: true }
    );
}

async function run() {
    try {
        await connectDB();

        const [admin, student] = await Promise.all([
            upsertAccount(DEFAULT_ADMIN),
            upsertAccount(DEFAULT_STUDENT),
        ]);

        await upsertStudentProfile(String(student._id));
        const contentSeed = await seedContentPipeline({ runLabel: 'seed_default_users' });

        const output = {
            ok: true,
            contentSeed,
            admin: {
                username: DEFAULT_ADMIN.username,
                email: DEFAULT_ADMIN.email,
                password: DEFAULT_ADMIN.password,
                role: DEFAULT_ADMIN.role,
                id: String(admin._id),
            },
            student: {
                username: DEFAULT_STUDENT.username,
                email: DEFAULT_STUDENT.email,
                password: DEFAULT_STUDENT.password,
                role: DEFAULT_STUDENT.role,
                id: String(student._id),
            },
        };

        // eslint-disable-next-line no-console
        console.log(JSON.stringify(output, null, 2));
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[seed-default-users] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
