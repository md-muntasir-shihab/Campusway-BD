import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionBillingCycle = 'monthly' | 'yearly' | 'custom' | 'one_time';
export type SubscriptionCtaMode = 'contact' | 'request_payment' | 'internal' | 'external';
export type SubscriptionThemeKey = 'basic' | 'standard' | 'premium' | 'enterprise' | 'custom';
export type SubscriptionSupportLevel = 'basic' | 'priority' | 'premium' | 'enterprise';
export type SubscriptionPlanType = 'free' | 'paid' | 'custom' | 'enterprise';

export interface ISubscriptionFaqItem {
    question: string;
    answer: string;
}

export interface ISubscriptionPlan extends Document {
    code: string;
    slug: string;
    name: string;
    shortTitle?: string;
    tagline?: string;
    type: 'free' | 'paid';
    planType: SubscriptionPlanType;
    priceBDT: number;
    price: number;
    oldPrice?: number | null;
    currency: string;
    billingCycle: SubscriptionBillingCycle;
    durationDays: number;
    durationMonths?: number | null;
    durationValue: number;
    durationUnit: 'days' | 'months';
    isFree: boolean;
    isPaid: boolean;
    bannerImageUrl?: string | null;
    shortDescription?: string;
    fullDescription?: string;
    description?: string;
    themeKey: SubscriptionThemeKey;
    badgeText?: string;
    highlightText?: string;
    features: string[];
    visibleFeatures: string[];
    fullFeatures: string[];
    excludedFeatures: string[];
    tags?: string[];
    includedModules: string[];
    recommendedFor?: string;
    comparisonNote?: string;
    supportLevel: SubscriptionSupportLevel;
    accessScope?: string;
    validityLabel?: string;
    renewalNotes?: string;
    policyNote?: string;
    faqItems: ISubscriptionFaqItem[];
    allowsExams: boolean;
    allowsPremiumResources: boolean;
    allowsSMSUpdates: boolean;
    allowsEmailUpdates: boolean;
    allowsGuardianAlerts: boolean;
    allowsSpecialGroups: boolean;
    dashboardPrivileges: string[];
    maxAttempts?: number | null;
    enabled: boolean;
    isActive: boolean;
    isFeatured?: boolean;
    isArchived: boolean;
    showOnHome: boolean;
    showOnPricingPage: boolean;
    displayOrder: number;
    priority: number;
    sortOrder: number;
    ctaLabel: string;
    ctaUrl: string;
    ctaMode: SubscriptionCtaMode;
    contactCtaLabel: string;
    contactCtaUrl: string;
    createdByAdminId?: mongoose.Types.ObjectId | null;
    updatedByAdminId?: mongoose.Types.ObjectId | null;
    createdAt: Date;
    updatedAt: Date;
}

const faqItemSchema = new Schema<ISubscriptionFaqItem>(
    {
        question: { type: String, trim: true, default: '' },
        answer: { type: String, trim: true, default: '' },
    },
    { _id: false }
);

