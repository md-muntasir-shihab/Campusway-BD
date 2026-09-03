import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertCircle, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Download, ExternalLink, Eye,
    FileText, Filter, Headphones, Image, Link2, Loader2, RefreshCw, Search, Share2, Sparkles, Star, StickyNote, Video, X,
} from 'lucide-react';
import {
    getPublicResourceSettings, getResources, trackAnalyticsEvent, trackResourceDownload,
    type PublicResourceSettings, type ResourceSettingsSort, type ResourceSettingsType,
} from '../services/api';
import { isExternalUrl, normalizeInternalOrExternalUrl } from '../utils/url';
import PageHeroBanner from '../components/common/PageHeroBanner';
import HeroSearchInput from '../components/common/HeroSearchInput';
import { usePageHeroSettings } from '../hooks/usePageHeroSettings';
import SEO from '../components/common/SEO';
import { buildMediaUrl } from '../utils/mediaUrl';

type ResourceType = ResourceSettingsType;
type SortKey = ResourceSettingsSort | 'title';
type CardResource = {
    _id: string;
    title: string;
    description: string;
    slug?: string;
    type: Exclude<ResourceType, 'all'>;
    category: string;
    tags: string[];
    fileUrl?: string;
    externalUrl?: string;
    thumbnailUrl?: string;
    isPublic: boolean;
    isFeatured: boolean;
    views: number;
    downloads: number;
    publishDate: string;
    expiryDate?: string;
};

const DEFAULT_SETTINGS: PublicResourceSettings = {
    pageTitle: 'Student Resources',
    pageSubtitle: 'Access PDFs, question banks, video tutorials, links, and notes in one searchable library.',
    heroBadgeLabel: 'Study Smart',
    searchPlaceholder: 'Search resources, question banks, and notes...',
    defaultThumbnailUrl: '',
    publicPageEnabled: true,
    studentHubEnabled: true,
    showHero: true,
    showStats: true,
    showFeatured: true,
    featuredLimit: 4,
    defaultSort: 'latest',
    defaultType: 'all',
    defaultCategory: 'All',
    itemsPerPage: 12,
    showSearch: true,
    showTypeFilter: true,
    showCategoryFilter: true,
    trackingEnabled: true,
    allowedCategories: ['Question Banks', 'Study Materials', 'Official Links', 'Tips & Tricks', 'Scholarships', 'Admit Cards'],
    allowedTypes: ['pdf', 'link', 'video', 'audio', 'image', 'note'],
    openLinksInNewTab: true,
    featuredSectionTitle: 'Featured Resources',
    emptyStateMessage: 'No resources found. Try adjusting your filters or search query.',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
    ogImageUrl: '',
};

const TYPE_CONFIG: Record<Exclude<ResourceType, 'all'>, {
    label: string;
    icon: ComponentType<{ className?: string }>;
    badge: string;
    action: string;
}> = {
    pdf: { label: 'PDF', icon: FileText, badge: 'bg-danger/10 text-danger dark:bg-danger/20', action: 'Download' },
    link: { label: 'Link', icon: Link2, badge: 'bg-primary/10 text-primary dark:bg-primary/20', action: 'Visit' },
    video: { label: 'Video', icon: Video, badge: 'bg-accent/10 text-accent dark:bg-accent/20', action: 'Watch' },
    audio: { label: 'Audio', icon: Headphones, badge: 'bg-warning/10 text-warning dark:bg-warning/20', action: 'Listen' },
    image: { label: 'Image', icon: Image, badge: 'bg-success/10 text-success dark:bg-success/20', action: 'View' },
    note: { label: 'Note', icon: StickyNote, badge: 'bg-primary/5 text-primary dark:bg-primary/10', action: 'Read' },
};
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
    { key: 'latest', label: 'Latest' },
    { key: 'downloads', label: 'Most Downloaded' },
    { key: 'views', label: 'Most Viewed' },
    { key: 'title', label: 'A → Z' },
];

