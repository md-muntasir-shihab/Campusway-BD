import mongoose, { Schema, Document } from 'mongoose';

export interface ITestimonial extends Document {
    name: string;
    role: string;
    university?: string;
    avatarUrl?: string;
    quote: string;
    rating: number;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
    {
        name: { type: String, required: true, trim: true },
        role: { type: String, required: true, trim: true, default: 'Student' },
        university: { type: String, trim: true, default: '' },
        avatarUrl: { type: String, trim: true, default: '' },
        quote: { type: String, required: true, trim: true },
        rating: { type: Number, min: 1, max: 5, default: 5 },
        isActive: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
    },
    { timestamps: true },
);

TestimonialSchema.index({ isActive: 1, order: 1 });

export default mongoose.model<ITestimonial>('Testimonial', TestimonialSchema);
