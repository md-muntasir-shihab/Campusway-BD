import type {
    ApiAboutStaticPageConfig,
    ApiFounderContactLink,
    ApiFounderProfile,
    ApiStaticFeatureCard,
    ApiStaticPageConfig,
    ApiStaticPageSection,
    StaticPageTone,
    WebsiteStaticPagesConfig,
} from '../services/api';

export const STATIC_PAGE_ICON_OPTIONS = [
    'info',
    'target',
    'globe',
    'heart',
    'graduation-cap',
    'book-open',
    'users',
    'award',
    'file-text',
    'shield',
    'alert-triangle',
    'mail',
    'eye',
    'database',
    'lock',
    'bell',
] as const;

export const STATIC_PAGE_TONE_OPTIONS: StaticPageTone[] = ['neutral', 'info', 'success', 'warning', 'accent'];

function createSection(
    order: number,
    title: string,
    body: string,
    iconKey: string,
    tone: StaticPageTone,
    bullets: string[] = [],
): ApiStaticPageSection {
    return {
        title,
        body,
        bullets,
        iconKey,
        tone,
        enabled: true,
        order,
    };
}

function createFeatureCard(
    order: number,
    title: string,
    description: string,
    iconKey: string,
): ApiStaticFeatureCard {
    return {
        title,
        description,
        iconKey,
        enabled: true,
        order,
    };
}

function createFounder(
    order: number,
    name = '',
    title = '',
    shortBio = '',
    photoUrl = '',
    contactLinks: ApiFounderContactLink[] = [],
): ApiFounderProfile {
    return {
        name,
        title,
        shortBio,
        photoUrl,
        contactLinks,
        enabled: true,
        order,
    };
}

export function createDefaultWebsiteStaticPages(): WebsiteStaticPagesConfig {
    return {
        about: {
            eyebrow: 'About CampusWay',
            title: 'Empowering Students Across Bangladesh',
            subtitle: 'CampusWay helps students navigate admissions, exams, scholarships, and university decisions with one reliable platform.',
            lastUpdatedLabel: 'Updated regularly by the CampusWay admin team.',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(
                    1,
                    'Our Mission',
                    'We want every student to have equal access to clear, practical, and timely admission guidance so opportunity does not depend on guesswork.',
                    'target',
                    'info',
                    [
                        'Keep admission information easy to understand.',
                        'Reduce confusion during university and scholarship applications.',
                        'Give students one place for guidance, exams, and resources.',
                    ],
                ),
                createSection(
                    2,
                    'Our Vision',
                    'CampusWay aims to become the most trusted student platform for admission preparation and decision support in the region.',
                    'globe',
                    'success',
                    [
                        'Connect students with verified university information.',
                        'Support better academic planning with practical tools.',
                        'Keep growth focused on clarity, trust, and student outcomes.',
                    ],
                ),
                createSection(
                    3,
                    'Built With Care',
                    'The platform is shaped around real student problems: deadline pressure, scattered information, and the need for better preparation support.',
                    'heart',
                    'accent',
                    [
                        'Designed for quick scanning on mobile and desktop.',
                        'Built to connect guidance, exams, results, and communication.',
                    ],
                ),
            ],
            featureCards: [
                createFeatureCard(1, 'University Database', 'Track institutions, categories, deadlines, and application details from one place.', 'graduation-cap'),
                createFeatureCard(2, 'Practice Exams', 'Prepare with guided tests, question banks, and exam performance insights.', 'book-open'),
                createFeatureCard(3, 'Student Guidance', 'Support students with practical workflows, alerts, and communication tools.', 'users'),
                createFeatureCard(4, 'Scholarship Support', 'Surface useful opportunities and simplify decision-making around next steps.', 'award'),
            ],
            founderProfiles: [],
        },
        terms: {
            eyebrow: 'Legal',
            title: 'Terms & Conditions',
            subtitle: 'Please review these terms before using CampusWay services, exam tools, and student resources.',
            lastUpdatedLabel: 'Last updated: March 2026',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(1, 'Acceptance of Terms', 'By using CampusWay, you agree to these terms and all applicable rules governing educational services and digital access.', 'shield', 'info', ['If you do not agree with the terms, you should stop using the platform.']),
                createSection(2, 'Use of Services', 'CampusWay provides admission guidance, exam preparation tools, news, and student resources for lawful educational purposes.', 'file-text', 'neutral', ['Users are responsible for their account activity.', 'Automated scraping or abusive usage is prohibited.', 'Exam integrity rules apply wherever assessment tools are used.']),
                createSection(3, 'Content Accuracy', 'We work to keep information current, but official university and institutional sources remain the final authority for deadlines, seats, and requirements.', 'alert-triangle', 'warning', ['Always verify critical admission details with the official source.']),
                createSection(4, 'Liability & Contact', 'CampusWay is not liable for direct or indirect decisions based solely on platform information. Use the contact page for legal or account-related questions.', 'mail', 'neutral'),
            ],
        },
        privacy: {
            eyebrow: 'Legal',
            title: 'Privacy Policy',
            subtitle: 'This policy explains what information CampusWay collects, why it is used, and how it is protected.',
            lastUpdatedLabel: 'Last updated: March 2026',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                createSection(1, 'Information We Collect', 'CampusWay may collect account, contact, exam, and device information needed to deliver the platform safely and effectively.', 'eye', 'info', ['Account information such as name, email, and phone.', 'Usage information related to learning activity and support flows.', 'Device and browser data for compatibility and security.']),
                createSection(2, 'How We Use Data', 'We use data to deliver services, personalize learning support, improve the product, and keep the platform secure.', 'database', 'neutral', ['Support admissions, exams, and communication workflows.', 'Generate aggregated analytics and service insights.', 'Protect the platform from misuse and fraud.']),
                createSection(3, 'Security & Retention', 'Reasonable technical and organizational controls are used to protect stored data and limit access based on role and need.', 'lock', 'success', ['Authentication and role-based access controls are enforced.', 'Sensitive data should be accessed only by authorized personnel.']),
                createSection(4, 'Your Rights', 'Users can contact CampusWay to request corrections, discuss account privacy concerns, or ask questions about communication preferences.', 'shield', 'accent', ['You may request correction of inaccurate personal information.', 'You may ask questions about stored communication data.']),
            ],
        },
    };
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback = true): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []): string[] {
    if (!Array.isArray(value)) return fallback;
    return value
        .map((item) => asString(item))
        .filter(Boolean);
}

