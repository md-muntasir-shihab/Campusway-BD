import mongoose from 'mongoose';
import dotenv from 'dotenv';
import SubscriptionPlan from '../models/SubscriptionPlan';
import SubscriptionSettings from '../models/SubscriptionSettings';
import User from '../models/User';
import UserSubscription from '../models/UserSubscription';
import { ensureHomeSettings } from '../services/homeSettingsService';

dotenv.config();

function normalizeSlug(value: unknown, fallback = 'plan'): string {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}

function safeString(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text || fallback;
}

function safeStringList(value: unknown, limit = 50): string[] {
    if (!Array.isArray(value)) return [];
    return Array.from(new Set(
        value
            .map((item) => safeString(item))
            .filter(Boolean)
    )).slice(0, limit);
}

function deriveThemeKey(code: string, name: string): 'basic' | 'standard' | 'premium' | 'enterprise' | 'custom' {
    const hint = `${code} ${name}`.toLowerCase();
    if (hint.includes('premium') || hint.includes('pro')) return 'premium';
    if (hint.includes('standard') || hint.includes('plus')) return 'standard';
    if (hint.includes('enterprise') || hint.includes('elite')) return 'enterprise';
    return 'basic';
}

function buildDurationLabel(durationValue: number, durationUnit: 'days' | 'months', durationDays: number): string {
    if (durationUnit === 'months') {
        const months = Math.max(1, durationValue || 1);
        return `${months} month${months === 1 ? '' : 's'}`;
    }
    const days = Math.max(1, durationDays || durationValue || 1);
    return `${days} day${days === 1 ? '' : 's'}`;
}

