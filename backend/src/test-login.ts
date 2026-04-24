
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    const email = process.env.TEST_LOGIN_EMAIL || 'admin@campusway.com';
    const password = process.env.TEST_LOGIN_PASSWORD || '';

    if (!password) {
        console.log('TEST_LOGIN_PASSWORD env var is required');
        process.exit(1);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        console.log('User not found');
        process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('User role:', user.role);
    console.log('User status:', user.status);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match:', isMatch);

    await mongoose.disconnect();
}

testLogin();
