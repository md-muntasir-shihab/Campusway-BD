import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Newspaper, RefreshCw, Rss, TriangleAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { type ApiNews, adminNewsV2FetchNow, adminNewsV2GetDashboard } from '../../../services/api';

export default function AdminNewsDashboard() {
    const queryClient = useQueryClient();
    const dashboardQuery = useQuery({
        queryKey: ['adminNewsDashboard'],
        queryFn: async () => (await adminNewsV2GetDashboard()).data,
    });

    const fetchNowMutation = useMutation({
        mutationFn: async () => (await adminNewsV2FetchNow()).data,
        onSuccess: (data) => {
            toast.success(`Fetch completed: ${data.stats.createdCount} created`);
            queryClient.invalidateQueries({ queryKey: ['adminNewsDashboard'] });
            queryClient.invalidateQueries({ queryKey: ['adminNewsList'] });
            queryClient.invalidateQueries({ queryKey: ['newsList'] });
        },
        onError: (err: any) => toast.error(err?.response?.data?.message || 'Fetch failed'),
    });

    const cards = dashboardQuery.data?.cards || {
        pending: 0,
        published: 0,
        fetchFailed: 0,
        activeSources: 0,
    };
    const latestJobs = dashboardQuery.data?.latestJobs || [];
    const latestRssItems = dashboardQuery.data?.latestRssItems || [];

    return (
        <div className="space-y-5">
            <div className="card-flat border border-cyan-500/15 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-200">
                                Overview
                            </span>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Operational snapshot</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Queue health, fetch activity, and the newest incoming items in one place.
                        </p>
                    </div>
                    <button
                        onClick={() => fetchNowMutation.mutate()}
                        className="btn-primary inline-flex items-center gap-2"
                        disabled={fetchNowMutation.isPending}
                    >
                        <RefreshCw className={`h-4 w-4 ${fetchNowMutation.isPending ? 'animate-spin' : ''}`} />
                        Fetch Now
                    </button>
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pending" value={cards.pending} icon={<Newspaper className="h-4 w-4" />} />
                <StatCard label="Published" value={cards.published} icon={<Newspaper className="h-4 w-4" />} />
                <StatCard label="Failed Fetches" value={cards.fetchFailed} icon={<TriangleAlert className="h-4 w-4" />} />
                <StatCard label="Active Sources" value={cards.activeSources} icon={<Rss className="h-4 w-4" />} />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <section className="card-flat border border-cyan-500/20 p-4">
                    <div className="mb-3 space-y-1">
                        <h3 className="text-base font-semibold text-slate-950 dark:text-white">Recent fetch jobs</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">See what was fetched, created, skipped as duplicate, or failed.</p>
                    </div>
                    <div className="grid gap-3 md:hidden">
                        {latestJobs.length > 0 ? latestJobs.map((job: any) => (
                            <div key={job._id} className="rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3 dark:border-slate-800/70 dark:bg-slate-950/50">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-semibold capitalize text-slate-900 dark:text-white">{job.status || 'unknown'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(job.createdAt)}</p>
                                    </div>
                                    <span className="rounded-full border border-slate-300/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                                        fetch
                                    </span>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                    <MetaChip label="Fetched" value={job.fetchedCount || 0} />
                                    <MetaChip label="Created" value={job.createdCount || 0} />
                                    <MetaChip label="Duplicate" value={job.duplicateCount || 0} />
                                    <MetaChip label="Failed" value={job.failedCount || 0} />
                                </div>
                            </div>
                        )) : (
                            <EmptyState message="No fetch jobs yet." />
                        )}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-cyan-500/20 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
                                    <th className="py-2 pr-4">Status</th>
                                    <th className="py-2 pr-4">Fetched</th>
                                    <th className="py-2 pr-4">Created</th>
                                    <th className="py-2 pr-4">Duplicate</th>
                                    <th className="py-2 pr-4">Failed</th>
                                    <th className="py-2 pr-0">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latestJobs.length > 0 ? latestJobs.map((job: any) => (
                                    <tr key={job._id} className="border-b border-slate-200/80 dark:border-slate-800/60">
                                        <td className="py-2 pr-4 capitalize text-slate-900 dark:text-white">{job.status || 'unknown'}</td>
                                        <td className="py-2 pr-4">{job.fetchedCount || 0}</td>
                                        <td className="py-2 pr-4">{job.createdCount || 0}</td>
                                        <td className="py-2 pr-4">{job.duplicateCount || 0}</td>
                                        <td className="py-2 pr-4">{job.failedCount || 0}</td>
                                        <td className="py-2 pr-0 text-slate-500 dark:text-slate-400">{formatDate(job.createdAt)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td className="py-4 text-slate-500 dark:text-slate-400" colSpan={6}>
                                            No fetch jobs yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card-flat border border-cyan-500/20 p-4">
                    <div className="mb-3 space-y-1">
                        <h3 className="text-base font-semibold text-slate-950 dark:text-white">Latest incoming items</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">New RSS items, their source, and where they are currently routed.</p>
                    </div>
                    {latestRssItems.length === 0 ? (
                        <EmptyState message="No RSS items fetched yet." />
                    ) : (
                        <div className="space-y-3">
                            {latestRssItems.map((item: ApiNews) => (
                                <Link
                                    key={item._id}
                                    to={`/__cw_admin__/news/${statusToPath(item.status)}`}
                                    className="block rounded-2xl border border-slate-200/80 bg-slate-100/60 p-3 transition hover:border-cyan-400/50 hover:bg-white dark:border-slate-800/70 dark:bg-slate-950/45 dark:hover:bg-slate-950/65"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1 space-y-1.5">
                                            <p className="line-clamp-2 text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {item.sourceName || 'Unknown source'} · {formatDate(item.createdAt)}
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-slate-300/70 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700/70 dark:text-slate-300">
                                            {statusToLabel(item.status)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-100/70 p-4 dark:bg-slate-950/50">
            <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-200">
                <span className="text-sm font-medium">{label}</span>
                {icon}
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

function MetaChip({ label, value }: { label: string; value: number | string }) {
    return (
        <div className="rounded-xl border border-slate-200/70 bg-white/70 px-2.5 py-2 dark:border-slate-800/70 dark:bg-slate-950/50">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{value}</p>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <p className="rounded-2xl border border-dashed border-cyan-500/20 px-3 py-6 text-center text-sm text-slate-400">
            {message}
        </p>
    );
}

function formatDate(value?: string | Date | null): string {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleString();
}

function statusToLabel(status: ApiNews['status']): string {
    if (status === 'pending_review') return 'Items to Review';
    if (status === 'duplicate_review') return 'Possible Duplicates';
    if (status === 'draft') return 'Saved Drafts';
    if (status === 'published') return 'Live News';
    if (status === 'scheduled') return 'Scheduled';
    if (status === 'rejected') return 'Rejected';
    return 'Items to Review';
}

function statusToPath(status: ApiNews['status']): string {
    if (status === 'published') return 'published';
    if (status === 'scheduled') return 'scheduled';
    if (status === 'rejected') return 'rejected';
    if (status === 'duplicate_review') return 'duplicates';
    if (status === 'draft') return 'drafts';
    return 'pending';
}
