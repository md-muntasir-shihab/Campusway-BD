import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campusway');
        console.log('Connected to DB');

        const collections = [
            'questiongroups',
            'questionsubgroups',
            'questionsubjects',
            'questionchapters',
            'questiontopics',
            'questioncategories'
        ];

        for (const col of collections) {
            try {
                await mongoose.connection.collection(col).deleteMany({});
                console.log(`Cleared ${col}`);
            } catch (e: unknown) {
                console.log(`Collection ${col} not found or error: ${(e as Error).message}`);
            }
        }

        console.log('Taxonomy completely cleared.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run();
