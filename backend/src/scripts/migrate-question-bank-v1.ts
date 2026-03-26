import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Question from '../models/Question';
import QuestionRevision from '../models/QuestionRevision';
import QuestionMedia from '../models/QuestionMedia';
import QuestionImportJob from '../models/QuestionImportJob';

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
            'Any collection rebuild/drop action must be reviewed manually.',
        ],
    };

    await mongoose.connect(uri);
    console.log('[migrate:question-bank-v1] connected');

    report.precheck = {
        missingClassLevel: await Question.countDocuments({ class_level: { $exists: false } }),
        missingStatus: await Question.countDocuments({ status: { $exists: false } }),
        missingQualityScore: await Question.countDocuments({ quality_score: { $exists: false } }),
        missingRevisionNo: await Question.countDocuments({ revision_no: { $exists: false } }),
        missingUsageCount: await Question.countDocuments({ usage_count: { $exists: false } }),
        missingCorrectAnswerArray: await Question.countDocuments({ correct_answer: { $exists: false } }),
        missingOptionsArray: await Question.countDocuments({ options: { $exists: false } }),
    };

    const defaults = await Question.updateMany(
        {
            $or: [
                { class_level: { $exists: false } },
                { department: { $exists: false } },
                { topic: { $exists: false } },
                { question_text: { $exists: false } },
                { question_html: { $exists: false } },
                { question_type: { $exists: false } },
                { options: { $exists: false } },
                { correct_answer: { $exists: false } },
                { status: { $exists: false } },
                { quality_score: { $exists: false } },
                { quality_flags: { $exists: false } },
                { flagged_duplicate: { $exists: false } },
                { duplicate_of_ids: { $exists: false } },
                { revision_no: { $exists: false } },
                { usage_count: { $exists: false } },
                { avg_correct_pct: { $exists: false } },
                { media_status: { $exists: false } },
                { media_alt_text_bn: { $exists: false } },
                { manual_flags: { $exists: false } },
                { has_explanation: { $exists: false } },
            ],
        },
        {
            $set: {
                class_level: '',
                department: '',
                topic: '',
                question_text: '',
                question_html: '',
                question_type: 'MCQ',
                options: [],
                correct_answer: [],
                status: 'draft',
                quality_score: 0,
                quality_flags: [],
                flagged_duplicate: false,
                duplicate_of_ids: [],
                revision_no: 1,
                usage_count: 0,
                avg_correct_pct: null,
                media_status: 'approved',
                media_alt_text_bn: '',
                manual_flags: [],
                has_explanation: false,
            },
        },
    );

    // Backfill question_text from legacy question when empty.
    const copiedLegacyText = await Question.updateMany(
        { $or: [{ question_text: '' }, { question_text: { $exists: false } }], question: { $exists: true, $ne: '' } },
        [{ $set: { question_text: '$question' } }],
    );

    // Backfill option fields into options array if options missing.
    const legacyOptionsBackfill = await Question.updateMany(
        {
            $and: [
                { $or: [{ options: { $exists: false } }, { options: { $size: 0 } }] },
                {
                    $or: [
                        { optionA: { $exists: true, $ne: '' } },
                        { optionB: { $exists: true, $ne: '' } },
                        { optionC: { $exists: true, $ne: '' } },
                        { optionD: { $exists: true, $ne: '' } },
                    ],
                },
            ],
        },
        [
            {
                $set: {
                    options: {
                        $filter: {
                            input: [
                                { key: 'A', text: '$optionA' },
                                { key: 'B', text: '$optionB' },
                                { key: 'C', text: '$optionC' },
                                { key: 'D', text: '$optionD' },
                            ],
                            as: 'option',
                            cond: { $gt: [{ $strLenCP: { $ifNull: ['$$option.text', ''] } }, 0] },
                        },
                    },
                },
            },
        ],
    );

    report.updates = {
        defaultsModified: Number(defaults.modifiedCount || 0),
        copiedLegacyText: Number(copiedLegacyText.modifiedCount || 0),
        legacyOptionsBackfill: Number(legacyOptionsBackfill.modifiedCount || 0),
    };

    await Question.createIndexes();
    await QuestionRevision.createIndexes();
    await QuestionMedia.createIndexes();
    await QuestionImportJob.createIndexes();

    report.indexes = ['Question', 'QuestionRevision', 'QuestionMedia', 'QuestionImportJob'];
    report.completedAt = new Date().toISOString();

    const reportDir = ensureReportDir();
    const reportPath = path.join(reportDir, 'question-bank-v1-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('[migrate:question-bank-v1] completed');
    console.log(`[migrate:question-bank-v1] report: ${reportPath}`);

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('[migrate:question-bank-v1] failed', err);
    await mongoose.disconnect();
    process.exit(1);
});
