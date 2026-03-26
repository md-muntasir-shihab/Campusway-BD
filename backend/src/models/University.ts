import mongoose, { Schema, Document } from 'mongoose';

export interface IExamCenter {
    city: string;
    address: string;
}

interface IUnit {
    name: string;
    seats: number;
    examDates: Date[];
    applicationStart: Date;
    applicationEnd: Date;
    examCenters: IExamCenter[];
    notes?: string;
}

export interface IUniversity extends Document {
    name: string;
    shortForm: string;
    category: string;
    categoryId?: mongoose.Types.ObjectId | null;
    established: number;
    establishedYear?: number;
    address: string;
    contactNumber: string;
    email: string;
    website: string;
    websiteUrl?: string;
    admissionWebsite: string;
    admissionUrl?: string;
    totalSeats: string;
    scienceSeats: string;
    seatsScienceEng?: string;
    artsSeats: string;
    seatsArtsHum?: string;
    businessSeats: string;
    seatsBusiness?: string;
    shortDescription: string;
    description?: string;
    logoUrl?: string;
    clusterId?: mongoose.Types.ObjectId | null;
    clusterGroup?: string;
    clusterName?: string;
    clusterCount?: number;
    clusterDateOverrides?: {
        applicationStartDate?: Date | null;
        applicationEndDate?: Date | null;
        scienceExamDate?: string;
        artsExamDate?: string;
        businessExamDate?: string;
    };
    clusterSyncLocked?: boolean;
    categorySyncLocked?: boolean;
    // Top-level application & exam dates
    applicationStartDate?: Date;
    applicationEndDate?: Date;
    scienceExamDate?: string;
    examDateScience?: string;
    artsExamDate?: string;
    examDateArts?: string;
    businessExamDate?: string;
    examDateBusiness?: string;
    units: IUnit[];
    examCenters: IExamCenter[];
    socialLinks: { platform: string; url: string; icon?: string }[];
    unitLayout: 'compact' | 'stacked' | 'carousel';
    isActive: boolean;
    featured?: boolean;
    featuredOrder?: number;
    verificationStatus?: string;
    remarks?: string;
    isArchived?: boolean;
    archivedAt?: Date | null;
    archivedBy?: mongoose.Types.ObjectId | null;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}

const ExamCenterSchema = new Schema<IExamCenter>({
    city: { type: String, required: true },
    address: { type: String, required: true },
}, { _id: false });

const UnitSchema = new Schema<IUnit>({
    name: { type: String, required: true },
    seats: { type: Number, default: 0 },
    examDates: [Date],
    applicationStart: Date,
    applicationEnd: Date,
    examCenters: [ExamCenterSchema],
    notes: String,
}, { _id: true });

const ClusterDateOverridesSchema = new Schema({
    applicationStartDate: { type: Date, default: null },
    applicationEndDate: { type: Date, default: null },
    scienceExamDate: { type: String, default: '' },
    artsExamDate: { type: String, default: '' },
    businessExamDate: { type: String, default: '' },
}, { _id: false });

const UniversitySchema = new Schema<IUniversity>({
    name: { type: String, required: true, trim: true },
    shortForm: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'UniversityCategory', default: null },
    established: { type: Number },
    establishedYear: { type: Number },
    address: { type: String },
    contactNumber: { type: String },
    email: { type: String },
    website: { type: String },
    websiteUrl: { type: String },
    admissionWebsite: { type: String },
    admissionUrl: { type: String },
    totalSeats: { type: String, default: 'N/A' },
    scienceSeats: { type: String, default: 'N/A' },
    seatsScienceEng: { type: String, default: 'N/A' },
    artsSeats: { type: String, default: 'N/A' },
    seatsArtsHum: { type: String, default: 'N/A' },
    businessSeats: { type: String, default: 'N/A' },
    seatsBusiness: { type: String, default: 'N/A' },
    shortDescription: { type: String },
    description: { type: String, default: '' },
    logoUrl: String,
    clusterId: { type: Schema.Types.ObjectId, ref: 'UniversityCluster', default: null },
    clusterGroup: { type: String, default: '' },
    clusterName: String,
    clusterCount: Number,
    clusterDateOverrides: { type: ClusterDateOverridesSchema, default: () => ({}) },
    clusterSyncLocked: { type: Boolean, default: false },
    categorySyncLocked: { type: Boolean, default: false },
    applicationStartDate: Date,
    applicationEndDate: Date,
    scienceExamDate: { type: String, default: 'N/A' },
    examDateScience: { type: String, default: 'N/A' },
    artsExamDate: { type: String, default: 'N/A' },
    examDateArts: { type: String, default: 'N/A' },
    businessExamDate: { type: String, default: 'N/A' },
    examDateBusiness: { type: String, default: 'N/A' },
    units: [UnitSchema],
    examCenters: [ExamCenterSchema],
    socialLinks: [{ platform: String, url: String, icon: String }],
    unitLayout: { type: String, enum: ['compact', 'stacked', 'carousel'], default: 'compact' },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    featuredOrder: { type: Number, default: 0 },
    verificationStatus: { type: String, default: 'Pending' },
    remarks: { type: String, default: '' },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    slug: { type: String, required: true, unique: true },
}, { timestamps: true });

UniversitySchema.index({ category: 1 });
UniversitySchema.index({ categoryId: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ category: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ clusterId: 1 });
UniversitySchema.index({ clusterGroup: 1 });
UniversitySchema.index({ shortForm: 1 });
UniversitySchema.index({ applicationEndDate: 1 });
UniversitySchema.index({ category: 1, clusterGroup: 1, isActive: 1, isArchived: 1 });
UniversitySchema.index({ name: 'text', shortForm: 'text' });
UniversitySchema.index({ name: 1, shortForm: 1 });

export default mongoose.model<IUniversity>('University', UniversitySchema);
