import mongoose, { Schema, Document } from 'mongoose';

export interface IHomeAlert extends Document {
    title?: string;
    message: string;
    link?: string;
    priority: number;
    isActive: boolean;
    status: 'draft' | 'published';
    requireAck: boolean;
    target: {
        type: 'all' | 'groups' | 'users';
        groupIds: string[];
        userIds: string[];
    };
    metrics: {
        impressions: number;
        acknowledgements: number;
    };
    startAt?: Date;
    endAt?: Date;
    createdBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const HomeAlertSchema = new Schema<IHomeAlert>({
    title: { type: String, default: '' },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: '' },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    requireAck: { type: Boolean, default: false },
    target: {
        type: { type: String, enum: ['all', 'groups', 'users'], default: 'all' },
        groupIds: { type: [String], default: [] },
        userIds: { type: [String], default: [] },
    },
    metrics: {
        impressions: { type: Number, default: 0 },
        acknowledgements: { type: Number, default: 0 },
    },
    startAt: { type: Date },
    endAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

HomeAlertSchema.index({ isActive: 1, status: 1, priority: -1 });
HomeAlertSchema.index({ status: 1, startAt: 1, endAt: 1, priority: -1 });

export default mongoose.model<IHomeAlert>('HomeAlert', HomeAlertSchema);
