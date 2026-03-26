import mongoose from 'mongoose';
import { connectDB } from '../config/db';
import HomeConfig from '../models/HomeConfig';
import HomeSettings, { createHomeSettingsDefaults, type HomeSettingsShape } from '../models/HomeSettings';
import News from '../models/News';
import SiteSettings from '../models/Settings';
import WebsiteSettings from '../models/WebsiteSettings';

type HomeSectionRecord = {
    id: string;
    title: string;
    isActive: boolean;
    order: number;
    config?: Record<string, unknown>;
};

const DEFAULT_HOME_SECTIONS: HomeSectionRecord[] = [
    { id: 'search', title: 'Search Bar', isActive: true, order: 0 },
    { id: 'hero', title: 'Hero Banner', isActive: true, order: 1 },
    { id: 'subscription_banner', title: 'Subscription Preview', isActive: true, order: 2 },
    { id: 'campaign_banners', title: 'Campaign Banners', isActive: true, order: 3 },
    { id: 'featured', title: 'Featured Universities', isActive: true, order: 4 },
    { id: 'category_filter', title: 'Category & Cluster Filter', isActive: true, order: 5 },
    { id: 'deadlines', title: 'Admission Deadlines', isActive: true, order: 6 },
    { id: 'upcoming_exams', title: 'Upcoming Exams', isActive: true, order: 7 },
    { id: 'online_exam_preview', title: 'Online Exam Preview', isActive: true, order: 8 },
    { id: 'news', title: 'Latest News', isActive: true, order: 9 },
    { id: 'resources', title: 'Resources Preview', isActive: true, order: 10 },
    { id: 'content_blocks', title: 'Global CTA / Content Block', isActive: true, order: 11 },
    { id: 'stats', title: 'Quick Stats', isActive: true, order: 12 },
];

const PLACEHOLDER_EMAILS = new Set([
    'support@campusway.com',
]);

const PLACEHOLDER_PHONES = new Set([
    '+8801700000000',
    '+8801234567890',
    '+880 1XXX-XXXXXX',
]);

const PLACEHOLDER_ADDRESSES = new Set([
    'Dhaka, Bangladesh',
]);

const PLACEHOLDER_SOCIAL_URLS = new Set([
    'https://facebook.com/campusway',
    'https://wa.me/8801700000000',
    'https://m.me/campusway',
    'https://t.me/campusway',
    'https://twitter.com/campusway',
    'https://youtube.com/@campusway',
    'https://instagram.com/campusway',
]);

function isPlaceholderEmail(value: unknown): boolean {
    return PLACEHOLDER_EMAILS.has(String(value || '').trim().toLowerCase());
}

function isPlaceholderPhone(value: unknown): boolean {
    return PLACEHOLDER_PHONES.has(String(value || '').trim());
}

function isPlaceholderAddress(value: unknown): boolean {
    return PLACEHOLDER_ADDRESSES.has(String(value || '').trim());
}

function isPlaceholderSocialUrl(value: unknown): boolean {
    return PLACEHOLDER_SOCIAL_URLS.has(String(value || '').trim().toLowerCase());
}

function heroContainsQaFixture(hero: Partial<HomeSettingsShape['hero']> | null | undefined): boolean {
    const combined = [
        String(hero?.pillText || ''),
        String(hero?.title || ''),
        String(hero?.subtitle || ''),
    ].join(' ').toLowerCase();

    return combined.includes('campusway universities qa')
        || combined.includes('open universities audit dataset')
        || combined.includes('edge-case fixtures are active for qa');
}

function normalizeHomeSections(currentSections: unknown): HomeSectionRecord[] {
    const incoming = Array.isArray(currentSections)
        ? currentSections.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
        : [];

    const byId = new Map<string, Record<string, unknown>>();
    incoming.forEach((item) => {
        const id = String(item.id || '').trim();
        if (id) byId.set(id, item);
    });

    const extras = incoming
        .filter((item) => {
            const id = String(item.id || '').trim();
            return id && !DEFAULT_HOME_SECTIONS.some((entry) => entry.id === id);
        })
        .map((item, index) => ({
            id: String(item.id || '').trim(),
            title: String(item.title || item.id || '').trim(),
            isActive: item.isActive === undefined ? true : Boolean(item.isActive),
            order: DEFAULT_HOME_SECTIONS.length + index,
            config: item.config && typeof item.config === 'object' ? item.config as Record<string, unknown> : {},
        }));

    return [
        ...DEFAULT_HOME_SECTIONS.map((fallback) => {
            const stored = byId.get(fallback.id);
            return {
                ...fallback,
                title: String(stored?.title || fallback.title),
                isActive: stored?.isActive === undefined ? fallback.isActive : Boolean(stored.isActive),
                order: fallback.order,
                config: stored?.config && typeof stored.config === 'object'
                    ? stored.config as Record<string, unknown>
                    : (fallback.config || {}),
            };
        }),
        ...extras,
    ];
}

