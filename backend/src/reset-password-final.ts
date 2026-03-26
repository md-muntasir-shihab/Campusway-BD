
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function reset() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Fix admin
    await User.updateOne(
        { email: 'admin@campusway.com' },
        {
            $set: {
                password: hashedPassword,
                status: 'active',
                loginAttempts: 0,
                lockUntil: null,
                mustChangePassword: false
            }
        }
    );

    // Fix student
    await User.updateOne(
        { email: 'student@campusway.com' },
        {
            $set: {
                password: hashedPassword,
                status: 'active',
                loginAttempts: 0,
                lockUntil: null,
                mustChangePassword: false
            }
        }
    );

    console.log('Admin and Student passwords reset to: admin123');

    await mongoose.disconnect();
}

reset();