function normalizeSection(value: unknown, fallback: ApiStaticPageSection): ApiStaticPageSection {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        body: asString(source.body, fallback.body),
        bullets: asStringArray(source.bullets, fallback.bullets),
        iconKey: asString(source.iconKey, fallback.iconKey),
        tone: (asString(source.tone, fallback.tone) as StaticPageTone) || fallback.tone,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFeatureCard(value: unknown, fallback: ApiStaticFeatureCard): ApiStaticFeatureCard {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        description: asString(source.description, fallback.description),
        iconKey: asString(source.iconKey, fallback.iconKey),
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFounderContactLink(value: unknown): ApiFounderContactLink | null {
    const source = asRecord(value);
    const label = asString(source.label);
    const url = asString(source.url);
    if (!label && !url) return null;
    return {
        label: label || 'Link',
        url,
    };
}

function normalizeFounderProfile(value: unknown, fallback: ApiFounderProfile): ApiFounderProfile {
    const source = asRecord(value);
    const nextContactLinks = Array.isArray(source.contactLinks)
        ? source.contactLinks
            .map((item) => normalizeFounderContactLink(item))
            .filter((item): item is ApiFounderContactLink => Boolean(item))
        : fallback.contactLinks;

    return {
        name: asString(source.name, fallback.name),
        title: asString(source.title, fallback.title),
        photoUrl: asString(source.photoUrl, fallback.photoUrl),
        shortBio: asString(source.shortBio, fallback.shortBio),
        contactLinks: nextContactLinks,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeStaticPage(value: unknown, fallback: ApiStaticPageConfig): ApiStaticPageConfig {
    const source = asRecord(value);
    const fallbackSections = fallback.sections || [];
    const sourceSections = Array.isArray(source.sections) ? source.sections : null;
    return {
        eyebrow: asString(source.eyebrow, fallback.eyebrow),
        title: asString(source.title, fallback.title),
        subtitle: asString(source.subtitle, fallback.subtitle),
        lastUpdatedLabel: asString(source.lastUpdatedLabel, fallback.lastUpdatedLabel),
        sections: sourceSections
            ? sourceSections.map((item, index) => normalizeSection(item, fallbackSections[index] || createSection(index + 1, '', '', 'info', 'neutral')))
            : fallbackSections,
        backLinkLabel: asString(source.backLinkLabel, fallback.backLinkLabel),
        backLinkUrl: asString(source.backLinkUrl, fallback.backLinkUrl),
    };
}

function normalizeAboutPage(value: unknown, fallback: ApiAboutStaticPageConfig): ApiAboutStaticPageConfig {
    const source = asRecord(value);
    const normalizedBase = normalizeStaticPage(source, fallback);
    const fallbackFeatureCards = fallback.featureCards || [];
    const fallbackFounderProfiles = fallback.founderProfiles || [];

    return {
        ...normalizedBase,
        featureCards: Array.isArray(source.featureCards)
            ? source.featureCards.map((item, index) => normalizeFeatureCard(item, fallbackFeatureCards[index] || createFeatureCard(index + 1, '', '', 'info')))
            : fallbackFeatureCards,
        founderProfiles: Array.isArray(source.founderProfiles)
            ? source.founderProfiles.map((item, index) => normalizeFounderProfile(item, fallbackFounderProfiles[index] || createFounder(index + 1)))
            : fallbackFounderProfiles,
    };
}

export function mergeWebsiteStaticPages(value?: Partial<WebsiteStaticPagesConfig> | null): WebsiteStaticPagesConfig {
    const defaults = createDefaultWebsiteStaticPages();
    const source = asRecord(value);
    return {
        about: normalizeAboutPage(source.about, defaults.about),
        terms: normalizeStaticPage(source.terms, defaults.terms),
        privacy: normalizeStaticPage(source.privacy, defaults.privacy),
    };
}

export function sortByOrder<T extends { order: number }>(items: T[]): T[] {
    return [...items].sort((left, right) => left.order - right.order);
}

