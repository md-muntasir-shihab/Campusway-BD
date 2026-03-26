import { useMemo, type ElementType } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BellRing, BookOpen, FileImage, FolderOpen, LayoutDashboard, Newspaper, Rss, Settings2, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { type ApiNews } from '../../services/api';
import AdminGuardShell from '../../components/admin/AdminGuardShell';
import AdminNewsDashboard from './sections/AdminNewsDashboard';
import AdminNewsItemsSection from './sections/AdminNewsItemsSection';
import AdminNewsSourcesSection from './sections/AdminNewsSourcesSection';
import AdminNewsMediaSection from './sections/AdminNewsMediaSection';
import AdminNewsExportsSection from './sections/AdminNewsExportsSection';
import AdminNewsAuditSection from './sections/AdminNewsAuditSection';
import { ADMIN_PATHS } from '../../routes/adminPaths';

type SectionKey =
    | 'dashboard'
    | 'articles'
    | 'sources'
    | 'settings-redirect'
    | 'media'
    | 'exports'
    | 'audit-logs';

type ArticleStatus = Extract<ApiNews['status'], 'pending_review' | 'duplicate_review' | 'draft' | 'published' | 'scheduled' | 'rejected'> | 'all';

interface RouteState {
    section: SectionKey;
    articleStatus: ArticleStatus;
    aiSelectedOnly: boolean;
    editorId?: string;
}

type NavItem = {
    key: string;
    label: string;
    path: string;
    icon: ElementType;
    summary: string;
};

const PRIMARY_SHORTCUTS: NavItem[] = [
    {
        key: 'pending',
        label: 'Items to Review',
        path: '/__cw_admin__/news/pending',
        icon: Newspaper,
        summary: 'Open the main review queue and work through incoming items.',
    },
    {
        key: 'published',
        label: 'Live News',
        path: '/__cw_admin__/news/published',
        icon: Newspaper,
        summary: 'See what is already live on the public site.',
    },
    {
        key: 'drafts',
        label: 'Saved Drafts',
        path: '/__cw_admin__/news/drafts',
        icon: FolderOpen,
        summary: 'Continue unfinished items and manual drafts.',
    },
    {
        key: 'sources',
        label: 'RSS Sources',
        path: '/__cw_admin__/news/sources',
        icon: Rss,
        summary: 'Manage feed sources, health, and fetch setup.',
    },
];

const SECONDARY_SHORTCUTS: NavItem[] = [
    {
        key: 'logs',
        label: 'Delivery Logs',
        path: ADMIN_PATHS.campaignsLogs,
        icon: BookOpen,
        summary: 'Review sent, failed, and retried delivery activity.',
    },
    {
        key: 'templates',
        label: 'Templates',
        path: ADMIN_PATHS.campaignsTemplates,
        icon: FileImage,
        summary: 'Adjust reusable email and SMS content blocks.',
    },
    {
        key: 'triggers',
        label: 'Triggers',
        path: ADMIN_PATHS.notificationTriggers,
        icon: BellRing,
        summary: 'Control publish-driven automations and auto-send rules.',
    },
    {
        key: 'settings',
        label: 'News Settings',
        path: '/__cw_admin__/settings/news',
        icon: Settings2,
        summary: 'Manage branding, defaults, and workflow settings.',
    },
];

const SUPPORT_LINKS: NavItem[] = [
    { key: 'overview', label: 'Overview', path: '/__cw_admin__/news/dashboard', icon: LayoutDashboard, summary: 'Operational snapshot.' },
    { key: 'ai-selected', label: 'AI Review', path: '/__cw_admin__/news/ai-selected', icon: Sparkles, summary: 'AI-flagged items.' },
    { key: 'media', label: 'Media Library', path: '/__cw_admin__/news/media', icon: FileImage, summary: 'News assets.' },
    { key: 'exports', label: 'Exports', path: '/__cw_admin__/news/exports', icon: ArrowRight, summary: 'Download content and logs.' },
    { key: 'audit', label: 'Audit Logs', path: '/__cw_admin__/news/audit-logs', icon: Shield, summary: 'Change history.' },
];

function normalizePath(pathname: string): string {
    return pathname.replace(/\/+$/, '');
}

const ARTICLE_TABS: Array<{
    status: Extract<ArticleStatus, 'pending_review' | 'duplicate_review' | 'draft' | 'published' | 'scheduled' | 'rejected'>;
    label: string;
    path: string;
}> = [
    { status: 'pending_review', label: 'Items to Review', path: '/__cw_admin__/news/pending' },
    { status: 'duplicate_review', label: 'Possible Duplicates', path: '/__cw_admin__/news/duplicates' },
    { status: 'draft', label: 'Saved Drafts', path: '/__cw_admin__/news/drafts' },
    { status: 'published', label: 'Live News', path: '/__cw_admin__/news/published' },
    { status: 'scheduled', label: 'Scheduled', path: '/__cw_admin__/news/scheduled' },
    { status: 'rejected', label: 'Rejected', path: '/__cw_admin__/news/rejected' },
];