async function migratePlans() {
    const plans = await SubscriptionPlan.find();
    let updated = 0;

    for (const plan of plans) {
        const code = normalizeSlug(plan.code || plan.name, 'plan');
        const slug = normalizeSlug(plan.slug || plan.code || plan.name, code);
        const name = safeString(plan.name, 'Subscription Plan');
        const priceBDT = Math.max(0, Number(plan.priceBDT ?? plan.price ?? 0));
        const durationDays = Math.max(1, Number(plan.durationDays ?? plan.durationValue ?? 30));
        const durationUnit = plan.durationUnit === 'months' ? 'months' : 'days';
        const durationValue = Math.max(
            1,
            Number(
                plan.durationValue ??
                (durationUnit === 'months'
                    ? (plan.durationMonths || 1)
                    : durationDays)
            )
        );
        const displayOrder = Number(plan.displayOrder ?? plan.sortOrder ?? plan.priority ?? 100) || 100;
        const enabled = plan.enabled !== false;
        const visibleFeatures = safeStringList(
            Array.isArray(plan.visibleFeatures) && plan.visibleFeatures.length
                ? plan.visibleFeatures
                : (Array.isArray(plan.features) && plan.features.length ? plan.features : plan.includedModules),
            8
        );
        const fullFeatures = Array.from(new Set(
            safeStringList(plan.fullFeatures)
                .concat(visibleFeatures)
                .concat(safeStringList(plan.features))
                .concat(safeStringList(plan.includedModules))
        ));

        plan.code = code;
        plan.slug = slug;
        plan.shortTitle = safeString(plan.shortTitle, name);
        plan.tagline = safeString(plan.tagline);
        plan.type = priceBDT <= 0 || plan.type === 'free' ? 'free' : 'paid';
        plan.planType = plan.planType === 'custom' || plan.planType === 'enterprise'
            ? plan.planType
            : (plan.type === 'free' ? 'free' : 'paid');
        plan.priceBDT = plan.type === 'free' ? 0 : priceBDT;
        plan.price = plan.priceBDT;
        plan.currency = safeString(plan.currency, 'BDT');
        plan.billingCycle = plan.billingCycle || 'monthly';
        plan.durationDays = durationDays;
        plan.durationValue = durationValue;
        plan.durationUnit = durationUnit;
        plan.durationMonths = durationUnit === 'months'
            ? Math.max(1, Number(plan.durationMonths || durationValue || 1))
            : null;
        plan.isFree = plan.type === 'free';
        plan.isPaid = plan.type !== 'free';
        plan.shortDescription = safeString(plan.shortDescription || plan.description);
        plan.fullDescription = safeString(plan.fullDescription || plan.description || plan.shortDescription);
        plan.description = plan.fullDescription || plan.shortDescription;
        plan.themeKey = plan.themeKey || deriveThemeKey(code, name);
        plan.badgeText = safeString(plan.badgeText);
        plan.highlightText = safeString(plan.highlightText);
        plan.visibleFeatures = visibleFeatures;
        plan.features = visibleFeatures;
        plan.fullFeatures = fullFeatures;
        plan.excludedFeatures = safeStringList(plan.excludedFeatures);
        plan.includedModules = safeStringList(plan.includedModules);
        plan.supportLevel = plan.supportLevel || 'basic';
        plan.validityLabel = safeString(
            plan.validityLabel,
            buildDurationLabel(durationValue, durationUnit, durationDays)
        );
        plan.renewalNotes = safeString(plan.renewalNotes);
        plan.policyNote = safeString(plan.policyNote);
        plan.faqItems = Array.isArray(plan.faqItems) ? plan.faqItems.filter(Boolean) : [];
        plan.allowsExams = plan.allowsExams !== false;
        plan.allowsPremiumResources = plan.allowsPremiumResources === true;
        plan.allowsSMSUpdates = plan.allowsSMSUpdates === true;
        plan.allowsEmailUpdates = plan.allowsEmailUpdates !== false;
        plan.allowsGuardianAlerts = plan.allowsGuardianAlerts === true;
        plan.allowsSpecialGroups = plan.allowsSpecialGroups === true;
        plan.dashboardPrivileges = safeStringList(plan.dashboardPrivileges, 20);
        plan.maxAttempts = plan.maxAttempts === null || plan.maxAttempts === undefined
            ? null
            : Math.max(0, Number(plan.maxAttempts || 0));
        plan.enabled = enabled;
        plan.isArchived = plan.isArchived === true;
        plan.isActive = !plan.isArchived && enabled;
        plan.displayOrder = displayOrder;
        plan.sortOrder = displayOrder;
        plan.priority = Number(plan.priority || displayOrder || 100);
        plan.showOnHome = plan.showOnHome === true || plan.isFeatured === true;
        plan.showOnPricingPage = plan.showOnPricingPage !== false;
        plan.ctaMode = plan.ctaMode || 'contact';
        plan.ctaLabel = safeString(
            plan.ctaLabel || plan.contactCtaLabel,
            plan.type === 'free' ? 'Get Started' : 'Subscribe Now'
        );
        plan.ctaUrl = safeString(
            plan.ctaUrl || plan.contactCtaUrl,
            plan.ctaMode === 'request_payment' ? '/subscription-plans/checkout' : '/contact'
        );
        plan.contactCtaLabel = safeString(plan.contactCtaLabel || plan.ctaLabel, 'Contact to Subscribe');
        plan.contactCtaUrl = safeString(plan.contactCtaUrl || plan.ctaUrl, '/contact');

        await plan.save();
        updated += 1;
    }

    return { total: plans.length, updated };
}

