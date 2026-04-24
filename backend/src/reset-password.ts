
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function reset() {
    const newPassword = process.env.RESET_PASSWORD;
    if (!newPassword) {
        console.error('RESET_PASSWORD env var is required');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Explicitly set the password for the student account
    const result = await User.updateOne(
        { email: 'student@campusway.com' },
        {
            $set: {
                password: hashedPassword,
                status: 'active',
                loginAttempts: 0,
                lockUntil: null
            }
        }
    );

    console.log('Password reset result:', result);

    await mongoose.disconnect();
}

reset();
