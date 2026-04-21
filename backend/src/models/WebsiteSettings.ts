import mongoose, { Schema, Document } from 'mongoose';
import { PUBLIC_BRAND_ASSETS } from '../utils/brandAssets';

const DEFAULT_CANONICAL_LOGO = PUBLIC_BRAND_ASSETS.logo;
const DEFAULT_CANONICAL_FAVICON = PUBLIC_BRAND_ASSETS.favicon;

export type StaticPageTone = 'neutral' | 'info' | 'success' | 'warning' | 'accent';

export interface StaticPageSectionConfig {
    title: string;
    body: string;
    bullets: string[];
    iconKey: string;
    tone: StaticPageTone;
    enabled: boolean;
    order: number;
}

export interface StaticFeatureCardConfig {
    title: string;
    description: string;
    iconKey: string;
    enabled: boolean;
    order: number;
}

export interface FounderContactLinkConfig {
    label: string;
    url: string;
}

export interface FounderEducationConfig {
    degree: string;
    institution: string;
    department: string;
    year: string;
    result: string;
    order: number;
}

export interface FounderProfileConfig {
    name: string;
    title: string;
    photoUrl: string;
    shortBio: string;
    quote: string;
    fatherName: string;
    dateOfBirth: string;
    gender: string;
    phone: string;
    emergencyPhone: string;
    email: string;
    address: string;
    education: FounderEducationConfig[];
    skills: string[];
    experience: string;
    contactLinks: FounderContactLinkConfig[];
    enabled: boolean;
    order: number;
}

export interface StaticPageConfig {
    eyebrow: string;
    title: string;
    subtitle: string;
    lastUpdatedLabel: string;
    sections: StaticPageSectionConfig[];
    backLinkLabel: string;
    backLinkUrl: string;
}

export interface AboutStaticPageConfig extends StaticPageConfig {
    featureCards: StaticFeatureCardConfig[];
    founderProfiles: FounderProfileConfig[];
}

export interface WebsiteStaticPagesConfig {
    about: AboutStaticPageConfig;
    terms: StaticPageConfig;
    privacy: StaticPageConfig;
}

function asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback = true): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => asString(item))
        .filter(Boolean);
}

