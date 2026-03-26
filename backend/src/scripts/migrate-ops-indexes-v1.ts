import dotenv from 'dotenv';
import mongoose from 'mongoose';
import University from '../models/University';
import News from '../models/News';
import Exam from '../models/Exam';
import ExamSession from '../models/ExamSession';
import ManualPayment from '../models/ManualPayment';
import User from '../models/User';

dotenv.config();

type IndexTask = {
    collection: string;
    name: string;
    keys: Record<string, 1 | -1>;
};

const INDEX_TASKS: IndexTask[] = [
    {
        collection: University.collection.name,
        name: 'ops_university_category_cluster_name',
        keys: { category: 1, clusterGroup: 1, name: 1 },
    },
    {
        collection: News.collection.name,
        name: 'ops_news_status_publishedAt_sourceId',
        keys: { status: 1, publishedAt: -1, sourceId: 1 },
    },
    {
        collection: Exam.collection.name,
        name: 'ops_exam_start_end_status',
        keys: { startDate: 1, endDate: 1, status: 1 },
    },
    {
        collection: ExamSession.collection.name,
        name: 'ops_exam_session_expires_status',
        keys: { expiresAt: 1, status: 1 },
    },
    {
        collection: ManualPayment.collection.name,
        name: 'ops_manual_payment_status_student',
        keys: { status: 1, studentId: 1 },
    },
    {
        collection: User.collection.name,
        name: 'ops_user_username_email_phone',
        keys: { username: 1, email: 1, phone_number: 1 },
    },
];

async function run(): Promise<void> {
    const mongoUri = String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
    if (!mongoUri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(mongoUri);
    console.log('[migrate-ops-indexes-v1] connected');

    for (const task of INDEX_TASKS) {
        const collection = mongoose.connection.collection(task.collection);
        await collection.createIndex(task.keys, { name: task.name, background: true });
        console.log(`[migrate-ops-indexes-v1] ensured index ${task.collection}.${task.name}`);
    }

    await mongoose.disconnect();
    console.log('[migrate-ops-indexes-v1] completed');
}

run().catch(async (error) => {
    console.error('[migrate-ops-indexes-v1] failed', error);
    try {
        await mongoose.disconnect();
    } catch {
        // ignore disconnect failures
    }
    process.exit(1);
});

