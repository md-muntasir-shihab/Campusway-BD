import mongoose, { Schema, Document } from 'mongoose';

export interface ICalculatorSettings extends Document {
    _id: mongoose.Types.ObjectId;
    isSSCEnabled: boolean;
    isHSCEnabled: boolean;
    isOLevelEnabled: boolean;
    isCGPAEnabled: boolean;
    isNUEnabled: boolean;
    maintenanceMode: boolean;
    /** Public hub page branding (admin-editable) */
    hubTitle: string;
    hubSubtitle: string;
    /** SEO fields for the public calculator hub (admin-editable) */
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string;
    ogImageUrl: string;
    updatedAt: Date;
    createdAt: Date;
}

const CalculatorSettingsSchema = new Schema<ICalculatorSettings>({
    isSSCEnabled: { type: Boolean, default: true },
    isHSCEnabled: { type: Boolean, default: true },
    isOLevelEnabled: { type: Boolean, default: true },
    isCGPAEnabled: { type: Boolean, default: true },
    isNUEnabled: { type: Boolean, default: true },
    maintenanceMode: { type: Boolean, default: false },
    hubTitle: { type: String, default: 'Academic Calculators', trim: true, maxlength: 120 },
    hubSubtitle: {
        type: String,
        default: 'Calculate your GPA and CGPA instantly. Pick a calculator below — SSC, HSC, O/A Level, National University or University CGPA.',
        trim: true,
        maxlength: 400,
    },
    metaTitle: { type: String, default: 'GPA & CGPA Calculators — SSC, HSC, O/A Level, University', trim: true, maxlength: 200 },
    metaDescription: {
        type: String,
        default: 'Free academic calculators for Bangladeshi students: SSC & HSC GPA (Bangladesh Board), O/A Level conversion, National University Honours CGPA and University semester CGPA.',
        trim: true,
        maxlength: 500,
    },
    metaKeywords: {
        type: String,
        default: 'gpa calculator, cgpa calculator, ssc gpa, hsc gpa, nu honours cgpa, o level a level grade calculator, university cgpa bangladesh',
        trim: true,
        maxlength: 500,
    },
    ogImageUrl: { type: String, default: '', trim: true, maxlength: 1000 },
}, { timestamps: true });

export default mongoose.model<ICalculatorSettings>('CalculatorSettings', CalculatorSettingsSchema);
