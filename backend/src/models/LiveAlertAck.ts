import mongoose, { Document, Schema } from 'mongoose';

export interface ILiveAlertAck extends Document {
    alertId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    ackAt: Date;
}

const LiveAlertAckSchema = new Schema<ILiveAlertAck>({
    alertId: { type: Schema.Types.ObjectId, ref: 'HomeAlert', required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ackAt: { type: Date, default: Date.now },
}, { timestamps: false, collection: 'live_alert_acks' });

LiveAlertAckSchema.index({ alertId: 1, studentId: 1 }, { unique: true });
LiveAlertAckSchema.index({ studentId: 1, ackAt: -1 });

export default mongoose.model<ILiveAlertAck>('LiveAlertAck', LiveAlertAckSchema);

