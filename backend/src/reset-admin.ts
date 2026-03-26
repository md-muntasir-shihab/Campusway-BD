
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import dotenv from 'dotenv';
dotenv.config();

async function reset() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');
    const hashed = await bcrypt.hash('admin123456', 12);
    await User.findOneAndUpdate(
        { email: 'admin@campusway.com' },
        { password: hashed, mustChangePassword: true, status: 'active' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('Admin (admin@campusway.com) password reset to: admin123456');
    process.exit(0);
}
reset();
