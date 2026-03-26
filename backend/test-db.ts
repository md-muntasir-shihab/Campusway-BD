import mongoose from 'mongoose';
import WebsiteSettings from './src/models/WebsiteSettings';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function testUpdate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway');
        console.log('Connected to DB');

        const settings = await WebsiteSettings.findOneAndUpdate(
            {},
            { $set: { websiteName: 'CampusWay Updated Test' } },
            { new: true, upsert: true }
        );

        console.log('Updated Settings:', settings);
        await mongoose.disconnect();
    } catch (err) {
        console.error('Update test error:', err);
    }
}

testUpdate();