function segmentToArticleStatus(segment: string | undefined): ArticleStatus {
    if (segment === 'pending' || segment === 'pending-review') return 'pending_review';
    if (segment === 'duplicates' || segment === 'duplicate') return 'duplicate_review';
    if (segment === 'drafts') return 'draft';
    if (segment === 'published') return 'published';
    if (segment === 'scheduled') return 'scheduled';
    if (segment === 'rejected') return 'rejected';
    return 'pending_review';
}

function parseRoute(pathname: string): RouteState {
    const segments = pathname
        .replace('/__cw_admin__/news', '')
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean);
    const first = segments[0] || '';
    const second = segments[1] || '';
    const third = segments[2] || '';

    if (!first) {
        return { section: 'articles', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'dashboard') {
        return { section: 'dashboard', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'articles') {
        if (second === 'editor' && third) {
            return { section: 'articles', articleStatus: 'all', aiSelectedOnly: false, editorId: third };
        }
        return { section: 'articles', articleStatus: segmentToArticleStatus(second), aiSelectedOnly: false };
    }

    if (first === 'editor' && second) {
        return { section: 'articles', articleStatus: 'all', aiSelectedOnly: false, editorId: second };
    }

    if (first === 'pending' || first === 'pending-review' || first === 'duplicates' || first === 'duplicate' || first === 'drafts' || first === 'published' || first === 'scheduled' || first === 'rejected') {
        return { section: 'articles', articleStatus: segmentToArticleStatus(first), aiSelectedOnly: false };
    }

    if (first === 'ai-selected') {
        return { section: 'articles', articleStatus: 'pending_review', aiSelectedOnly: true };
    }

    if (first === 'sources') {
        return { section: 'sources', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'settings' || first === 'appearance' || first === 'ai-settings' || first === 'share-templates') {
        return { section: 'settings-redirect', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'media' || first === 'media-library') {
        return { section: 'media', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'exports') {
        return { section: 'exports', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    if (first === 'audit-logs') {
        return { section: 'audit-logs', articleStatus: 'pending_review', aiSelectedOnly: false };
    }

    return { section: 'articles', articleStatus: 'pending_review', aiSelectedOnly: false };
}

function articleStatusLabel(status: ArticleStatus): string {
    if (status === 'all') return 'All Items';
    return ARTICLE_TABS.find((item) => item.status === status)?.label || 'Items to Review';
}

function getQuickLinkLabel(route: RouteState, pathname: string): string {
    const normalizedPath = normalizePath(pathname);
    const allItems = [...PRIMARY_SHORTCUTS, ...SECONDARY_SHORTCUTS, ...SUPPORT_LINKS];
    const activeItem = allItems.find((item) => normalizedPath === item.path || normalizedPath.startsWith(`${item.path}/`));
    if (activeItem) return activeItem.label;
    if (route.section === 'dashboard') return 'Overview';
    if (route.section === 'articles' && route.editorId) return 'Edit Article';
    if (route.section === 'articles' && route.aiSelectedOnly) return 'AI Review';
    if (route.section === 'articles') return articleStatusLabel(route.articleStatus);
    if (route.section === 'settings-redirect') return 'News Settings';
    return 'News Management';
}

function ShortcutGrid({ items, compact = false }: { items: NavItem[]; compact?: boolean }) {
    return (
        <div className={`grid gap-3 ${compact ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <Link
                        key={item.key}
                        to={item.path}
                        className="group flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-4 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/35 dark:hover:border-cyan-400/40 dark:hover:bg-slate-950/55"
                    >
                        <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-200">
                            <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">{item.label}</span>
                                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:text-cyan-500" />
                            </span>
                            <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{item.summary}</span>
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}

function CompactUtilityBar() {
    return (
        <div className="card-flat border border-cyan-500/15 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">
                        News Management
                    </span>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Review items first. Use overview, sources, logs, and settings only when you need them.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link to="/__cw_admin__/news/dashboard" className="btn-outline">Overview</Link>
                    <Link to="/__cw_admin__/news/sources" className="btn-outline">RSS Sources</Link>
                    <Link to="/__cw_admin__/news/ai-selected" className="btn-outline">AI Review</Link>
                    <Link to="/__cw_admin__/settings/news" className="btn-outline">News Settings</Link>
                </div>
            </div>
        </div>
    );
}

export default function AdminNewsConsole() {
    const { user, isLoading, isAuthenticated } = useAuth();
    const location = useLocation();

    const route = useMemo(() => parseRoute(location.pathname), [location.pathname]);
    const section = route.section;
    const articleStatus = route.articleStatus;

    const pageTitle = useMemo(() => {
        if (section === 'dashboard') return 'Overview';
        if (section === 'articles' && route.editorId) return 'Edit Article';
        if (section === 'articles' && route.aiSelectedOnly) return 'AI Review';
        if (section === 'articles') return articleStatusLabel(articleStatus);
        if (section === 'settings-redirect') return 'News Settings';
        return getQuickLinkLabel(route, location.pathname);
    }, [section, articleStatus, route, location.pathname]);

    if (!isLoading && (!isAuthenticated || !user || user.role === 'student')) {
        return <Navigate to="/__cw_admin__/login" replace />;
    }

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-text dark:bg-[#020b1c] dark:text-white">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            </div>
        );
    }

    function renderSection() {
        switch (section) {
            case 'dashboard':
                return <AdminNewsDashboard />;
            case 'articles':
                return (
                    <AdminNewsItemsSection
                        status={articleStatus}
                        title={route.editorId ? 'Edit Article' : route.aiSelectedOnly ? 'AI Review' : articleStatusLabel(articleStatus)}
                        aiSelectedOnly={route.aiSelectedOnly}
                        initialEditId={route.editorId}
                    />
                );
            case 'sources':
                return <AdminNewsSourcesSection />;
            case 'settings-redirect':
                return (
                    <div className="card-flat space-y-4 border border-cyan-500/20 p-5">
                        <div className="space-y-2">
                            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">News Settings</h2>
                            <p className="max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                                Appearance, AI defaults, share templates, and workflow settings live in one place.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link to="/__cw_admin__/settings/news" className="btn-primary">
                                Open News Settings
                            </Link>
                            <Link to="/__cw_admin__/news/sources" className="btn-outline">
                                RSS Sources
                            </Link>
                            <Link to="/__cw_admin__/news/pending" className="btn-outline">
                                Back to Review Queue
                            </Link>
                        </div>
                    </div>
                );
            case 'media':
                return <AdminNewsMediaSection />;
            case 'exports':
                return <AdminNewsExportsSection />;
            case 'audit-logs':
                return <AdminNewsAuditSection />;
            default:
                return <AdminNewsDashboard />;
        }
    }

    return (
        <AdminGuardShell title={pageTitle}>
            <div className="space-y-4">
                {section === 'dashboard' ? (
                    <div className="space-y-4">
                        <div className="card-flat border border-cyan-500/15 p-5">
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-2">
                                        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-200">
                                            News Management
                                        </span>
                                        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Start with the task you need</h2>
                                        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
                                            The review queue is primary. Overview, templates, logs, and settings are support tools.
                                        </p>
                                    </div>
                                    <Link to="/__cw_admin__/news/pending" className="btn-primary">
                                        Open Review Queue
                                    </Link>
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Primary shortcuts</h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The four places an editor is most likely to need first.</p>
                                    </div>
                                    <ShortcutGrid items={PRIMARY_SHORTCUTS} compact />
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Supporting tools</h3>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Keep delivery, automation, and settings close without crowding the main workflow.</p>
                                    </div>
                                    <ShortcutGrid items={SECONDARY_SHORTCUTS} compact />
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <Link to="/__cw_admin__/news/pending" className="rounded-full border border-slate-300/70 px-3 py-1.5 text-slate-600 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700/70 dark:text-slate-300 dark:hover:text-cyan-200">
                                        Items to Review
                                    </Link>
                                    <Link to="/__cw_admin__/news/published" className="rounded-full border border-slate-300/70 px-3 py-1.5 text-slate-600 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700/70 dark:text-slate-300 dark:hover:text-cyan-200">
                                        Live News
                                    </Link>
                                    <Link to="/__cw_admin__/news/sources" className="rounded-full border border-slate-300/70 px-3 py-1.5 text-slate-600 transition hover:border-cyan-500/50 hover:text-cyan-700 dark:border-slate-700/70 dark:text-slate-300 dark:hover:text-cyan-200">
                                        RSS Sources
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <motion.div
                            key="dashboard"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderSection()}
                        </motion.div>
                    </div>
                ) : (
                    <>
                        <CompactUtilityBar />
                        <motion.div
                            key={`${section}-${articleStatus}-${route.aiSelectedOnly ? 'ai' : 'normal'}-${route.editorId || 'none'}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {renderSection()}
                        </motion.div>
                    </>
                )}
            </div>
        </AdminGuardShell>
    );
}
