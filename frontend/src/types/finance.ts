/* ─── Finance Center Type Definitions ──────────────────── */

export type TransactionDirection = 'income' | 'expense';
export type TransactionStatus = 'pending' | 'approved' | 'paid' | 'cancelled' | 'refunded';
export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank' | 'card' | 'manual' | 'gateway' | 'upay' | 'rocket';
export type SourceType =
    | 'subscription_payment' | 'exam_payment' | 'service_sale'
    | 'manual_income' | 'expense' | 'refund'
    | 'sms_cost' | 'email_cost' | 'hosting_cost' | 'staff_payout' | 'other';
export type InvoicePurpose = 'subscription' | 'exam' | 'service' | 'custom';
export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled' | 'overdue';
export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly' | 'custom';
export type COAType = 'income' | 'expense' | 'asset' | 'liability';
export type RefundStatus = 'requested' | 'approved' | 'paid' | 'rejected';
export type BudgetDirection = 'income' | 'expense';

export interface FcTransaction {
    _id: string;
    txnCode: string;
    direction: TransactionDirection;
    amount: number;
    currency: string;
    dateUTC: string;
    accountCode: string;
    categoryLabel: string;
    description?: string;
    status: TransactionStatus;
    method: PaymentMethod;
    sourceType: SourceType;
    sourceId?: string;
    studentId?: string;
    planId?: string;
    examId?: string;
    serviceId?: string;
    txnRefId?: string;
    invoiceNo?: string;
    note?: string;
    tags?: string[];
    costCenterId?: string;
    vendorId?: string;
    createdByAdminId?: string;
    approvedByAdminId?: string;
    approvedAtUTC?: string;
    paidAtUTC?: string;
    attachments?: { url: string; label?: string }[];
    isDeleted?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FcInvoice {
    _id: string;
    invoiceNo: string;
    studentId?: string;
    purpose: InvoicePurpose;
    planId?: string;
    examId?: string;
    serviceId?: string;
    amountBDT: number;
    paidAmountBDT: number;
    status: InvoiceStatus;
    dueDateUTC?: string;
    issuedAtUTC?: string;
    paidAtUTC?: string;
    notes?: string;
    isDeleted?: boolean;
    createdByAdminId?: string;
    linkedTxnIds?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface FcBudget {
    _id: string;
    month: string;
    accountCode: string;
    categoryLabel: string;
    amountLimit: number;
    alertThresholdPercent: number;
    direction: BudgetDirection;
    costCenterId?: string;
    notes?: string;
    actualSpent?: number;
    createdByAdminId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FcRecurringRule {
    _id: string;
    name: string;
    direction: TransactionDirection;
    amount: number;
    currency: string;
    accountCode: string;
    categoryLabel: string;
    description?: string;
    method?: PaymentMethod;
    tags?: string[];
    costCenterId?: string;
    vendorId?: string;
    frequency: RecurringFrequency;
    dayOfMonth?: number;
    intervalDays?: number;
    nextRunAtUTC?: string;
    endAtUTC?: string;
    isActive: boolean;
    lastRunAtUTC?: string;
    lastCreatedTxnId?: string;
    createdByAdminId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FcChartOfAccount {
    _id: string;
    code: string;
    name: string;
    type: COAType;
    parentCode?: string;
    description?: string;
    isActive: boolean;
    isSystem: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FcVendor {
    _id: string;
    name: string;
    contact?: string;
    email?: string;
    phone?: string;
    address?: string;
    category?: string;
    notes?: string;
    isActive: boolean;
    createdByAdminId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface FcSettings {
    _id: string;
    key: string;
    defaultCurrency: string;
    requireApprovalForExpense: boolean;
    requireApprovalForIncome: boolean;
    enableBudgets: boolean;
    enableRecurringEngine: boolean;
    receiptRequiredAboveAmount: number;
    exportFooterNote?: string;
    smsCostPerMessageBDT: number;
    emailCostPerMessageBDT: number;
    costCenters: string[];
    lastEditedByAdminId?: string;
}

export interface FcRefund {
    _id: string;
    refundCode: string;
    originalPaymentId?: string;
    financeTxnId?: string;
    studentId?: string;
    amountBDT: number;
    reason: string;
    status: RefundStatus;
    rejectionNote?: string;
    processedByAdminId?: string;
    processedAtUTC?: string;
    createdByAdminId?: string;
    isDeleted?: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface FcDashboardSummary {
    month: string;
    incomeTotal: number;
    expenseTotal: number;
    netProfit: number;
    receivablesTotal: number;
    receivablesCount: number;
    payablesTotal: number;
    payablesCount: number;
    refundTotal?: number;
    subscriptionRevenue?: number;
    examRevenue?: number;
    manualServiceRevenue?: number;
    activeBudgetUsagePercent?: number;
    monthOverMonthChange?: { incomeChange: number; expenseChange: number };
    topIncomeSources: { category: string; total: number }[];
    topExpenseCategories: { category: string; total: number }[];
    dailyCashflowTrend: { date: string; income: number; expense: number; net: number }[];
    budgetStatus: FcBudgetStatus[];
    recentActivity?: FcActivityItem[];
    incomeBySource?: { source: string; total: number }[];
    expenseByCategory?: { category: string; total: number }[];
}

export interface FcActivityItem {
    _id: string;
    type: 'income' | 'expense' | 'invoice' | 'refund' | 'budget_alert';
    description: string;
    amount?: number;
    timestamp: string;
    sourceType?: string;
}

export interface FcBudgetStatus {
    _id: string;
    month: string;
    accountCode: string;
    categoryLabel: string;
    direction: BudgetDirection;
    amountLimit: number;
    spent: number;
    percentUsed: number;
    alertThresholdPercent: number;
    exceeded: boolean;
}

export interface FcAuditLog {
    _id: string;
    actor_id: string;
    action: string;
    target_type: string;
    target_id?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    timestamp: string;
    beforeSnapshot?: Record<string, unknown>;
    afterSnapshot?: Record<string, unknown>;
    description?: string;
}

export interface FcPaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}