export function createWebsiteStaticPagesDefaults(): WebsiteStaticPagesConfig {
    return {
        about: {
            eyebrow: 'ক্যাম্পাসওয়ে সম্পর্কে',
            title: 'ক্যাম্পাসওয়েতে স্বাগতম',
            subtitle: 'ক্যাম্পাসওয়ে বাংলাদেশের শিক্ষার্থীদের জন্য তৈরি একটি আধুনিক, নির্ভরযোগ্য এবং সমন্বিত শিক্ষা প্ল্যাটফর্ম। আমরা বিশ্বাস করি, ভালো রেজাল্ট শুধু মেধার উপর নির্ভর করে না; সঠিক পরিকল্পনা, নিয়মিত অনুশীলন, নির্ভুল তথ্য এবং সময়মতো গাইডলাইনও সমানভাবে জরুরি।',
            lastUpdatedLabel: 'CampusWay Team কর্তৃক পরিচালিত',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                {
                    title: 'আমাদের ভিশন',
                    body: 'বাংলাদেশের প্রতিটি শিক্ষার্থীর জন্য মানসম্মত শিক্ষা সহায়তাকে সহজলভ্য, সাশ্রয়ী এবং বাস্তবমুখী করা। শহর বা গ্রাম, বাংলা মিডিয়াম বা ইংরেজি মিডিয়াম, অনলাইন বা অফলাইন ব্যাকগ্রাউন্ড—সব শিক্ষার্থী যেন সমান সুযোগ নিয়ে এগোতে পারে, সেটাই আমাদের মূল লক্ষ্য।',
                    bullets: [], iconKey: 'globe', tone: 'success', enabled: true, order: 1,
                },
                {
                    title: 'আমাদের মিশন',
                    body: 'শিক্ষার্থীর একাডেমিক যাত্রাকে সহজ, সংগঠিত এবং ফলপ্রসূ করা।',
                    bullets: [
                        'শিক্ষার্থীর একাডেমিক যাত্রাকে সহজ ও সংগঠিত করা',
                        'নির্ভুল তথ্যের ভিত্তিতে সিদ্ধান্ত নেওয়ার সুযোগ তৈরি করা',
                        'অনুশীলনভিত্তিক শেখার সংস্কৃতি গড়ে তোলা',
                        'ভর্তি, পরীক্ষা ও ভবিষ্যৎ পরিকল্পনায় আত্মবিশ্বাস বাড়ানো',
                        'প্রযুক্তির মাধ্যমে শেখাকে আরও ব্যক্তিগত, দ্রুত এবং ফলপ্রসূ করা',
                    ], iconKey: 'target', tone: 'info', enabled: true, order: 2,
                },
                {
                    title: 'কারা ক্যাম্পাসওয়ে ব্যবহার করতে পারবে',
                    body: 'ক্যাম্পাসওয়ে সকল স্তরের শিক্ষার্থীদের জন্য উন্মুক্ত।',
                    bullets: [
                        'স্কুল ও কলেজ শিক্ষার্থী',
                        'বিশ্ববিদ্যালয় ভর্তি পরীক্ষার্থী',
                        'প্রতিযোগিতামূলক পরীক্ষার প্রস্তুতিমূলক শিক্ষার্থী',
                        'যারা এক জায়গায় পরীক্ষা, রিসোর্স, গাইডলাইন ও অগ্রগতি ট্র্যাকিং চায়',
                    ], iconKey: 'users', tone: 'accent', enabled: true, order: 3,
                },
                {
                    title: 'একজন শিক্ষার্থীর জন্য ক্যাম্পাসওয়ে কেন জরুরি',
                    body: 'ক্যাম্পাসওয়ে শিক্ষার্থীর প্রতিটি পদক্ষেপে সহায়তা করে।',
                    bullets: [
                        'দিকনির্দেশনা স্পষ্ট করে',
                        'সময় বাঁচায়',
                        'অনুশীলনকে কার্যকর করে',
                        'অগ্রগতি বুঝতে সাহায্য করে',
                        'ভর্তি প্রস্তুতিতে বাস্তব সহায়তা দেয়',
                        'আপডেটেড থাকতে সাহায্য করে',
                        'একাডেমিক আত্মবিশ্বাস বাড়ায়',
                    ], iconKey: 'heart', tone: 'warning', enabled: true, order: 4,
                },
                {
                    title: 'আমাদের প্রতিশ্রুতি',
                    body: 'ক্যাম্পাসওয়ে তোমার একাডেমিক যাত্রার প্রতিটি ধাপে একজন নির্ভরযোগ্য সঙ্গী।\n\nতোমার লক্ষ্য, তোমার গতি, তোমার ভবিষ্যৎ — ক্যাম্পাসওয়ে আছে তোমার পাশে।',
                    bullets: [
                        'শিক্ষার্থীকে কেন্দ্র করে প্রতিটি ফিচার উন্নয়ন',
                        'তথ্যকে আরও নির্ভুল, আপডেটেড ও প্রাসঙ্গিক রাখা',
                        'শেখাকে শুধু কনটেন্ট-ভিত্তিক নয়, ফলাফল-ভিত্তিক করা',
                        'বাংলাদেশি শিক্ষার্থীর বাস্তব চাহিদা অনুযায়ী সেবা উন্নত করা',
                    ], iconKey: 'heart', tone: 'accent', enabled: true, order: 5,
                },
            ],
            featureCards: [
                { title: 'পাবলিক একাডেমিক কনটেন্ট', description: 'বিশ্ববিদ্যালয়, রিসোর্স, নিউজ ও গুরুত্বপূর্ণ তথ্য থেকে নির্ভরযোগ্য ধারণা পান।', iconKey: 'graduation-cap', enabled: true, order: 1 },
                { title: 'এক্সাম ও প্রস্তুতি সাপোর্ট', description: 'অনুশীলন, মূল্যায়ন, রেজাল্ট ভিউ — শেখা হয় পরিমাপযোগ্য।', iconKey: 'book-open', enabled: true, order: 2 },
                { title: 'স্টুডেন্ট ড্যাশবোর্ড', description: 'পরীক্ষা, ফলাফল, নোটিফিকেশন ও একাডেমিক অ্যাকশন এক জায়গায়।', iconKey: 'users', enabled: true, order: 3 },
                { title: 'রিসোর্স ও জ্ঞানভান্ডার', description: 'বিষয়ভিত্তিক শেখার উপকরণ ও ব্যবহারযোগ্য রিসোর্স।', iconKey: 'file-text', enabled: true, order: 4 },
                { title: 'নিউজ ও আপডেট', description: 'সময়োপযোগী একাডেমিক আপডেট সহজভাবে পৌঁছে দিই।', iconKey: 'bell', enabled: true, order: 5 },
                { title: 'হেল্প সেন্টার ও সাপোর্ট', description: 'সমস্যা থাকলে দ্রুত সহায়তা পান।', iconKey: 'shield', enabled: true, order: 6 },
            ],
            founderProfiles: [
                {
                    name: 'মোঃ মুনতাসির শিহাব (MD Muntasir Shihab)',
                    title: 'Founder & CEO',
                    photoUrl: '',
                    shortBio: 'CampusWay-এর প্রতিষ্ঠাতা ও পরিচালক। শিক্ষার্থীদের ভর্তি প্রস্তুতি ও একাডেমিক সহায়তায় একটি নির্ভরযোগ্য প্ল্যাটফর্ম গড়ে তোলার লক্ষ্যে কাজ করছেন।',
                    quote: 'Learn, Create, Deliver excellence',
                    fatherName: 'মোঃ মকবুলার রহমান',
                    dateOfBirth: '১২ অক্টোবর ২০০৫',
                    gender: 'পুরুষ',
                    phone: '01317138570',
                    emergencyPhone: '01516553350',
                    email: 'mm.xihab@gmail.com',
                    address: 'গ্রাম: ডাঙ্গাবাড়ী, ডাকঘর: ফুটকিবাড়ী-৫০৪১, ইউনিয়ন: গরিনাবাড়ী (ওয়ার্ড নং- ৭), উপজেলা: পঞ্চগড় সদর, জেলা: পঞ্চগড়।',
                    education: [
                        { degree: 'B.Sc. (স্নাতক)', institution: 'খুলনা বিশ্ববিদ্যালয়', department: 'পরিসংখ্যান (Statistics)', year: '২০২৬ — বর্তমান', result: 'অধ্যয়নরত', order: 5 },
                        { degree: 'HSC (উচ্চ মাধ্যমিক)', institution: 'মকবুলার রহমান সরকারি কলেজ', department: 'বিজ্ঞান', year: '২০২৪', result: 'GPA 4.92', order: 4 },
                        { degree: 'SSC (মাধ্যমিক)', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'বিজ্ঞান', year: '২০২২', result: 'GPA 5.00 (গোল্ডেন)', order: 3 },
                        { degree: 'JSC', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'সাধারণ', year: '২০১৯', result: 'GPA 5.00 (গোল্ডেন)', order: 2 },
                        { degree: 'PSC (প্রাথমিক)', institution: 'আমেনা-বাকি রেসিডেন্সিয়াল মডেল স্কুল অ্যান্ড কলেজ', department: 'সাধারণ', year: '২০১৬', result: 'GPA 5.00 (গোল্ডেন)', order: 1 },
                    ],
                    skills: ['গ্রাফিক ডিজাইন', 'ব্র্যান্ডিং', 'লোগো ডিজাইন', 'ওয়েব ডেভেলপমেন্ট (HTML, CSS)', 'ডিজিটাল মার্কেটিং'],
                    experience: 'সদর শাখা সভাপতি, রংধনু ফাউন্ডেশন (২০২৩ থেকে বর্তমান)',
                    contactLinks: [
                        { label: 'Email', url: 'mailto:mm.xihab@gmail.com' },
                        { label: 'CampusWay', url: '/' },
                    ],
                    enabled: true,
                    order: 1,
                },
            ],
        },
        terms: {
            eyebrow: 'Legal',
            title: 'Terms & Conditions',
            subtitle: 'Please review these terms before using CampusWay services, exam tools, and student resources.',
            lastUpdatedLabel: 'Last updated: March 2026',
            backLinkLabel: 'Back to Home',
            backLinkUrl: '/',
            sections: [
                {
                    title: 'Acceptance of Terms',
                    body: 'By using CampusWay, you agree to these terms and all applicable rules governing educational services and digital access.',
                    bullets: [
                        'If you do not agree with the terms, you should stop using the platform.',
                    ],
                    iconKey: 'shield',
                    tone: 'info',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'Use of Services',
                    body: 'CampusWay provides admission guidance, exam preparation tools, news, and student resources for lawful educational purposes.',
                    bullets: [
                        'Users are responsible for their account activity.',
                        'Automated scraping or abusive usage is prohibited.',
                        'Exam integrity rules apply wherever assessment tools are used.',
                    ],
                    iconKey: 'file-text',
                    tone: 'neutral',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Content Accuracy',
                    body: 'We work to keep information current, but official university and institutional sources remain the final authority for deadlines, seats, and requirements.',
                    bullets: [
                        'Always verify critical admission details with the official source.',
                    ],
                    iconKey: 'alert-triangle',
                    tone: 'warning',
                    enabled: true,
                    order: 3,
                },
                {
                    title: 'Liability & Contact',
                    body: 'CampusWay is not liable for direct or indirect decisions based solely on platform information. Use the contact page for legal or account-related questions.',
                    bullets: [],
                    iconKey: 'mail',
                    tone: 'neutral',
                    enabled: true,
                    order: 4,
                },
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
                {
                    title: 'Information We Collect',
                    body: 'CampusWay may collect account, contact, exam, and device information needed to deliver the platform safely and effectively.',
                    bullets: [
                        'Account information such as name, email, and phone.',
                        'Usage information related to learning activity and support flows.',
                        'Device and browser data for compatibility and security.',
                    ],
                    iconKey: 'eye',
                    tone: 'info',
                    enabled: true,
                    order: 1,
                },
                {
                    title: 'How We Use Data',
                    body: 'We use data to deliver services, personalize learning support, improve the product, and keep the platform secure.',
                    bullets: [
                        'Support admissions, exams, and communication workflows.',
                        'Generate aggregated analytics and service insights.',
                        'Protect the platform from misuse and fraud.',
                    ],
                    iconKey: 'database',
                    tone: 'neutral',
                    enabled: true,
                    order: 2,
                },
                {
                    title: 'Security & Retention',
                    body: 'Reasonable technical and organizational controls are used to protect stored data and limit access based on role and need.',
                    bullets: [
                        'Authentication and role-based access controls are enforced.',
                        'Sensitive data should be accessed only by authorized personnel.',
                    ],
                    iconKey: 'lock',
                    tone: 'success',
                    enabled: true,
                    order: 3,
                },
                {
                    title: 'Your Rights',
                    body: 'Users can contact CampusWay to request corrections, discuss account privacy concerns, or ask questions about communication preferences.',
                    bullets: [
                        'You may request correction of inaccurate personal information.',
                        'You may ask questions about stored communication data.',
                    ],
                    iconKey: 'shield',
                    tone: 'accent',
                    enabled: true,
                    order: 4,
                },
            ],
        },
    };
}

