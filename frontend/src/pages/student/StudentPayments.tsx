import { Link } from 'react-router-dom';
import {
    AlertCircle,
    Calendar,
    CheckCircle2,
    Clock,
    CreditCard,
    ExternalLink,
    Loader2,
    ShieldCheck,
    XCircle,
} from 'lucide-react';
import { useMySubscription } from '../../hooks/useSubscriptionPlans';
import { useAuth } from '../../hooks/useAuth';

const STATUS_CONFIG: Record<string, {
    label: string;
    icon: typeof CheckCircle2;
    colorClass: string;
    bgClass: string;
    borderClass: string;
}> = {
    active: {
        label: 'Active',
        icon: CheckCircle2,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-500/10',
        borderClass: 'border-emerald-200 dark:border-emerald-500/20',
    },
    expired: {
        label: 'Expired',
        icon: XCircle,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-50 dark:bg-rose-500/10',
        borderClass: 'border-rose-200 dark:border-rose-500/20',
    },
    pending: {
        label: 'Pending Approval',
        icon: Clock,
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-500/10',
        borderClass: 'border-amber-200 dark:border-amber-500/20',
    },
    cancelled: {
        label: 'Cancelled',
        icon: XCircle,
        colorClass: 'text-slate-500 dark:text-slate-400',
        bgClass: 'bg-slate-50 dark:bg-slate-500/10',
        borderClass: 'border-slate-200 dark:border-slate-500/20',
    },
    suspended: {
        label: 'Suspended',
        icon: AlertCircle,
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-50 dark:bg-orange-500/10',
        borderClass: 'border-orange-200 dark:border-orange-500/20',
    },
};

function getStatusConfig(status?: string) {
    return STATUS_CONFIG[String(status || '').toLowerCase()] || STATUS_CONFIG.pending;
}

function formatDate(dateStr?: string | null): string {
    if (!dateStr) return '—';
    try {
        return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(dateStr));
    } catch {
        return '—';
    }
}

function daysRemaining(dateStr?: string | null): number | null {
    if (!dateStr) return null;
    try {
        const diff = new Date(dateStr).getTime() - Date.now();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
        return null;
    }
}

export default function StudentPayments() {
    const { user } = useAuth();
    const { data: subscription, isLoading, isError } = useMySubscription(Boolean(user));

    const status = subscription?.status;
    const statusCfg = getStatusConfig(status);
    const StatusIcon = statusCfg.icon;
    const planName = subscription?.plan?.name || subscription?.plan?.shortTitle || subscription?.planName;
    const expiresAt = subscription?.expiresAtUTC;
    const startedAt = subscription?.startAtUTC;
    const remaining = subscription?.daysLeft ?? daysRemaining(expiresAt);
    const hasPlan = Boolean(planName && status && status !== 'none');

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Payments & Subscription</h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            View your current subscription status and billing details.
                        </p>
                    </div>
                    <Link
                        to="/subscription-plans"
                        className="btn-primary inline-flex items-center gap-2 text-sm"
                    >
                        View Plans
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </div>
            </div>

            {/* Subscription Status Card */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-5">
                <div className="mb-4 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Subscription Status</h2>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
                        <span className="ml-2 text-sm text-slate-500">Loading subscription info...</span>
                    </div>
                ) : isError ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-500/20 dark:bg-rose-500/10">
                        <p className="text-sm text-rose-600 dark:text-rose-400">
                            Could not load subscription information. Please try again later.
                        </p>
                    </div>
                ) : hasPlan ? (
                    <div className="space-y-4">
                        {/* Status Badge + Plan Name */}
                        <div className={`flex flex-wrap items-center gap-3 rounded-xl border p-4 ${statusCfg.bgClass} ${statusCfg.borderClass}`}>
                            <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusCfg.colorClass}`} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{planName}</p>
                                <p className={`text-xs font-semibold ${statusCfg.colorClass}`}>{statusCfg.label}</p>
                            </div>
                            {remaining !== null && status === 'active' && (
                                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    remaining <= 7
                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                        : remaining <= 30
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                    {remaining === 0 ? 'Expires today' : `${remaining} day${remaining !== 1 ? 's' : ''} left`}
                                </span>
                            )}
                        </div>

                        {/* Details Grid */}
                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-3">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Started
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatDate(startedAt)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-3">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    Expires
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                    {formatDate(expiresAt)}
                                </p>
                            </div>
                            <div className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-3">
                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <CreditCard className="h-3.5 w-3.5" />
                                    Plan Type
                                </div>
                                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                                    {subscription?.plan?.planType === 'free' ? 'Free' : 'Paid'}
                                </p>
                            </div>
                        </div>

                        {/* Renewal CTA for expiring/expired plans */}
                        {(status === 'expired' || (remaining !== null && remaining <= 7 && status === 'active')) && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                                    {status === 'expired'
                                        ? 'Your subscription has expired. Renew to continue accessing premium features.'
                                        : 'Your subscription is expiring soon. Consider renewing to avoid interruption.'}
                                </p>
                                <Link
                                    to="/subscription-plans"
                                    className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
                                >
                                    Renew Subscription
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    /* No Subscription */
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-800/70">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                            <CreditCard className="h-6 w-6 text-indigo-500" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Active Subscription</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Browse our plans and choose one that fits your needs.
                        </p>
                        <Link
                            to="/subscription-plans"
                            className="btn-primary mt-3 inline-flex items-center gap-2 text-sm"
                        >
                            Explore Plans
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                )}
            </div>

            {/* Payment Info Card */}
            <div className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-5">
                <div className="mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-indigo-500" />
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Billing</h2>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Transactions and invoices will appear here once available.
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        For now, contact admin for payment confirmation and history.
                    </p>
                </div>
            </div>
        </div>
    );
}
