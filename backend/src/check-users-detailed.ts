
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');
    const users = await User.find({});

    console.log('--- ALL USERS ---');
    users.forEach(u => {
        console.log(`Email: ${u.email}`);
        console.log(`  Username: "${u.username}"`);
        console.log(`  Role: ${u.role}`);
        console.log(`  Status: ${u.status}`);
        console.log(`  Name: "${u.full_name}"`);
        console.log(`  ID: ${u._id}`);
        console.log('---');
    });

    await mongoose.disconnect();
}

check();
