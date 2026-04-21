import { FileText, Plus, Trash2, UserRound } from 'lucide-react';
import type {
    ApiFounderContactLink,
    ApiFounderEducation,
    ApiFounderProfile,
    ApiStaticFeatureCard,
    ApiStaticPageSection,
    WebsiteStaticPagesConfig,
} from '../../services/api';
import { STATIC_PAGE_ICON_OPTIONS, STATIC_PAGE_TONE_OPTIONS } from '../../lib/websiteStaticPages';
import AdminImageUploadField from './AdminImageUploadField';

type StaticPagesEditorProps = {
    value: WebsiteStaticPagesConfig;
    onChange: (nextValue: WebsiteStaticPagesConfig) => void;
};

const PAGE_LABELS = {
    about: 'About Page',
    terms: 'Terms Page',
    privacy: 'Privacy Page',
} as const;

type PageKey = keyof WebsiteStaticPagesConfig;

function makeEmptySection(order: number): ApiStaticPageSection {
    return {
        title: '',
        body: '',
        bullets: [],
        iconKey: 'info',
        tone: 'neutral',
        enabled: true,
        order,
    };
}

function makeEmptyFeatureCard(order: number): ApiStaticFeatureCard {
    return {
        title: '',
        description: '',
        iconKey: 'info',
        enabled: true,
        order,
    };
}

function makeEmptyFounder(order: number): ApiFounderProfile {
    return {
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
        order,
    };
}

function makeEmptyEducation(order: number): ApiFounderEducation {
    return {
        degree: '',
        institution: '',
        department: '',
        year: '',
        result: '',
        order,
    };
}

function makeEmptyFounderContactLink(): ApiFounderContactLink {
    return {
        label: '',
        url: '',
    };
}

function bulletsToText(bullets: string[]): string {
    return bullets.join('\n');
}

function textToBullets(value: string): string[] {
    return value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
}

