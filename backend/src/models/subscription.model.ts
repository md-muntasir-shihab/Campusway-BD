import { Schema, model } from "mongoose";

/**
 * Subscription model — tracks user subscription lifecycle and plan association.
 *
 * Key fields:
 * - `userId`: The user who holds the subscription
 * - `planId`: The subscription plan ID
 * - `status`: Subscription state — active | expired | pending | suspended
 * - `startAtUTC` / `expiresAtUTC`: Subscription validity window
 * - `paymentId`: Associated payment record
 *
 * @collection user_subscriptions
 */
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
