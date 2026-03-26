import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SiteSettings from '../models/Settings';
import User from '../models/User';
import ActiveSession from '../models/ActiveSession';

dotenv.config();

async function run(): Promise<void> {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGODB_URI (or MONGO_URI) is required');
    }

    await mongoose.connect(uri);
    console.log('[security-migrate] connected');

    const settings = await SiteSettings.findOne();
    if (!settings) {
        await SiteSettings.create({});
    }

    await SiteSettings.updateOne(
        {},
        {
            $set: {
                'security.singleBrowserLogin': true,
                'security.forceLogoutOnNewLogin': true,
                'security.enable2faAdmin': false,
                'security.enable2faStudent': false,
                'security.force2faSuperAdmin': false,
                'security.default2faMethod': 'email',
                'security.otpExpiryMinutes': 5,
                'security.maxOtpAttempts': 5,
                'security.ipChangeAlert': true,
                'security.allowLegacyTokens': true,
                'security.strictExamTabLock': false,
                'security.strictTokenHashValidation': false,
                'featureFlags.studentDashboardV2': true,
                'featureFlags.studentManagementV2': true,
                'featureFlags.subscriptionEngineV2': false,
                'featureFlags.examShareLinks': false,
                'featureFlags.proctoringSignals': false,
                'featureFlags.aiQuestionSuggestions': false,
                'featureFlags.pushNotifications': false,
                'featureFlags.strictExamTabLock': false,
                'featureFlags.webNextEnabled': false,
                runtimeVersion: 1,
            },
        },
        { upsert: true }
    );

    const twoFaFixResult = await User.updateMany(
        {
            twoFactorEnabled: true,
            $or: [
                { two_factor_method: { $exists: false } },
                { two_factor_method: null },
                { two_factor_method: '' },
            ],
        },
        { $set: { two_factor_method: 'email' } }
    );

    const duplicateUsers = await ActiveSession.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$user_id', ids: { $push: '$_id' }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]);

    let terminatedCount = 0;
    for (const entry of duplicateUsers) {
        const sessions = await ActiveSession.find({ _id: { $in: entry.ids } })
            .sort({ login_time: -1, last_activity: -1, createdAt: -1 })
            .lean();

        const keep = sessions[0];
        const terminateIds = sessions
            .filter((session) => String(session._id) !== String(keep?._id))
            .map((session) => session._id);

        if (!terminateIds.length) continue;

        const result = await ActiveSession.updateMany(
            { _id: { $in: terminateIds }, status: 'active' },
            {
                $set: {
                    status: 'terminated',
                    terminated_reason: 'duplicate_session_reconcile',
                    terminated_at: new Date(),
                    termination_meta: { migration: 'security_hardening' },
                },
            }
        );

        terminatedCount += Number(result.modifiedCount || 0);
    }

    console.log('[security-migrate] summary:', {
        usersNormalizedWithEmail2FA: twoFaFixResult.modifiedCount,
        duplicateUsersDetected: duplicateUsers.length,
        sessionsTerminated: terminatedCount,
    });

    await mongoose.disconnect();
    console.log('[security-migrate] completed');
}

run().catch(async (error) => {
    console.error('[security-migrate] failed:', error);
    await mongoose.disconnect();
    process.exit(1);
});
