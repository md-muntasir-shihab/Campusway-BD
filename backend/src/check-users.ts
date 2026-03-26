
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';
import StudentProfile from './models/StudentProfile';
import AdminProfile from './models/AdminProfile';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');
    const users = await User.find({});
    const profiles = await StudentProfile.find({});
    const adminProfiles = await AdminProfile.find({});

    console.log('--- USERS ---');
    users.forEach(u => {
        console.log(`Email: ${u.email}, Role: ${u.role}, Status: ${u.status}, Name: "${u.full_name}", ID: ${u._id}`);
        const profile = profiles.find(p => p.user_id.toString() === u._id.toString());
        console.log(`  Profile found: ${!!profile}`);
    });

    console.log('--- ADMIN PROFILES ---');
    adminProfiles.forEach(p => {
        console.log(`User ID: ${p.user_id}, Name: ${p.admin_name}, Role: ${p.role_level}`);
    });

    await mongoose.disconnect();
}

check();
