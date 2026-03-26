import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import DOMPurify from 'dompurify';
import {
    ArrowLeft,
    CalendarDays,
    Copy,
    ExternalLink,
    Facebook,
    Globe2,
    Link as LinkIcon,
    MessageCircle,
    Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    ApiNews,
    ApiNewsPublicSettings,
    getPublicNewsSettings,
    getPublicNewsV2BySlug,
    trackAnalyticsEvent,
    trackPublicNewsV2Share,
} from '../services/api';
import InfoHint from '../components/ui/InfoHint';

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

function getArticleImage(news: ApiNews, settings: ApiNewsPublicSettings): string {
    const fallback =
        settings.defaultBannerUrl
        || settings.defaultThumbUrl
        || settings.appearance.thumbnailFallbackUrl
        || '/logo.png';
    const forceDefault = String(news.coverImageSource || news.coverSource || '').toLowerCase() === 'default';
    if (forceDefault) return fallback;
    return (
        news.coverImageUrl
        || news.coverImage
        || news.thumbnailImage
        || news.featuredImage
        || news.fallbackBanner
        || fallback
    );
}

function renderDate(value?: string): string {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString();
}

type ShareChannel = 'whatsapp' | 'facebook' | 'messenger' | 'telegram' | 'copy_link' | 'copy_text';

