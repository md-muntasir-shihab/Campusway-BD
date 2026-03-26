import mongoose, { Schema } from 'mongoose';
const NewsSettingsSchema = new Schema({
    key: { type: String, required: true, unique: true, default: 'default' },
    newsPageTitle: { type: String, default: 'CampusWay News' },
    newsPageSubtitle: { type: String, default: 'Latest verified updates' },
    defaultBannerUrl: { type: String, default: '' },
    defaultThumbUrl: { type: String, default: '' },
    defaultSourceIconUrl: { type: String, default: '' },
    fetchFullArticleEnabled: { type: Boolean, default: true },
    fullArticleFetchMode: { type: String, enum: ['rss_content', 'readability_scrape', 'both'], default: 'both' },
    appearance: {
        layoutMode: { type: String, enum: ['rss_reader', 'grid', 'list'], default: 'rss_reader' },
        density: { type: String, enum: ['compact', 'comfortable'], default: 'comfortable' },
        showWidgets: {
            trending: { type: Boolean, default: true },
            latest: { type: Boolean, default: true },
            sourceSidebar: { type: Boolean, default: true },
            tagChips: { type: Boolean, default: true },
            previewPanel: { type: Boolean, default: true },
            breakingTicker: { type: Boolean, default: false }
        },
        animationLevel: { type: String, enum: ['off', 'minimal', 'normal'], default: 'normal' },
        paginationMode: { type: String, enum: ['infinite', 'pages'], default: 'pages' }
    },
    shareTemplates: {
        whatsapp: { type: String, default: '{title}\n{url}' },
        facebook: { type: String, default: '{title} {url}' },
        messenger: { type: String, default: '{title} {url}' },
        telegram: { type: String, default: '{title}\n{url}' }
    },
    aiSettings: {
        enabled: { type: Boolean, default: false },
        language: { type: String, enum: ['bn', 'en', 'mixed'], default: 'en' },
        stylePreset: { type: String, enum: ['short', 'standard', 'detailed'], default: 'standard' },
        strictNoHallucination: { type: Boolean, default: true },
        maxLength: { type: Number, default: 1200 },
        duplicateSensitivity: { type: String, enum: ['strict', 'medium', 'loose'], default: 'medium' }
    },
    workflow: {
        defaultIncomingStatus: { type: String, enum: ['pending_review'], default: 'pending_review' },
        allowScheduling: { type: Boolean, default: true },
        autoExpireDays: { type: Number, default: null }
    }
}, { timestamps: true, collection: 'news_settings' });
export const NewsSettingsModel = mongoose.model('NewsSettings', NewsSettingsSchema);