function formatCount(value: number): string {
    if (!Number.isFinite(value)) return '0';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return String(value);
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    useEffect(() => {
        const timeoutId = window.setTimeout(onDismiss, 2500);
        return () => window.clearTimeout(timeoutId);
    }, [onDismiss]);
    return (
        <div role="status" aria-live="polite" className="animate-slide-up fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl bg-text px-5 py-3 text-sm font-medium text-surface shadow-elevated dark:bg-dark-text dark:text-dark-bg">
            <CheckCircle className="h-4 w-4 text-success" aria-hidden="true" /> {message}
        </div>
    );
}

function Skeleton() {
    return (
        <div className="card p-4 sm:p-5">
            <div className="mb-3 flex gap-3"><div className="skeleton h-10 w-10 rounded-xl" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/3 rounded" /><div className="skeleton h-4 w-3/4 rounded" /></div></div>
            <div className="skeleton mb-1 h-3 w-full rounded" /><div className="skeleton mb-3 h-3 w-2/3 rounded" />
            <div className="mb-3 flex gap-1"><div className="skeleton h-4 w-12 rounded-full" /><div className="skeleton h-4 w-10 rounded-full" /></div>
            <div className="skeleton mb-3 h-px w-full" /><div className="flex justify-between"><div className="skeleton h-3 w-20 rounded" /><div className="skeleton h-6 w-16 rounded" /></div>
        </div>
    );
}

/** Direct open/download link for the resource file or target. */
function directHref(resource: CardResource): string {
    if (resource.type === 'video') return normalizeInternalOrExternalUrl(resource.externalUrl || resource.fileUrl || '') || '';
    return normalizeInternalOrExternalUrl(resource.fileUrl || resource.externalUrl || '') || '';
}

function ResourceActionLink({
    resource, href, detailHref, actionLabel, openLinksInNewTab, onAction,
}: {
    resource: CardResource;
    href: string;
    detailHref: string;
    actionLabel: string;
    openLinksInNewTab: boolean;
    onAction: (resource: CardResource, action: string) => void;
}) {
    const external = !detailHref && isExternalUrl(href || '');
    const newTab = !detailHref && openLinksInNewTab;
    return (
        <a
            href={href}
            target={external || newTab ? '_blank' : undefined}
            rel={external || newTab ? 'noopener noreferrer' : undefined}
            onClick={() => onAction(resource, actionLabel)}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 hover:text-accent dark:text-primary-300"
        >
            {detailHref ? <Eye className="h-3 w-3" /> : resource.type === 'link' ? <ExternalLink className="h-3 w-3" /> : <Download className="h-3 w-3" />}
            {actionLabel}
        </a>
    );
}

