import { z } from 'zod';

// ── Shared primitives ───────────────────────────────────
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid ObjectId').optional();
const direction = z.enum(['income', 'expense']);
const status = z.enum(['pending', 'approved', 'paid', 'cancelled', 'refunded']);
const method = z.enum(['cash', 'bkash', 'nagad', 'bank', 'card', 'manual', 'gateway', 'upay', 'rocket']);
const sourceType = z.enum([
    'subscription_payment', 'exam_payment', 'service_sale', 'manual_income',
    'expense', 'refund', 'sms_cost', 'email_cost', 'hosting_cost', 'staff_payout', 'other',
]);
const safeStr = z.string().trim().max(1000);
const tags = z.array(z.string().trim().max(100)).max(20).optional();

// ── Transactions ────────────────────────────────────────
export const createTransactionSchema = z.object({
    direction,
    amount: z.number().positive(),
    currency: z.string().max(10).default('BDT'),
    dateUTC: z.string().datetime().optional(),
    accountCode: safeStr.min(1),
    categoryLabel: safeStr.min(1),
    description: safeStr.optional(),
    status: status.optional(),
    method: method.optional(),
    sourceType: sourceType.optional(),
    sourceId: z.string().max(200).optional(),
    studentId: objectId,
    planId: objectId,
    examId: objectId,
    serviceId: objectId,
    tags,
    costCenterId: safeStr.optional(),
    vendorId: objectId,
});

export const updateTransactionSchema = z.object({
    direction: direction.optional(),
    amount: z.number().positive().optional(),
    currency: z.string().max(10).optional(),
    dateUTC: z.string().datetime().optional(),
    accountCode: safeStr.optional(),
    categoryLabel: safeStr.optional(),
    description: safeStr.optional(),
    status: status.optional(),
    method: method.optional(),
    tags,
    costCenterId: safeStr.optional(),
    vendorId: objectId,
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const bulkIdsSchema = z.object({
    ids: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).min(1).max(500),
});

// ── Invoices ────────────────────────────────────────────
export const createInvoiceSchema = z.object({
    studentId: objectId,
    purpose: z.enum(['subscription', 'exam', 'service', 'custom']),
    planId: objectId,
    examId: objectId,
    serviceId: objectId,
    amountBDT: z.number().positive(),
    dueDateUTC: z.string().datetime().optional(),
    notes: safeStr.optional(),
});

export const updateInvoiceSchema = z.object({
    amountBDT: z.number().positive().optional(),
    paidAmountBDT: z.number().min(0).optional(),
    status: z.enum(['unpaid', 'partial', 'paid', 'cancelled', 'overdue']).optional(),
    dueDateUTC: z.string().datetime().optional(),
    notes: safeStr.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const markInvoicePaidSchema = z.object({
    paidAmount: z.number().positive().optional(),
});

// ── Budgets ─────────────────────────────────────────────
export const createBudgetSchema = z.object({
    month: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM'),
    accountCode: safeStr.min(1),
    categoryLabel: safeStr.min(1),
    amountLimit: z.number().positive(),
    alertThresholdPercent: z.number().min(1).max(100).default(80),
    direction,
    costCenterId: safeStr.optional(),
    notes: safeStr.optional(),
});

export const updateBudgetSchema = z.object({
    accountCode: safeStr.optional(),
    categoryLabel: safeStr.optional(),
    amountLimit: z.number().positive().optional(),
    alertThresholdPercent: z.number().min(1).max(100).optional(),
    direction: direction.optional(),
    costCenterId: safeStr.optional(),
    notes: safeStr.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ── Recurring Rules ─────────────────────────────────────
export const createRecurringRuleSchema = z.object({
    name: safeStr.min(1),
    direction,
    amount: z.number().positive(),
    currency: z.string().max(10).default('BDT'),
    accountCode: safeStr.min(1),
    categoryLabel: safeStr.min(1),
    description: safeStr.optional(),
    method: method.optional(),
    tags,
    costCenterId: safeStr.optional(),
    vendorId: objectId,
    frequency: z.enum(['monthly', 'weekly', 'yearly', 'custom']),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    intervalDays: z.number().int().min(1).max(365).optional(),
    nextRunAtUTC: z.string().datetime().optional(),
    endAtUTC: z.string().datetime().optional(),
    isActive: z.boolean().default(true),
});

export const updateRecurringRuleSchema = z.object({
    name: safeStr.optional(),
    direction: direction.optional(),
    amount: z.number().positive().optional(),
    accountCode: safeStr.optional(),
    categoryLabel: safeStr.optional(),
    description: safeStr.optional(),
    method: method.optional(),
    tags,
    costCenterId: safeStr.optional(),
    vendorId: objectId,
    frequency: z.enum(['monthly', 'weekly', 'yearly', 'custom']).optional(),
    dayOfMonth: z.number().int().min(1).max(31).optional(),
    intervalDays: z.number().int().min(1).max(365).optional(),
    nextRunAtUTC: z.string().datetime().optional(),
    endAtUTC: z.string().datetime().optional(),
    isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// ── Chart of Accounts ───────────────────────────────────
export const createAccountSchema = z.object({
    code: z.string().trim().min(1).max(50).transform((s) => s.toUpperCase()),
    name: safeStr.min(1),
    type: z.enum(['income', 'expense', 'asset', 'liability']),
    parentCode: z.string().max(50).optional(),
    description: safeStr.optional(),
});

// ── Vendors ─────────────────────────────────────────────
export const createVendorSchema = z.object({
    name: safeStr.min(1),
    contact: safeStr.optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: safeStr.optional(),
    address: safeStr.optional(),
    category: safeStr.optional(),
    notes: safeStr.optional(),
});

// ── Settings ────────────────────────────────────────────
export const updateSettingsSchema = z.object({
    defaultCurrency: z.string().max(10).optional(),
    requireApprovalForExpense: z.boolean().optional(),
    requireApprovalForIncome: z.boolean().optional(),
    enableBudgets: z.boolean().optional(),
    enableRecurringEngine: z.boolean().optional(),
    receiptRequiredAboveAmount: z.number().min(0).optional(),
    exportFooterNote: z.string().max(2000).optional(),
    smsCostPerMessageBDT: z.number().min(0).optional(),
    emailCostPerMessageBDT: z.number().min(0).optional(),
    costCenters: z.array(z.string().trim().max(100)).max(50).optional(),
});

// ── Refunds ─────────────────────────────────────────────
export const createRefundSchema = z.object({
    originalPaymentId: objectId,
    financeTxnId: objectId,
    studentId: objectId,
    amountBDT: z.number().positive(),
    reason: safeStr.min(1),
});

export const processRefundSchema = z.object({
    action: z.enum(['approve', 'reject']),
    rejectionNote: safeStr.optional(),
});

// ── Import ──────────────────────────────────────────────
export const importCommitSchema = z.object({
    rows: z.array(z.object({
        direction: direction.optional(),
        amount: z.number().positive(),
        accountCode: safeStr.min(1),
        categoryLabel: safeStr.min(1),
        description: safeStr.optional(),
        method: method.optional(),
        dateUTC: z.string().optional(),
        tags: z.array(z.string()).optional(),
    })).min(1).max(5000),
});
