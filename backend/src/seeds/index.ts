import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import { seedLegalPages } from './seedLegalPages';
import { seedFounderProfile } from './seedFounderProfile';

dotenv.config();

async function runAllSeeds(): Promise<void> {
    console.log('[seed] Starting all seeds...');
    await connectDB();

    await seedLegalPages();
    await seedFounderProfile();

    console.log('[seed] All seeds completed successfully.');
}

runAllSeeds()
    .catch((error) => {
        console.error('[seed] Failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
    });
