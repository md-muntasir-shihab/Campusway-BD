
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusway';

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const Banner = mongoose.model('Banner', new mongoose.Schema({}, { strict: false }));
        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        console.log('\n--- Banners ---');
        const now = new Date();
        const allBanners = await Banner.find();
        console.log(`Total banners in DB: ${allBanners.length}`);

        allBanners.forEach(b => {
            console.log(`ID: ${b._id}, Title: ${b.title}, Active: ${b.isActive}, Start: ${b.startDate}, End: ${b.endDate}`);
        });

        const activeBanners = await Banner.find({
            isActive: true,
            $or: [
                { startDate: { $lte: now }, endDate: { $gte: now } },
                { startDate: { $exists: false }, endDate: { $exists: false } },
                { startDate: null, endDate: null }
            ]
        });
        console.log(`Banners matching current query: ${activeBanners.length}`);

        console.log('\n--- Users ---');
        const count = await User.countDocuments();
        console.log(`Total users: ${count}`);

        const sampleUser = await User.findOne();
        if (sampleUser) {
            console.log(`Sample user: ${sampleUser.email}, Role: ${sampleUser.role}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('❌ Error:', err);
    }
}

test();
