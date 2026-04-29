import mongoose, { Document, Schema } from 'mongoose';

export interface ICouponCode {
    code: string;
    discountPercent: number;
    maxUses: number;
    usedCount: number;
    expiresAt: Date;
}

export interface IExamPackage extends Document {
    title: string;
    title_bn?: string;
    description?: string;
    exams: mongoose.Types.ObjectId[];
    priceBDT: number;
    discountPercentage: number;
    couponCodes: ICouponCode[];
    validFrom: Date;
    validUntil: Date;
    createdBy: mongoose.Types.ObjectId;
    isActive: boolean;
    purchaseCount: number;
    createdAt: Date;
    updatedAt: Date;
}

const CouponCodeSchema = new Schema<ICouponCode>(
    {
        code: { type: String, required: true, trim: true },
        discountPercent: { type: Number, required: true, min: 0, max: 100 },
        maxUses: { type: Number, required: true, min: 1 },
        usedCount: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true },
    },
    { _id: false },
);

const ExamPackageSchema = new Schema<IExamPackage>(
    {
        title: { type: String, required: true, trim: true },
        title_bn: { type: String, default: '', trim: true },
        description: { type: String, default: '', trim: true },
        exams: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Exam',
            },
        ],
        priceBDT: { type: Number, required: true, min: 0 },
        discountPercentage: { type: Number, default: 0, min: 0, max: 100 },
        couponCodes: { type: [CouponCodeSchema], default: [] },
        validFrom: { type: Date, required: true },
        validUntil: { type: Date, required: true },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isActive: { type: Boolean, default: true },
        purchaseCount: { type: Number, default: 0 },
    },
    { timestamps: true, collection: 'exam_packages' },
);

// Active packages within validity window
ExamPackageSchema.index({ isActive: 1, validUntil: 1 });
// Packages by creator
ExamPackageSchema.index({ createdBy: 1 });

export default mongoose.model<IExamPackage>('ExamPackage', ExamPackageSchema);