export default function SingleNewsPage() {
    const { slug = '' } = useParams<{ slug: string }>();

    const settingsQuery = useQuery({
        queryKey: ['newsSettings'],
        queryFn: async () => (await getPublicNewsSettings()).data,
    });

    const itemQuery = useQuery({
        queryKey: ['newsDetail', slug],
        queryFn: async () => (await getPublicNewsV2BySlug(slug)).data,
        enabled: Boolean(slug),
    });

    const settings = settingsQuery.data || DEFAULT_SETTINGS;
    const shareButtons = settings.shareButtons || DEFAULT_SETTINGS.shareButtons;
    const newsItem = itemQuery.data?.item;
    const relatedNews = itemQuery.data?.related || [];

    useEffect(() => {
        if (!newsItem) {
            document.title = 'News | CampusWay';
            return;
        }
        document.title = `${newsItem.seoTitle || newsItem.title} | CampusWay News`;
        void trackAnalyticsEvent({
            eventName: 'news_view',
            module: 'news',
            source: 'public',
            meta: { slug: newsItem.slug || slug, newsId: newsItem._id, source: newsItem.sourceName || '' },
        }).catch(() => undefined);
    }, [newsItem, slug]);

    async function handleShare(channel: ShareChannel) {
        if (!newsItem) return;
        try {
            const newsTarget = newsItem.slug || newsItem._id;
            const shareUrl = newsItem.shareUrl || `${window.location.origin}/news/${newsTarget}`;
            const channelKey = channel.replace('copy_', '') as 'whatsapp' | 'facebook' | 'messenger' | 'telegram';
            const shareText = newsItem.shareText?.[channelKey] || `${newsItem.title}\n${shareUrl}`;
            const links = {
                whatsapp: newsItem.shareLinks?.whatsapp || `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                facebook: newsItem.shareLinks?.facebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                messenger: newsItem.shareLinks?.messenger || `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}`,
                telegram: newsItem.shareLinks?.telegram || `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
            };

            if (channel === 'copy_link') {
                await navigator.clipboard.writeText(shareUrl);
                toast.success('Link copied');
            } else if (channel === 'copy_text') {
                await navigator.clipboard.writeText(shareText);
                toast.success('Share text copied');
            } else {
                window.open(links[channel], '_blank', 'noopener,noreferrer');
            }
        } catch {
            toast.error('Share failed');
            return;
        }

        try {
            const trackChannel = channel === 'copy_link' || channel === 'copy_text' ? 'copy' : channel;
            if (newsItem.slug) {
                await trackPublicNewsV2Share(newsItem.slug, trackChannel);
            }
            await trackAnalyticsEvent({
                eventName: 'news_share',
                module: 'news',
                source: 'public',
                meta: { slug: newsItem.slug || slug, newsId: newsItem._id, platform: trackChannel },
            });
        } catch {
            // Share tracking failures should not block user-facing share action.
        }
    }

    if (itemQuery.isLoading || settingsQuery.isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#060f23] px-4 py-12 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-6xl space-y-4">
                    <div className="skeleton h-12 w-64 rounded-xl" />
                    <div className="skeleton h-[320px] w-full rounded-3xl" />
                    <div className="skeleton h-10 w-full rounded-xl" />
                    <div className="skeleton h-64 w-full rounded-xl" />
                </div>
            </div>
        );
    }

    if (!newsItem) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-[#060f23] px-4 py-16 text-center sm:px-6 lg:px-8">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white">Article not found</h1>
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                    This article is not available or was unpublished.
                </p>
                <Link
                    to="/news"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to News
                </Link>
            </div>
        );
    }

    const image = getArticleImage(newsItem, settings);
    const sourceName = newsItem.sourceName || 'CampusWay';
    const sourceUrl = newsItem.sourceUrl || '#';
    const originalUrl = newsItem.originalArticleUrl || newsItem.originalLink || '';

    return (
        <div className="min-h-screen bg-slate-50 pb-14 dark:bg-[#060f23]">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                    <Link
                        to="/news"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20 dark:bg-slate-900 dark:text-slate-200"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to News
                    </Link>
                    <span className="text-xs text-slate-500 dark:text-slate-300">
                        {renderDate(newsItem.publishedAt || newsItem.publishDate || newsItem.createdAt)}
                    </span>
                </div>

                <motion.header
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24 }}
                    className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950/60"
                >
                    <img src={image} alt={newsItem.title} className="h-64 w-full object-cover sm:h-80 lg:h-[420px]" />
                    <div className="space-y-4 p-5 sm:p-7">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-300">
                            <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 font-medium text-cyan-700 dark:text-cyan-200">
                                {newsItem.category || 'General'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {renderDate(newsItem.publishedAt || newsItem.publishDate || newsItem.createdAt)}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black leading-tight text-slate-900 dark:text-white sm:text-4xl">
                            {newsItem.title}
                        </h1>
                        <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">
                            {newsItem.shortSummary || newsItem.shortDescription}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-200">
                            <a
                                href={sourceUrl}
                                target={sourceUrl !== '#' ? '_blank' : undefined}
                                rel={sourceUrl !== '#' ? 'noopener noreferrer' : undefined}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                            >
                                {settings.appearance.showSourceIcons ? (
                                    <img
                                        src={newsItem.sourceIconUrl || settings.defaultSourceIconUrl || image}
                                        alt={sourceName}
                                        className="h-4 w-4 rounded-full object-cover"
                                    />
                                ) : (
                                    <Globe2 className="h-4 w-4" />
                                )}
                                {sourceName}
                                {sourceUrl !== '#' ? <ExternalLink className="h-3.5 w-3.5" /> : null}
                            </a>
                            {originalUrl ? (
                                <a
                                    href={originalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                >
                                    <LinkIcon className="h-4 w-4" />
                                    Original Source
                                </a>
                            ) : (
                                <span className="inline-flex items-center gap-2 rounded-lg border border-slate-300/70 px-2.5 py-1.5 text-slate-400 dark:border-white/10 dark:text-slate-500">
                                    <LinkIcon className="h-4 w-4" />
                                    Original Source Unavailable
                                </span>
                            )}
                            {newsItem.aiUsed ? (
                                <InfoHint
                                    title={newsItem.aiMeta?.noHallucinationPassed ? 'AI Verified Draft' : 'AI Draft'}
                                    description={newsItem.aiMeta?.noHallucinationPassed
                                        ? 'This article passed strict AI verification with source citations.'
                                        : 'This article came from an AI draft workflow and may need admin review.'}
                                />
                            ) : null}
                        </div>
                        {newsItem.aiEnrichment?.studentFriendlyExplanation ? (
                            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
                                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-200">
                                    Student-Friendly Explanation
                                </p>
                                <p>{newsItem.aiEnrichment.studentFriendlyExplanation}</p>
                            </div>
                        ) : null}
                    </div>
                </motion.header>

                <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
                    <article className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60 sm:p-7">
                        {newsItem.fetchedFullText === false && originalUrl ? (
                            <div className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
                                Full article content could not be extracted.{' '}
                                <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">
                                    Open original source
                                </a>
                                .
                            </div>
                        ) : null}
                        {newsItem.aiEnrichment?.keyPoints?.length ? (
                            <div className="mb-5 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-4 dark:border-white/10 dark:bg-slate-900/50">
                                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                                    Key Points
                                </p>
                                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                                    {newsItem.aiEnrichment.keyPoints.slice(0, 6).map((point) => (
                                        <li key={`${newsItem._id}-${point}`} className="flex gap-2">
                                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        <div
                            className="prose prose-slate max-w-none dark:prose-invert prose-headings:font-bold prose-img:rounded-xl"
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(newsItem.fullContent || newsItem.content || '') }}
                        />

                        {newsItem.tags?.length ? (
                            <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
                                {newsItem.tags.map((item) => (
                                    <span
                                        key={`${newsItem._id}-${item}`}
                                        className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-200"
                                    >
                                        #{item}
                                    </span>
                                ))}
                            </div>
                        ) : null}
                    </article>

                    <aside className="space-y-4">
                        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Share</h2>
                                <InfoHint
                                    title="Share Options"
                                    description="Use quick share actions for WhatsApp, Facebook, Messenger, Telegram, or copy."
                                />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {shareButtons.whatsapp ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('whatsapp')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        WhatsApp
                                    </button>
                                ) : null}
                                {shareButtons.facebook ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('facebook')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <Facebook className="h-3.5 w-3.5" />
                                        Facebook
                                    </button>
                                ) : null}
                                {shareButtons.messenger ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('messenger')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <MessageCircle className="h-3.5 w-3.5" />
                                        Messenger
                                    </button>
                                ) : null}
                                {shareButtons.telegram ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('telegram')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        Telegram
                                    </button>
                                ) : null}
                                {shareButtons.copyLink ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('copy_link')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <LinkIcon className="h-3.5 w-3.5" />
                                        Copy Link
                                    </button>
                                ) : null}
                                {shareButtons.copyText ? (
                                    <button
                                        type="button"
                                        onClick={() => handleShare('copy_text')}
                                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300 px-2 py-2 text-xs font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/20"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                        Copy Text
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </aside>
                </div>

                {relatedNews.length > 0 ? (
                    <section className="mt-7 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Related Articles</h2>
                            <Link to="/news" className="text-sm font-semibold text-cyan-600 hover:text-cyan-500">
                                View all
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {relatedNews.slice(0, 5).map((item) => (
                                <Link
                                    key={item._id}
                                    to={`/news/${item.slug || item._id}`}
                                    className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white transition hover:-translate-y-0.5 hover:border-cyan-500/60 dark:border-white/10 dark:bg-slate-900/60"
                                >
                                    <img
                                        src={getArticleImage(item, settings)}
                                        alt={item.title}
                                        className="h-32 w-full object-cover"
                                        loading="lazy"
                                    />
                                    <div className="space-y-2 p-3">
                                        <h3 className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">
                                            {item.title}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-300">
                                            {renderDate(item.publishedAt || item.publishDate || item.createdAt)}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </div>
    );
}
