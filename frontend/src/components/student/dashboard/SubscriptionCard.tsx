import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Crown, Eye, ShieldCheck } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse } from '../../../services/api';
import { useSubscriptionPlanById } from '../../../hooks/useSubscriptionPlans';
import PlanDetailsDrawer from '../../subscription/PlanDetailsDrawer';
import {
    resolveSubscriptionPlanTarget,
    shouldOpenSubscriptionPlanTargetInNewTab,
} from '../../subscription/subscriptionAction';
import { isExternalUrl } from '../../../utils/url';

interface Props {
    subscription: StudentDashboardFullResponse['subscription'];
    renewalCtaText?: string;
    renewalCtaUrl?: string;
}

export default function SubscriptionCard({ subscription, renewalCtaText, renewalCtaUrl }: Props) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const lookupId = subscription.planSlug || subscription.planId || subscription.planCode || '';
    const planQuery = useSubscriptionPlanById(lookupId);
    const plan = planQuery.data;

    const expiryLabel = useMemo(() => {
        if (!subscription.expiryDate) return 'No expiry set';
        const expiryDate = new Date(subscription.expiryDate);
        if (Number.isNaN(expiryDate.getTime())) return 'Expiry unavailable';
        const daysLeft = subscription.daysLeft ?? Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
        if (daysLeft <= 0) return 'Expired';
        if (daysLeft <= 7) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
        return `Expires ${expiryDate.toLocaleDateString()}`;
    }, [subscription.daysLeft, subscription.expiryDate]);

    const actionUrl = renewalCtaUrl || (plan ? resolveSubscriptionPlanTarget(plan) : '/contact');
    const handlePlanAction = () => {
        if (!plan) {
            if (isExternalUrl(actionUrl)) {
                window.open(actionUrl, '_blank', 'noopener,noreferrer');
                return;
            }
            navigate(actionUrl);
            return;
        }
        const target = resolveSubscriptionPlanTarget(plan);
        if (shouldOpenSubscriptionPlanTargetInNewTab(plan)) {
            window.open(target, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(target);
    };

    return (
        <DashboardSection delay={0.12}>
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-700 px-5 py-5 text-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/14">
                                <Crown className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">My Subscription</p>
                                <h3 className="mt-2 text-2xl font-black tracking-tight">{subscription.planName || 'No Active Plan'}</h3>
                                <p className="mt-2 text-sm text-white/78">{expiryLabel}</p>
                            </div>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${subscription.isActive ? 'bg-emerald-400/18 text-emerald-100' : 'bg-rose-400/18 text-rose-100'}`}>
                            {subscription.isActive ? 'Active' : 'Renewal Needed'}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="rounded-[1.4rem] bg-slate-100 p-4 dark:bg-slate-950">
                        <div className="flex items-start gap-3">
                            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/12 text-cyan-700 dark:text-cyan-200">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-slate-950 dark:text-white">
                                    {plan?.highlightText || plan?.tagline || 'Open your plan details to review benefits, renewal notes, and support access.'}
                                </p>
                                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                                    {plan?.shortDescription || 'Your plan information is synced from the same subscription plan record used on the pricing page.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => setOpen(true)}
                            disabled={!plan && planQuery.isLoading}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-950"
                        >
                            <Eye className="h-4 w-4" />
                            View Details
                        </button>
                        <button
                            type="button"
                            onClick={handlePlanAction}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                        >
                            {renewalCtaText || (subscription.isActive ? 'Upgrade / Renew' : 'Choose a Plan')}
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <PlanDetailsDrawer
                open={open && Boolean(plan)}
                plan={plan || null}
                onClose={() => setOpen(false)}
                onDismissToContact={() => navigate('/contact')}
                onPrimaryAction={(item) => {
                    setOpen(false);
                    const target = resolveSubscriptionPlanTarget(item);
                    if (shouldOpenSubscriptionPlanTargetInNewTab(item)) {
                        window.open(target, '_blank', 'noopener,noreferrer');
                        return;
                    }
                    navigate(target);
                }}
            />
        </DashboardSection>
    );
}
