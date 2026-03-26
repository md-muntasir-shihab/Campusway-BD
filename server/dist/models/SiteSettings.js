import mongoose, { Schema } from 'mongoose';
const SocialLinkSchema = new Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    iconType: { type: String, enum: ['upload', 'url'], required: true },
    iconUrl: { type: String, required: true },
    targetUrl: { type: String, required: true },
    placement: [{ type: String }]
}, { _id: false });
const FooterSchema = new Schema({
    aboutText: { type: String, default: '' },
    quickLinks: [{ label: String, href: String }],
    contactInfo: { email: String, phone: String, address: String }
}, { _id: false });
const SiteSettingsSchema = new Schema({
    siteName: { type: String, required: true, default: 'CampusWay' },
    logoUrl: { type: String, default: '' },
    siteDescription: { type: String, default: '' },
    themeDefault: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    socialLinks: [SocialLinkSchema],
    footer: { type: FooterSchema, default: () => ({}) }
}, { timestamps: true });
export const SiteSettingsModel = mongoose.model('SiteSettings', SiteSettingsSchema);
