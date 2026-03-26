
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function reset() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    const hashedPassword = await bcrypt.hash('admin123456789', 10);

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
