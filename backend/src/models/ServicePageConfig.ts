import mongoose, { Schema, Document } from 'mongoose';

export interface IServicePageConfig extends Document {
    heroTitle: string;
    heroSubtitle: string;
    heroBannerImage: string;
    ctaText: string;
    ctaLink: string;
}

const ServicePageConfigSchema = new Schema<IServicePageConfig>({
    heroTitle: { type: String, default: 'Our Premium Services' },
    heroSubtitle: { type: String, default: 'Empowering your academic journey with expert guidance.' },
    heroBannerImage: { type: String, default: '' },
    ctaText: { type: String, default: 'Explore All Services' },
    ctaLink: { type: String, default: '#services' }
}, { timestamps: true });

export default mongoose.model<IServicePageConfig>('ServicePageConfig', ServicePageConfigSchema);
