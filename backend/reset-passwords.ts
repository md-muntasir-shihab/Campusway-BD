/**
 * Quick script to reset admin & student passwords for local testing.
 * Run: npx tsx reset-passwords.ts
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusway';

async function main() {
    await mongoose.connect(MONGO_URI);
    const db = mongoose.connection.db!;
    const users = db.collection('users');

    const adminHash = await bcrypt.hash('Admin@123', 12);
    const studentHash = await bcrypt.hash('Student@123', 12);

    // Reset admin
    const adminResult = await users.updateOne(
        { role: 'superadmin' },
        { $set: { password: adminHash, mustChangePassword: false } }
    );
    console.log(adminResult.modifiedCount ? '✅ Admin password reset to: Admin@123' : '⚠️ No superadmin found');

    // Reset or create student
    const existingStudent = await users.findOne({ username: 'campus_test_user' });
    if (existingStudent) {
        await users.updateOne(
            { username: 'campus_test_user' },
            { $set: { password: studentHash, mustChangePassword: false } }
        );
        console.log('✅ Student password reset to: Student@123');
    } else {
        await users.insertOne({
            username: 'campus_test_user',
            full_name: 'Test Student',
            email: 'teststudent@campusway.local',
            password: studentHash,
            role: 'student',
            status: 'active',
            mustChangePassword: false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            subscription: {
                plan: 'demo', planCode: 'demo', planName: 'Demo Plan',
                isActive: true, startDate: new Date(),
                expiryDate: new Date(Date.now() + 30 * 86400000), assignedAt: new Date(),
            },
        });
        console.log('✅ Student created with password: Student@123');
    }

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
