import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Clock3, CreditCard, Filter, RefreshCw, Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import { adminUi } from '../../../lib/appRoutes';

interface SubRow {
    _id: string;
    userId?: { _id: string; full_name?: string; email?: string; phone_number?: string; status?: string } | null;
    planId?: { _id: string; name?: string; code?: string; priceBDT?: number } | null;
    status: string;
    startDate?: string;
    endDate?: string;
    autoRenew?: boolean;
    createdAt?: string;
}

interface SubsResponse {
    data: SubRow[];
    total: number;
    page: number;
    limit: number;
}

const STATUS_OPTS = ['', 'active', 'expired', 'pending', 'cancelled'] as const;

export default function SubscriptionsV2Page() {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [status, setStatus] = useState('');
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');

    const query = useQuery<SubsResponse>({
        queryKey: ['admin-subscriptions-v2', page, status, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('limit', '20');
            if (status) params.set('status', status);
            if (search) params.set('q', search);
            const { data } = await api.get(`/admin/subscriptions-v2?${params}`);
            return data;
        },
    });

    const subs = query.data?.data ?? [];
    const total = query.data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    const statusBadge = (s: string) => {
        const map: Record<string, string> = {
            active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
            expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        };
        return map[s] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
    };

    const getTimeline = (startDate?: string, endDate?: string) => {
        if (!startDate || !endDate) return null;
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
        const now = Date.now();
        const progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
        const remainingMs = end - now;
        const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
        return {
            progress,
            label: remainingDays >= 0 ? `${remainingDays}d left` : 'Expired',
        };
    };

    const statActive = subs.filter((s) => s.status === 'active').length;
    const statExpired = subs.filter((s) => s.status === 'expired').length;
    const statPending = subs.filter((s) => s.status === 'pending').length;

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="rounded-[2rem] border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-[0_24px_70px_rgba(6,10,24,0.24)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/85">Subscription Management</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Subscriptions</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-300">
                            {total} total subscriptions across all plans. Use the search and filter options to drill into specific records.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => query.refetch()}
                        disabled={query.isFetching}
                        className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                {[
                    { label: 'Total', value: total, accent: false },
                    { label: 'Active', value: statActive, accent: true },
                    { label: 'Expired', value: statExpired, accent: false },
                    { label: 'Pending', value: statPending, accent: false },
                ].map((stat) => (
                    <div key={stat.label} className={`rounded-[1.5rem] border px-4 py-4 ${stat.accent ? 'border-cyan-200 bg-cyan-50 dark:border-cyan-900/70 dark:bg-cyan-950/30' : 'border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-950/70'}`}>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{stat.label}</p>
                        <p className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-wrap items-center gap-3 rounded-[1.5rem] border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70">
                <div className="relative min-w-[220px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        aria-label="Search subscriptions"
                        title="Search subscriptions"
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                        placeholder="Search by name, email, phone..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-cyan-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:focus:border-cyan-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        aria-label="Filter by status"
                        title="Filter by status"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-cyan-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                    >
                        <option value="">All Status</option>
                        {STATUS_OPTS.filter(Boolean).map((item) => (
                            <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto rounded-[1.75rem] border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/80 text-left dark:border-slate-800 dark:bg-slate-900/50">
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Student</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Plan</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Status</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Start</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">End</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Timeline</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Renew</th>
                            <th className="px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
                        {query.isLoading ? (
                            <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">Loading subscriptions...</td></tr>
                        ) : subs.length === 0 ? (
                            <tr><td colSpan={8} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                                <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                No subscriptions found.
                            </td></tr>
                        ) : subs.map((sub) => {
                            const timeline = getTimeline(sub.startDate, sub.endDate);
                            return (
                                <tr key={sub._id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/20">
                                    <td className="px-5 py-4">
                                        <p className="font-semibold text-slate-900 dark:text-white">{sub.userId?.full_name || 'N/A'}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{sub.userId?.email || sub.userId?._id || 'N/A'}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-medium text-slate-900 dark:text-white">{sub.planId?.name || 'N/A'}</p>
                                        {sub.planId?.priceBDT ? (
                                            <p className="text-xs text-slate-500 dark:text-slate-400">৳{sub.planId.priceBDT}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(sub.status)}`}>
                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {timeline ? (
                                            <div className="min-w-[150px]">
                                                <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        Active Window
                                                    </span>
                                                    <span className="font-semibold">{timeline.label}</span>
                                                </div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${sub.status === 'expired' ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`}
                                                        style={{ width: `${timeline.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-400">No timeline</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${sub.autoRenew ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                                            {sub.autoRenew ? 'Yes' : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        {sub.userId?._id ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(adminUi(`student-management/students/${sub.userId?._id}`))}
                                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-cyan-500/40"
                                            >
                                                Profile
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-slate-400">Unavailable</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 ? (
                <div className="flex items-center justify-between rounded-[1.5rem] border border-slate-200/80 bg-white/90 px-5 py-3 shadow-sm dark:border-slate-800/80 dark:bg-slate-950/70">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page <= 1}
                            className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                            title="Previous page"
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page >= totalPages}
                            className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
                            title="Next page"
                        >
                            Next
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
