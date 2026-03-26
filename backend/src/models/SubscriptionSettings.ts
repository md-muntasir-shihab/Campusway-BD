import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionSettingsFaqItem {
    question: string;
    answer: string;
}

export interface ISubscriptionSettingsComparisonRow {
    key: string;
    label: string;
}

export interface ISubscriptionSettings extends Document {
    pageTitle: string;
    pageSubtitle: string;
    heroEyebrow: string;
    heroNote: string;
    headerBannerUrl: string | null;
    defaultPlanBannerUrl: string | null;
    currencyLabel: string;
    showFeaturedFirst: boolean;
    allowFreePlans: boolean;
    comparisonEnabled: boolean;
    comparisonTitle: string;
    comparisonSubtitle: string;
    comparisonRows: ISubscriptionSettingsComparisonRow[];
    pageFaqEnabled: boolean;
    pageFaqTitle: string;
    pageFaqItems: ISubscriptionSettingsFaqItem[];
    sectionToggles: {
        detailsDrawer: boolean;
        comparisonTable: boolean;
        faqBlock: boolean;
        homePreview: boolean;
    };
    defaultCtaMode: 'contact' | 'request_payment' | 'internal' | 'external';
    lastEditedByAdminId: mongoose.Types.ObjectId | null;
    updatedAt: Date;
    createdAt: Date;
}

const faqItemSchema = new Schema<ISubscriptionSettingsFaqItem>(
    {
        question: { type: String, trim: true, default: '' },
        answer: { type: String, trim: true, default: '' },
    },
    { _id: false }
);

const comparisonRowSchema = new Schema<ISubscriptionSettingsComparisonRow>(
    {
        key: { type: String, trim: true, default: '' },
        label: { type: String, trim: true, default: '' },
    },
    { _id: false }
);

const SubscriptionSettingsSchema = new Schema<ISubscriptionSettings>(
    {
        pageTitle: { type: String, default: 'Subscription Plans' },
        pageSubtitle: { type: String, default: 'Choose the right plan for your CampusWay journey.' },
        heroEyebrow: { type: String, default: 'CampusWay Memberships' },
        heroNote: { type: String, default: 'Premium access, clear comparisons, and one-click plan details.' },
        headerBannerUrl: { type: String, default: null },
        defaultPlanBannerUrl: { type: String, default: null },
        currencyLabel: { type: String, default: 'BDT' },
        showFeaturedFirst: { type: Boolean, default: true },
        allowFreePlans: { type: Boolean, default: true },
        comparisonEnabled: { type: Boolean, default: true },
        comparisonTitle: { type: String, default: 'Compare Plans' },
        comparisonSubtitle: { type: String, default: 'See what changes as you upgrade.' },
        comparisonRows: {
            type: [comparisonRowSchema],
            default: () => ([
                { key: 'allowsExams', label: 'Exam Access' },
                { key: 'allowsPremiumResources', label: 'Premium Resources' },
                { key: 'allowsSMSUpdates', label: 'SMS Updates' },
                { key: 'allowsEmailUpdates', label: 'Email Updates' },
                { key: 'allowsGuardianAlerts', label: 'Guardian Alerts' },
                { key: 'supportLevel', label: 'Support Level' },
            ]),
        },
        pageFaqEnabled: { type: Boolean, default: true },
        pageFaqTitle: { type: String, default: 'Frequently Asked Questions' },
        pageFaqItems: {
            type: [faqItemSchema],
            default: () => ([
                {
                    question: 'How do I activate a paid plan?',
                    answer: 'Choose your plan, continue to the subscription action screen, and follow the provided payment or contact flow.',
                },
                {
                    question: 'When does plan validity begin?',
                    answer: 'Validity begins when the plan is activated by CampusWay and continues for the configured duration.',
                },
            ]),
        },
        sectionToggles: {
            detailsDrawer: { type: Boolean, default: true },
            comparisonTable: { type: Boolean, default: true },
            faqBlock: { type: Boolean, default: true },
            homePreview: { type: Boolean, default: true },
        },
        defaultCtaMode: { type: String, enum: ['contact', 'request_payment', 'internal', 'external'], default: 'contact' },
        lastEditedByAdminId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true }
);

SubscriptionSettingsSchema.index({ updatedAt: -1 });

export default mongoose.model<ISubscriptionSettings>('SubscriptionSettings', SubscriptionSettingsSchema);
