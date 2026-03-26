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

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="flex items-center gap-2 text-xl font-bold text-text dark:text-dark-text">
                        <CreditCard className="h-5 w-5 text-indigo-500" />
                        Subscriptions
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">{total} total subscriptions</p>
                </div>
                <button type="button" onClick={() => query.refetch()} className="btn-secondary" disabled={query.isFetching}>
                    <RefreshCw className={`mr-1.5 h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[200px] flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        aria-label="Search subscriptions"
                        title="Search subscriptions"
                        type="search"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
                        placeholder="Search by name, email, phone..."
                        className="admin-input pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-text-muted" />
                    <select
                        aria-label="Filter by status"
                        title="Filter by status"
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="admin-input w-auto"
                    >
                        <option value="">All Status</option>
                        {STATUS_OPTS.filter(Boolean).map((item) => (
                            <option key={item} value={item}>{item.charAt(0).toUpperCase() + item.slice(1)}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border dark:border-dark-border">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 text-left dark:bg-slate-800/50">
                            <th className="px-4 py-3 font-medium text-text-muted">Student</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Plan</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Start</th>
                            <th className="px-4 py-3 font-medium text-text-muted">End</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Timeline</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Auto-Renew</th>
                            <th className="px-4 py-3 font-medium text-text-muted">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-dark-border">
                        {query.isLoading ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">Loading subscriptions...</td></tr>
                        ) : subs.length === 0 ? (
                            <tr><td colSpan={8} className="px-4 py-8 text-center text-text-muted">
                                <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                                No subscriptions found.
                            </td></tr>
                        ) : subs.map((sub) => {
                            const timeline = getTimeline(sub.startDate, sub.endDate);
                            return (
                                <tr key={sub._id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-text dark:text-dark-text">{sub.userId?.full_name || 'N/A'}</p>
                                        <p className="text-xs text-text-muted">{sub.userId?.email || sub.userId?._id || 'N/A'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="text-text dark:text-dark-text">{sub.planId?.name || 'N/A'}</p>
                                        {sub.planId?.priceBDT ? (
                                            <p className="text-xs text-text-muted">৳{sub.planId.priceBDT}</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(sub.status)}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-text-muted">
                                        {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-text-muted">
                                        {sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {timeline ? (
                                            <div className="min-w-[150px]">
                                                <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        Active Window
                                                    </span>
                                                    <span>{timeline.label}</span>
                                                </div>
                                                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                                    <div
                                                        className={`h-full rounded-full ${sub.status === 'expired' ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                                        style={{ width: `${timeline.progress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-text-muted">No timeline</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-text-muted">
                                        {sub.autoRenew ? 'Yes' : 'No'}
                                    </td>
                                    <td className="px-4 py-3">
                                        {sub.userId?._id ? (
                                            <button
                                                type="button"
                                                onClick={() => navigate(adminUi(`student-management/students/${sub.userId?._id}`))}
                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300"
                                            >
                                                Profile
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                            </button>
                                        ) : (
                                            <span className="text-xs text-text-muted">Unavailable</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 ? (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-muted">Page {page} of {totalPages}</p>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page <= 1} className="btn-secondary text-sm" title="Previous page">
                            Previous
                        </button>
                        <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page >= totalPages} className="btn-secondary text-sm" title="Next page">
                            Next
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
