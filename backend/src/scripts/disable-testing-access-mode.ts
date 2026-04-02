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
    console.log('[testing-access-mode:disable] connected');

    const result = await SecuritySettings.updateOne(
        { key: 'global' },
        {
            $set: {
                'runtimeGuards.testingAccessMode': false,
                'twoFactor.requireForRoles': [],
                'adminAccess.require2FAForAdmins': false,
                'verificationRecovery.requireVerifiedEmailForAdmins': false,
                'verificationRecovery.requireVerifiedEmailForStudents': false,
            },
            $setOnInsert: { key: 'global' },
        },
        { upsert: true },
    );

    const settings = await SecuritySettings.findOne({ key: 'global' })
        .select('runtimeGuards.testingAccessMode twoFactor.requireForRoles adminAccess.require2FAForAdmins verificationRecovery.requireVerifiedEmailForAdmins verificationRecovery.requireVerifiedEmailForStudents')
        .lean();

    console.log('[testing-access-mode:disable] summary:', {
        matched: Number(result.matchedCount || 0),
        modified: Number(result.modifiedCount || 0),
        upsertedId: result.upsertedId || null,
        testingAccessMode: Boolean(settings?.runtimeGuards?.testingAccessMode),
        requiredTwoFactorRoles: Array.isArray(settings?.twoFactor?.requireForRoles) ? settings?.twoFactor?.requireForRoles : [],
        require2FAForAdmins: Boolean(settings?.adminAccess?.require2FAForAdmins),
        requireVerifiedEmailForAdmins: Boolean(settings?.verificationRecovery?.requireVerifiedEmailForAdmins),
        requireVerifiedEmailForStudents: Boolean(settings?.verificationRecovery?.requireVerifiedEmailForStudents),
        dbName: mongoose.connection.name,
    });

    await mongoose.disconnect();
    console.log('[testing-access-mode:disable] completed');
}

run().catch(async (error) => {
    console.error('[testing-access-mode:disable] failed:', error);
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect().catch(() => undefined);
    }
    process.exit(1);
});
