import mongoose, { Document, Schema } from 'mongoose';

export interface IUniversitySettings extends Document {
    categoryOrder: string[];
    highlightedCategories: string[];
    defaultCategory: string;
    featuredUniversitySlugs: string[];
    maxFeaturedItems: number;
    enableClusterFilterOnHome: boolean;
    enableClusterFilterOnUniversities: boolean;
    defaultUniversityLogoUrl: string | null;
    allowCustomCategories: boolean;
    lastEditedByAdminId: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export const ALLOWED_CATEGORIES = [
    'Individual Admission',
    'Science & Technology',
    'GST (General/Public)',
    'GST (Science & Technology)',
    'Medical College',
    'AGRI Cluster',
    'Under Army',
    'DCU',
    'Specialized University',
    'Affiliate College',
    'Dental College',
    'Nursing Colleges',
] as const;

const universitySettingsSchema = new Schema<IUniversitySettings>(
    {
        categoryOrder: {
            type: [String],
            default: () => [...ALLOWED_CATEGORIES],
        },
        highlightedCategories: {
            type: [String],
            default: () => [],
        },
        defaultCategory: {
            type: String,
            default: 'Individual Admission',
        },
        featuredUniversitySlugs: {
            type: [String],
            default: () => [],
        },
        maxFeaturedItems: {
            type: Number,
            default: 12,
            min: 1,
            max: 50,
        },
        enableClusterFilterOnHome: {
            type: Boolean,
            default: true,
        },
        enableClusterFilterOnUniversities: {
            type: Boolean,
            default: true,
        },
        defaultUniversityLogoUrl: {
            type: String,
            default: null,
        },
        allowCustomCategories: {
            type: Boolean,
            default: false,
        },
        lastEditedByAdminId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'university_settings',
    }
);

export default mongoose.model<IUniversitySettings>('UniversitySettings', universitySettingsSchema);

// Helper: get or create singleton settings doc
export async function ensureUniversitySettings(): Promise<IUniversitySettings> {
    const existing = await mongoose.model<IUniversitySettings>('UniversitySettings').findOne().lean<IUniversitySettings>();
    if (existing) return existing as IUniversitySettings;

    const created = await mongoose.model<IUniversitySettings>('UniversitySettings').create({});
    return created;
}

export function getUniversitySettingsDefaults(): Omit<IUniversitySettings, keyof Document | 'createdAt' | 'updatedAt'> {
    return {
        categoryOrder: [...ALLOWED_CATEGORIES],
        highlightedCategories: [],
        defaultCategory: 'Individual Admission',
        featuredUniversitySlugs: [],
        maxFeaturedItems: 12,
        enableClusterFilterOnHome: true,
        enableClusterFilterOnUniversities: true,
        defaultUniversityLogoUrl: null,
        allowCustomCategories: false,
        lastEditedByAdminId: null,
    };
}
