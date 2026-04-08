/**
 * One-time migration script: Disable 2FA for all users in the database.
 * Run with: npx tsx src/scripts/disable-2fa-all-users.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || '';

async function main() {
    if (!MONGO_URI) {
        console.error('ERROR: MONGO_URI is not set');
        process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');

    const result = await mongoose.connection.collection('users').updateMany(
        { twoFactorEnabled: true },
        {
            $set: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: [],
                two_factor_method: null,
            }
        }
    );

    console.log(`✅ Updated ${result.modifiedCount} users — twoFactorEnabled set to false`);
    await mongoose.disconnect();
}

main().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
