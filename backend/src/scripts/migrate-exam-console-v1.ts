import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Exam from '../models/Exam';
import Question from '../models/Question';
import QuestionRevision from '../models/QuestionRevision';
import ExamSession from '../models/ExamSession';
import ExamEvent from '../models/ExamEvent';
import Banner from '../models/Banner';
import HomeAlert from '../models/HomeAlert';
import LiveAlertAck from '../models/LiveAlertAck';

dotenv.config();

type MigrationReport = {
    startedAt: string;
    completedAt?: string;
    mode: 'non_destructive';
    precheck: Record<string, number>;
    updates: Record<string, number>;
    indexes: string[];
    notes: string[];
};

function ensureReportDir(): string {
    const reportDir = path.resolve(process.cwd(), '../qa-artifacts/migrations');
    fs.mkdirSync(reportDir, { recursive: true });
    return reportDir;
}

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    const report: MigrationReport = {
        startedAt: new Date().toISOString(),
        mode: 'non_destructive',
        precheck: {},
        updates: {},
        indexes: [],
        notes: [
            'No destructive operations executed.',
            'Any destructive rebuild/index drop must remain manual and explicitly approved.',
        ],
    };

    await mongoose.connect(uri);
    console.log('[migrate:exam-console-v1] connected');

    const [questionCount, questionRevisionDistinctCount] = await Promise.all([
        Question.countDocuments({}),
        QuestionRevision.distinct('questionId').then((ids) => ids.length),
    ]);

    report.precheck = {
        examMissingGroupCategory: await Exam.countDocuments({ group_category: { $exists: false } }),
        examMissingShareLink: await Exam.countDocuments({ share_link: { $exists: false } }),
        examMissingShortLink: await Exam.countDocuments({ short_link: { $exists: false } }),
        examMissingShareExpiry: await Exam.countDocuments({ share_link_expires_at: { $exists: false } }),
        examMissingDeliveryMode: await Exam.countDocuments({ deliveryMode: { $exists: false } }),
        examMissingBannerSource: await Exam.countDocuments({ bannerSource: { $exists: false } }),
        examMissingViolationAction: await Exam.countDocuments({ 'security_policies.violation_action': { $exists: false } }),
        examMissingAutosaveInterval: await Exam.countDocuments({ autosave_interval_sec: { $exists: false } }),
        examMissingAccessControl: await Exam.countDocuments({ accessControl: { $exists: false } }),
        sessionMissingCurrentQuestion: await ExamSession.countDocuments({ currentQuestionId: { $exists: false } }),
        sessionMissingViolations: await ExamSession.countDocuments({ violationsCount: { $exists: false } }),
        questionWithoutRevision: Math.max(0, questionCount - questionRevisionDistinctCount),
        bannerMissingSlot: await Banner.countDocuments({ slot: { $exists: false } }),
        bannerMissingPriority: await Banner.countDocuments({ priority: { $exists: false } }),
        bannerMissingStatus: await Banner.countDocuments({ status: { $exists: false } }),
        alertMissingTarget: await HomeAlert.countDocuments({ target: { $exists: false } }),
        alertMissingRequireAck: await HomeAlert.countDocuments({ requireAck: { $exists: false } }),
        alertMissingStatus: await HomeAlert.countDocuments({ status: { $exists: false } }),
        alertMissingMetrics: await HomeAlert.countDocuments({ metrics: { $exists: false } }),
    };

    const examDefaults = await Exam.updateMany(
        {
            $or: [
                { group_category: { $exists: false } },
                { share_link: { $exists: false } },
                { short_link: { $exists: false } },
                { share_link_expires_at: { $exists: false } },
                { deliveryMode: { $exists: false } },
                { bannerSource: { $exists: false } },
                { autosave_interval_sec: { $exists: false } },
                { accessControl: { $exists: false } },
                { 'security_policies.violation_action': { $exists: false } },
            ],
        },
        {
            $set: {
                group_category: 'Custom',
                share_link: '',
                short_link: '',
                share_link_expires_at: null,
                deliveryMode: 'internal',
                bannerSource: 'default',
                autosave_interval_sec: 5,
                'security_policies.violation_action': 'warn',
                accessControl: {
                    allowedGroupIds: [],
                    allowedPlanCodes: [],
                    allowedUserIds: [],
                },
            },
        },
    );

    // Backfill delivery mode by existing external URL for historical exams.
    const examDeliveryModeBackfill = await Exam.updateMany(
        {
            $or: [
                { deliveryMode: { $exists: false } },
                { deliveryMode: 'internal', externalExamUrl: { $type: 'string', $ne: '' } },
            ],
        },
        [
            {
                $set: {
                    deliveryMode: {
                        $cond: [
                            { $gt: [{ $strLenCP: { $ifNull: ['$externalExamUrl', ''] } }, 0] },
                            'external_link',
                            'internal',
                        ],
                    },
                    bannerSource: {
                        $cond: [
                            { $gt: [{ $strLenCP: { $ifNull: ['$bannerImageUrl', ''] } }, 0] },
                            'url',
                            'default',
                        ],
                    },
                },
            },
        ],
    );

    const sessionDefaults = await ExamSession.updateMany(
        {
            $or: [
                { copyAttemptCount: { $exists: false } },
                { fullscreenExitCount: { $exists: false } },
                { violationsCount: { $exists: false } },
                { currentQuestionId: { $exists: false } },
                { sessionLocked: { $exists: false } },
                { lockReason: { $exists: false } },
            ],
        },
        {
            $set: {
                copyAttemptCount: 0,
                fullscreenExitCount: 0,
                violationsCount: 0,
                currentQuestionId: '',
                sessionLocked: false,
                lockReason: '',
            },
        },
    );

    const bannerDefaults = await Banner.updateMany(
        {
            $or: [
                { slot: { $exists: false } },
                { priority: { $exists: false } },
                { status: { $exists: false } },
            ],
        },
        {
            $set: {
                slot: 'top',
                priority: 0,
                status: 'draft',
            },
        },
    );

    const alertDefaults = await HomeAlert.updateMany(
        {
            $or: [
                { title: { $exists: false } },
                { status: { $exists: false } },
                { requireAck: { $exists: false } },
                { target: { $exists: false } },
                { metrics: { $exists: false } },
            ],
        },
        {
            $set: {
                title: '',
                status: 'draft',
                requireAck: false,
                target: { type: 'all', groupIds: [], userIds: [] },
                metrics: { impressions: 0, acknowledgements: 0 },
            },
        },
    );

    report.updates = {
        examsModified: Number(examDefaults.modifiedCount || 0),
        examsDeliveryModeBackfilled: Number(examDeliveryModeBackfill.modifiedCount || 0),
        sessionsModified: Number(sessionDefaults.modifiedCount || 0),
        bannersModified: Number(bannerDefaults.modifiedCount || 0),
        alertsModified: Number(alertDefaults.modifiedCount || 0),
    };

    await Exam.createIndexes();
    await Question.createIndexes();
    await QuestionRevision.createIndexes();
    await ExamSession.createIndexes();
    await ExamEvent.createIndexes();
    await Banner.createIndexes();
    await HomeAlert.createIndexes();
    await LiveAlertAck.createIndexes();

    report.indexes = [
        'Exam',
        'Question',
        'QuestionRevision',
        'ExamSession',
        'ExamEvent',
        'Banner',
        'HomeAlert',
        'LiveAlertAck',
    ];
    report.completedAt = new Date().toISOString();

    const reportDir = ensureReportDir();
    const reportPath = path.join(reportDir, 'exam-console-v1-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('[migrate:exam-console-v1] completed');
    console.log(`[migrate:exam-console-v1] report: ${reportPath}`);

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:exam-console-v1] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});
