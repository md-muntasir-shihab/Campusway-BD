import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import LegalPage from '../models/LegalPage';

dotenv.config();

async function run() {
    await connectDB();

    // Remove about, terms, privacy from LegalPages since they are now managed via Site Settings → Static Pages
    const slugsToRemove = ['about', 'terms', 'privacy'];
    for (const slug of slugsToRemove) {
        const result = await LegalPage.deleteOne({ slug });
        console.log(`[cleanup] Removed legal page "${slug}": ${result.deletedCount ? 'deleted' : 'not found'}`);
    }

    console.log('[cleanup] Done. About/Terms/Privacy are now only managed via Site Settings → Static Pages.');
    await mongoose.connection.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
