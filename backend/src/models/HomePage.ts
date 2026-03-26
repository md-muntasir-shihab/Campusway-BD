import mongoose, { Schema, Document } from 'mongoose';

export interface IHomePage extends Document {
    heroSection: {
        title: string;
        subtitle: string;
        buttonText: string;
        buttonLink: string;
        backgroundImage: string;
        overlay: boolean;
    };
    announcementBar: {
        enabled: boolean;
        text: string;
        backgroundColor: string;
    };
    promotionalBanner: {
        enabled: boolean;
        image: string;
        link: string;
    };
    statistics: {
        totalStudents: number;
        totalExams: number;
        totalUniversities: number;
        totalResults: number;
    };
    featuredSectionSettings: {
        showNews: boolean;
        showServices: boolean;
        showExams: boolean;
    };
}

const HomePageSchema = new Schema<IHomePage>({
    heroSection: {
        title: { type: String, default: 'Master Your Admission Journey' },
        subtitle: { type: String, default: 'Comprehensive preparation for top universities.' },
        buttonText: { type: String, default: 'Get Started' },
        buttonLink: { type: String, default: '/universities' },
        backgroundImage: { type: String, default: '' },
        overlay: { type: Boolean, default: true }
    },
    announcementBar: {
        enabled: { type: Boolean, default: false },
        text: { type: String, default: 'Welcome to CampusWay!' },
        backgroundColor: { type: String, default: '#FF7A59' }
    },
    promotionalBanner: {
        enabled: { type: Boolean, default: false },
        image: { type: String, default: '' },
        link: { type: String, default: '' }
    },
    statistics: {
        totalStudents: { type: Number, default: 0 },
        totalExams: { type: Number, default: 0 },
        totalUniversities: { type: Number, default: 0 },
        totalResults: { type: Number, default: 0 }
    },
    featuredSectionSettings: {
        showNews: { type: Boolean, default: true },
        showServices: { type: Boolean, default: true },
        showExams: { type: Boolean, default: true }
    }
}, { timestamps: true });

export default mongoose.model<IHomePage>('HomePage', HomePageSchema);
