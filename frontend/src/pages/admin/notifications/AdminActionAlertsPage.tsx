import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCheck, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    adminGetActionableAlerts,
    adminMarkActionableAlertsRead,
} from '../../../services/api';

interface AdminActionAlertsPageProps {
    noShell?: boolean;
}

const tone: Record<string, string> = {
    general: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    exam: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200',
    update: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-200',
};

export default function AdminActionAlertsPage(_props: AdminActionAlertsPageProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const alertsQuery = useQuery({
        queryKey: ['admin', 'actionable-alerts'],
        queryFn: async () => (await adminGetActionableAlerts({ page: 1, limit: 50 })).data,
    });

    const markAllMutation = useMutation({
        mutationFn: async () => (await adminMarkActionableAlertsRead()).data,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin', 'actionable-alerts'] });
        },
    });

    const markOneMutation = useMutation({
        mutationFn: async (id: string) => (await adminMarkActionableAlertsRead([id])).data,
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['admin', 'actionable-alerts'] });
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Failed to update alert'),
    });

    const unreadCount = useMemo(() => Number(alertsQuery.data?.unreadCount || 0), [alertsQuery.data?.unreadCount]);

    const openAlert = async (id: string, linkUrl?: string) => {
        await markOneMutation.mutateAsync(id);
        if (linkUrl) navigate(linkUrl);
    };

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="inline-flex items-center gap-2 text-xl font-bold">
                            <BellRing className="h-5 w-5" />
                            Actionable Alerts
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            New contacts, support activity, and approval requests for admins.
                        </p>
                    </div>
                    <button
                        onClick={() => markAllMutation.mutate()}
                        disabled={markAllMutation.isPending || unreadCount === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Mark all read
                    </button>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Unread alerts: {unreadCount}</p>
            </div>

            {alertsQuery.isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            ) : alertsQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    Failed to load admin alerts.
                </div>
            ) : (alertsQuery.data?.items || []).length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    No actionable alerts right now.
                </div>
            ) : (
                <div className="space-y-3">
                    {(alertsQuery.data?.items || []).map((item) => (
                        <button
                            key={item._id}
                            onClick={() => void openAlert(item._id, item.linkUrl)}
                            className={`w-full rounded-2xl border p-5 text-left transition hover:border-indigo-400 hover:shadow-sm ${
                                item.isRead
                                    ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                    : 'border-indigo-300/60 bg-indigo-50/60 dark:border-indigo-500/40 dark:bg-indigo-500/10'
                            }`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold">{item.title}</p>
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone[item.category] || tone.general}`}>
                                            {item.category}
                                        </span>
                                        {!item.isRead && (
                                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                                                New
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.message}</p>
                                </div>
                                <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                                    <p>{new Date(item.publishAt).toLocaleString()}</p>
                                    {item.linkUrl && (
                                        <span className="mt-2 inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300">
                                            Open
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