function normalizeStaticPageSection(value: unknown, fallback: StaticPageSectionConfig): StaticPageSectionConfig {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        body: asString(source.body, fallback.body),
        bullets: source.bullets !== undefined ? asStringArray(source.bullets) : fallback.bullets,
        iconKey: asString(source.iconKey, fallback.iconKey),
        tone: (asString(source.tone, fallback.tone) as StaticPageTone) || fallback.tone,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeStaticFeatureCard(value: unknown, fallback: StaticFeatureCardConfig): StaticFeatureCardConfig {
    const source = asRecord(value);
    return {
        title: asString(source.title, fallback.title),
        description: asString(source.description, fallback.description),
        iconKey: asString(source.iconKey, fallback.iconKey),
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFounderContactLink(value: unknown): FounderContactLinkConfig | null {
    const source = asRecord(value);
    const label = asString(source.label);
    const url = asString(source.url);
    if (!label && !url) return null;
    return {
        label: label || 'Link',
        url,
    };
}

function normalizeFounderEducation(value: unknown, fallback: FounderEducationConfig): FounderEducationConfig {
    const source = asRecord(value);
    return {
        degree: asString(source.degree, fallback.degree),
        institution: asString(source.institution, fallback.institution),
        department: asString(source.department, fallback.department),
        year: asString(source.year, fallback.year),
        result: asString(source.result, fallback.result),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeFounderProfile(value: unknown, fallback: FounderProfileConfig): FounderProfileConfig {
    const source = asRecord(value);
    const normalizedLinks = Array.isArray(source.contactLinks)
        ? source.contactLinks
            .map((item) => normalizeFounderContactLink(item))
            .filter((item): item is FounderContactLinkConfig => Boolean(item))
        : fallback.contactLinks;

    const fallbackEducation = Array.isArray(fallback.education) ? fallback.education : [];
    const normalizedEducation = Array.isArray(source.education)
        ? source.education.map((item, idx) => normalizeFounderEducation(item, fallbackEducation[idx] || { degree: '', institution: '', department: '', year: '', result: '', order: idx + 1 }))
        : fallbackEducation;

    return {
        name: asString(source.name, fallback.name),
        title: asString(source.title, fallback.title),
        photoUrl: asString(source.photoUrl, fallback.photoUrl),
        shortBio: asString(source.shortBio, fallback.shortBio),
        quote: asString(source.quote, fallback.quote),
        fatherName: asString(source.fatherName, fallback.fatherName),
        dateOfBirth: asString(source.dateOfBirth, fallback.dateOfBirth),
        gender: asString(source.gender, fallback.gender),
        phone: asString(source.phone, fallback.phone),
        emergencyPhone: asString(source.emergencyPhone, fallback.emergencyPhone),
        email: asString(source.email, fallback.email),
        address: asString(source.address, fallback.address),
        education: normalizedEducation,
        skills: source.skills !== undefined ? asStringArray(source.skills) : fallback.skills,
        experience: asString(source.experience, fallback.experience),
        contactLinks: normalizedLinks,
        enabled: asBoolean(source.enabled, fallback.enabled),
        order: asNumber(source.order, fallback.order),
    };
}

function normalizeStaticPage(value: unknown, fallback: StaticPageConfig): StaticPageConfig {
    const source = asRecord(value);
    const fallbackSections = Array.isArray(fallback.sections) ? fallback.sections : [];
    const sourceSections = Array.isArray(source.sections) ? source.sections : undefined;
    const sections = sourceSections
        ? sourceSections.map((item, index) => normalizeStaticPageSection(item, fallbackSections[index] || fallbackSections[fallbackSections.length - 1] || {
            title: '',
            body: '',
            bullets: [],
            iconKey: 'info',
            tone: 'neutral',
            enabled: true,
            order: index + 1,
        }))
        : fallbackSections;

    return {
        eyebrow: asString(source.eyebrow, fallback.eyebrow),
        title: asString(source.title, fallback.title),
        subtitle: asString(source.subtitle, fallback.subtitle),
        lastUpdatedLabel: asString(source.lastUpdatedLabel, fallback.lastUpdatedLabel),
        sections,
        backLinkLabel: asString(source.backLinkLabel, fallback.backLinkLabel),
        backLinkUrl: asString(source.backLinkUrl, fallback.backLinkUrl),
    };
}

function normalizeAboutStaticPage(value: unknown, fallback: AboutStaticPageConfig): AboutStaticPageConfig {
    const source = asRecord(value);
    const normalizedBase = normalizeStaticPage(source, fallback);
    const fallbackFeatureCards = Array.isArray(fallback.featureCards) ? fallback.featureCards : [];
    const featureCards = Array.isArray(source.featureCards)
        ? source.featureCards.map((item, index) => normalizeStaticFeatureCard(item, fallbackFeatureCards[index] || fallbackFeatureCards[fallbackFeatureCards.length - 1] || {
            title: '',
            description: '',
            iconKey: 'info',
            enabled: true,
            order: index + 1,
        }))
        : fallbackFeatureCards;
    const fallbackFounderProfiles = Array.isArray(fallback.founderProfiles) ? fallback.founderProfiles : [];
    const founderProfiles = Array.isArray(source.founderProfiles)
        ? source.founderProfiles.map((item, index) => normalizeFounderProfile(item, fallbackFounderProfiles[index] || {
            name: '',
            title: '',
            photoUrl: '',
            shortBio: '',
            quote: '',
            fatherName: '',
            dateOfBirth: '',
            gender: '',
            phone: '',
            emergencyPhone: '',
            email: '',
            address: '',
            education: [],
            skills: [],
            experience: '',
            contactLinks: [],
            enabled: true,
            order: index + 1,
        }))
        : fallbackFounderProfiles;

    return {
        ...normalizedBase,
        featureCards,
        founderProfiles,
    };
}

export function normalizeWebsiteStaticPages(value: unknown, current?: Partial<WebsiteStaticPagesConfig> | null): WebsiteStaticPagesConfig {
    const defaults = createWebsiteStaticPagesDefaults();
    const currentValue = asRecord(current);
    const source = asRecord(value);
    const currentAbout = normalizeAboutStaticPage(currentValue.about, defaults.about);
    const currentTerms = normalizeStaticPage(currentValue.terms, defaults.terms);
    const currentPrivacy = normalizeStaticPage(currentValue.privacy, defaults.privacy);

    return {
        about: normalizeAboutStaticPage(source.about, currentAbout),
        terms: normalizeStaticPage(source.terms, currentTerms),
        privacy: normalizeStaticPage(source.privacy, currentPrivacy),
    };
}

export interface IWebsiteSettings extends Document {
    websiteName: string;
    logo: string;
    favicon: string;
    motto: string;
    metaTitle: string;
    metaDescription: string;
    /** Open Graph / Social Preview settings */
    socialPreview: {
        ogTitle: string;
        ogDescription: string;
        ogImageUrl: string;
        ogType: 'website' | 'article';
        twitterCard: 'summary' | 'summary_large_image';
        twitterSite: string;
    };
    contactEmail: string;
    contactPhone: string;
    socialLinks: {
        facebook: string;
        whatsapp: string;
        messenger: string;
        telegram: string;
        twitter: string;
        youtube: string;
        instagram: string;
    };
    theme: {
        modeDefault: 'light' | 'dark' | 'system';
        allowSystemMode: boolean;
        switchVariant: 'default' | 'pro';
        animationLevel: 'none' | 'subtle' | 'rich';
        brandGradients: string[];
    };
    socialUi: {
        clusterEnabled: boolean;
        buttonVariant: 'default' | 'squircle';
        showLabels: boolean;
        platformOrder: Array<'facebook' | 'whatsapp' | 'messenger' | 'telegram' | 'twitter' | 'youtube' | 'instagram'>;
    };
    pricingUi: {
        currencyCode: string;
        currencySymbol: string;
        currencyLocale: string;
        displayMode: 'symbol' | 'code';
        thousandSeparator: boolean;
    };
    subscriptionPageTitle: string;
    subscriptionPageSubtitle: string;
    subscriptionDefaultBannerUrl: string;
    subscriptionLoggedOutCtaMode: 'login' | 'contact';
    staticPages: WebsiteStaticPagesConfig;
    pageHeroSettings: Record<string, {
        enabled: boolean;
        title: string;
        subtitle: string;
        pillText: string;
        vantaEffect: string;
        vantaColor: string;
        vantaBackgroundColor: string;
        gradientFrom: string;
        gradientTo: string;
        showSearch: boolean;
        searchPlaceholder: string;
        primaryCTA: { label: string; url: string };
        secondaryCTA: { label: string; url: string };
    }>;
}

const WebsiteSettingsSchema = new Schema<IWebsiteSettings>({
    websiteName: { type: String, default: 'CampusWay' },
    logo: { type: String, default: DEFAULT_CANONICAL_LOGO },
    favicon: { type: String, default: DEFAULT_CANONICAL_FAVICON },
    motto: { type: String, default: 'Your Admission Gateway' },
    metaTitle: { type: String, default: 'CampusWay - Admission Gateway' },
    metaDescription: { type: String, default: 'Prepare for university admissions with CampusWay.' },
    socialPreview: {
        ogTitle: { type: String, default: '' },
        ogDescription: { type: String, default: '' },
        ogImageUrl: { type: String, default: '' },
        ogType: { type: String, enum: ['website', 'article'], default: 'website' },
        twitterCard: { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image' },
        twitterSite: { type: String, default: '' },
    },
    contactEmail: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    socialLinks: {
        facebook: { type: String, default: '' },
        whatsapp: { type: String, default: '' },
        messenger: { type: String, default: '' },
        telegram: { type: String, default: '' },
        twitter: { type: String, default: '' },
        youtube: { type: String, default: '' },
        instagram: { type: String, default: '' },
    },
    theme: {
        modeDefault: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
        allowSystemMode: { type: Boolean, default: true },
        switchVariant: { type: String, enum: ['default', 'pro'], default: 'pro' },
        animationLevel: { type: String, enum: ['none', 'subtle', 'rich'], default: 'subtle' },
        brandGradients: {
            type: [String],
            default: [
                'linear-gradient(135deg,#0D5FDB 0%,#0EA5E9 55%,#22D3EE 100%)',
                'linear-gradient(135deg,#0891B2 0%,#2563EB 100%)',
            ],
        },
    },
    socialUi: {
        clusterEnabled: { type: Boolean, default: true },
        buttonVariant: { type: String, enum: ['default', 'squircle'], default: 'squircle' },
        showLabels: { type: Boolean, default: false },
        platformOrder: {
            type: [String],
            default: ['facebook', 'whatsapp', 'messenger', 'telegram', 'twitter', 'youtube', 'instagram'],
        },
    },
    pricingUi: {
        currencyCode: { type: String, default: 'BDT' },
        currencySymbol: { type: String, default: '\\u09F3' },
        currencyLocale: { type: String, default: 'bn-BD' },
        displayMode: { type: String, enum: ['symbol', 'code'], default: 'symbol' },
        thousandSeparator: { type: Boolean, default: true },
    },
    subscriptionPageTitle: { type: String, default: 'Subscription Plans' },
    subscriptionPageSubtitle: { type: String, default: 'Choose free or paid plans to unlock premium exam access.' },
    subscriptionDefaultBannerUrl: { type: String, default: '' },
    subscriptionLoggedOutCtaMode: { type: String, enum: ['login', 'contact'], default: 'contact' },
    staticPages: { type: Schema.Types.Mixed, default: createWebsiteStaticPagesDefaults },
    pageHeroSettings: { type: Schema.Types.Mixed, default: () => ({}) },
}, { timestamps: true });

export default mongoose.model<IWebsiteSettings>('WebsiteSettings', WebsiteSettingsSchema);

