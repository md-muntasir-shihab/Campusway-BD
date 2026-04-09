import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusway');
    
    const adminHash = await bcrypt.hash('admin123456', 12);
    const r1 = await mongoose.connection.collection('users').updateOne(
        { email: 'admin@campusway.com' },
        { $set: { password: adminHash, mustChangePassword: false } }
    );
    console.log('Admin password reset:', r1.modifiedCount);

    const studentHash = await bcrypt.hash('student123456', 12);
    const r2 = await mongoose.connection.collection('users').updateOne(
        { username: 'campus_test_user' },
        { $set: { password: studentHash, mustChangePassword: false } }
    );
    console.log('Student password reset:', r2.modifiedCount);

    // Also ensure student email matches expected seed
    const r3 = await mongoose.connection.collection('users').updateOne(
        { username: 'campus_test_user' },
        { $set: { email: 'student@campusway.com' } }
    );
    console.log('Student email set to student@campusway.com:', r3.modifiedCount);

    await mongoose.disconnect();
    console.log('Done.');
}

main().catch(console.error);
