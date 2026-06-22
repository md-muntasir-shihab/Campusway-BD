/**
 * Diagnostic script — reproduces Exam Center server-side calls directly against
 * the configured MongoDB so we can see the REAL error stacks (the API only
 * returns a generic 500 message).
 *
 * Run: npx tsx scripts/diag-exam-center.ts
 * Safe: creates a draft exam then deletes it; never touches real published data.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import * as ExamBuilderService from '../src/services/ExamBuilderService';
import * as QuestionBankService from '../src/services/QuestionBankService';

const MONGO = process.env.MONGODB_URI || process.env.MONGO_URI || '';

async function main() {
    if (!MONGO) throw new Error('No MONGODB_URI/MONGO_URI in env');
    console.log('Connecting to Mongo...');
    await mongoose.connect(MONGO);
    console.log('Connected. DB:', mongoose.connection.name);

    // ── 1. listQuestions (Question Bank "No questions found") ──
    try {
        const res = await QuestionBankService.listQuestions({} as any, { page: 1, limit: 5 });
        console.log('\n[listQuestions] OK total=%d returned=%d', res.total, res.data.length);
    } catch (e) {
        console.error('\n[listQuestions] THREW:', e);
    }

    // ── 2. createExamDraft (Exam Builder 500) ──
    let draftId: string | null = null;
    try {
        const fakeAdminId = new mongoose.Types.ObjectId().toString();
        const exam = await ExamBuilderService.createExamDraft({
            title: 'DIAG test',
            title_bn: 'টেস্ট',
            description: 'diag',
            exam_type: 'Practice',
            duration: 60,
            createdBy: fakeAdminId,
        } as any);
        draftId = String(exam._id);
        console.log('\n[createExamDraft] OK id=%s', draftId);
    } catch (e) {
        console.error('\n[createExamDraft] THREW:', e);
    }

    // ── 2b. createExamDraft WITH hierarchy filters (mirrors the UI form) ──
    try {
        const fakeAdminId = new mongoose.Types.ObjectId().toString();
        const exam = await ExamBuilderService.createExamDraft({
            title: 'DIAG test 2',
            title_bn: 'টেস্ট ২',
            description: 'diag with hierarchy',
            exam_type: 'Practice',
            duration: 60,
            group_id: new mongoose.Types.ObjectId().toString(),
            sub_group_id: new mongoose.Types.ObjectId().toString(),
            subject_id: new mongoose.Types.ObjectId().toString(),
            createdBy: fakeAdminId,
        } as any);
        console.log('[createExamDraft+hierarchy] OK id=%s', String(exam._id));
        await mongoose.connection.collection('exam_collection').deleteOne({ _id: exam._id });
    } catch (e) {
        console.error('\n[createExamDraft+hierarchy] THREW:', e);
    }

    // cleanup draft 1
    if (draftId) {
        await mongoose.connection.collection('exam_collection').deleteOne({ _id: new mongoose.Types.ObjectId(draftId) });
        console.log('cleaned up diag drafts');
    }

    // ── 3. Count questions in the collection the bank reads from ──
    try {
        const coll = mongoose.connection.db!.collection('questionbankquestions');
        const c = await coll.countDocuments();
        console.log('\n[questionbankquestions] documents=%d', c);
        const coll2 = mongoose.connection.db!.collection('questions');
        const c2 = await coll2.countDocuments();
        console.log('[questions (legacy)] documents=%d', c2);
    } catch (e) {
        console.error('[count] THREW:', e);
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
