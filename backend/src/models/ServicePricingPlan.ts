import mongoose, { Schema, Document } from 'mongoose';

export interface IServicePricingPlan extends Document {
    service_id: mongoose.Types.ObjectId;
    name: string;
    price: number;
    billing_cycle: 'monthly' | 'yearly' | 'one_time';
    features_included: string[];
    is_trial: boolean;
    order_index: number;
    status: 'active' | 'inactive';
}

const ServicePricingPlanSchema = new Schema<IServicePricingPlan>({
    service_id: { type: Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, default: 0 },
    billing_cycle: { type: String, enum: ['monthly', 'yearly', 'one_time'], default: 'monthly' },
    features_included: [{ type: String }],
    is_trial: { type: Boolean, default: false },
    order_index: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
}, { timestamps: true });

export default mongoose.model<IServicePricingPlan>('ServicePricingPlan', ServicePricingPlanSchema);
