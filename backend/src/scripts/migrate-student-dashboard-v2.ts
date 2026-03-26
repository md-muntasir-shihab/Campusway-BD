import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exam from '../models/Exam';
import StudentProfile from '../models/StudentProfile';
import ExamSession from '../models/ExamSession';
import ExamResult from '../models/ExamResult';
import StudentDashboardConfig from '../models/StudentDashboardConfig';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import StudentGroup from '../models/StudentGroup';

dotenv.config();

async function runMigration() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(uri);
    console.log('[migrate] connected');

    const precheck = await Promise.all([
        Exam.countDocuments({ $or: [{ subjectBn: { $exists: false } }, { subjectBn: '' }] }),
        Exam.countDocuments({ $or: [{ universityNameBn: { $exists: false } }, { universityNameBn: '' }] }),
        ExamResult.countDocuments({ attemptNo: { $exists: false } }),
        ExamSession.countDocuments({ attemptNo: { $exists: false } }),
        StudentProfile.countDocuments({ guardianPhoneVerificationStatus: { $exists: false } }),
        StudentProfile.countDocuments({ admittedAt: { $exists: false } }),
        StudentProfile.countDocuments({ groupIds: { $exists: false } }),
        User.countDocuments({ role: 'student', $or: [{ subscription: { $exists: false } }, { 'subscription.plan': { $exists: false } }] }),
    ]);
    console.log('[migrate] precheck:', {
        examsMissingSubjectBn: precheck[0],
        examsMissingUniversityNameBn: precheck[1],
        resultsMissingAttemptNo: precheck[2],
        sessionsMissingAttemptNo: precheck[3],
        profilesMissingGuardianStatus: precheck[4],
        profilesMissingAdmittedAt: precheck[5],
        profilesMissingGroupIds: precheck[6],
        studentsMissingSubscription: precheck[7],
    });

    // Ensure dashboard config exists
    const cfg = await StudentDashboardConfig.findOne();
    if (!cfg) {
        await StudentDashboardConfig.create({});
        console.log('[migrate] created default StudentDashboardConfig');
    }

    // Ensure required catalog collections have defaults
    await SubscriptionPlan.updateOne(
        { code: 'legacy_free' },
        {
            $setOnInsert: {
                code: 'legacy_free',
                name: 'Legacy Free Access',
                durationDays: 3650,
                description: 'Auto-backfilled legacy access for existing students.',
                features: ['Legacy Access'],
                isActive: true,
                priority: 999,
            },
        },
        { upsert: true }
    );
    await StudentGroup.createCollection().catch(() => null);

    // Backfill exam bilingual/card fields
    await Exam.updateMany(
        { $or: [{ subjectBn: { $exists: false } }, { subjectBn: '' }] },
        [{ $set: { subjectBn: '$subject' } }]
    );
    await Exam.updateMany(
        { $or: [{ universityNameBn: { $exists: false } }, { universityNameBn: '' }] },
        [{ $set: { universityNameBn: '$title' } }]
    );
    await Exam.updateMany(
        { examType: { $exists: false } },
        { $set: { examType: 'mcq_only' } }
    );
    await Exam.updateMany(
        { logoUrl: { $exists: false } },
        { $set: { logoUrl: '' } }
    );
    await Exam.updateMany(
        { branchFilters: { $exists: false } },
        { $set: { branchFilters: [] } }
    );
    await Exam.updateMany(
        { batchFilters: { $exists: false } },
        { $set: { batchFilters: [] } }
    );

    // Backfill dashboard config extensions
    await StudentDashboardConfig.updateMany(
        { featuredOrderingMode: { $exists: false } },
        { $set: { featuredOrderingMode: 'manual' } }
    );

    // Backfill student guardian verification fields
    await StudentProfile.updateMany(
        { guardianOtpHash: { $exists: false } },
        { $set: { guardianOtpHash: '' } }
    );
    await StudentProfile.updateMany(
        { guardianPhoneVerificationStatus: { $exists: false } },
        { $set: { guardianPhoneVerificationStatus: 'unverified' } }
    );
    await StudentProfile.updateMany(
        { guardianOtpExpiresAt: { $exists: false } },
        { $set: { guardianOtpExpiresAt: null } }
    );
    await StudentProfile.updateMany(
        { guardianPhoneVerifiedAt: { $exists: false } },
        { $set: { guardianPhoneVerifiedAt: null } }
    );
    await StudentProfile.updateMany(
        { admittedAt: { $exists: false } },
        [{ $set: { admittedAt: '$createdAt' } }]
    );
    await StudentProfile.updateMany(
        { groupIds: { $exists: false } },
        { $set: { groupIds: [] } }
    );

    // Backfill student subscription canonical keys and legacy_free for missing plans
    const students = await User.find({ role: 'student' }).select('_id subscription createdAt');
    for (const student of students) {
        const sub = student.subscription || {};
        const hasPlan = Boolean(sub.plan || sub.planCode || sub.planName);
        if (!hasPlan) {
            const startDate = sub.startDate || student.createdAt || new Date();
            const expiryDate = sub.expiryDate || new Date(startDate.getTime() + (3650 * 24 * 60 * 60 * 1000));
            student.subscription = {
                ...sub,
                plan: 'legacy_free',
                planCode: 'legacy_free',
                planName: 'Legacy Free Access',
                isActive: true,
                startDate,
                expiryDate,
                assignedAt: new Date(),
            };
            await student.save();
            continue;
        }

        const normalizedPlanCode = String(sub.planCode || sub.plan || '').trim().toLowerCase();
        const normalizedPlanName = String(sub.planName || sub.plan || '').trim();
        const nextSub = {
            ...sub,
            plan: normalizedPlanCode,
            planCode: normalizedPlanCode,
            planName: normalizedPlanName,
            isActive: sub.isActive ?? true,
            startDate: sub.startDate || student.createdAt,
            expiryDate: sub.expiryDate || new Date((sub.startDate || student.createdAt || new Date()).getTime() + (365 * 24 * 60 * 60 * 1000)),
            assignedAt: sub.assignedAt || new Date(),
        };
        student.subscription = nextSub;
        await student.save();
    }

    // Backfill attempts + device/session lock fields
    await ExamSession.updateMany(
        { attemptNo: { $exists: false } },
        { $set: { attemptNo: 1 } }
    );
    await ExamSession.updateMany(
        { deviceFingerprint: { $exists: false } },
        { $set: { deviceFingerprint: '' } }
    );
    await ExamSession.updateMany(
        { sessionLocked: { $exists: false } },
        { $set: { sessionLocked: false } }
    );

    await ExamResult.updateMany(
        { attemptNo: { $exists: false } },
        { $set: { attemptNo: 1 } }
    );

    // Rebuild result unique index: (exam, student) -> (exam, student, attemptNo)
    const resultCollection = mongoose.connection.collection('student_results');
    const indexes = await resultCollection.indexes();
    console.log('[migrate] existing student_results indexes:', indexes.map((idx) => idx.name));
    for (const idx of indexes) {
        const keys = Object.keys(idx.key || {});
        const isOldUnique = idx.unique && keys.length === 2 && keys.includes('exam') && keys.includes('student');
        if (isOldUnique && idx.name) {
            await resultCollection.dropIndex(idx.name);
            console.log(`[migrate] dropped old index: ${idx.name}`);
        }
    }

    try {
        await resultCollection.createIndex({ exam: 1, student: 1, attemptNo: 1 }, { unique: true });
        console.log('[migrate] ensured unique index on (exam, student, attemptNo)');
    } catch (indexError) {
        console.error('[migrate] index recreation failed:', indexError);
        console.error('[migrate] rollback steps:');
        console.error('1) Restore DB snapshot if available.');
        console.error('2) Deduplicate student_results by { exam, student, attemptNo }.');
        console.error('3) Retry: db.student_results.createIndex({ exam: 1, student: 1, attemptNo: 1 }, { unique: true })');
        throw indexError;
    }

    console.log('[migrate] completed');
    await mongoose.disconnect();
}

runMigration().catch(async (error) => {
    console.error('[migrate] failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