export default function StaticPagesEditor({ value, onChange }: StaticPagesEditorProps) {
    const updatePage = <K extends PageKey>(
        pageKey: K,
        updater: (currentPage: WebsiteStaticPagesConfig[K]) => WebsiteStaticPagesConfig[K],
    ) => {
        onChange({
            ...value,
            [pageKey]: updater(value[pageKey]),
        });
    };

    const renderCommonFields = (pageKey: PageKey) => {
        const page = value[pageKey];
        return (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                    <label className="text-xs text-slate-400">Eyebrow</label>
                    <input
                        value={page.eyebrow}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, eyebrow: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Last Updated Label</label>
                    <input
                        value={page.lastUpdatedLabel}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, lastUpdatedLabel: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Title</label>
                    <input
                        value={page.title}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, title: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-400">Subtitle</label>
                    <textarea
                        rows={3}
                        value={page.subtitle}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, subtitle: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Back Link Label</label>
                    <input
                        value={page.backLinkLabel}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, backLinkLabel: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400">Back Link URL</label>
                    <input
                        value={page.backLinkUrl}
                        onChange={(event) => updatePage(pageKey, (current) => ({ ...current, backLinkUrl: event.target.value }))}
                        className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                    />
                </div>
            </div>
        );
    };

    const renderSectionList = (pageKey: PageKey) => {
        const page = value[pageKey];
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h4 className="text-sm font-semibold text-white">Sections</h4>
                        <p className="text-xs text-slate-500">Each block can be reordered or disabled from here.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => updatePage(pageKey, (current) => ({ ...current, sections: [...current.sections, makeEmptySection(current.sections.length + 1)] }))}
                        className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Section
                    </button>
                </div>

                {page.sections.map((section, index) => (
                    <div key={`${pageKey}-section-${index}`} className="space-y-3 rounded-2xl border border-indigo-500/10 bg-slate-950/45 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h5 className="text-sm font-semibold text-white">Section {index + 1}</h5>
                            <button
                                type="button"
                                onClick={() => updatePage(pageKey, (current) => ({ ...current, sections: current.sections.filter((_, itemIndex) => itemIndex !== index) }))}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remove
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                            <label className="flex items-center gap-2 text-sm text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={section.enabled}
                                    onChange={(event) => updatePage(pageKey, (current) => ({
                                        ...current,
                                        sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item),
                                    }))}
                                    className="h-4 w-4 rounded accent-indigo-500"
                                />
                                Enabled
                            </label>
                            <div>
                                <label className="text-xs text-slate-400">Order</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={section.order}
                                    onChange={(event) => updatePage(pageKey, (current) => ({
                                        ...current,
                                        sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, order: Number(event.target.value) || 1 } : item),
                                    }))}
                                    className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Icon</label>
                                <select
                                    value={section.iconKey}
                                    onChange={(event) => updatePage(pageKey, (current) => ({
                                        ...current,
                                        sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, iconKey: event.target.value } : item),
                                    }))}
                                    className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                                >
                                    {STATIC_PAGE_ICON_OPTIONS.map((iconKey) => (
                                        <option key={iconKey} value={iconKey}>{iconKey}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400">Tone</label>
                                <select
                                    value={section.tone}
                                    onChange={(event) => updatePage(pageKey, (current) => ({
                                        ...current,
                                        sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, tone: event.target.value as ApiStaticPageSection['tone'] } : item),
                                    }))}
                                    className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                                >
                                    {STATIC_PAGE_TONE_OPTIONS.map((tone) => (
                                        <option key={tone} value={tone}>{tone}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-slate-400">Section Title</label>
                            <input
                                value={section.title}
                                onChange={(event) => updatePage(pageKey, (current) => ({
                                    ...current,
                                    sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Body</label>
                            <textarea
                                rows={4}
                                value={section.body}
                                onChange={(event) => updatePage(pageKey, (current) => ({
                                    ...current,
                                    sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, body: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Bullets (one per line)</label>
                            <textarea
                                rows={4}
                                value={bulletsToText(section.bullets)}
                                onChange={(event) => updatePage(pageKey, (current) => ({
                                    ...current,
                                    sections: current.sections.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: textToBullets(event.target.value) } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderAboutFeatureCards = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-semibold text-white">About Highlights</h4>
                    <p className="text-xs text-slate-500">These cards appear in the About highlights grid.</p>
                </div>
                <button
                    type="button"
                    onClick={() => updatePage('about', (current) => ({ ...current, featureCards: [...current.featureCards, makeEmptyFeatureCard(current.featureCards.length + 1)] }))}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Highlight
                </button>
            </div>

            {value.about.featureCards.map((card, index) => (
                <div key={`about-feature-${index}`} className="space-y-3 rounded-2xl border border-indigo-500/10 bg-slate-950/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h5 className="text-sm font-semibold text-white">Highlight {index + 1}</h5>
                        <button
                            type="button"
                            onClick={() => updatePage('about', (current) => ({ ...current, featureCards: current.featureCards.filter((_, itemIndex) => itemIndex !== index) }))}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                checked={card.enabled}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    featureCards: current.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item),
                                }))}
                                className="h-4 w-4 rounded accent-indigo-500"
                            />
                            Enabled
                        </label>
                        <div>
                            <label className="text-xs text-slate-400">Order</label>
                            <input
                                type="number"
                                min={1}
                                value={card.order}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    featureCards: current.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, order: Number(event.target.value) || 1 } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-400">Icon</label>
                            <select
                                value={card.iconKey}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    featureCards: current.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, iconKey: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                            >
                                {STATIC_PAGE_ICON_OPTIONS.map((iconKey) => (
                                    <option key={iconKey} value={iconKey}>{iconKey}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className="text-xs text-slate-400">Title</label>
                            <input
                                value={card.title}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    featureCards: current.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Description</label>
                            <textarea
                                rows={3}
                                value={card.description}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    featureCards: current.featureCards.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderFounderProfiles = () => (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h4 className="text-sm font-semibold text-white">Founder Profiles</h4>
                    <p className="text-xs text-slate-500">Publish founder identity, photo, bio, and external links from here.</p>
                </div>
                <button
                    type="button"
                    onClick={() => updatePage('about', (current) => ({ ...current, founderProfiles: [...current.founderProfiles, makeEmptyFounder(current.founderProfiles.length + 1)] }))}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Add Founder
                </button>
            </div>

            {value.about.founderProfiles.map((founder, index) => (
                <div key={`founder-${index}`} className="space-y-3 rounded-2xl border border-indigo-500/10 bg-slate-950/45 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                            <UserRound className="h-4 w-4 text-indigo-300" />
                            Founder {index + 1}
                        </div>
                        <button
                            type="button"
                            onClick={() => updatePage('about', (current) => ({ ...current, founderProfiles: current.founderProfiles.filter((_, itemIndex) => itemIndex !== index) }))}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <label className="flex items-center gap-2 text-sm text-slate-200">
                            <input
                                type="checkbox"
                                checked={founder.enabled}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item),
                                }))}
                                className="h-4 w-4 rounded accent-indigo-500"
                            />
                            Enabled
                        </label>
                        <div>
                            <label className="text-xs text-slate-400">Order</label>
                            <input
                                type="number"
                                min={1}
                                value={founder.order}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, order: Number(event.target.value) || 1 } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Name</label>
                            <input
                                value={founder.name}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Role / Title</label>
                            <input
                                value={founder.title}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <AdminImageUploadField
                            label="Founder Photo"
                            value={founder.photoUrl}
                            onChange={(nextPhotoUrl) => updatePage('about', (current) => ({
                                ...current,
                                founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, photoUrl: nextPhotoUrl } : item),
                            }))}
                            helper="This image appears on the public About page founder section."
                            category="admin_upload"
                            previewAlt={`${founder.name || 'Founder'} photo`}
                            previewClassName="min-h-[160px]"
                        />
                        <div>
                            <label className="text-xs text-slate-400">Short Bio</label>
                            <textarea
                                rows={4}
                                value={founder.shortBio}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, shortBio: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                    </div>

                    {/* Quote / বাণী */}
                    <div>
                        <label className="text-xs text-slate-400">বাণী / Quote</label>
                        <textarea
                            rows={2}
                            value={founder.quote}
                            onChange={(event) => updatePage('about', (current) => ({
                                ...current,
                                founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, quote: event.target.value } : item),
                            }))}
                            placeholder="e.g. Learn, Create, Deliver excellence"
                            className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                        />
                    </div>

                    {/* Personal Details */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div>
                            <label className="text-xs text-slate-400">Father's Name</label>
                            <input
                                value={founder.fatherName}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, fatherName: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Date of Birth</label>
                            <input
                                value={founder.dateOfBirth}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, dateOfBirth: event.target.value } : item),
                                }))}
                                placeholder="e.g. ১২ অক্টোবর ২০০৫"
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Gender</label>
                            <input
                                value={founder.gender}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, gender: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Phone</label>
                            <input
                                value={founder.phone}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, phone: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Emergency Phone</label>
                            <input
                                value={founder.emergencyPhone}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, emergencyPhone: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-400">Email</label>
                            <input
                                value={founder.email}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, email: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-400">Address</label>
                            <textarea
                                rows={2}
                                value={founder.address}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, address: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-400">Experience</label>
                            <textarea
                                rows={2}
                                value={founder.experience}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, experience: event.target.value } : item),
                                }))}
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs text-slate-400">Skills (comma separated)</label>
                            <input
                                value={(founder.skills || []).join(', ')}
                                onChange={(event) => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index ? { ...item, skills: event.target.value.split(',').map((s) => s.trim()).filter(Boolean) } : item),
                                }))}
                                placeholder="e.g. Graphic Design, Web Development, Digital Marketing"
                                className="mt-1 w-full rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2.5 text-sm text-white"
                            />
                        </div>
                    </div>

                    {/* Education */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-400">Education</label>
                            <button
                                type="button"
                                onClick={() => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                        ? { ...item, education: [...(item.education || []), makeEmptyEducation((item.education || []).length + 1)] }
                                        : item),
                                }))}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/10"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Education
                            </button>
                        </div>

                        {(founder.education || []).map((edu, eduIndex) => (
                            <div key={`founder-${index}-edu-${eduIndex}`} className="grid grid-cols-1 gap-2 rounded-xl border border-indigo-500/10 bg-slate-950/30 p-3 md:grid-cols-6">
                                <input
                                    value={edu.degree}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? { ...item, education: (item.education || []).map((e, ei) => ei === eduIndex ? { ...e, degree: event.target.value } : e) }
                                            : item),
                                    }))}
                                    placeholder="Degree (e.g. B.Sc.)"
                                    className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-1.5 text-xs text-white"
                                />
                                <input
                                    value={edu.institution}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? { ...item, education: (item.education || []).map((e, ei) => ei === eduIndex ? { ...e, institution: event.target.value } : e) }
                                            : item),
                                    }))}
                                    placeholder="Institution"
                                    className="md:col-span-2 rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-1.5 text-xs text-white"
                                />
                                <input
                                    value={edu.department}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? { ...item, education: (item.education || []).map((e, ei) => ei === eduIndex ? { ...e, department: event.target.value } : e) }
                                            : item),
                                    }))}
                                    placeholder="Department"
                                    className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-1.5 text-xs text-white"
                                />
                                <input
                                    value={edu.year}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? { ...item, education: (item.education || []).map((e, ei) => ei === eduIndex ? { ...e, year: event.target.value } : e) }
                                            : item),
                                    }))}
                                    placeholder="Year"
                                    className="rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-1.5 text-xs text-white"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        value={edu.result}
                                        onChange={(event) => updatePage('about', (current) => ({
                                            ...current,
                                            founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                                ? { ...item, education: (item.education || []).map((e, ei) => ei === eduIndex ? { ...e, result: event.target.value } : e) }
                                                : item),
                                        }))}
                                        placeholder="Result"
                                        className="w-full rounded-lg border border-indigo-500/15 bg-slate-950/65 px-2.5 py-1.5 text-xs text-white"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => updatePage('about', (current) => ({
                                            ...current,
                                            founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                                ? { ...item, education: (item.education || []).filter((_, ei) => ei !== eduIndex) }
                                                : item),
                                        }))}
                                        className="flex-shrink-0 text-xs text-rose-300 hover:text-rose-200"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                        {!(founder.education || []).length && (
                            <p className="text-xs text-slate-500">No education entries added yet.</p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label className="text-xs text-slate-400">Contact Links</label>
                            <button
                                type="button"
                                onClick={() => updatePage('about', (current) => ({
                                    ...current,
                                    founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                        ? { ...item, contactLinks: [...item.contactLinks, makeEmptyFounderContactLink()] }
                                        : item),
                                }))}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-500/15 px-2.5 py-1.5 text-xs text-indigo-200 hover:bg-indigo-500/10"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Link
                            </button>
                        </div>

                        {founder.contactLinks.length ? founder.contactLinks.map((contactLink, linkIndex) => (
                            <div key={`founder-${index}-link-${linkIndex}`} className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto]">
                                <input
                                    value={contactLink.label}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? {
                                                ...item,
                                                contactLinks: item.contactLinks.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, label: event.target.value } : entry),
                                            }
                                            : item),
                                    }))}
                                    placeholder="LinkedIn"
                                    className="rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                                />
                                <input
                                    value={contactLink.url}
                                    onChange={(event) => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? {
                                                ...item,
                                                contactLinks: item.contactLinks.map((entry, entryIndex) => entryIndex === linkIndex ? { ...entry, url: event.target.value } : entry),
                                            }
                                            : item),
                                    }))}
                                    placeholder="https://linkedin.com/in/founder"
                                    className="rounded-xl border border-indigo-500/15 bg-slate-950/65 px-3 py-2 text-sm text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => updatePage('about', (current) => ({
                                        ...current,
                                        founderProfiles: current.founderProfiles.map((item, itemIndex) => itemIndex === index
                                            ? { ...item, contactLinks: item.contactLinks.filter((_, entryIndex) => entryIndex !== linkIndex) }
                                            : item),
                                    }))}
                                    className="inline-flex items-center justify-center rounded-xl px-3 text-xs text-rose-300 hover:bg-rose-500/10"
                                >
                                    Remove
                                </button>
                            </div>
                        )) : (
                            <p className="text-xs text-slate-500">No founder links added yet.</p>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="rounded-2xl border border-indigo-500/10 bg-slate-950/45 p-4 text-sm text-slate-300">
                Edit the public About, Terms, and Privacy pages here. Toggle individual blocks on or off, adjust their order, and manage founder information without touching code.
            </div>

            {(['about', 'terms', 'privacy'] as const).map((pageKey) => (
                <section key={pageKey} className="space-y-5 rounded-2xl border border-indigo-500/10 bg-slate-900/40 p-5">
                    <div className="flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">{PAGE_LABELS[pageKey]}</h3>
                            <p className="text-xs text-slate-500">Hero copy, section content, ordering, and visibility live here.</p>
                        </div>
                    </div>

                    {renderCommonFields(pageKey)}
                    {renderSectionList(pageKey)}
                    {pageKey === 'about' ? renderAboutFeatureCards() : null}
                    {pageKey === 'about' ? renderFounderProfiles() : null}
                </section>
            ))}
        </div>
    );
}
