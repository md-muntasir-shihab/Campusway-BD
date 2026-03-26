import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentWebhookEvent extends Document {
    provider: string;
    eventType: string;
    providerEventId: string;
    signatureValid: boolean;
    requestHash: string;
    status: 'received' | 'processed' | 'ignored' | 'failed';
    paymentId?: mongoose.Types.ObjectId | null;
    reference?: string;
    payload: Record<string, unknown>;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PaymentWebhookEventSchema = new Schema<IPaymentWebhookEvent>(
    {
        provider: { type: String, required: true, default: 'sslcommerz' },
        eventType: { type: String, required: true, default: 'payment' },
        providerEventId: { type: String, required: true, trim: true },
        signatureValid: { type: Boolean, required: true, default: false },
        requestHash: { type: String, required: true, trim: true },
        status: { type: String, enum: ['received', 'processed', 'ignored', 'failed'], default: 'received' },
        paymentId: { type: Schema.Types.ObjectId, ref: 'ManualPayment', default: null },
        reference: { type: String, default: '' },
        payload: { type: Schema.Types.Mixed, default: {} },
        errorMessage: { type: String, default: '' },
    },
    { timestamps: true, collection: 'payment_webhook_events' }
);

PaymentWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });
PaymentWebhookEventSchema.index({ createdAt: -1, status: 1 });
PaymentWebhookEventSchema.index({ requestHash: 1 });

export default mongoose.model<IPaymentWebhookEvent>('PaymentWebhookEvent', PaymentWebhookEventSchema);
