import mongoose from 'mongoose';

const DB_URI = 'mongodb://localhost:27017/campusway';

async function check() {
    await mongoose.connect(DB_URI);
    console.log('Connected to DB.');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    const news = await db.collection('news').find().limit(5).toArray();
    console.log('News Content:', JSON.stringify(news, null, 2));

    const categories = await db.collection('newscategories').find().toArray();
    console.log('Categories:', JSON.stringify(categories, null, 2));

    const featured = await db.collection('news').find({ isFeatured: true }).toArray();
    console.log('Featured News:', JSON.stringify(featured, null, 2));

    await mongoose.disconnect();
}

check().catch(console.error);