function ResourceCard({
    resource, openLinksInNewTab, onShare, onAction, onNavigate,
}: {
    resource: CardResource;
    openLinksInNewTab: boolean;
    onShare: (resource: CardResource) => void;
    onAction: (resource: CardResource, action: string) => void;
    onNavigate: (resource: CardResource) => void;
}) {
    const config = TYPE_CONFIG[resource.type];
    const Icon = config.icon;
    const detailHref = resource.slug ? `/resources/${resource.slug}` : '';
    const direct = directHref(resource);
    const href = detailHref || direct;
    const actionLabel = detailHref ? 'View' : config.action;
    const thumb = resource.thumbnailUrl ? buildMediaUrl(resource.thumbnailUrl) : '';
    return (
        <div className="card relative flex flex-col gap-3 overflow-hidden p-4 sm:p-5 group">
            {resource.isFeatured ? <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-bl-xl bg-accent px-3 py-1 text-[9px] font-bold text-white"><Star className="h-2.5 w-2.5 fill-current" /> Featured</span> : null}
            <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${config.badge}`}><Icon className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                    <span className={`mb-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>{config.label}</span>
                    <h3 className="text-sm font-semibold leading-snug dark:text-dark-text"><button type="button" onClick={() => onNavigate(resource)} className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-primary">{resource.title}</button></h3>
                </div>
            </div>
            <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-text-muted dark:text-dark-text/60">{resource.description}</p>
            {Array.isArray(resource.tags) && resource.tags.length > 0 ? <div className="flex flex-wrap gap-1">{resource.tags.slice(0, 3).map((tag, index) => <span key={`${tag}-${index}`} className="rounded-full bg-primary/5 px-2 py-0.5 text-[10px] text-primary dark:bg-primary/10 dark:text-primary-300">{tag}</span>)}</div> : null}
            <div className="flex items-center justify-between border-t border-card-border pt-3 dark:border-dark-border">
                <div className="flex items-center gap-3 text-xs text-text-muted dark:text-dark-text/50">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(resource.views)}</span>
                    {resource.downloads > 0 ? <span className="flex items-center gap-1"><Download className="h-3 w-3" />{formatCount(resource.downloads)}</span> : null}
                    <span className="text-[10px]">{resource.publishDate ? new Date(resource.publishDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => onShare(resource)} className="btn-ghost min-h-[34px] rounded-lg p-2 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100" aria-label="Copy link"><Share2 className="h-3.5 w-3.5" /></button>
                    {/* Direct action (download / watch / visit) when a target exists */}
                    {direct ? (
                        <a
                            href={direct}
                            target={isExternalUrl(direct) && openLinksInNewTab ? '_blank' : undefined}
                            rel={isExternalUrl(direct) && openLinksInNewTab ? 'noopener noreferrer' : undefined}
                            onClick={() => onAction(resource, config.action)}
                            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 dark:bg-primary/15 dark:text-primary-200"
                            aria-label={`${config.action} ${resource.title}`}
                        >
                            {resource.type === 'link' ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                            {config.action}
                        </a>
                    ) : null}
                    {href ? <ResourceActionLink resource={resource} href={href} detailHref={detailHref} actionLabel={actionLabel} openLinksInNewTab={openLinksInNewTab} onAction={onAction} /> : !direct ? <button type="button" disabled className="inline-flex min-h-[34px] cursor-not-allowed items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-500"><AlertCircle className="h-3 w-3" />Unavailable</button> : null}
                </div>
            </div>
        </div>
    );
}

function FeaturedCard(props: {
    resource: CardResource;
    openLinksInNewTab: boolean;
    onShare: (resource: CardResource) => void;
    onAction: (resource: CardResource, action: string) => void;
    onNavigate: (resource: CardResource) => void;
}) {
    const { resource, onNavigate } = props;
    const config = TYPE_CONFIG[resource.type];
    const Icon = config.icon;
    const detailHref = resource.slug ? `/resources/${resource.slug}` : '';
    const direct = directHref(resource);
    return (
        <div className="card relative flex flex-col gap-3 overflow-hidden p-5 sm:flex-row sm:items-center sm:gap-5">
            {thumbOrIcon(resource, config, Icon)}
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.badge}`}>{config.label}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent"><Star className="h-2.5 w-2.5 fill-current" /> Featured</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted dark:text-dark-text/50">{resource.category}</span>
                </div>
                <h3 className="text-base font-semibold leading-snug dark:text-dark-text">
                    <button type="button" onClick={() => onNavigate(resource)} className="line-clamp-1 cursor-pointer text-left transition-colors hover:text-primary">{resource.title}</button>
                </h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-muted dark:text-dark-text/60">{resource.description}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-text-muted dark:text-dark-text/50">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatCount(resource.views)} views</span>
                    <span className="flex items-center gap-1"><Download className="h-3 w-3" />{formatCount(resource.downloads)} downloads</span>
                </div>
            </div>
            <div className="flex flex-shrink-0 flex-row gap-2 sm:flex-col">
                {detailHref ? (
                    <button type="button" onClick={() => onNavigate(resource)} className="btn-outline min-h-[38px] gap-1.5 rounded-xl px-4 text-xs font-semibold"><Eye className="h-3.5 w-3.5" /> View</button>
                ) : null}
                {direct ? (
                    <a
                        href={direct}
                        target={isExternalUrl(direct) && props.openLinksInNewTab ? '_blank' : undefined}
                        rel={isExternalUrl(direct) && props.openLinksInNewTab ? 'noopener noreferrer' : undefined}
                        onClick={() => props.onAction(resource, config.action)}
                        className="btn-primary min-h-[38px] gap-1.5 rounded-xl px-4 text-xs font-semibold"
                    >
                        {resource.type === 'link' ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                        {config.action}
                    </a>
                ) : null}
                <button type="button" onClick={() => props.onShare(resource)} className="btn-ghost min-h-[38px] rounded-xl border border-card-border p-2.5 dark:border-dark-border" aria-label="Copy link"><Share2 className="h-3.5 w-3.5" /></button>
            </div>
        </div>
    );
}

function thumbOrIcon(resource: CardResource, config: { badge: string }, Icon: ComponentType<{ className?: string }>) {
    const thumb = resource.thumbnailUrl ? buildMediaUrl(resource.thumbnailUrl) : '';
    if (thumb) {
        return <img src={thumb} alt="" className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover ring-1 ring-card-border dark:ring-dark-border" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />;
    }
    return (
        <div className={`flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl ${config.badge}`}>
            <Icon className="h-7 w-7" />
        </div>
    );
}

function buildCategories(serverCategories: string[], settings: PublicResourceSettings) {
    const ordered = new Set<string>(['All']);
    settings.allowedCategories.forEach((item) => item.trim() && ordered.add(item.trim()));
    (serverCategories || []).forEach((item) => item?.trim() && ordered.add(item.trim()));
    if (settings.defaultCategory && settings.defaultCategory !== 'All') ordered.add(settings.defaultCategory);
    return Array.from(ordered);
}

const VALID_TYPES = new Set<string>(['all', 'pdf', 'link', 'video', 'audio', 'image', 'note']);
const VALID_SORTS = new Set<string>(['latest', 'downloads', 'views', 'title']);

export default function ResourcesPage() {
    const navigate = useNavigate();
    const hero = usePageHeroSettings('resources');
    const [searchParams, setSearchParams] = useSearchParams();
    const defaultsApplied = useRef(false);
    const [settings, setSettings] = useState<PublicResourceSettings>(DEFAULT_SETTINGS);
    const [settingsReady, setSettingsReady] = useState(false);
    const [settingsError, setSettingsError] = useState(false);
    const [resources, setResources] = useState<CardResource[]>([]);
    const [serverCategories, setServerCategories] = useState<string[]>([]);
    const [stats, setStats] = useState({ total: 0, pdfs: 0, videos: 0, featured: 0 });
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [featured, setFeatured] = useState<CardResource[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [type, setType] = useState<ResourceType>('all');
    const [subject, setSubject] = useState('All');
    const [sort, setSort] = useState<SortKey>('latest');
    const [page, setPage] = useState(1);
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [toast, setToast] = useState('');

    /* ── Hydrate state from URL once settings arrive (URL is source of truth) ── */
    useEffect(() => {
        void getPublicResourceSettings()
            .then((settingsRes) => {
                const next = settingsRes.data?.settings ? { ...DEFAULT_SETTINGS, ...settingsRes.data.settings } : DEFAULT_SETTINGS;
                setSettings(next);
                const urlType = VALID_TYPES.has(String(searchParams.get('type') || '')) ? (searchParams.get('type') as ResourceType) : (next.defaultType || 'all');
                const urlCategory = searchParams.get('category') ?? next.defaultCategory ?? 'All';
                const urlSort = VALID_SORTS.has(String(searchParams.get('sort') || '')) ? (searchParams.get('sort') as SortKey) : (next.defaultSort || 'latest');
                const urlQ = searchParams.get('q') || '';
                const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
                setType(urlType);
                setSubject(urlCategory);
                setSort(urlSort);
                setSearch(urlQ);
                setSearchInput(urlQ);
                setPage(urlPage);
            })
            .catch(() => {
                setSettings(DEFAULT_SETTINGS);
                setSettingsError(true);
            })
            .finally(() => { setSettingsReady(true); defaultsApplied.current = true; });
    }, []);

    /* ── Debounce the search box ── */
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setSearch((current) => {
                const next = searchInput.trim();
                return current === next ? current : next;
            });
            setPage(1);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchInput]);

    /* ── Persist filter state into the URL (shareable / back-button friendly) ── */
    useEffect(() => {
        if (!settingsReady) return;
        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (type && type !== 'all') params.set('type', type);
        if (subject && subject !== 'All') params.set('category', subject);
        if (sort && sort !== (settings.defaultSort || 'latest')) params.set('sort', sort);
        if (page > 1) params.set('page', String(page));
        const next = params.toString();
        if (next !== searchParams.toString()) setSearchParams(params, { replace: true });
    }, [search, type, subject, sort, page, settingsReady, searchParams, setSearchParams]);

    /* ── Server-driven list fetch ── */
    useEffect(() => {
        if (!settingsReady) return;
        let cancelled = false;
        setLoading(true);
        const params: Record<string, string | number> = {
            type,
            category: subject,
            sort: sort === 'title' ? 'title' : sort,
            page,
            limit: Math.max(4, settings.itemsPerPage || 12),
        };
        if (search.trim()) params.q = search.trim();
        void getResources(params)
            .then((res) => {
                if (cancelled) return;
                const payload = res.data as { resources?: CardResource[]; total?: number; pages?: number; categories?: string[]; stats?: { total: number; pdfs: number; videos: number; featured: number } };
                setResources(Array.isArray(payload?.resources) ? payload.resources : []);
                setTotal(Number(payload?.total || 0));
                setTotalPages(Math.max(1, Number(payload?.pages || 1)));
                if (Array.isArray(payload?.categories)) setServerCategories(payload.categories);
                if (payload?.stats) setStats(payload.stats);
                setError(false);
            })
            .catch(() => {
                if (!cancelled) { setResources([]); setError(true); }
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [search, type, subject, sort, page, settings.itemsPerPage, settingsReady]);

    /* ── Featured strip: only when no filters are active ── */
    const unfiltered = type === (settings.defaultType || 'all')
        && subject === (settings.defaultCategory || 'All')
        && !search.trim()
        && sort === (settings.defaultSort || 'latest');
    useEffect(() => {
        if (!settingsReady || !settings.showFeatured || !unfiltered || settings.featuredLimit <= 0) {
            setFeatured([]);
            return;
        }
        let cancelled = false;
        void getResources({ featured: 'true', sort: 'latest', limit: settings.featuredLimit, page: 1 })
            .then((res) => {
                if (cancelled) return;
                const payload = res.data as { resources?: CardResource[] };
                setFeatured(Array.isArray(payload?.resources) ? payload.resources.slice(0, settings.featuredLimit) : []);
            })
            .catch(() => { if (!cancelled) setFeatured([]); });
        return () => { cancelled = true; };
    }, [settingsReady, settings.showFeatured, settings.featuredLimit, unfiltered]);

    const categoryOptions = useMemo(() => buildCategories(serverCategories, settings), [serverCategories, settings]);
    const typeOptions = useMemo<ResourceType[]>(() => ['all', ...settings.allowedTypes], [settings.allowedTypes]);

    useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

    const resetFilters = () => {
        setSearchInput('');
        setSearch('');
        setType(settings.defaultType || 'all');
        setSubject(settings.defaultCategory || 'All');
        setSort(settings.defaultSort || 'latest');
        setPage(1);
    };
    const hasActiveFilters = Boolean(search.trim()) || type !== (settings.defaultType || 'all') || subject !== (settings.defaultCategory || 'All') || sort !== (settings.defaultSort || 'latest');

    const handleShare = async (resource: CardResource) => {
        const url = resource.slug
            ? `${window.location.origin}/resources/${resource.slug}`
            : normalizeInternalOrExternalUrl(resource.fileUrl || resource.externalUrl || window.location.href) || window.location.href;
        try { await navigator.clipboard.writeText(url); setToast('Link copied!'); } catch { /* ignore */ }
    };
    const handleAction = (resource: CardResource, action: string) => {
        // Server-side download/visit counter (respects settings.trackingEnabled)
        void trackResourceDownload(resource._id);
        if (!settings.trackingEnabled) return;
        void trackAnalyticsEvent({ eventName: 'resource_download', module: 'resources', source: 'public', meta: { resourceId: resource._id, type: resource.type, action } }).catch(() => undefined);
    };
    const handleNavigate = (resource: CardResource) => { if (resource.slug) navigate(`/resources/${resource.slug}`); };

    const seoTitle = settings.metaTitle || settings.pageTitle || DEFAULT_SETTINGS.pageTitle;
    const seoDescription = settings.metaDescription || settings.pageSubtitle || DEFAULT_SETTINGS.pageSubtitle;

    if (!settings.publicPageEnabled) {
        return <div className="section-container py-16 sm:py-20"><div className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white/95 p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/80"><BookOpen className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Resources page is currently hidden</h1><p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">The resource library is temporarily unavailable from the public website.</p></div></div>;
    }

    return (
        <>
            <SEO
                title={seoTitle}
                description={seoDescription}
                keywords={settings.metaKeywords || undefined}
                image={settings.ogImageUrl ? buildMediaUrl(settings.ogImageUrl) : undefined}
                url={`${window.location.origin}/resources`}
                schema={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    name: settings.pageTitle,
                    description: seoDescription,
                    url: `${window.location.origin}/resources`,
                    numberOfItems: stats.total,
                }}
            />
            {hero.enabled && (
                <PageHeroBanner
                    title={hero.title}
                    subtitle={hero.subtitle}
                    pillText={hero.pillText}
                    vantaEffect={hero.vantaEffect}
                    vantaColor={hero.vantaColor}
                    vantaBackgroundColor={hero.vantaBackgroundColor}
                    gradientFrom={hero.gradientFrom}
                    gradientTo={hero.gradientTo}
                >
                    {settings.showSearch ? (
                        <HeroSearchInput
                            value={searchInput}
                            onChange={(v) => setSearchInput(v)}
                            placeholder={settings.searchPlaceholder}
                            className="mt-2"
                        />
                    ) : null}
                </PageHeroBanner>
            )}
            <div className="min-h-screen">
                {toast ? <Toast message={toast} onDismiss={() => setToast('')} /> : null}

                {/* Stats strip (admin-controlled) */}
                {settings.showStats && stats.total > 0 ? (
                    <section className="section-container pt-6">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {[
                                { label: 'Total Resources', value: stats.total, icon: BookOpen },
                                { label: 'PDF Files', value: stats.pdfs, icon: FileText },
                                { label: 'Video Lessons', value: stats.videos, icon: Video },
                                { label: 'Featured', value: stats.featured, icon: Star },
                            ].map((item) => (
                                <div key={item.label} className="card flex items-center gap-3 p-4">
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="h-4.5 w-4.5 h-[18px] w-[18px]" /></div>
                                    <div className="min-w-0">
                                        <p className="text-lg font-bold leading-none tabular-nums dark:text-dark-text">{formatCount(item.value)}</p>
                                        <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-wider text-text-muted dark:text-dark-text/50">{item.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}

                <section className="sticky top-16 z-30 mt-4 border-b border-card-border bg-surface dark:border-dark-border dark:bg-dark-surface">
                    <div className="section-container space-y-2 py-2.5">
                        <div className="flex items-center gap-2">
                            {settings.showSearch ? <div className="relative max-w-xs flex-1 sm:hidden"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input type="search" placeholder={settings.searchPlaceholder} aria-label="Search resources" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="input-field min-h-[44px] py-2 pl-9 text-xs" /></div> : null}
                            <button type="button" className="btn-ghost flex min-h-[44px] items-center gap-2 rounded-xl border border-card-border p-2.5 sm:hidden dark:border-dark-border" onClick={() => setMobileFilterOpen((current) => !current)} aria-expanded={mobileFilterOpen}><Filter className="h-4 w-4" /><span className="text-[10px] font-bold uppercase tracking-widest">Filters</span></button>
                            {settings.showTypeFilter ? <div className="relative hidden flex-1 items-center gap-1.5 overflow-x-auto scrollbar-hide after:pointer-events-none after:absolute after:bottom-0 after:right-0 after:top-0 after:w-12 after:bg-gradient-to-l after:from-surface after:to-transparent dark:after:from-dark-surface sm:flex">{typeOptions.map((item) => { const config = item === 'all' ? null : TYPE_CONFIG[item]; return <button key={item} type="button" onClick={() => { setType(item); setPage(1); }} className={`tab-pill flex-shrink-0 gap-1 text-xs ${type === item ? 'tab-pill-active' : 'tab-pill-inactive'}`}>{config ? <config.icon className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}{item === 'all' ? 'All Types' : config!.label}</button>; })}</div> : <div className="flex-1" />}
                            <select value={sort} onChange={(event) => { setSort(event.target.value as SortKey); setPage(1); }} className="input-field min-h-[44px] w-auto flex-shrink-0 py-2 text-xs" aria-label="Sort resources">{SORT_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}</select>
                        </div>
                        {settings.showCategoryFilter ? <div className="relative hidden items-center gap-1.5 overflow-x-auto scrollbar-hide after:pointer-events-none after:absolute after:bottom-0 after:right-0 after:top-0 after:w-16 after:bg-gradient-to-l after:from-surface after:to-transparent dark:after:from-dark-surface sm:flex">{categoryOptions.map((item) => <button key={item} type="button" onClick={() => { setSubject(item); setPage(1); }} className={`tab-pill flex-shrink-0 text-xs ${subject === item ? 'tab-pill-active' : 'tab-pill-inactive'}`}>{item}</button>)}{hasActiveFilters ? <button type="button" onClick={resetFilters} className="ml-2 flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-danger transition-colors hover:bg-danger/10 hover:text-danger/80"><X className="h-3 w-3" />Clear</button> : null}</div> : null}
                        {mobileFilterOpen ? <div className="space-y-2 pb-1 sm:hidden">{settings.showTypeFilter ? <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">{typeOptions.map((item) => { const config = item === 'all' ? null : TYPE_CONFIG[item]; return <button key={item} type="button" onClick={() => { setType(item); setPage(1); setMobileFilterOpen(false); }} className={`tab-pill flex-shrink-0 gap-1 text-xs ${type === item ? 'tab-pill-active' : 'tab-pill-inactive'}`}>{config ? <config.icon className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}{item === 'all' ? 'All' : config!.label}</button>; })}</div> : null}{settings.showCategoryFilter ? <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">{categoryOptions.map((item) => <button key={item} type="button" onClick={() => { setSubject(item); setPage(1); setMobileFilterOpen(false); }} className={`tab-pill flex-shrink-0 text-xs ${subject === item ? 'tab-pill-active' : 'tab-pill-inactive'}`}>{item}</button>)}</div> : null}</div> : null}
                    </div>
                </section>

                <section className="section-container space-y-8 py-8 sm:py-10">
                    {error ? (
                        <div className="flex flex-col items-start gap-3 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
                            <span className="flex items-center gap-3"><AlertCircle className="h-4 w-4 flex-shrink-0" />Live resource data could not be loaded.</span>
                            <button type="button" onClick={() => setPage((current) => current)} className="btn-outline gap-2 rounded-lg px-3 py-1.5 text-xs"><RefreshCw className="h-3.5 w-3.5" />Retry</button>
                        </div>
                    ) : null}
                    {settings.showFeatured && featured.length > 0 ? (
                        <div>
                            <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent" /><h2 className="text-lg font-heading font-bold dark:text-dark-text">{settings.featuredSectionTitle}</h2></div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">{featured.map((resource) => <FeaturedCard key={resource._id} resource={resource} openLinksInNewTab={settings.openLinksInNewTab} onShare={handleShare} onAction={handleAction} onNavigate={handleNavigate} />)}</div>
                        </div>
                    ) : null}
                    <div>
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-heading font-bold dark:text-dark-text">{settings.showSearch && search ? `Results for "${search}"` : subject !== 'All' ? subject : type !== 'all' ? `${TYPE_CONFIG[type as Exclude<ResourceType, 'all'>].label}s` : 'All Resources'}</h2>
                                <p className="mt-0.5 text-xs text-text-muted dark:text-dark-text/50">{loading ? 'Loading...' : `${total} resource${total !== 1 ? 's' : ''} found`}</p>
                            </div>
                            {settings.showSearch ? <div className="hidden items-center gap-2 sm:flex"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" /><input type="search" placeholder={settings.searchPlaceholder} aria-label="Search resources" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="input-field min-h-[44px] w-64 py-2 pl-9 text-xs" />{searchInput ? <button type="button" onClick={() => { setSearchInput(''); }} className="absolute right-3 top-1/2 -translate-y-1/2" aria-label="Clear resource search"><X className="h-3.5 w-3.5 text-text-muted hover:text-danger" /></button> : null}</div></div> : null}
                        </div>
                        {loading ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} />)}</div> : resources.length === 0 ? <div className="py-16 text-center sm:py-24"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5"><BookOpen className="h-8 w-8 text-primary/30" /></div><h3 className="mb-2 text-lg font-semibold dark:text-dark-text">No resources found</h3><p className="mb-5 text-sm text-text-muted dark:text-dark-text/50">{settings.emptyStateMessage}</p><button type="button" onClick={resetFilters} className="btn-outline gap-2 text-sm"><X className="h-4 w-4" />Reset filters</button></div> : <div className={`grid grid-cols-1 gap-4 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'pointer-events-none opacity-50' : ''}`}>{resources.map((resource) => <ResourceCard key={resource._id} resource={resource} openLinksInNewTab={settings.openLinksInNewTab} onShare={handleShare} onAction={handleAction} onNavigate={handleNavigate} />)}</div>}
                        {totalPages > 1 ? <><div className="mt-10 flex items-center justify-center gap-2" role="navigation" aria-label="Pagination"><button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="btn-ghost rounded-xl border border-card-border p-2 disabled:opacity-40 dark:border-dark-border" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>{Array.from({ length: Math.min(totalPages, 7) }, (_, index) => { const pageNumber = totalPages <= 7 ? index + 1 : page <= 4 ? index + 1 : page >= totalPages - 3 ? totalPages - 6 + index : page - 3 + index; return <button key={pageNumber} type="button" onClick={() => setPage(pageNumber)} aria-current={pageNumber === page ? 'page' : undefined} className={`h-9 w-9 rounded-xl text-sm font-medium transition-all ${pageNumber === page ? 'bg-primary text-white shadow-md' : 'btn-ghost border border-card-border dark:border-dark-border'}`}>{pageNumber}</button>; })}<button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="btn-ghost rounded-xl border border-card-border p-2 disabled:opacity-40 dark:border-dark-border" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div><p className="mt-3 text-center text-xs text-text-muted dark:text-dark-text/40">Page {page} of {totalPages} · {total} total results</p></> : null}
                    </div>
                </section>
            </div>
        </>
    );
}
