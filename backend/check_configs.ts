import mongoose from 'mongoose';

const DB_URI = 'mongodb://localhost:27017/campusway';

async function check() {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB.');

    if (!mongoose.connection.db) throw new Error('Database connection failed');

    const home = await mongoose.connection.db.collection('homepages').findOne();
    console.log('HomePage Config:', JSON.stringify(home, null, 2));

    const settings = await mongoose.connection.db.collection('websitesettings').findOne();
    console.log('WebsiteSettings:', JSON.stringify(settings, null, 2));

    const studentDashboardConfig = await mongoose.connection.db.collection('studentdashboardconfigs').findOne();
    console.log('StudentDashboardConfig:', JSON.stringify(studentDashboardConfig, null, 2));

    await mongoose.disconnect();
}

check().catch(console.error);
