import { Schema, model } from "mongoose";

/**
 * Payment model — records payment transactions for exams and subscription plans.
 *
 * Key fields:
 * - `userId`: The user who made the payment
 * - `examId`: Optional exam the payment is for
 * - `planId`: Optional subscription plan the payment is for
 * - `amountBDT`: Payment amount in Bangladeshi Taka
 * - `method`: Payment method (bkash, nagad, card, bank, manual)
 * - `status`: Payment lifecycle — pending | paid | failed | refunded
 * - `transactionId`: External payment gateway transaction ID
 *
 * @collection payments
 */
const paymentSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    examId: { type: String, default: null, index: true },
    planId: { type: String, default: null },
    amountBDT: Number,
    method: { type: String, enum: ["bkash", "nagad", "card", "bank", "manual"], default: "manual" },
    status: { type: String, enum: ["pending", "paid", "failed", "refunded"], default: "pending", index: true },
    transactionId: String,
    reference: String,
    proofFileUrl: String,
    verifiedByAdminId: String,
    notes: String,
    paidAt: Date
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
paymentSchema.index({ status: 1, examId: 1, userId: 1 });

export const PaymentModel = model("payments", paymentSchema);
