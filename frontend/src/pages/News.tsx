import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    AlertCircle,
    ArrowRight,
    Eye,
    Globe2,
    Layers,
    Newspaper,
    RefreshCw,
    Search,
    Share2,
    SlidersHorizontal,
    Sparkles,
    Tag,
    TrendingUp,
    X,
} from 'lucide-react';
import PageHeroBanner from '../components/common/PageHeroBanner';
import HeroSearchInput from '../components/common/HeroSearchInput';
import { usePageHeroSettings } from '../hooks/usePageHeroSettings';
import toast from 'react-hot-toast';
import {
    ApiNews,
    ApiNewsPublicSettings,
    getPublicNewsSettings,
    getPublicNewsSources,
    getPublicNewsV2List,
    getPublicNewsV2Widgets,
    trackPublicNewsV2Share,
} from '../services/api';
import { buildMediaUrl } from '../utils/mediaUrl';

const DEFAULT_SETTINGS: ApiNewsPublicSettings = {
    pageTitle: 'Admission News & Updates',
    pageSubtitle: 'Live updates from verified CampusWay RSS feeds.',
    headerBannerUrl: '',
    defaultBannerUrl: '',
    defaultThumbUrl: '',
    defaultSourceIconUrl: '',
    appearance: {
        layoutMode: 'rss_reader',
        density: 'comfortable',
        cardDensity: 'comfortable',
        paginationMode: 'pages',
        showWidgets: {
            trending: true,
            latest: true,
            sourceSidebar: true,
            tagChips: true,
            previewPanel: true,
            breakingTicker: false,
        },
        showSourceIcons: true,
        showTrendingWidget: true,
        showCategoryWidget: true,
        showShareButtons: true,
        animationLevel: 'normal',
        thumbnailFallbackUrl: '',
    },
    shareTemplates: {},
    shareButtons: {
        whatsapp: true,
        facebook: true,
        messenger: true,
        telegram: true,
        copyLink: true,
        copyText: true,
    },
    workflow: {
        allowScheduling: true,
        openOriginalWhenExtractionIncomplete: true,
    },
};

/** Deterministic pastel gradient per article id — used when no real image exists. */
const TILE_GRADIENTS = [
    'from-cyan-500/20 via-sky-500/10 to-indigo-500/20',
    'from-violet-500/20 via-fuchsia-500/10 to-pink-500/20',
    'from-emerald-500/20 via-teal-500/10 to-cyan-500/20',
    'from-amber-500/20 via-orange-500/10 to-rose-500/20',
    'from-blue-500/20 via-indigo-500/10 to-violet-500/20',
    'from-rose-500/20 via-red-500/10 to-orange-500/20',
];

function tileGradient(id: string): string {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) % 997;
    return TILE_GRADIENTS[hash % TILE_GRADIENTS.length];
}

/**
 * Returns the article's *real* image, or null when the article has none.
 * The backend marks missing covers with coverImageSource === 'default' and
 * swaps in the site logo — rendering that as a giant card image looked bad,
 * so those articles get an elegant gradient tile instead.
 */
function getRealArticleImage(news: ApiNews): string | null {
    const forceDefault = String(news.coverImageSource || news.coverSource || '').toLowerCase() === 'default';
    if (forceDefault) return null;
    const candidates = [news.coverImageUrl, news.coverImage, news.thumbnailImage, news.featuredImage];
    const found = candidates.map((item) => String(item || '').trim()).find(Boolean);
    if (!found || /^(default|placeholder|none)$/i.test(found)) return null;
    return buildMediaUrl(found);
}

function formatRelative(value?: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderDate(value?: string): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
}

function getOriginalArticleUrl(news: ApiNews): string {
    return String(news.originalArticleUrl || news.originalLink || '').trim();
}

function shouldOpenOriginalSource(news: ApiNews, settings: ApiNewsPublicSettings): boolean {
    const sourceType = String(news.sourceType || '').toLowerCase();
    const hasOriginalUrl = Boolean(getOriginalArticleUrl(news));
    const allowFallback = settings.workflow?.openOriginalWhenExtractionIncomplete !== false;
    return (
        allowFallback
        && hasOriginalUrl
        && (sourceType === 'rss' || sourceType === 'ai_assisted')
        && news.fetchedFullText === false
    );
}

function articleLink(news: ApiNews): string {
    return `/news/${news.slug || news._id}`;
}

