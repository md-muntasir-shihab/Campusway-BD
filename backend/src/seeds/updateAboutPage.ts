import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import WebsiteSettings, { createWebsiteStaticPagesDefaults } from '../models/WebsiteSettings';

dotenv.config();

async function updateAboutPage(): Promise<void> {
    console.log('[update-about] Updating About page static content...');

    const defaults = createWebsiteStaticPagesDefaults();
    const settings = await WebsiteSettings.findOne();

    if (!settings) {
        console.log('[update-about] No WebsiteSettings found. Creating with defaults...');
        await WebsiteSettings.create({ staticPages: defaults });
        console.log('[update-about] Created.');
        return;
    }

    // Update all static pages with new defaults
    // Force overwrite all pages
    settings.staticPages = defaults;
    settings.markModified('staticPages');
    await settings.save();

    console.log('[update-about] About page updated successfully with new content.');
    console.log(`[update-about] Sections: ${defaults.about.sections.length}`);
    console.log(`[update-about] Feature cards: ${defaults.about.featureCards.length}`);
    console.log(`[update-about] Founder profiles: ${defaults.about.founderProfiles.length}`);
}

if (require.main === module) {
    (async () => {
        await connectDB();
        await updateAboutPage();
    })()
        .catch((error) => {
            console.error('[update-about] Failed:', error);
            process.exitCode = 1;
        })
        .finally(async () => {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
            }
        });
}

export { updateAboutPage };
