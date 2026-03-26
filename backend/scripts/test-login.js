
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

// Mock Response
const res = {
    status: function (code) {
        this.statusCode = code;
        console.log('Response Status:', code);
        return this;
    },
    json: function (data) {
        console.log('Response JSON:', JSON.stringify(data, null, 2));
        return this;
    },
    cookie: function (name, value, options) {
        console.log('Set Cookie:', name);
    }
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway';

async function testLogin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // We need the controller but it might use imports that node doesn't like directly
        // So let's re-implement the core logic or try to require it if it's compiled
        // Since it's TS, it might not be compiled to the same directory

        const User = require('../src/models/User').default;
        const StudentProfile = require('../src/models/StudentProfile').default;
        const AdminProfile = require('../src/models/AdminProfile').default;

        const email = 'admin@campusway.com';
        const password = 'password123'; // assuming this is a default or common one

        console.log(`Attempting login for: ${email}`);

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            console.log('User not found');
            return;
        }

        console.log('User found:', user.email, 'Role:', user.role);

        // Let's see if we can compare password
        // If we don't know the password, we can't test isMatch, but we can see if bcrypt crashes
        try {
            const isMatch = await bcrypt.compare(password, user.password);
            console.log('Bcrypt comparison result:', isMatch);
        } catch (e) {
            console.error('Bcrypt error:', e);
        }

        // Test the parts that usually fail
        user.loginAttempts = 0;
        user.lastLogin = new Date();
        console.log('Saving user...');
        await user.save();
        console.log('User saved successfully');

        let fullName = '';
        if (user.role === 'student') {
            const profile = await StudentProfile.findOne({ user_id: user._id });
            fullName = profile?.full_name || user.username;
            console.log('Student Profile found:', !!profile);
        } else {
            console.log('Looking for Admin Profile for user_id:', user._id);
            const profile = await AdminProfile.findOne({ user_id: user._id });
            fullName = profile?.admin_name || user.username;
            console.log('Admin Profile found:', !!profile);
        }

        console.log('Final FullName:', fullName);

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Login simulation error:', err);
    }
}

testLogin();
