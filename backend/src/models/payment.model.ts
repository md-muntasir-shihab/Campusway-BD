import { Schema, model } from "mongoose";

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
