
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function fix() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');

    // Fix admin
    const admin = await User.findOne({ email: 'admin@campusway.com' });
    if (admin) {
        admin.full_name = 'Super Admin';
        await admin.save();
        console.log('Fixed admin full_name');
    }

    // Fix student
    const student = await User.findOne({ email: 'student@campusway.com' });
    if (student) {
        student.full_name = 'Test Student';
        await student.save();
        console.log('Fixed student full_name');
    }

    // Fix any other users that might have undefined full_name
    const otherUsers = await User.find({ full_name: { $exists: false } });
    for (const u of otherUsers) {
        u.full_name = u.username || 'User';
        await u.save();
        console.log(`Fixed user ${u.email} full_name`);
    }

    await mongoose.disconnect();
}

fix();