async function migrateSettings() {
    let settings = await SubscriptionSettings.findOne();
    if (!settings) {
        settings = await SubscriptionSettings.create({});
    }

    settings.pageTitle = safeString(settings.pageTitle, 'Subscription Plans');
    settings.pageSubtitle = safeString(settings.pageSubtitle, 'Choose the right plan for your CampusWay journey.');
    settings.heroEyebrow = safeString(settings.heroEyebrow, 'CampusWay Memberships');
    settings.heroNote = safeString(
        settings.heroNote,
        'Premium access, clear comparisons, and one-click plan details.'
    );
    settings.currencyLabel = safeString(settings.currencyLabel, 'BDT');
    settings.comparisonEnabled = settings.comparisonEnabled !== false;
    settings.comparisonTitle = safeString(settings.comparisonTitle, 'Compare Plans');
    settings.comparisonSubtitle = safeString(settings.comparisonSubtitle, 'See what changes as you upgrade.');
    settings.comparisonRows = Array.isArray(settings.comparisonRows) && settings.comparisonRows.length > 0
        ? settings.comparisonRows
        : [
            { key: 'allowsExams', label: 'Exam Access' },
            { key: 'allowsPremiumResources', label: 'Premium Resources' },
            { key: 'allowsSMSUpdates', label: 'SMS Updates' },
            { key: 'allowsEmailUpdates', label: 'Email Updates' },
            { key: 'allowsGuardianAlerts', label: 'Guardian Alerts' },
            { key: 'supportLevel', label: 'Support Level' },
        ];
    settings.pageFaqEnabled = settings.pageFaqEnabled !== false;
    settings.pageFaqTitle = safeString(settings.pageFaqTitle, 'Frequently Asked Questions');
    settings.pageFaqItems = Array.isArray(settings.pageFaqItems) && settings.pageFaqItems.length > 0
        ? settings.pageFaqItems
        : [
            {
                question: 'How do I activate a paid plan?',
                answer: 'Choose your plan, continue to the subscription action screen, and follow the provided payment or contact flow.',
            },
            {
                question: 'When does plan validity begin?',
                answer: 'Validity begins when the plan is activated by CampusWay and continues for the configured duration.',
            },
        ];
    settings.sectionToggles = {
        detailsDrawer: settings.sectionToggles?.detailsDrawer !== false,
        comparisonTable: settings.sectionToggles?.comparisonTable !== false,
        faqBlock: settings.sectionToggles?.faqBlock !== false,
        homePreview: settings.sectionToggles?.homePreview !== false,
    };
    settings.defaultCtaMode = settings.defaultCtaMode || 'contact';

    await settings.save();
    return { id: String(settings._id) };
}

async function migrateUserCaches() {
    const users = await User.find({
        role: 'student',
        $or: [
            { 'subscription.planCode': { $exists: true, $ne: '' } },
            { 'subscription.plan': { $exists: true, $ne: '' } },
        ],
    }).select('_id subscription');

    let updated = 0;

    for (const user of users) {
        const latest = await UserSubscription.findOne({ userId: user._id })
            .sort({ updatedAt: -1, createdAt: -1 })
            .populate('planId')
            .lean();

        const planDoc = latest?.planId
            && typeof latest.planId === 'object'
            && !(latest.planId instanceof mongoose.Types.ObjectId)
            ? latest.planId as unknown as Record<string, unknown>
            : null;
        const fallbackCode = normalizeSlug(user.subscription?.planCode || user.subscription?.plan, '');
        const fallbackPlan = !planDoc && fallbackCode
            ? await SubscriptionPlan.findOne({ code: fallbackCode }).lean()
            : null;
        const plan = (planDoc || fallbackPlan) as Record<string, unknown> | null;

        if (!plan) continue;

        user.subscription = {
            ...(user.subscription || {}),
            plan: String(plan.code || ''),
            planCode: String(plan.code || ''),
            planId: mongoose.Types.ObjectId.isValid(String(plan._id || ''))
                ? new mongoose.Types.ObjectId(String(plan._id))
                : undefined,
            planSlug: String(plan.slug || plan.code || ''),
            planName: String(plan.name || ''),
            ctaLabel: safeString(plan.ctaLabel || plan.contactCtaLabel, 'Subscribe Now'),
            ctaUrl: safeString(plan.ctaUrl || plan.contactCtaUrl, '/contact'),
            ctaMode: safeString(plan.ctaMode, 'contact') as any,
        };
        await user.save();
        updated += 1;
    }

    return { total: users.length, updated };
}

async function run() {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) is required');

    await mongoose.connect(uri);
    console.log('[migrate:subscription-plans-v3] connected');

    const [planResult, settingsResult, homeSettingsDoc, userCacheResult] = await Promise.all([
        migratePlans(),
        migrateSettings(),
        ensureHomeSettings(),
        migrateUserCaches(),
    ]);

    console.log('[migrate:subscription-plans-v3] plans', planResult);
    console.log('[migrate:subscription-plans-v3] settings', settingsResult);
    console.log('[migrate:subscription-plans-v3] home_settings', { id: String(homeSettingsDoc._id) });
    console.log('[migrate:subscription-plans-v3] user_cache', userCacheResult);

    await mongoose.disconnect();
    console.log('[migrate:subscription-plans-v3] done');
}

run().catch(async (error) => {
    console.error('[migrate:subscription-plans-v3] failed', error);
    await mongoose.disconnect();
    process.exit(1);
});
