import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SecuritySettings from '../models/SecuritySettings';

dotenv.config();

async function run(): Promise<void> {
    const uri = String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(uri);
    console.log('[testing-access-mode] connected');

    const result = await SecuritySettings.updateOne(
        { key: 'global' },
        {
            $set: {
                'runtimeGuards.testingAccessMode': true,
                'verificationRecovery.requireVerifiedEmailForAdmins': false,
                'verificationRecovery.requireVerifiedEmailForStudents': false,
            },
            $setOnInsert: { key: 'global' },
        },
        { upsert: true },
    );

    const settings = await SecuritySettings.findOne({ key: 'global' })
        .select('runtimeGuards.testingAccessMode verificationRecovery.requireVerifiedEmailForAdmins verificationRecovery.requireVerifiedEmailForStudents')
        .lean();

    console.log('[testing-access-mode] summary:', {
        matched: Number(result.matchedCount || 0),
        modified: Number(result.modifiedCount || 0),
        upsertedId: result.upsertedId || null,
        testingAccessMode: Boolean(settings?.runtimeGuards?.testingAccessMode),
        requireVerifiedEmailForAdmins: Boolean(settings?.verificationRecovery?.requireVerifiedEmailForAdmins),
        requireVerifiedEmailForStudents: Boolean(settings?.verificationRecovery?.requireVerifiedEmailForStudents),
        dbName: mongoose.connection.name,
    });

    await mongoose.disconnect();
    console.log('[testing-access-mode] completed');
}

run().catch(async (error) => {
    console.error('[testing-access-mode] failed:', error);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => undefined);
    }
    process.exit(1);
});
