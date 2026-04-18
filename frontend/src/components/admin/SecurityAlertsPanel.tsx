import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    BellRing as BellAlertIcon,
    CheckCircle as CheckCircleIcon,
    AlertTriangle as AlertTriangleIcon,
    Info as InfoIcon,
    RotateCcw as ArrowPathIcon,
    Shield as ShieldIcon,
    Lock as LockIcon,
    Key as KeyIcon,
    Users as UsersIcon,
} from 'lucide-react';
import {
    adminGetAntiCheatAlerts,
    adminAcknowledgeAntiCheatAlert,
    type AntiCheatAlertItem,
} from '../../services/api';

/* ── Alert type display config ── */

const ALERT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType }> = {
    auth_failure_spike: { label: 'Auth Failure Spike', icon: KeyIcon },
    otp_abuse: { label: 'OTP Abuse', icon: LockIcon },
    suspicious_admin_activity: { label: 'Suspicious Admin Activity', icon: UsersIcon },
    anti_cheat_spike: { label: 'Anti-Cheat Spike', icon: ShieldIcon },
};

const SEVERITY_CONFIG: Record<string, { badge: string; icon: React.ElementType }> = {
    critical: { badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangleIcon },
    warning: { badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: AlertTriangleIcon },
    info: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: InfoIcon },
};

/* ── Component ── */

export default function SecurityAlertsPanel() {
    const [page, setPage] = useState(1);
    const [alertTypeFilter, setAlertTypeFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['antiCheatAlerts', page, alertTypeFilter, severityFilter],
        queryFn: () =>
            adminGetAntiCheatAlerts({
                page,
                limit: 20,
                alertType: alertTypeFilter || undefined,
                severity: severityFilter || undefined,
            }).then((r) => r.data),
        staleTime: 15_000,
    });

    const acknowledgeMutation = useMutation({
        mutationFn: adminAcknowledgeAntiCheatAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['antiCheatAlerts'] });
        },
    });

    const items: AntiCheatAlertItem[] = data?.items ?? [];
    const unacknowledgedCount = items.filter((a) => !a.acknowledged).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <ArrowPathIcon className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                        <BellAlertIcon className="w-5 h-5" /> Security Alerts
                        {unacknowledgedCount > 0 && (
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                                {unacknowledgedCount}
                            </span>
                        )}
                    </h3>
                </div>
                <div className="flex gap-2">
                    <select
                        title="Filter by alert type"
                        aria-label="Filter by alert type"
                        value={alertTypeFilter}
                        onChange={(e) => { setAlertTypeFilter(e.target.value); setPage(1); }}
                        className="text-xs border rounded-lg px-2 py-1.5 bg-slate-950/70 border-white/10 text-slate-200"
                    >
                        <option value="">All Types</option>
                        <option value="auth_failure_spike">Auth Failure Spike</option>
                        <option value="otp_abuse">OTP Abuse</option>
                        <option value="suspicious_admin_activity">Suspicious Admin</option>
                        <option value="anti_cheat_spike">Anti-Cheat Spike</option>
                    </select>
                    <select
                        title="Filter by severity"
                        aria-label="Filter by severity"
                        value={severityFilter}
                        onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                        className="text-xs border rounded-lg px-2 py-1.5 bg-slate-950/70 border-white/10 text-slate-200"
                    >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/6 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>

            {/* Alerts List */}
            {items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                    No unacknowledged alerts
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((alert) => {
                        const typeConfig = ALERT_TYPE_CONFIG[alert.alertType] || { label: alert.alertType, icon: BellAlertIcon };
                        const sevConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                        const TypeIcon = typeConfig.icon;

                        return (
                            <motion.div
                                key={alert._id}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`rounded-xl border p-4 transition-colors ${alert.acknowledged
                                        ? 'bg-gray-50/5 border-gray-200 dark:border-gray-700 opacity-60'
                                        : 'bg-white/5 border-gray-200 dark:border-gray-600'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <TypeIcon className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                                    {typeConfig.label}
                                                </span>
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${sevConfig.badge}`}>
                                                    {alert.severity}
                                                </span>
                                                {alert.acknowledged && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Acknowledged
                                                    </span>
                                                )}
                                            </div>

                                            {/* Details */}
                                            {alert.details && Object.keys(alert.details).length > 0 && (
                                                <div className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-mono bg-black/10 dark:bg-black/20 rounded-lg p-2 overflow-x-auto max-h-20 overflow-y-auto">
                                                    {JSON.stringify(alert.details, null, 2)}
                                                </div>
                                            )}

                                            <p className="mt-1 text-[10px] text-gray-400">
                                                {new Date(alert.createdAt).toLocaleString()}
                                                {alert.acknowledgedAt && (
                                                    <> · Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}</>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Acknowledge button */}
                                    {!alert.acknowledged && (
                                        <button
                                            onClick={() => acknowledgeMutation.mutate(alert._id)}
                                            disabled={acknowledgeMutation.isPending}
                                            className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                                            title="Acknowledge alert"
                                        >
                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                            Acknowledge
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {data && data.pages > 1 && (
                <div className="flex justify-center gap-2">
                    <button
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="px-3 py-1 text-xs rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-40"
                        title="Previous page"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-gray-500 self-center">{page} / {data.pages}</span>
                    <button
                        disabled={page >= data.pages}
                        onClick={() => setPage((p) => p + 1)}
                        className="px-3 py-1 text-xs rounded-lg border bg-white dark:bg-gray-800 dark:border-gray-600 disabled:opacity-40"
                        title="Next page"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
