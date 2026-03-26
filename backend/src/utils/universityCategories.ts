export const UNIVERSITY_CATEGORY_ORDER = [
    'Individual Admission',
    'Science & Technology',
    'GST (General/Public)',
    'GST (Science & Technology)',
    'Medical College',
    'AGRI Cluster',
    'Under Army',
    'DCU',
    'Specialized University',
    'Affiliate College',
    'Dental College',
    'Nursing Colleges',
] as const;

export type UniversityCategoryLabel = (typeof UNIVERSITY_CATEGORY_ORDER)[number];

const CANONICAL_SET = new Set<string>(UNIVERSITY_CATEGORY_ORDER.map((item) => item.toLowerCase()));
const ALL_UNIVERSITY_CATEGORY_TOKENS = new Set<string>([
    'all',
    'all universities',
    'all university',
]);

const CATEGORY_ALIAS_MAP: Record<string, UniversityCategoryLabel> = {
    'individual': 'Individual Admission',
    'individual admission': 'Individual Admission',
    'science and technology': 'Science & Technology',
    'science & technology': 'Science & Technology',
    'gst general/public': 'GST (General/Public)',
    'gst (general/public)': 'GST (General/Public)',
    'gst general': 'GST (General/Public)',
    'gst public': 'GST (General/Public)',
    'gst science & technology': 'GST (Science & Technology)',
    'gst (science & technology)': 'GST (Science & Technology)',
    'gst science and technology': 'GST (Science & Technology)',
    'medical': 'Medical College',
    'medical college': 'Medical College',
    'agri': 'AGRI Cluster',
    'agri cluster': 'AGRI Cluster',
    'army': 'Under Army',
    'under army': 'Under Army',
    'under army (medical)': 'Under Army',
    'under army medical': 'Under Army',
    'army medical': 'Under Army',
    'dcu': 'DCU',
    'specialized': 'Specialized University',
    'specialized university': 'Specialized University',
    'affiliate': 'Affiliate College',
    'affiliate college': 'Affiliate College',
    'dental': 'Dental College',
    'dental college': 'Dental College',
    'nursing': 'Nursing Colleges',
    'nursing college': 'Nursing Colleges',
    'nursing colleges': 'Nursing Colleges',
};

export const DEFAULT_UNIVERSITY_CATEGORY: UniversityCategoryLabel = UNIVERSITY_CATEGORY_ORDER[0];

export function isAllUniversityCategoryToken(input: unknown): boolean {
    const normalized = String(input || '').trim().toLowerCase().replace(/\s+/g, ' ');
    return ALL_UNIVERSITY_CATEGORY_TOKENS.has(normalized);
}

export function normalizeUniversityCategory(input: unknown): string {
    const raw = String(input || '').trim();
    if (!raw) return DEFAULT_UNIVERSITY_CATEGORY;
    if (isAllUniversityCategoryToken(raw)) return DEFAULT_UNIVERSITY_CATEGORY;

    const direct = UNIVERSITY_CATEGORY_ORDER.find((item) => item.toLowerCase() === raw.toLowerCase());
    if (direct) return direct;

    const aliasKey = raw.toLowerCase().replace(/\s+/g, ' ');
    return CATEGORY_ALIAS_MAP[aliasKey] || raw;
}

function normalizeCategoryKey(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/^[\d\s.\-_)]+/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function normalizeUniversityCategoryStrict(input: unknown): UniversityCategoryLabel {
    const raw = String(input || '').trim();
    if (!raw) return DEFAULT_UNIVERSITY_CATEGORY;
    if (isAllUniversityCategoryToken(raw)) return DEFAULT_UNIVERSITY_CATEGORY;

    const baseNormalized = normalizeUniversityCategory(raw);
    if (CANONICAL_SET.has(baseNormalized.toLowerCase())) {
        return baseNormalized as UniversityCategoryLabel;
    }

    const normalizedKey = normalizeCategoryKey(raw);
    if (CATEGORY_ALIAS_MAP[normalizedKey]) return CATEGORY_ALIAS_MAP[normalizedKey];

    if (normalizedKey.includes('gst') && (normalizedKey.includes('science') || normalizedKey.includes('technology'))) {
        return 'GST (Science & Technology)';
    }
    if (normalizedKey.includes('gst') && (normalizedKey.includes('general') || normalizedKey.includes('public'))) {
        return 'GST (General/Public)';
    }
    if (normalizedKey.includes('army')) return 'Under Army';
    if (normalizedKey.includes('agri')) return 'AGRI Cluster';
    if (normalizedKey.includes('dental')) return 'Dental College';
    if (normalizedKey.includes('nursing')) return 'Nursing Colleges';
    if (normalizedKey.includes('affiliate')) return 'Affiliate College';
    if (normalizedKey.includes('specialized')) return 'Specialized University';
    if (normalizedKey.includes('medical')) return 'Medical College';
    if (normalizedKey.includes('dcu')) return 'DCU';
    if (normalizedKey.includes('science') || normalizedKey.includes('technology')) return 'Science & Technology';
    if (normalizedKey.includes('individual')) return 'Individual Admission';

    return DEFAULT_UNIVERSITY_CATEGORY;
}

export function isCanonicalUniversityCategory(input: unknown): input is UniversityCategoryLabel {
    return CANONICAL_SET.has(String(input || '').trim().toLowerCase());
}

export function getUniversityCategoryOrderIndex(input: unknown): number {
    const normalized = normalizeUniversityCategory(input);
    const index = UNIVERSITY_CATEGORY_ORDER.findIndex((item) => item === normalized);
    return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function sortByUniversityCategoryOrder(values: string[]): string[] {
    return [...values].sort((a, b) => {
        const aIndex = getUniversityCategoryOrderIndex(a);
        const bIndex = getUniversityCategoryOrderIndex(b);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.localeCompare(b);
    });
}