function normalizeSlug(raw: unknown, fallback = 'plan'): string {
    return String(raw || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || fallback;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
    {
        code: { type: String, required: true, unique: true, trim: true, lowercase: true },
        slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
        name: { type: String, required: true, trim: true },
        shortTitle: { type: String, trim: true, default: '' },
        tagline: { type: String, trim: true, default: '' },
        type: { type: String, enum: ['free', 'paid'], default: 'paid' },
        planType: { type: String, enum: ['free', 'paid', 'custom', 'enterprise'], default: 'paid' },
        priceBDT: { type: Number, min: 0, default: 0 },
        price: { type: Number, min: 0, default: 0 },
        oldPrice: { type: Number, min: 0, default: null },
        currency: { type: String, trim: true, default: 'BDT' },
        billingCycle: { type: String, enum: ['monthly', 'yearly', 'custom', 'one_time'], default: 'monthly' },
        durationDays: { type: Number, required: true, min: 1, default: 30 },
        durationMonths: { type: Number, min: 0, default: null },
        durationValue: { type: Number, required: true, min: 1, default: 30 },
        durationUnit: { type: String, enum: ['days', 'months'], default: 'days' },
        isFree: { type: Boolean, default: false },
        isPaid: { type: Boolean, default: true },
        bannerImageUrl: { type: String, default: null },
        shortDescription: { type: String, default: '' },
        fullDescription: { type: String, default: '' },
        description: { type: String, default: '' },
        themeKey: { type: String, enum: ['basic', 'standard', 'premium', 'enterprise', 'custom'], default: 'basic' },
        badgeText: { type: String, trim: true, default: '' },
        highlightText: { type: String, trim: true, default: '' },
        features: { type: [String], default: [] },
        visibleFeatures: { type: [String], default: [] },
        fullFeatures: { type: [String], default: [] },
        excludedFeatures: { type: [String], default: [] },
        tags: { type: [String], default: [] },
        includedModules: { type: [String], default: [] },
        recommendedFor: { type: String, trim: true, default: '' },
        comparisonNote: { type: String, trim: true, default: '' },
        supportLevel: { type: String, enum: ['basic', 'priority', 'premium', 'enterprise'], default: 'basic' },
        accessScope: { type: String, trim: true, default: '' },
        validityLabel: { type: String, trim: true, default: '' },
        renewalNotes: { type: String, trim: true, default: '' },
        policyNote: { type: String, trim: true, default: '' },
        faqItems: { type: [faqItemSchema], default: [] },
        allowsExams: { type: Boolean, default: true },
        allowsPremiumResources: { type: Boolean, default: false },
        allowsSMSUpdates: { type: Boolean, default: false },
        allowsEmailUpdates: { type: Boolean, default: true },
        allowsGuardianAlerts: { type: Boolean, default: false },
        allowsSpecialGroups: { type: Boolean, default: false },
        dashboardPrivileges: { type: [String], default: [] },
        maxAttempts: { type: Number, min: 0, default: null },
        enabled: { type: Boolean, default: true },
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        isArchived: { type: Boolean, default: false },
        showOnHome: { type: Boolean, default: false },
        showOnPricingPage: { type: Boolean, default: true },
        displayOrder: { type: Number, default: 100 },
        priority: { type: Number, default: 100 },
        sortOrder: { type: Number, default: 100 },
        ctaLabel: { type: String, trim: true, default: 'Subscribe Now' },
        ctaUrl: { type: String, trim: true, default: '/subscription-plans/checkout' },
        ctaMode: { type: String, enum: ['contact', 'request_payment', 'internal', 'external'], default: 'contact' },
        contactCtaLabel: { type: String, trim: true, default: 'Contact to Subscribe' },
        contactCtaUrl: { type: String, trim: true, default: '/contact' },
        createdByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
        updatedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

SubscriptionPlanSchema.index({ isActive: 1, isArchived: 1, priority: 1, sortOrder: 1, code: 1 });
SubscriptionPlanSchema.index({ enabled: 1, displayOrder: 1, showOnHome: 1, showOnPricingPage: 1 });
SubscriptionPlanSchema.pre('validate', function syncLegacyAndV3(next) {
    const normalizedName = String(this.name || '').trim();
    const nextCode = normalizeSlug(this.code || normalizedName, 'plan');
    const nextSlug = normalizeSlug(this.slug || this.code || normalizedName, nextCode || 'plan');

    this.code = nextCode;
    this.slug = nextSlug;
    this.shortTitle = String(this.shortTitle || normalizedName).trim();

    const numericPrice = Number(this.priceBDT ?? this.price ?? 0);
    this.priceBDT = Number.isFinite(numericPrice) ? Math.max(0, numericPrice) : 0;
    this.price = Number(this.priceBDT || this.price || 0);

    const days = Number(this.durationDays ?? this.durationValue ?? 30);
    this.durationDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 30;
    this.durationValue = Number(this.durationValue || this.durationDays || 30);
    this.durationUnit = this.durationUnit === 'months' ? 'months' : 'days';
    this.durationMonths = this.durationUnit === 'months'
        ? Math.max(1, Number(this.durationMonths || this.durationValue || 1))
        : (this.durationMonths === null || this.durationMonths === undefined ? null : Math.max(0, Number(this.durationMonths || 0)));

    this.enabled = this.enabled !== false;
    this.isArchived = this.isArchived === true;
    this.isActive = !this.isArchived && this.enabled;

    const displayOrder = Number(this.displayOrder || this.sortOrder || this.priority || 100);
    this.displayOrder = Number.isFinite(displayOrder) ? displayOrder : 100;
    this.sortOrder = this.displayOrder;
    this.priority = Number(this.priority || this.displayOrder || 100);

    const mergedVisible = Array.from(new Set(
        (Array.isArray(this.visibleFeatures) ? this.visibleFeatures : [])
            .concat(Array.isArray(this.features) ? this.features : [])
            .concat(Array.isArray(this.includedModules) ? this.includedModules : [])
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    ));
    const mergedFull = Array.from(new Set(
        (Array.isArray(this.fullFeatures) ? this.fullFeatures : [])
            .concat(mergedVisible)
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    ));

    this.visibleFeatures = mergedVisible.slice(0, 8);
    this.fullFeatures = mergedFull;
    this.features = mergedVisible;

    this.ctaLabel = String(this.ctaLabel || this.contactCtaLabel || 'Subscribe Now').trim() || 'Subscribe Now';
    this.ctaUrl = String(this.ctaUrl || this.contactCtaUrl || '/contact').trim() || '/contact';
    this.contactCtaLabel = String(this.contactCtaLabel || this.ctaLabel || 'Contact to Subscribe').trim() || 'Contact to Subscribe';
    this.contactCtaUrl = String(this.contactCtaUrl || this.ctaUrl || '/contact').trim() || '/contact';

    this.shortDescription = String(this.shortDescription || this.description || '').trim();
    this.fullDescription = String(this.fullDescription || this.description || this.shortDescription || '').trim();
    this.description = this.fullDescription || this.shortDescription;

    if (!this.themeKey || this.themeKey === 'custom') {
        const hint = `${this.code} ${this.name}`.toLowerCase();
        if (hint.includes('premium') || hint.includes('pro')) this.themeKey = 'premium';
        else if (hint.includes('standard') || hint.includes('plus')) this.themeKey = 'standard';
        else if (hint.includes('enterprise') || hint.includes('elite')) this.themeKey = 'enterprise';
        else this.themeKey = 'basic';
    }

    const rawPlanType = String(this.planType || this.type || '').toLowerCase();
    if (['custom', 'enterprise'].includes(rawPlanType)) {
        this.planType = rawPlanType as SubscriptionPlanType;
    } else {
        this.planType = this.priceBDT <= 0 ? 'free' : 'paid';
    }

    if (this.planType === 'free' || this.type === 'free' || Number(this.priceBDT || 0) <= 0) {
        this.type = 'free';
        this.planType = this.planType === 'custom' || this.planType === 'enterprise' ? this.planType : 'free';
        this.priceBDT = 0;
        this.price = 0;
        this.isFree = true;
        this.isPaid = false;
    } else {
        this.type = 'paid';
        this.isFree = false;
        this.isPaid = true;
    }

    if (this.showOnHome === undefined) {
        this.showOnHome = Boolean(this.isFeatured);
    }
    if (this.showOnPricingPage === undefined) {
        this.showOnPricingPage = true;
    }

    next();
});

export default mongoose.model<ISubscriptionPlan>('SubscriptionPlan', SubscriptionPlanSchema);
