import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Download, Loader2, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    AnalyticsOverview,
    AnalyticsSettings,
    adminExportEventLogs,
    adminGetAnalyticsOverview,
    adminGetAnalyticsSettings,
    adminUpdateAnalyticsSettings,
} from '../../services/api';
import { invalidateQueryGroup, invalidationGroups, queryKeys } from '../../lib/queryKeys';
import { downloadFile } from '../../utils/download';

const DEFAULT_SETTINGS: AnalyticsSettings = {
    enabled: true,
    trackAnonymous: true,
    retentionDays: 90,
    eventToggles: {
        universityApplyClick: true,
        universityOfficialClick: true,
        newsView: true,
        newsShare: true,
        resourceDownload: true,
        examViewed: true,
        examStarted: true,
        examSubmitted: true,
        subscriptionPlanView: true,
        subscriptionPlanClick: true,
        supportTicketCreated: true,
    },
};

const DEFAULT_OVERVIEW: AnalyticsOverview = {
    range: { from: '', to: '' },
    totals: { totalEvents: 0, uniqueSessions: 0, uniqueUsers: 0 },
    topEvents: [],
    dailySeries: [],
    funnel: { viewed: 0, started: 0, submitted: 0 },
};

export default function AnalyticsSettingsPanel() {
    const queryClient = useQueryClient();
    const [settings, setSettings] = useState<AnalyticsSettings>(DEFAULT_SETTINGS);
    const [filters, setFilters] = useState<{ from: string; to: string; module: string }>({ from: '', to: '', module: 'all' });

    const settingsQuery = useQuery({
        queryKey: queryKeys.analyticsSettings,
        queryFn: async () => (await adminGetAnalyticsSettings()).data.settings,
    });

    const overviewQuery = useQuery({
        queryKey: [...queryKeys.analyticsOverview, filters.from, filters.to, filters.module],
        queryFn: async () => (await adminGetAnalyticsOverview({
            from: filters.from || undefined,
            to: filters.to || undefined,
            module: filters.module,
        })).data,
    });

    useEffect(() => {
        if (!settingsQuery.data) return;
        setSettings({ ...DEFAULT_SETTINGS, ...(settingsQuery.data || {}) });
    }, [settingsQuery.data]);

    const saveMutation = useMutation({
        mutationFn: async () => adminUpdateAnalyticsSettings(settings),
        onSuccess: async (response) => {
            setSettings({ ...DEFAULT_SETTINGS, ...(response.data.settings || {}) });
            toast.success('Analytics settings saved');
            await queryClient.invalidateQueries({ queryKey: queryKeys.analyticsSettings });
            await invalidateQueryGroup(queryClient, invalidationGroups.analyticsSave);
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to save analytics settings');
        },
    });

    const exportEvents = async (format: 'csv' | 'xlsx') => {
        try {
            const response = await adminExportEventLogs({
                from: filters.from || undefined,
                to: filters.to || undefined,
                module: filters.module,
                format,
            });
            downloadFile(response, { filename: `analytics-events-${Date.now()}.${format}` });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Event export failed');
        }
    };

    const overview = overviewQuery.data || DEFAULT_OVERVIEW;
    const topEventRows = useMemo(() => overview.topEvents.slice(0, 10), [overview.topEvents]);

    if (settingsQuery.isLoading) {
        return (
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 text-sm cw-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading analytics settings...
                </div>
            </div>
        );
    }

    if (settingsQuery.isError) {
        return (
            <div className="card-flat p-6">
                <p className="text-sm text-rose-400">Unable to load analytics settings.</p>
                <button type="button" onClick={() => settingsQuery.refetch()} className="btn-outline mt-3 inline-flex items-center gap-2 text-sm">
                    <RefreshCw className="h-4 w-4" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <section className="card-flat p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-semibold cw-text">
                            <Activity className="h-5 w-5 text-primary" />
                            Analytics Settings
                        </h2>
                        <p className="mt-1 text-sm cw-muted">Control event tracking, retention, and export access.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void saveMutation.mutateAsync()}
                        disabled={saveMutation.isPending}
                        className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                        {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Enable Analytics</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.enabled}
                            onChange={(event) => setSettings((prev) => ({ ...prev, enabled: event.target.checked }))}
                        />
                    </label>
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Track Anonymous Sessions</span>
                        <input
                            type="checkbox"
                            className="ml-3 align-middle"
                            checked={settings.trackAnonymous}
                            onChange={(event) => setSettings((prev) => ({ ...prev, trackAnonymous: event.target.checked }))}
                        />
                    </label>
                    <label className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                        <span className="font-medium">Retention Days</span>
                        <input
                            type="number"
                            min={7}
                            max={3650}
                            value={settings.retentionDays}
                            onChange={(event) => setSettings((prev) => ({ ...prev, retentionDays: Math.max(7, Number(event.target.value) || 90) }))}
                            className="input-field mt-2"
                        />
                    </label>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {Object.entries(settings.eventToggles).map(([key, enabled]) => (
                        <label key={key} className="rounded-xl border cw-border cw-surface p-3 text-sm cw-text">
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <input
                                type="checkbox"
                                className="ml-3 align-middle"
                                checked={Boolean(enabled)}
                                onChange={(event) => setSettings((prev) => ({
                                    ...prev,
                                    eventToggles: {
                                        ...prev.eventToggles,
                                        [key]: event.target.checked,
                                    },
                                }))}
                            />
                        </label>
                    ))}
                </div>
            </section>

            <section className="card-flat p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold cw-text">Analytics Overview</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => void exportEvents('csv')} className="btn-outline inline-flex items-center gap-2 text-sm">
                            <Download className="h-4 w-4" />
                            Export CSV
                        </button>
                        <button type="button" onClick={() => void exportEvents('xlsx')} className="btn-outline inline-flex items-center gap-2 text-sm">
                            <Download className="h-4 w-4" />
                            Export XLSX
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                    <input type="date" className="input-field" value={filters.from} onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))} />
                    <input type="date" className="input-field" value={filters.to} onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))} />
                    <select className="input-field" value={filters.module} onChange={(event) => setFilters((prev) => ({ ...prev, module: event.target.value }))}>
                        <option value="all">All modules</option>
                        <option value="universities">Universities</option>
                        <option value="news">News</option>
                        <option value="resources">Resources</option>
                        <option value="exams">Exams</option>
                        <option value="subscription">Subscription</option>
                        <option value="support">Support</option>
                    </select>
                    <button
                        type="button"
                        onClick={() => overviewQuery.refetch()}
                        className="btn-outline inline-flex items-center justify-center gap-2 text-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>

                {overviewQuery.isLoading ? (
                    <div className="mt-4 rounded-xl border cw-border cw-surface p-4 text-sm cw-muted">Loading analytics overview...</div>
                ) : overviewQuery.isError ? (
                    <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                        Failed to load analytics overview.
                    </div>
                ) : (
                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                            <article className="rounded-xl border cw-border cw-surface p-4">
                                <p className="text-xs uppercase tracking-widest cw-muted">Total Events</p>
                                <p className="mt-1 text-2xl font-bold cw-text">{overview.totals.totalEvents.toLocaleString()}</p>
                            </article>
                            <article className="rounded-xl border cw-border cw-surface p-4">
                                <p className="text-xs uppercase tracking-widest cw-muted">Unique Sessions</p>
                                <p className="mt-1 text-2xl font-bold cw-text">{overview.totals.uniqueSessions.toLocaleString()}</p>
                            </article>
                            <article className="rounded-xl border cw-border cw-surface p-4">
                                <p className="text-xs uppercase tracking-widest cw-muted">Unique Users</p>
                                <p className="mt-1 text-2xl font-bold cw-text">{overview.totals.uniqueUsers.toLocaleString()}</p>
                            </article>
                        </div>

                        <div className="rounded-xl border cw-border cw-surface p-4">
                            <h4 className="text-sm font-semibold cw-text">Exam Funnel</h4>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                <p className="text-sm cw-muted">Viewed: <span className="font-semibold cw-text">{overview.funnel.viewed}</span></p>
                                <p className="text-sm cw-muted">Started: <span className="font-semibold cw-text">{overview.funnel.started}</span></p>
                                <p className="text-sm cw-muted">Submitted: <span className="font-semibold cw-text">{overview.funnel.submitted}</span></p>
                            </div>
                        </div>

                        <div className="rounded-xl border cw-border cw-surface p-4">
                            <h4 className="text-sm font-semibold cw-text">Top Events</h4>
                            {topEventRows.length === 0 ? (
                                <p className="mt-2 text-sm cw-muted">No analytics events in this range.</p>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    {topEventRows.map((row) => (
                                        <div key={row.eventName} className="flex items-center justify-between rounded-lg border cw-border px-3 py-2">
                                            <span className="text-sm cw-text">{row.eventName}</span>
                                            <span className="text-sm font-semibold cw-text">{row.count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
