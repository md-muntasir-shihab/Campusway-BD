import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import ExamEvent from '../models/ExamEvent';
import ExamCertificate from '../models/ExamCertificate';

dotenv.config();

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(uri);
    console.log('[migrate:exam-participant-v2] connected');

    const precheck = await Promise.all([
        Exam.countDocuments({ resultPublishMode: { $exists: false } }),
        Exam.countDocuments({ reviewSettings: { $exists: false } }),
        Exam.countDocuments({ certificateSettings: { $exists: false } }),
        Exam.countDocuments({ autosave_interval_sec: { $exists: false } }),
        Exam.countDocuments({ 'security_policies.violation_action': { $exists: false } }),
        ExamSession.countDocuments({ copyAttemptCount: { $exists: false } }),
        ExamSession.countDocuments({ fullscreenExitCount: { $exists: false } }),
        ExamSession.countDocuments({ violationsCount: { $exists: false } }),
        ExamSession.countDocuments({ lockReason: { $exists: false } }),
        ExamSession.countDocuments({ currentQuestionId: { $exists: false } }),
    ]);

    console.log('[migrate:exam-participant-v2] precheck', {
        missingResultPublishMode: precheck[0],
        missingReviewSettings: precheck[1],
        missingCertificateSettings: precheck[2],
        missingAutosaveInterval: precheck[3],
        missingViolationAction: precheck[4],
        missingCopyAttemptCount: precheck[5],
        missingFullscreenExitCount: precheck[6],
        missingViolationsCount: precheck[7],
        missingLockReason: precheck[8],
        missingCurrentQuestionId: precheck[9],
    });

    await Exam.updateMany(
        { resultPublishMode: { $exists: false } },
        { $set: { resultPublishMode: 'scheduled' } },
    );
    await Exam.updateMany(
        { reviewSettings: { $exists: false } },
        {
            $set: {
                reviewSettings: {
                    showQuestion: true,
                    showSelectedAnswer: true,
                    showCorrectAnswer: true,
                    showExplanation: true,
                    showSolutionImage: true,
                },
            },
        },
    );
    await Exam.updateMany(
        { certificateSettings: { $exists: false } },
        {
            $set: {
                certificateSettings: {
                    enabled: false,
                    minPercentage: 40,
                    passOnly: true,
                    templateVersion: 'v1',
                },
            },
        },
    );
    await Exam.updateMany(
        { autosave_interval_sec: { $exists: false } },
        { $set: { autosave_interval_sec: 5 } },
    );
    await Exam.updateMany(
        { 'security_policies.violation_action': { $exists: false } },
        { $set: { 'security_policies.violation_action': 'warn' } },
    );
    await Exam.updateMany(
        { accessControl: { $exists: false } },
        {
            $set: {
                accessControl: {
                    allowedGroupIds: [],
                    allowedPlanCodes: [],
                    allowedUserIds: [],
                },
            },
        },
    );

    await ExamSession.updateMany(
        { copyAttemptCount: { $exists: false } },
        { $set: { copyAttemptCount: 0 } },
    );
    await ExamSession.updateMany(
        { fullscreenExitCount: { $exists: false } },
        { $set: { fullscreenExitCount: 0 } },
    );
    await ExamSession.updateMany(
        { violationsCount: { $exists: false } },
        { $set: { violationsCount: 0 } },
    );
    await ExamSession.updateMany(
        { lockReason: { $exists: false } },
        { $set: { lockReason: '' } },
    );
    await ExamSession.updateMany(
        { currentQuestionId: { $exists: false } },
        { $set: { currentQuestionId: '' } },
    );
    await ExamSession.updateMany(
        { forcedSubmittedAt: { $exists: false } },
        { $set: { forcedSubmittedAt: null } },
    );
    await ExamSession.updateMany(
        { forcedSubmittedBy: { $exists: false } },
        { $set: { forcedSubmittedBy: null } },
    );

    await Exam.createIndexes();
    await ExamSession.createIndexes();
    await ExamEvent.createIndexes();
    await ExamCertificate.createIndexes();

    console.log('[migrate:exam-participant-v2] non-destructive migration completed');
    console.log('[migrate:exam-participant-v2] no destructive index rebuilds were executed');

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:exam-participant-v2] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});
