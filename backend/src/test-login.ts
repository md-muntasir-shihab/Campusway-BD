
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User';
import dotenv from 'dotenv';
dotenv.config();

async function testLogin() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    const email = 'admin@campusway.com';
    const password = 'admin123456';

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
