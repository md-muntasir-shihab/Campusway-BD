/**
 * Shared payment / subscription API request/response types.
 *
 * Derived from the actual shapes used in `subscriptionController.ts`
 * and `financeCenterController.ts`.
 */

import type { ApiEnvelope } from './api';

/** Accepted payment methods. */
export type PaymentMethod =
    | 'bkash'
    | 'nagad'
    | 'rocket'
    | 'upay'
    | 'cash'
    | 'manual'
    | 'bank'
    | 'card'
    | 'sslcommerz';

/** Body sent to POST /api/subscriptions/:planId/pay */
export interface SubscriptionPaymentRequest {
    method?: PaymentMethod;
    transactionId?: string;
    proofUrl?: string;
    notes?: string;
}

/** Subscription plan DTO returned by public plan endpoints. */
export interface SubscriptionPlanDto {
    id: string;
    name: string;
    code: string;
    slug: string;
    type: 'free' | 'paid' | 'trial';
    priceBDT: number;
    billingCycle: string;
    durationLabel: string;
    features: string[];
    enabled: boolean;
    isFeatured: boolean;
    themeKey: string;
    supportLevel: string;
}

/** Payment record returned after a subscription payment request. */
export interface PaymentRecord {
    _id: string;
    studentId: string;
    subscriptionPlanId: string;
    amount: number;
    method: string;
    status: 'pending' | 'paid' | 'rejected' | 'refunded';
    transactionId?: string;
    proofUrl?: string;
    createdAt: string;
}

/** Subscription record returned after a subscription payment request. */
export interface SubscriptionRecord {
    _id: string;
    userId: string;
    planId: string;
    status: 'active' | 'pending' | 'expired' | 'suspended';
    startDate: string;
    endDate: string;
}

/** Data returned by POST /api/subscriptions/:planId/pay */
export interface SubscriptionPaymentResponseData {
    message: string;
    payment: PaymentRecord;
    subscription: SubscriptionRecord;
    invoice: Record<string, unknown> | null;
    plan: SubscriptionPlanDto;
}

/** Full typed subscription payment response. */
export type SubscriptionPaymentResponse = ApiEnvelope<SubscriptionPaymentResponseData>;

/** Body sent to POST /api/subscriptions/:planId/proof */
export interface UploadPaymentProofRequest {
    proofUrl?: string;
    transactionId?: string;
    method?: PaymentMethod;
}

/** Finance transaction summary (admin finance center). */
export interface TransactionSummary {
    _id: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    date: string;
    status: string;
    tags: string[];
}

/** Full typed transaction list response (paginated). */
export type TransactionListResponse = ApiEnvelope<TransactionSummary[]>;
