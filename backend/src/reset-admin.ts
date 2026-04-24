
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import dotenv from 'dotenv';
dotenv.config();

async function reset() {
    const newPassword = process.env.RESET_PASSWORD;
    if (!newPassword) {
        console.error('RESET_PASSWORD env var is required');
        process.exit(1);
    }
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.findOneAndUpdate(
        { email: 'admin@campusway.com' },
        { password: hashed, mustChangePassword: true, status: 'active' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Admin (admin@campusway.com) password has been reset.');
    process.exit(0);
}
reset();
