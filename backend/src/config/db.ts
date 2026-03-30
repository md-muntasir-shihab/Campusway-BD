import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/campusway';

async function ensureCriticalIndexes(): Promise<void> {
    const db = mongoose.connection;
    if (!db.db) return;

    try {
        // --- Student Results ---
        const results = db.db.collection('student_results');
        const resultIndexes = await results.indexes();
        const legacyUnique = resultIndexes.find((idx) =>
            idx.name === 'exam_1_student_1'
            && idx.unique === true
            && idx.key?.exam === 1
            && idx.key?.student === 1
        );
        if (legacyUnique) {
            await results.dropIndex('exam_1_student_1');
            console.log('[db] Dropped legacy index student_results.exam_1_student_1');
        }
        const hasCurrentUnique = resultIndexes.some((idx) =>
            idx.unique === true
            && idx.key?.exam === 1
            && idx.key?.student === 1
            && idx.key?.attemptNo === 1
        );
        if (!hasCurrentUnique) {
            await results.createIndex(
                { exam: 1, student: 1, attemptNo: 1 },
                { unique: true, name: 'exam_1_student_1_attemptNo_1' }
            );
            console.log('[db] Ensured index student_results.exam_1_student_1_attemptNo_1');
        }

        // --- Users ---
        const users = db.db.collection('users');
        const userIndexes = await users.indexes();
        const legacyUserIdUnique = userIndexes.find((idx) =>
            idx.name === 'userId_1'
            && idx.unique === true
            && idx.key?.userId === 1
        );
        if (legacyUserIdUnique) {
            await users.dropIndex('userId_1');
            console.log('[db] Dropped legacy index users.userId_1');
        }
        await Promise.all([
            users.createIndex({ email: 1 }, { unique: true, name: 'email_1' }).catch(() => { }),
            users.createIndex({ username: 1 }, { unique: true, name: 'username_1' }).catch(() => { }),
            users.createIndex({ role: 1, status: 1 }, { name: 'role_1_status_1' }).catch(() => { }),
        ]);

        // --- Exams ---
        const exams = db.db.collection('exam_collection');
        await Promise.all([
            exams.createIndex({ share_link: 1 }, { sparse: true, unique: true, name: 'share_link_1' }).catch(() => { }),
            exams.createIndex({ startTime: 1, endTime: 1 }, { name: 'startTime_1_endTime_1' }).catch(() => { }),
            exams.createIndex({ publishTime: -1 }, { name: 'publishTime_-1' }).catch(() => { }),
            exams.createIndex({ status: 1 }, { name: 'status_1' }).catch(() => { }),
        ]);

        // --- Exam Sessions ---
        const sessions = db.db.collection('exam_sessions');
        await Promise.all([
            sessions.createIndex({ exam: 1, user: 1 }, { name: 'exam_1_user_1' }).catch(() => { }),
            sessions.createIndex({ status: 1, expiresAtUTC: 1 }, { name: 'status_1_expiresAtUTC_1' }).catch(() => { }),
        ]);

        // --- Payments ---
        const payments = db.db.collection('manual_payments');
        await Promise.all([
            payments.createIndex({ reference: 1 }, { sparse: true, name: 'reference_1' }).catch(() => { }),
            payments.createIndex({ date: -1 }, { name: 'date_-1' }).catch(() => { }),
            payments.createIndex({ studentId: 1, status: 1 }, { name: 'studentId_1_status_1' }).catch(() => { }),
        ]);

        // --- Universities ---
        const universities = db.db.collection('universities');
        await Promise.all([
            universities.createIndex({ category: 1 }, { name: 'category_1' }).catch(() => { }),
            universities.createIndex({ clusterGroup: 1 }, { name: 'clusterGroup_1' }).catch(() => { }),
            universities.createIndex({ name: 'text', shortForm: 'text' }, { name: 'name_text_shortForm_text' }).catch(() => { }),
        ]);

        // --- News ---
        const news = db.db.collection('news');
        await Promise.all([
            news.createIndex({ status: 1, publishedAt: -1 }, { name: 'status_1_publishedAt_-1' }).catch(() => { }),
            news.createIndex({ sourceId: 1 }, { name: 'sourceId_1' }).catch(() => { }),
            news.createIndex({ slug: 1 }, { unique: true, sparse: true, name: 'slug_1' }).catch(() => { }),
        ]);

        // --- Student Profiles ---
        const studentProfiles = db.db.collection('student_profiles');
        await Promise.all([
            studentProfiles.createIndex({ user_id: 1 }, { unique: true, name: 'user_id_1' }).catch(() => { }),
            studentProfiles.createIndex({ points: -1 }, { name: 'points_-1' }).catch(() => { }),
        ]);

        // --- Webhook Events ---
        const webhookEvents = db.db.collection('paymentwebhookevents');
        await Promise.all([
            webhookEvents.createIndex({ provider: 1, externalId: 1 }, { name: 'provider_1_externalId_1' }).catch(() => { }),
            webhookEvents.createIndex({ receivedAt: -1 }, { name: 'receivedAt_-1' }).catch(() => { }),
        ]);

        console.log('[db] All critical indexes ensured');
    } catch (error) {
        console.error('[db] Failed to ensure critical indexes:', error);
    }
}

export async function connectDB(): Promise<void> {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[db] MongoDB connected successfully');
        await ensureCriticalIndexes();
    } catch (error) {
        console.error('[db] MongoDB connection error:', error);
        // process.exit(1);
    }
}

mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err);
});
