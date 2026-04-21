import mongoose, { Document, Schema } from 'mongoose';

export interface IFounderProfile extends Document {
    name: string;
    tagline: string;
    founderMessage: string;
    photoUrl: string;
    role: string;
    aboutText: string;
    fatherName: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    location: string;
    contactDetails: {
        phones: string[];
        email: string;
        website: string;
    };
    skills: string[];
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        startYear: number;
        endYear?: number;
        description?: string;
    }>;
    experience: Array<{
        company: string;
        role: string;
        startYear: number;
        endYear?: number;
        description?: string;
        current?: boolean;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const FounderProfileSchema = new Schema<IFounderProfile>(
    {
        name: { type: String, required: true, trim: true },
        tagline: { type: String, default: '' },
        founderMessage: { type: String, default: '' },
        photoUrl: { type: String, default: '' },
        role: { type: String, default: '' },
        aboutText: { type: String, default: '' },
        fatherName: { type: String, default: '' },
        dateOfBirth: { type: String, default: '' },
        gender: { type: String, default: '' },
        address: { type: String, default: '' },
        location: { type: String, default: '' },
        contactDetails: {
            phones: { type: [String], default: [] },
            email: { type: String, default: '' },
            website: { type: String, default: '' },
        },
        skills: { type: [String], default: [] },
        education: [
            {
                institution: { type: String, required: true },
                degree: { type: String, default: '' },
                field: { type: String, default: '' },
                startYear: { type: Number, required: true },
                endYear: { type: Number },
                description: { type: String, default: '' },
            },
        ],
        experience: [
            {
                company: { type: String, required: true },
                role: { type: String, default: '' },
                startYear: { type: Number, required: true },
                endYear: { type: Number },
                description: { type: String, default: '' },
                current: { type: Boolean, default: false },
            },
        ],
    },
    { timestamps: true, collection: 'founder_profiles' },
);

export default mongoose.model<IFounderProfile>('FounderProfile', FounderProfileSchema);
