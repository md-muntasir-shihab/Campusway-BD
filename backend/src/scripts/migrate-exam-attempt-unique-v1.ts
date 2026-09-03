/**
 * Migration: ensure the unique (exam, student, attemptNo) index exists on the
 * exam_attempts collection. Guards against duplicate active sessions per
 * attempt (fix B-4). The index is also declared in the schema, but this script
 * makes the index explicit/idempotent for already-deployed databases.
 *
 * Safe to re-run: createIndex is a no-op when the index already exists.
 *
 * Usage: npx tsx src/scripts/migrate-exam-attempt-unique-v1.ts
 */
import mongoose from 'mongoose';
import ExamSession from '../models/ExamSession';
import { logger } from '../utils/logger';

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusway';
    await mongoose.connect(uri);
    logger.info('[migrate-exam-attempt-unique-v1] connected; building index...');

    await ExamSession.collection.createIndex(
        { exam: 1, student: 1, attemptNo: 1 },
        { unique: true, name: 'exam_student_attempt_unique', background: true },
    );

    const indexes = await ExamSession.collection.indexes();
    const present = indexes.some((idx) => idx.name === 'exam_student_attempt_unique');
    logger.info(`[migrate-exam-attempt-unique-v1] index present: ${present}`);
    if (!present) {
        throw new Error('Failed to create exam_student_attempt_unique index');
    }
    await mongoose.disconnect();
    logger.info('[migrate-exam-attempt-unique-v1] done');
}

run().catch((err) => {
    logger.error('[migrate-exam-attempt-unique-v1] failed', err);
    process.exit(1);
});
