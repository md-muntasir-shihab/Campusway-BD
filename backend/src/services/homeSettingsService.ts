import HomeConfig from '../models/HomeConfig';
import HomePage from '../models/HomePage';
import HomeSettings, {
    createHomeSettingsDefaults,
    type HomeSettingsShape,
    type IHomeSettings,
} from '../models/HomeSettings';

const RESETTABLE_SECTIONS = new Set<keyof HomeSettingsShape>([
    'sectionVisibility',
    'hero',
    'subscriptionBanner',
    'bottomBanner',
    'adsSection',
    'stats',
    'timeline',
    'universityDashboard',
    'universityCardConfig',
    'universityPreview',
    'highlightedCategories',
    'featuredUniversities',
    'closingExamWidget',
    'examsWidget',
    'newsPreview',
    'resourcesPreview',
    'socialStrip',
    'footer',
    'ui',
]);

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function deepMerge<T>(base: T, patch: unknown): T {
    if (patch === undefined) return base;
    if (Array.isArray(base)) {
        if (!Array.isArray(patch)) return base;
        return patch as unknown as T;
    }
    if (!isPlainObject(base)) {
        return patch as T;
    }
    if (!isPlainObject(patch)) {
        return base;
    }

    const output: PlainObject = { ...base };
    for (const [key, patchValue] of Object.entries(patch)) {
        if (patchValue === undefined) {
            continue;
        }
        const currentValue = output[key];
        if (Array.isArray(currentValue)) {
            output[key] = Array.isArray(patchValue) ? patchValue : currentValue;
            continue;
        }
        if (isPlainObject(currentValue) && isPlainObject(patchValue)) {
            output[key] = deepMerge(currentValue, patchValue);
            continue;
        }
        output[key] = patchValue as unknown;
    }
    return output as T;
}

function normalizePatch(raw: unknown): Partial<HomeSettingsShape> {
    if (!isPlainObject(raw)) return {};
    return raw as Partial<HomeSettingsShape>;
}

async function buildLegacySeedPatch(): Promise<Partial<HomeSettingsShape>> {
    const [legacyHome, legacyConfig] = await Promise.all([
        HomePage.findOne().lean(),
        HomeConfig.findOne().select('selectedUniversityCategories').lean(),
    ]);

    if (!legacyHome && !legacyConfig) return {};

    const patch: Partial<HomeSettingsShape> = {};

    if (legacyHome?.heroSection) {
        patch.hero = {
            pillText: 'CampusWay',
            title: String(legacyHome.heroSection.title || ''),
            subtitle: String(legacyHome.heroSection.subtitle || ''),
            showSearch: true,
            searchPlaceholder: 'Search universities, exams, news...',
            showNextDeadlineCard: true,
            primaryCTA: {
                label: String(legacyHome.heroSection.buttonText || 'Explore'),
                url: String(legacyHome.heroSection.buttonLink || '/universities'),
            },
            secondaryCTA: { label: 'View Exams', url: '/exam-portal' },
            heroImageUrl: String(legacyHome.heroSection.backgroundImage || ''),
            shortcutChips: [],
        };
    }

    if (legacyHome?.promotionalBanner) {
        patch.subscriptionBanner = {
            enabled: Boolean(legacyHome.promotionalBanner.enabled),
            title: 'Subscription Plans',
            subtitle: 'Choose a plan that fits your preparation goals.',
            loginMessage: 'Contact admin to subscribe and unlock online exams.',
            noPlanMessage: 'Subscription required to start online exams.',
            activePlanMessage: 'Plan Active',
            bannerImageUrl: String(legacyHome.promotionalBanner.image || ''),
            primaryCTA: {
                label: 'See Plans',
                url: String(legacyHome.promotionalBanner.link || '/subscription-plans'),
            },
            secondaryCTA: { label: 'Contact Admin', url: '/contact' },
            showPlanCards: true,
            planIdsToShow: [],
        };
    }

    if (legacyHome?.featuredSectionSettings) {
        patch.sectionVisibility = {
            hero: true,
            subscriptionBanner: true,
            stats: true,
            timeline: true,
            universityDashboard: true,
            closingExamWidget: true,
            examsWidget: Boolean(legacyHome.featuredSectionSettings.showExams),
            newsPreview: Boolean(legacyHome.featuredSectionSettings.showNews),
            resourcesPreview: true,
            socialStrip: true,
            adsSection: true,
            footer: true,
        };
    }

    if (legacyConfig?.selectedUniversityCategories?.[0]) {
        patch.universityDashboard = {
            enabled: true,
            title: 'University Dashboard',
            subtitle: 'Filters and placeholder grid for upcoming detailed card design.',
            showFilters: true,
            defaultCategory: String(legacyConfig.selectedUniversityCategories[0] || 'Individual Admission'),
            showAllCategories: false,
            showPlaceholderText: true,
            placeholderNote: 'University cards will be designed separately.',
        };
    }

    return patch;
}

export function mergeHomeSettings(
    current: HomeSettingsShape,
    patch: unknown
): HomeSettingsShape {
    const normalizedPatch = normalizePatch(patch);
    const merged = deepMerge(current, normalizedPatch);

    // Ensure defaults always remain available.
    return deepMerge(createHomeSettingsDefaults(), merged);
}

export async function ensureHomeSettings(): Promise<IHomeSettings> {
    const existing = await HomeSettings.findOne();
    if (existing) return existing;

    const defaults = createHomeSettingsDefaults();
    const legacyPatch = await buildLegacySeedPatch();
    const seeded = mergeHomeSettings(defaults, legacyPatch);
    return HomeSettings.create(seeded);
}

export function getHomeSettingsDefaults(): HomeSettingsShape {
    return createHomeSettingsDefaults();
}

export function isResettableSection(value: string): value is keyof HomeSettingsShape {
    return RESETTABLE_SECTIONS.has(value as keyof HomeSettingsShape);
}
