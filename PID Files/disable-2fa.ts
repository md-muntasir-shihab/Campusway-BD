
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway';

async function disable2FA() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected.');

        const db = mongoose.connection.db;
        const collection = db.collection('security_settings');

        console.log('Updating security settings...');
        const result = await collection.updateOne(
            { key: 'global' },
            { $set: { 'adminAccess.require2FAForAdmins': false } }
        );

        if (result.modifiedCount > 0) {
            console.log('Successfully disabled 2FA for Admin Panel.');
        } else {
            console.log('No changes made. 2FA might already be disabled or key "global" not found.');
        }

        // Also check site settings for legacy support
        const siteCol = db.collection('sitesettings');
        await siteCol.updateOne(
            {},
            { $set: { 'security.enable2faAdmin': false, 'security.force2faSuperAdmin': false } }
        );
        console.log('Legacy site settings updated.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected.');
    }
}

disable2FA();