type SourceOption = { key: string; label: string; iconUrl: string; count: number };

function dedupeSources(raw: Array<{ _id: string; name: string; iconUrl?: string; count: number }>): SourceOption[] {
    const merged = new Map<string, SourceOption>();
    raw.forEach((item) => {
        const label = String(item.name || '').trim() || 'Unknown source';
        const key = label.toLowerCase();
        const iconUrl = String(item.iconUrl || '');
        const existing = merged.get(key);
        if (existing) {
            existing.count += Number(item.count || 0);
            if (!existing.iconUrl && iconUrl) existing.iconUrl = iconUrl;
            return;
        }
        merged.set(key, { key, label, iconUrl, count: Number(item.count || 0) });
    });
    return Array.from(merged.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default function NewsPage() {
    const hero = usePageHeroSettings('news');
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [source, setSource] = useState('');
    const [category, setCategory] = useState('All');
    const [tag, setTag] = useState('');
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
    const [infiniteItems, setInfiniteItems] = useState<ApiNews[]>([]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search.trim());
            setPage(1);
            setInfiniteItems([]);
        }, 320);
        return () => window.clearTimeout(timer);
    }, [search]);

    const listFilters = useMemo(
        () => ({
            page,
            limit: 15,
            // Sources can be merged server-side, so filter by the display name —
            // it matches every article of the merged duplicates.
            source: source.startsWith('name:') ? source.slice(5) : source,
            category: category.trim().toLowerCase() === 'all' ? '' : category,
            tag,
            q: debouncedSearch,
        }),
        [page, source, category, tag, debouncedSearch]
    );

    const settingsQuery = useQuery({
        queryKey: ['newsSettings'],
        queryFn: async () => (await getPublicNewsSettings()).data,
    });

    const sourcesQuery = useQuery({
        queryKey: ['newsSources'],
        queryFn: async () => (await getPublicNewsSources()).data,
    });

    const widgetsQuery = useQuery({
        queryKey: ['news.public.widgets'],
        queryFn: async () => (await getPublicNewsV2Widgets()).data,
    });

    const listQuery = useQuery({
        queryKey: ['newsList', listFilters],
        queryFn: async () =>
            (
                await getPublicNewsV2List(listFilters)
            ).data,
    });

    const settings = settingsQuery.data || DEFAULT_SETTINGS;
    const shareButtons = settings.shareButtons || DEFAULT_SETTINGS.shareButtons;
    // useMemo keeps the empty-array reference stable while loading/errored —
    // a fresh `[]` here fed an effect below ([items, ...]) and caused an
    // infinite setState render loop ("Maximum update depth exceeded").
    const items = useMemo(() => listQuery.data?.items ?? [], [listQuery.data]);
    const pages = Math.max(1, listQuery.data?.pages || 1);
    const paginationMode = settings.appearance.paginationMode || 'pages';
    const layoutMode = settings.appearance.layoutMode || 'rss_reader';
    const categories = useMemo(() => {
        const raw = ['All', ...(widgetsQuery.data?.categories || []).map((item) => item._id).filter(Boolean)];
        const seen = new Set<string>();
        return raw.filter((item) => {
            const key = String(item).trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [widgetsQuery.data?.categories]);
    const tags = useMemo(() => {
        if (settings.appearance.showWidgets?.tagChips === false) return [];
        const raw = (widgetsQuery.data?.tags || []).map((item) => item._id).filter(Boolean);
        const seen = new Set<string>();
        return raw.filter((item) => {
            const key = String(item).trim().toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [settings.appearance.showWidgets?.tagChips, widgetsQuery.data?.tags]);
    const sources = useMemo(
        () => dedupeSources(sourcesQuery.data?.items || []),
        [sourcesQuery.data?.items]
    );
    const trending = useMemo(() => {
        const enabled = settings.appearance.showWidgets?.trending !== false
            && settings.appearance.showTrendingWidget !== false;
        if (!enabled) return [];
        return (widgetsQuery.data?.trending || []).slice(0, 5);
    }, [settings.appearance.showWidgets?.trending, settings.appearance.showTrendingWidget, widgetsQuery.data?.trending]);
    const isLoading = settingsQuery.isLoading || sourcesQuery.isLoading || widgetsQuery.isLoading || listQuery.isLoading;
    const activeFilterCount = (source ? 1 : 0) + (category !== 'All' ? 1 : 0) + (tag ? 1 : 0);

    useEffect(() => {
        setPage(1);
        setInfiniteItems([]);
    }, [source, category, tag, debouncedSearch, paginationMode]);

    useEffect(() => {
        if (paginationMode !== 'infinite') {
            setInfiniteItems(items);
            return;
        }
        if (page === 1) {
            setInfiniteItems(items);
            return;
        }
        setInfiniteItems((prev) => {
            const merged = [...prev];
            items.forEach((item) => {
                if (!merged.some((entry) => entry._id === item._id)) {
                    merged.push(item);
                }
            });
            return merged;
        });
    }, [items, page, paginationMode]);

    const renderedItems = paginationMode === 'infinite' ? infiniteItems : items;
    const showSourceSidebar = layoutMode === 'rss_reader' && settings.appearance.showWidgets?.sourceSidebar !== false;
    const showTrendingPanel = layoutMode === 'rss_reader' && trending.length > 0;
    const [featured, ...restItems] = renderedItems;
    const isGridMode = layoutMode === 'grid';

    async function handleShare(news: ApiNews, channel: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text') {
        try {
            const newsTarget = news.slug || news._id;
            const shareUrl = news.shareUrl || `${window.location.origin}/news/${newsTarget}`;
            const shareText = news.shareText?.[channel.replace('copy_', '') as 'whatsapp' | 'facebook' | 'messenger' | 'telegram']
                || `${news.title}\n${shareUrl}`;

            if (channel === 'copy_link') {
                await navigator.clipboard.writeText(shareUrl);
            } else if (channel === 'copy_text') {
                await navigator.clipboard.writeText(shareText);
            } else {
                const linkMap: Record<'whatsapp' | 'facebook' | 'messenger' | 'telegram', string> = {
                    whatsapp: news.shareLinks?.whatsapp || `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                    facebook: news.shareLinks?.facebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    messenger: news.shareLinks?.messenger || `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}`,
                    telegram: news.shareLinks?.telegram || `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
                };
                window.open(linkMap[channel], '_blank', 'noopener,noreferrer');
            }
            toast.success('Shared');
        } catch {
            toast.error('Share failed');
            return;
        }

        try {
            const trackChannel = channel === 'copy_link' || channel === 'copy_text' ? 'copy' : channel;
            await trackPublicNewsV2Share(news.slug, trackChannel);
        } catch {
            // Share tracking failures should not block user-facing share action.
        }
    }

    return (
        <>
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
                    primaryCTA={hero.primaryCTA}
                    secondaryCTA={hero.secondaryCTA}
                >
                    <HeroSearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="নিউজ খুঁজুন..."
                        className="mt-2"
                    />
                </PageHeroBanner>
            )}
            <div className="min-h-screen bg-background dark:bg-[#081322]">
                <div className={`mx-auto grid w-full grid-cols-1 gap-6 px-4 py-6 sm:px-6 sm:py-8 md:px-10 lg:grid-cols-[270px_minmax(0,1fr)] lg:px-12 xl:px-20 2xl:px-28 ${showTrendingPanel ? '2xl:grid-cols-[270px_minmax(0,1fr)_310px] xl:grid-cols-[270px_minmax(0,1fr)_300px]' : ''}`}>
                    <aside className={`${showSourceSidebar ? 'hidden lg:block' : 'hidden'}`}>
                        <div className="sticky top-24 space-y-4">
                            <FilterPanel
                                category={category}
                                onCategory={setCategory}
                                categories={categories}
                                source={source}
                                onSource={setSource}
                                sources={sources}
                                tag={tag}
                                onTag={setTag}
                                tags={tags}
                            />
                        </div>
                    </aside>

                    <section className="min-w-0 space-y-4">
                        {/* Active filter chips — visible on every screen size */}
                        {activeFilterCount > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                {source && (
                                    <FilterChip
                                        label={sources.find((item) => `name:${item.key}` === source || item.key === source)?.label || 'Source'}
                                        onClear={() => setSource('')}
                                    />
                                )}
                                {category !== 'All' && <FilterChip label={category} onClear={() => setCategory('All')} />}
                                {tag && <FilterChip label={`#${tag}`} onClear={() => setTag('')} />}
                                <button
                                    type="button"
                                    className="text-xs font-medium text-text-muted underline-offset-2 hover:underline dark:text-dark-text/60"
                                    onClick={() => { setSource(''); setCategory('All'); setTag(''); }}
                                >
                                    Clear all
                                </button>
                            </div>
                        )}

                        {/* Mobile: inline filters + a floating trigger for the sheet */}
                        {!showSourceSidebar && (
                            <FilterPanel
                                category={category}
                                onCategory={setCategory}
                                categories={categories}
                                source={source}
                                onSource={setSource}
                                sources={sources}
                                tag={tag}
                                onTag={setTag}
                                tags={tags}
                            />
                        )}

                        {isLoading && (
                            <div className="space-y-4">
                                <div className="skeleton h-72 w-full rounded-3xl" />
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="skeleton h-28 w-full rounded-2xl" />
                                ))}
                            </div>
                        )}

                        {!isLoading && (listQuery.isError || settingsQuery.isError) && (
                            <div className="rounded-3xl border border-dashed border-slate-200/60 bg-white px-6 py-12 text-center dark:border-white/[0.06] dark:bg-slate-900/50">
                                <AlertCircle className="mx-auto h-10 w-10 text-red-400 dark:text-red-300" />
                                <p className="mt-3 text-sm font-medium text-text-muted dark:text-dark-text/75">
                                    Failed to load news
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                                    onClick={() => {
                                        listQuery.refetch();
                                        settingsQuery.refetch();
                                    }}
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Retry
                                </button>
                            </div>
                        )}

                        {!isLoading && renderedItems.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-200/60 bg-white px-6 py-14 text-center dark:border-white/[0.06] dark:bg-slate-900/50">
                                <Newspaper className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
                                <p className="mt-3 text-sm font-medium text-text-muted dark:text-dark-text/75">No news found for this filter.</p>
                                <p className="mt-1 text-xs text-text-muted/70 dark:text-dark-text/50">Try a different keyword or clear the filters.</p>
                            </div>
                        )}

                        {!isLoading && renderedItems.length > 0 && (
                            <motion.div
                                initial="hidden"
                                animate="show"
                                variants={{
                                    hidden: { opacity: 0 },
                                    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
                                }}
                                className={isGridMode
                                    ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
                                    : 'space-y-4'}
                            >
                                {!isGridMode && featured && (
                                    <FeaturedCard
                                        news={featured}
                                        settings={settings}
                                        shareButtons={shareButtons}
                                        onShare={handleShare}
                                    />
                                )}
                                {(isGridMode ? renderedItems : restItems).map((news) => (
                                    <ArticleCard
                                        key={news._id}
                                        news={news}
                                        settings={settings}
                                        layoutMode={layoutMode}
                                        shareButtons={shareButtons}
                                        onShare={handleShare}
                                    />
                                ))}
                            </motion.div>
                        )}

                        {paginationMode === 'infinite' ? (
                            <div className="flex items-center justify-center gap-2 pt-2">
                                <button
                                    type="button"
                                    className="btn-outline"
                                    disabled={page >= pages}
                                    onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
                                >
                                    {page >= pages ? 'No More News' : 'Load More'}
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    className="btn-outline"
                                    disabled={page <= 1}
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                >
                                    Previous
                                </button>
                                <span className="text-sm tabular-nums text-slate-500 dark:text-slate-300">
                                    Page {page} / {pages}
                                </span>
                                <button
                                    type="button"
                                    className="btn-outline"
                                    disabled={page >= pages}
                                    onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </section>

                    <aside className={`${showTrendingPanel ? 'hidden lg:block' : 'hidden'}`}>
                        <div className="sticky top-24 space-y-4">
                            <TrendingPanel
                                trending={trending}
                                categories={widgetsQuery.data?.categories || []}
                                category={category}
                                onCategory={setCategory}
                                showCategories={settings.appearance.showCategoryWidget !== false && settings.appearance.showWidgets?.trending !== false}
                            />
                        </div>
                    </aside>
                </div>

                {/* Floating filter button — the only way to reach filters on mobile in rss_reader mode */}
                {showSourceSidebar && (
                    <button
                        type="button"
                        onClick={() => setMobileFilterOpen(true)}
                        className="fixed bottom-6 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-black/20 transition hover:opacity-90 lg:hidden"
                        aria-label="Open filters"
                    >
                        <SlidersHorizontal className="h-4 w-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[11px] font-bold tabular-nums">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>
                )}

                {mobileFilterOpen && (
                    <div className="fixed inset-0 z-50 bg-black/50 lg:hidden" onClick={() => setMobileFilterOpen(false)}>
                        <div
                            className="absolute bottom-0 left-0 right-0 max-h-[84vh] overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-slate-950"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Filter News</h2>
                                <button
                                    type="button"
                                    className="rounded-lg border border-slate-300 p-2 dark:border-white/20"
                                    onClick={() => setMobileFilterOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <FilterPanel
                                category={category}
                                onCategory={setCategory}
                                categories={categories}
                                source={source}
                                onSource={setSource}
                                sources={sources}
                                tag={tag}
                                onTag={setTag}
                                tags={tags}
                            />
                            <button
                                type="button"
                                className="mt-4 w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white"
                                onClick={() => setMobileFilterOpen(false)}
                            >
                                Show {pages > 1 ? `${pages} page${pages > 1 ? 's' : ''}` : 'results'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
            {label}
            <button type="button" onClick={onClear} aria-label={`Remove ${label} filter`} className="rounded-full p-0.5 transition hover:bg-cyan-500/20">
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

function SectionHeading({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <h3 className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            {icon}
            {children}
        </h3>
    );
}

function SourceSidebar({ source, onSource, sources }: { source: string; onSource: (value: string) => void; sources: SourceOption[] }) {
    const [sourceSearch, setSourceSearch] = useState('');
    const filteredSources = useMemo(() => {
        const q = sourceSearch.trim().toLowerCase();
        if (!q) return sources;
        return sources.filter((item) => item.label.toLowerCase().includes(q));
    }, [sourceSearch, sources]);

    return (
        <div>
            <SectionHeading icon={<Globe2 className="h-3.5 w-3.5" />}>Sources</SectionHeading>
            <label className="relative mb-2.5 block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                    className="w-full rounded-lg border border-slate-200/60 bg-slate-50 py-1.5 pl-8 pr-2 text-xs outline-none transition focus:border-cyan-500 focus:bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:focus:border-cyan-500 dark:focus:bg-white/[0.06]"
                    placeholder="Filter sources..."
                    aria-label="Filter news sources"
                    value={sourceSearch}
                    onChange={(e) => setSourceSearch(e.target.value)}
                />
            </label>
            <div className="max-h-56 space-y-0.5 overflow-y-auto pr-0.5">
                <button
                    type="button"
                    onClick={() => onSource('')}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors ${source === ''
                        ? 'bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                        }`}
                >
                    <span>All Sources</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-400">
                        {sources.reduce((acc, item) => acc + item.count, 0)}
                    </span>
                </button>
                {filteredSources.map((item) => {
                    const value = `name:${item.key}`;
                    const active = source === value;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onSource(active ? '' : value)}
                            title={item.label}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-[13px] transition-colors ${active
                                ? 'bg-cyan-500/10 font-semibold text-cyan-700 dark:text-cyan-300'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                                }`}
                        >
                            <span className="inline-flex min-w-0 items-center gap-2">
                                {item.iconUrl
                                    ? <img src={buildMediaUrl(item.iconUrl)} alt="" className="h-4.5 w-4.5 h-[18px] w-[18px] flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200/70 dark:ring-white/10" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    : <span className="flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-[9px] font-bold text-white">{item.label.charAt(0).toUpperCase()}</span>}
                                <span className="truncate">{item.label}</span>
                            </span>
                            <span className="ml-2 flex-shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-slate-400">{item.count}</span>
                        </button>
                    );
                })}
                {filteredSources.length === 0 && (
                    <p className="px-2.5 py-2 text-xs text-slate-400 dark:text-slate-500">No sources match.</p>
                )}
            </div>
        </div>
    );
}

function FilterPanel({
    category,
    onCategory,
    categories,
    source,
    onSource,
    sources,
    tag,
    onTag,
    tags,
}: {
    category: string;
    onCategory: (value: string) => void;
    categories: string[];
    source: string;
    onSource: (value: string) => void;
    sources: SourceOption[];
    tag: string;
    onTag: (value: string) => void;
    tags: string[];
}) {
    return (
        <div className="space-y-5 rounded-2xl border border-slate-200/60 bg-white/95 p-4 shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-slate-900/80">
            <SourceSidebar source={source} onSource={onSource} sources={sources} />
            <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                <SectionHeading icon={<Layers className="h-3.5 w-3.5" />}>Categories</SectionHeading>
                <div className="flex flex-wrap gap-1.5">
                    {categories.map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onCategory(item)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${category === item
                                ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/[0.12]'
                                }`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            </div>
            {tags.length > 0 && (
                <div className="border-t border-slate-100 pt-4 dark:border-white/5">
                    <SectionHeading icon={<Tag className="h-3.5 w-3.5" />}>Tags</SectionHeading>
                    <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => onTag('')}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${tag === ''
                                ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/[0.12]'
                                }`}
                        >
                            All
                        </button>
                        {tags.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => onTag(item)}
                                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${tag === item
                                    ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/25'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/[0.12]'
                                    }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function TrendingPanel({
    trending,
    categories,
    category,
    onCategory,
    showCategories,
}: {
    trending: ApiNews[];
    categories: Array<{ _id: string; count: number }>;
    category: string;
    onCategory: (value: string) => void;
    showCategories: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-slate-900/80">
                <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                        <TrendingUp className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Trending Now</h3>
                </div>
                <ol className="divide-y divide-slate-100 dark:divide-white/5">
                    {trending.map((news, index) => (
                        <li key={news._id}>
                            <Link
                                to={articleLink(news)}
                                className="group flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                            >
                                <span className={`text-base font-black leading-none tabular-nums ${index === 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`}>
                                    {index + 1}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-700 transition-colors group-hover:text-cyan-600 dark:text-slate-200 dark:group-hover:text-cyan-400">
                                        {news.title}
                                    </span>
                                    <span className="mt-1 flex items-center gap-2 text-[11px] text-text-muted dark:text-dark-text/50">
                                        {typeof news.views === 'number' && (
                                            <span className="inline-flex items-center gap-1">
                                                <Eye className="h-3 w-3" />
                                                {news.views}
                                            </span>
                                        )}
                                        <span>{formatRelative(news.publishedAt || news.publishDate || news.createdAt)}</span>
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ol>
            </div>

            {showCategories && categories.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-sm dark:border-white/[0.06] dark:bg-slate-900/80">
                    <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 dark:border-white/5">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                            <Layers className="h-4 w-4" />
                        </span>
                        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Browse Topics</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 p-4">
                        {categories.slice(0, 10).map((item) => (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => onCategory(category === item._id ? 'All' : item._id)}
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${category === item._id
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/[0.07] dark:text-slate-300 dark:hover:bg-white/[0.12]'
                                    }`}
                            >
                                {item._id}
                                <span className={`tabular-nums ${category === item._id ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {item.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/** Image area that never degrades into a giant logo: real image or a chic gradient tile. */
function ArticleThumb({ news, className, iconSize = 'h-7 w-7' }: { news: ApiNews; className?: string; iconSize?: string }) {
    const image = getRealArticleImage(news);
    if (image) {
        return (
            <img
                src={image}
                alt={news.title || 'News article'}
                className={`${className || ''} object-cover transition-transform duration-500 group-hover:scale-105`}
                loading="lazy"
                onError={(e) => {
                    (e.target as HTMLImageElement).style.visibility = 'hidden';
                }}
            />
        );
    }
    return (
        <div className={`${className || ''} flex items-center justify-center bg-gradient-to-br ${tileGradient(String(news._id || ''))}`}>
            <Newspaper className={`${iconSize} text-white/70`} />
        </div>
    );
}

function SourceMeta({ news, settings, size = 'sm' }: { news: ApiNews; settings: ApiNewsPublicSettings; size?: 'sm' | 'md' }) {
    const iconPx = size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
    return (
        <div className={`flex min-w-0 items-center gap-2 text-text-muted dark:text-dark-text/60 ${size === 'md' ? 'text-xs' : 'text-[11px]'}`}>
            {settings.appearance.showSourceIcons !== false && (
                news.sourceIconUrl || settings.defaultSourceIconUrl ? (
                    <img
                        src={buildMediaUrl(news.sourceIconUrl || settings.defaultSourceIconUrl || '/logo.svg')}
                        alt=""
                        className={`${iconPx} flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200/60 dark:ring-slate-700/60`}
                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
                    />
                ) : null
            )}
            <span className="truncate font-medium text-slate-600 dark:text-slate-300">{news.sourceName || 'CampusWay'}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="flex-shrink-0" title={renderDate(news.publishedAt || news.publishDate || news.createdAt)}>
                {formatRelative(news.publishedAt || news.publishDate || news.createdAt) || renderDate(news.publishedAt || news.publishDate || news.createdAt)}
            </span>
            {news.aiUsed && (
                <span className="inline-flex flex-shrink-0 items-center gap-0.5 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI
                </span>
            )}
        </div>
    );
}

function CategoryBadge({ category, className = '' }: { category?: string; className?: string }) {
    if (!category) return null;
    return (
        <span className={`inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--primary)] shadow-sm backdrop-blur-sm dark:bg-slate-900/85 ${className}`}>
            {category}
        </span>
    );
}

function ShareMenu({ news, shareButtons, onShare, align = 'right' }: {
    news: ApiNews;
    shareButtons: Record<string, boolean>;
    onShare: (news: ApiNews, channel: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text') => void;
    align?: 'right' | 'left';
}) {
    const [shareOpen, setShareOpen] = useState(false);
    const hasAnyShare = shareButtons.whatsapp || shareButtons.facebook || shareButtons.messenger || shareButtons.telegram || shareButtons.copyLink;

    useEffect(() => {
        if (!shareOpen) return;
        const close = () => setShareOpen(false);
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [shareOpen]);

    if (!hasAnyShare) return null;
    return (
        <div className="relative">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShareOpen(!shareOpen); }}
                className="rounded-lg border border-slate-200/60 p-2 text-text-muted transition-colors hover:border-[var(--primary)]/40 hover:text-[var(--primary)] dark:border-white/[0.08] dark:hover:border-cyan-500/30"
                aria-label="Share"
            >
                <Share2 className="h-3.5 w-3.5" />
            </button>
            {shareOpen && (
                <div
                    className={`absolute bottom-full mb-1 z-50 min-w-[140px] rounded-xl border border-slate-200/60 bg-white p-1.5 shadow-xl dark:border-white/[0.08] dark:bg-slate-900 ${align === 'right' ? 'right-0' : 'left-0'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {shareButtons.whatsapp && <ShareMenuItem label="WhatsApp" onClick={() => { onShare(news, 'whatsapp'); setShareOpen(false); }} />}
                    {shareButtons.facebook && <ShareMenuItem label="Facebook" onClick={() => { onShare(news, 'facebook'); setShareOpen(false); }} />}
                    {shareButtons.messenger && <ShareMenuItem label="Messenger" onClick={() => { onShare(news, 'messenger'); setShareOpen(false); }} />}
                    {shareButtons.telegram && <ShareMenuItem label="Telegram" onClick={() => { onShare(news, 'telegram'); setShareOpen(false); }} />}
                    {shareButtons.copyLink && <ShareMenuItem label="Copy Link" onClick={() => { onShare(news, 'copy_link'); setShareOpen(false); }} />}
                </div>
            )}
        </div>
    );
}

function ReadAction({ news, settings, className = '' }: { news: ApiNews; settings: ApiNewsPublicSettings; className?: string }) {
    if (shouldOpenOriginalSource(news, settings)) {
        return (
            <a
                href={getOriginalArticleUrl(news)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
            >
                Read Source
                <ArrowRight className="h-3 w-3" />
            </a>
        );
    }
    return (
        <Link
            to={articleLink(news)}
            onClick={(e) => e.stopPropagation()}
            className={`inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 ${className}`}
        >
            Read
            <ArrowRight className="h-3 w-3" />
        </Link>
    );
}

/** Big first story — the visual anchor of the page. */
function FeaturedCard({ news, settings, shareButtons, onShare }: {
    news: ApiNews;
    settings: ApiNewsPublicSettings;
    shareButtons: Record<string, boolean>;
    onShare: (news: ApiNews, channel: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text') => void;
}) {
    const navigate = useNavigate();
    const target = news.slug || news._id;
    const open = () => {
        if (shouldOpenOriginalSource(news, settings)) {
            window.open(getOriginalArticleUrl(news), '_blank', 'noopener,noreferrer');
            return;
        }
        if (target) navigate(articleLink(news));
    };

    return (
        <motion.article
            variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.2 }}
            onClick={open}
            className="group cursor-pointer overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm transition-shadow hover:shadow-xl dark:border-white/[0.06] dark:bg-slate-900/80"
        >
            <div className="relative">
                <ArticleThumb news={news} className="h-56 w-full sm:h-64" iconSize="h-14 w-14" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
                <CategoryBadge category={news.category} className="absolute left-4 top-4" />
                {news.priority === 'breaking' && (
                    <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                        Breaking
                    </span>
                )}
            </div>
            <div className="space-y-3 p-5 sm:p-6">
                <h2 className="line-clamp-2 text-xl font-bold leading-snug text-text transition-colors group-hover:text-[var(--primary)] dark:text-dark-text sm:text-2xl">
                    {news.title}
                </h2>
                <p className="line-clamp-3 text-sm leading-relaxed text-text-muted dark:text-dark-text/70">
                    {news.shortSummary || news.shortDescription}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <SourceMeta news={news} settings={settings} size="md" />
                    <div className="flex items-center gap-2">
                        <ReadAction news={news} settings={settings} className="!px-4 !py-2 !text-[13px]" />
                        <ShareMenu news={news} shareButtons={shareButtons} onShare={onShare} />
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

/** Compact story row. */
function ArticleCard({ news, settings, layoutMode, shareButtons, onShare }: {
    news: ApiNews;
    settings: ApiNewsPublicSettings;
    layoutMode: string;
    shareButtons: Record<string, boolean>;
    onShare: (news: ApiNews, channel: 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text') => void;
}) {
    const navigate = useNavigate();
    const target = news.slug || news._id;
    const open = () => {
        if (shouldOpenOriginalSource(news, settings)) {
            window.open(getOriginalArticleUrl(news), '_blank', 'noopener,noreferrer');
            return;
        }
        if (target) navigate(articleLink(news));
    };

    if (layoutMode === 'grid') {
        return (
            <motion.article
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18 }}
                onClick={open}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-shadow hover:shadow-lg dark:border-white/[0.06] dark:bg-slate-900/80"
            >
                <div className="relative">
                    <ArticleThumb news={news} className="h-40 w-full" />
                    <CategoryBadge category={news.category} className="absolute left-3 top-3" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                    <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-text transition-colors group-hover:text-[var(--primary)] dark:text-dark-text">
                        {news.title}
                    </h2>
                    <p className="line-clamp-2 text-[13px] leading-relaxed text-text-muted dark:text-dark-text/70">
                        {news.shortSummary || news.shortDescription}
                    </p>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                        <SourceMeta news={news} settings={settings} />
                        <ShareMenu news={news} shareButtons={shareButtons} onShare={onShare} />
                    </div>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.article
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.18 }}
            onClick={open}
            className="group relative cursor-pointer rounded-2xl border border-slate-200/60 bg-white shadow-sm transition-all duration-200 hover:border-cyan-400/40 hover:shadow-lg dark:border-white/[0.06] dark:bg-slate-900/80 dark:hover:border-cyan-500/30"
        >
            <div className="flex gap-4 p-3.5 sm:gap-5 sm:p-4">
                <div className="relative flex-shrink-0 self-start overflow-hidden rounded-xl">
                    <ArticleThumb news={news} className="h-[92px] w-[120px] sm:h-[96px] sm:w-[150px]" iconSize="h-6 w-6" />
                    {news.priority === 'breaking' && (
                        <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                            Live
                        </span>
                    )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-text transition-colors group-hover:text-[var(--primary)] dark:text-dark-text sm:text-base">
                        {news.title}
                    </h2>
                    <p className="line-clamp-2 hidden text-[13px] leading-relaxed text-text-muted dark:text-dark-text/70 sm:block">
                        {news.shortSummary || news.shortDescription}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex min-w-0 items-center gap-3">
                            <SourceMeta news={news} settings={settings} />
                            {news.category && (
                                <span className="hidden flex-shrink-0 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300 md:inline-flex">
                                    {news.category}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-2">
                            <ReadAction news={news} settings={settings} />
                            <ShareMenu news={news} shareButtons={shareButtons} onShare={onShare} />
                        </div>
                    </div>
                </div>
            </div>
        </motion.article>
    );
}

function ShareMenuItem({ label, onClick }: { label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center rounded-lg px-3 py-1.5 text-xs text-text-muted transition-colors hover:bg-slate-50 hover:text-[var(--primary)] dark:text-dark-text/75 dark:hover:bg-white/5"
        >
            {label}
        </button>
    );
}