async function cleanupHomeSettings(): Promise<Record<string, unknown>> {
    const defaults = createHomeSettingsDefaults();
    const settings = await HomeSettings.findOne();

    if (!settings) {
        await HomeSettings.create(defaults);
        return { createdDefaults: true, heroReset: false, footerNormalized: false };
    }

    let heroReset = false;
    let footerNormalized = false;

    if (heroContainsQaFixture(settings.hero)) {
        settings.hero = defaults.hero;
        heroReset = true;
    } else {
        if (settings.hero?.secondaryCTA?.url === '/exam-portal') {
            settings.hero.secondaryCTA.url = '/exams';
            footerNormalized = true;
        }
        if (Array.isArray(settings.hero?.shortcutChips)) {
            settings.hero.shortcutChips = settings.hero.shortcutChips.map((chip) => (
                chip.actionType === 'route' && chip.actionValue === '/exam-portal'
                    ? { ...chip, actionValue: '/exams' }
                    : chip
            ));
        }
    }

    if (Array.isArray(settings.footer?.quickLinks)) {
        settings.footer.quickLinks = settings.footer.quickLinks.map((link) => (
            link.url === '/exam-portal'
                ? { ...link, url: '/exams' }
                : link
        ));
    }

    if (isPlaceholderEmail(settings.footer?.contactInfo?.email)) {
        settings.footer.contactInfo.email = '';
        footerNormalized = true;
    }
    if (isPlaceholderPhone(settings.footer?.contactInfo?.phone)) {
        settings.footer.contactInfo.phone = '';
        footerNormalized = true;
    }
    if (isPlaceholderAddress(settings.footer?.contactInfo?.address)) {
        settings.footer.contactInfo.address = '';
        footerNormalized = true;
    }

    await settings.save();
    return { createdDefaults: false, heroReset, footerNormalized };
}

async function cleanupHomeConfig(): Promise<Record<string, unknown>> {
    const config = await HomeConfig.findOne();
    if (!config) {
        await HomeConfig.create({ sections: DEFAULT_HOME_SECTIONS, selectedUniversityCategories: [], highlightCategoryIds: [] });
        return { createdDefaults: true, sectionsNormalized: false };
    }

    config.sections = normalizeHomeSections(config.sections) as typeof config.sections;
    await config.save();
    return { createdDefaults: false, sectionsNormalized: true };
}

async function cleanupWebsiteSettings(): Promise<Record<string, unknown>> {
    let settings = await WebsiteSettings.findOne();
    if (!settings) {
        settings = await WebsiteSettings.create({});
    }

    let clearedContacts = 0;
    let clearedSocialLinks = 0;

    if (isPlaceholderEmail(settings.contactEmail)) {
        settings.contactEmail = '';
        clearedContacts += 1;
    }
    if (isPlaceholderPhone(settings.contactPhone)) {
        settings.contactPhone = '';
        clearedContacts += 1;
    }

    const nextSocialLinks = {
        ...(settings.socialLinks || {}),
    };

    (Object.keys(nextSocialLinks) as Array<keyof typeof nextSocialLinks>).forEach((key) => {
        if (isPlaceholderSocialUrl(nextSocialLinks[key])) {
            nextSocialLinks[key] = '';
            clearedSocialLinks += 1;
        }
    });

    settings.socialLinks = nextSocialLinks;
    await settings.save();

    return { clearedContacts, clearedSocialLinks };
}

async function cleanupSiteSettings(): Promise<Record<string, unknown>> {
    let settings = await SiteSettings.findOne();
    if (!settings) {
        settings = await SiteSettings.create({});
    }

    let clearedContacts = 0;
    let removedSocialLinks = 0;

    if (isPlaceholderEmail(settings.contactEmail)) {
        settings.contactEmail = '';
        clearedContacts += 1;
    }
    if (isPlaceholderPhone(settings.contactPhone)) {
        settings.contactPhone = '';
        clearedContacts += 1;
    }
    if (isPlaceholderAddress(settings.contactAddress)) {
        settings.contactAddress = '';
        clearedContacts += 1;
    }

    if (Array.isArray(settings.socialLinks)) {
        const before = settings.socialLinks.length;
        settings.socialLinks = settings.socialLinks.filter((item) => !isPlaceholderSocialUrl(item?.url));
        removedSocialLinks = before - settings.socialLinks.length;
    }

    await settings.save();
    return { clearedContacts, removedSocialLinks };
}

async function cleanupDiagnosticNews(): Promise<Record<string, unknown>> {
    const result = await News.updateMany(
        {
            $or: [
                { title: { $regex: '^CampusWay diagnostic feed:', $options: 'i' } },
                { slug: { $regex: '^campusway-diagnostic-', $options: 'i' } },
                { originalArticleUrl: { $regex: '/api/news/diagnostics/', $options: 'i' } },
                { originalLink: { $regex: '/api/news/diagnostics/', $options: 'i' } },
                { sourceUrl: { $regex: '/api/news/diagnostics/', $options: 'i' } },
            ],
        },
        {
            $set: {
                status: 'archived',
                isPublished: false,
                publishedAt: null,
                scheduleAt: null,
                scheduledAt: null,
            },
        },
    );

    return {
        matched: Number(result.matchedCount || 0),
        modified: Number(result.modifiedCount || 0),
    };
}

async function run(): Promise<void> {
    try {
        await connectDB();

        const [homeSettings, homeConfig, websiteSettings, siteSettings, diagnosticNews] = await Promise.all([
            cleanupHomeSettings(),
            cleanupHomeConfig(),
            cleanupWebsiteSettings(),
            cleanupSiteSettings(),
            cleanupDiagnosticNews(),
        ]);

        console.log(JSON.stringify({
            ok: true,
            homeSettings,
            homeConfig,
            websiteSettings,
            siteSettings,
            diagnosticNews,
        }, null, 2));
    } catch (error) {
        console.error('[release_cleanup_public_surface] failed', error);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

void run();
