import ChartOfAccounts from '../models/ChartOfAccounts';

/**
 * Default Chart-of-Account entries seeded on startup.
 * Each has `isSystem: true` so admins cannot delete them.
 * The seed is idempotent — existing codes are skipped.
 */
const DEFAULT_COA_ENTRIES = [
    // Income accounts
    { code: 'REV_SUBSCRIPTION', name: 'Subscription Revenue', type: 'income' as const, description: 'Student subscription plan payments' },
    { code: 'REV_EXAM', name: 'Exam Fee Revenue', type: 'income' as const, description: 'Paid exam registration fees' },
    { code: 'REV_SERVICE', name: 'Service Revenue', type: 'income' as const, description: 'Other paid services and features' },
    { code: 'REV_OTHER', name: 'Other Income', type: 'income' as const, description: 'Miscellaneous income' },

    // Expense accounts
    { code: 'EXP_HOSTING', name: 'Hosting & Infrastructure', type: 'expense' as const, description: 'Servers, cloud services, domain, CDN' },
    { code: 'EXP_PAYROLL', name: 'Payroll & Staff', type: 'expense' as const, description: 'Salaries, freelance, and contractor payments' },
    { code: 'EXP_SMS', name: 'SMS Costs', type: 'expense' as const, description: 'SMS gateway and notification costs' },
    { code: 'EXP_EMAIL', name: 'Email Costs', type: 'expense' as const, description: 'Email service and transactional email costs' },
    { code: 'EXP_MARKETING', name: 'Marketing & Ads', type: 'expense' as const, description: 'Advertising, promotions, and marketing campaigns' },
    { code: 'EXP_TOOLS', name: 'Tools & Software', type: 'expense' as const, description: 'SaaS tools, licenses, and third-party services' },
    { code: 'EXP_MISC', name: 'Miscellaneous Expenses', type: 'expense' as const, description: 'Other operational expenses' },
];

export async function seedDefaultChartOfAccounts(): Promise<void> {
    const existingCodes = new Set(
        (await ChartOfAccounts.find({}, { code: 1 }).lean()).map(a => a.code),
    );

    const toInsert = DEFAULT_COA_ENTRIES
        .filter(entry => !existingCodes.has(entry.code))
        .map(entry => ({ ...entry, isActive: true, isSystem: true }));

    if (toInsert.length === 0) return;

    await ChartOfAccounts.insertMany(toInsert);
    console.log(`[FinanceSeed] Seeded ${toInsert.length} default Chart-of-Account entries.`);
}
