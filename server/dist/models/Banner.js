import mongoose, { Schema } from 'mongoose';
const BannerSchema = new Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    targetUrl: { type: String, required: true },
    placements: [{ type: String }],
    enabled: { type: Boolean, default: true },
    startAt: Date,
    endAt: Date,
    priority: { type: Number, default: 0 }
}, { timestamps: true });
export const BannerModel = mongoose.model('Banner', BannerSchema);
