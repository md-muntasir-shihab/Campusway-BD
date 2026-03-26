import { Schema, model } from "mongoose";

const subscriptionSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    planId: { type: String, required: true },
    status: { type: String, enum: ["active", "expired", "pending", "suspended"], default: "pending" },
    startAtUTC: Date,
    expiresAtUTC: Date,
    paymentId: String,
    notes: String
  },
  { timestamps: true }
);

export const SubscriptionModel = model("user_subscriptions", subscriptionSchema);
