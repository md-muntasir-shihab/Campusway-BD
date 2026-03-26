import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye } from 'lucide-react';
import type { SubscriptionPlanPublic } from '../../../services/api';
import { resolveSubscriptionPlanPrimaryLabel } from '../../subscription/subscriptionAction';

interface HomeSubscriptionPreviewCardProps {
    plan: SubscriptionPlanPublic;
    onPrimaryAction: (plan: SubscriptionPlanPublic) => void;
    onViewDetails: (plan: SubscriptionPlanPublic) => void;
}

function formatPrice(plan: SubscriptionPlanPublic): string {
    if (plan.isFree || plan.priceBDT <= 0) return 'Free';
    const currency = plan.currency || 'BDT';
    return `${currency} ${Number(plan.priceBDT || 0).toLocaleString()}`;
}

function formatBillingCycle(plan: SubscriptionPlanPublic): string {
    if (plan.billingCycle === 'one_time') return 'One time';
    if (plan.billingCycle === 'yearly') return 'Yearly';
    if (plan.billingCycle === 'custom') return 'Custom';
    return 'Monthly';
}

export default function HomeSubscriptionPreviewCard({
    plan,
    onPrimaryAction,
    onViewDetails,
}: HomeSubscriptionPreviewCardProps) {
    const features = (plan.visibleFeatures?.length ? plan.visibleFeatures : plan.features || []).slice(0, 2);
    const summary = plan.tagline || plan.shortDescription || plan.highlightText || 'Access plan benefits from your dashboard.';
    const duration = plan.validityLabel || plan.durationLabel || `${plan.durationDays} days`;
    const primaryLabel = resolveSubscriptionPlanPrimaryLabel(plan);

    return (
        <motion.article
            whileHover={{ y: -3 }}
            className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition-shadow hover:shadow-[0_18px_40px_rgba(15,23,42,0.10)] dark:border-slate-800 dark:bg-slate-950"
            data-testid="home-subscription-preview-card"
        >
            <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            {plan.badgeText ? (
                                <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white dark:bg-white dark:text-slate-950">
                                    {plan.badgeText}
                                </span>
                            ) : null}
                            {plan.isFeatured ? (
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                                    Popular
                                </span>
                            ) : null}
                        </div>
                        <h3 className="mt-3 line-clamp-2 text-[1.05rem] font-bold leading-snug text-slate-950 dark:text-white">
                            {plan.name}
                        </h3>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                        {formatBillingCycle(plan)}
                    </span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {summary}
                </p>

                <div className="mt-4 rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Price
                            </p>
                            <p className="mt-1 text-lg font-black tracking-tight text-slate-950 dark:text-white">
                                {formatPrice(plan)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                Validity
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                {duration}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 space-y-2">
                    {features.length > 0 ? (
                        features.map((feature) => (
                            <div key={`${plan.id || plan._id}-${feature}`} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
                                    <Check className="h-3.5 w-3.5" />
                                </span>
                                <span className="line-clamp-2 leading-5">{feature}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Plan highlights will appear here.
                        </p>
                    )}
                </div>

                <div className="mt-auto pt-4">
                    <button
                        type="button"
                        onClick={() => onPrimaryAction(plan)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                    >
                        {primaryLabel}
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewDetails(plan)}
                        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[1rem] border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                    >
                        <Eye className="h-4 w-4" />
                        View Details
                    </button>
                </div>
            </div>
        </motion.article>
    );
}
