import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import WebsiteSettings from '../models/WebsiteSettings';

dotenv.config();

async function run() {
    await connectDB();
    const result = await WebsiteSettings.updateOne({}, {
        $set: {
            'pageHeroSettings.about.enabled': true,
            'pageHeroSettings.terms.enabled': true,
            'pageHeroSettings.privacy.enabled': true,
            'pageHeroSettings.home.enabled': true,
            'pageHeroSettings.universities.enabled': true,
            'pageHeroSettings.news.enabled': true,
            'pageHeroSettings.exams.enabled': true,
            'pageHeroSettings.resources.enabled': true,
            'pageHeroSettings.contact.enabled': true,
            'pageHeroSettings.subscriptionPlans.enabled': true,
            'pageHeroSettings.helpCenter.enabled': true,
        },
    });
    console.log('[hero] All hero banners RE-ENABLED. Modified:', result.modifiedCount);
    await mongoose.connection.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
