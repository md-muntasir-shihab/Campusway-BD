import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSubscriptionPlanById } from '../hooks/useSubscriptionPlans';
import {
    resolveSubscriptionPlanContactTarget,
    resolveSubscriptionPlanPrimaryLabel,
    resolveSubscriptionPlanTarget,
    shouldOpenSubscriptionPlanTargetInNewTab,
} from '../components/subscription/subscriptionAction';
import { getSubscriptionTheme } from '../components/subscription/subscriptionTheme';
import { isExternalUrl } from '../utils/url';

function paragraphBlocks(value: string): string[] {
    const source = String(value || '').trim();
    if (!source) return [];

    const explicitBlocks = source.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    if (explicitBlocks.length > 1) return explicitBlocks;

    const sentences = source.split(/(?<=[.!?\u0964])\s+/).map((item) => item.trim()).filter(Boolean);
    if (sentences.length <= 2) return [source];

    const blocks: string[] = [];
    for (let index = 0; index < sentences.length; index += 2) {
        blocks.push(sentences.slice(index, index + 2).join(' '));
    }
    return blocks;
}

export default function SubscriptionPlanDetailPage() {
    const navigate = useNavigate();
    const { planId } = useParams<{ planId: string }>();
    const planQuery = useSubscriptionPlanById(planId || '');
    const plan = planQuery.data;

    const openTarget = (target: string) => {
        if (isExternalUrl(target)) {
            window.open(target, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(target);
    };

    if (planQuery.isLoading) {
        return (
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="h-[28rem] animate-pulse rounded-[2rem] bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">Plan not found</h1>
                <Link to="/subscription-plans" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950">
                    Back to plans
                </Link>
            </div>
        );
    }

    const theme = getSubscriptionTheme(plan.themeKey);
    const summary = plan.tagline || plan.shortDescription || 'Subscription details are managed from the admin pricing center.';
    const descriptionBlocks = paragraphBlocks(plan.fullDescription || plan.shortDescription || '').slice(0, 2);
    const allFeatures = plan.fullFeatures?.length
        ? plan.fullFeatures
        : (plan.visibleFeatures?.length ? plan.visibleFeatures : (plan.features || []));
    const features = allFeatures.slice(0, 6);
    const extraFeatureCount = Math.max(allFeatures.length - features.length, 0);
    const priceText = plan.isFree || plan.priceBDT <= 0
        ? 'Free'
        : `${plan.currency || 'BDT'}${Number(plan.priceBDT || 0).toLocaleString()}`;
    const primaryLabel = resolveSubscriptionPlanPrimaryLabel(plan);
    const primaryTarget = resolveSubscriptionPlanTarget(plan);
    const contactTarget = resolveSubscriptionPlanContactTarget(plan);
    const showContactAction = Boolean(contactTarget) && contactTarget !== primaryTarget;
    const metaItems = [
        { label: 'Billing', value: plan.billingCycle === 'one_time' ? 'One time' : (plan.billingCycle || 'Monthly') },
        { label: 'Validity', value: plan.validityLabel || plan.durationLabel || 'Admin managed' },
        { label: 'Support', value: plan.supportLevel || 'Standard' },
    ];

    const handlePrimaryAction = () => {
        if (shouldOpenSubscriptionPlanTargetInNewTab(plan)) {
            window.open(primaryTarget, '_blank', 'noopener,noreferrer');
            return;
        }
        navigate(primaryTarget);
    };

    const handleContactAction = () => {
        openTarget(contactTarget);
    };

    return (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Link to="/subscription-plans" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to subscription plans
            </Link>

            <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/92 shadow-[0_28px_90px_rgba(2,6,23,0.28)]">
                <div className={`relative overflow-hidden border-b border-white/8 bg-gradient-to-br ${theme.shell} px-6 py-7 sm:px-8`}>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.06),rgba(2,6,23,0.46))]" />
                    <div className="relative">
                        <div className="flex flex-wrap items-center gap-2">
                            {plan.badgeText ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.badge}`}>{plan.badgeText}</span> : null}
                            {plan.isFeatured ? (
                                <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                                    Popular
                                </span>
                            ) : null}
                        </div>

                        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr),auto] lg:items-end">
                            <div className="max-w-3xl">
                                <h1 className="text-3xl font-black tracking-tight text-white sm:text-[2.7rem]">{plan.name}</h1>
                                <p className="mt-3 text-sm leading-7 text-white/80 sm:text-base">{summary}</p>
                            </div>

                            <div className="rounded-[1.4rem] border border-white/15 bg-slate-950/20 px-5 py-4 backdrop-blur-sm">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">Price</p>
                                <div className="mt-2 flex flex-wrap items-end gap-2">
                                    <p className="text-[2.2rem] font-black tracking-[-0.05em] text-white">{priceText}</p>
                                    <span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
                                        / {plan.billingCycle === 'one_time' ? 'one time' : (plan.billingCycle || 'monthly')}
                                    </span>
                                </div>
                                {plan.oldPrice ? (
                                    <p className="mt-1 text-xs text-white/45 line-through">
                                        {plan.currency || 'BDT'}{Number(plan.oldPrice).toLocaleString()}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap gap-2.5">
                            {metaItems.map((item) => (
                                <div key={item.label} className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-2">
                                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{item.label}</span>
                                    <span className="ml-2 text-sm font-medium text-white">{item.value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={handlePrimaryAction}
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition hover:scale-[1.01] ${theme.cta}`}
                            >
                                {primaryLabel}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                            {showContactAction ? (
                                <button
                                    type="button"
                                    onClick={handleContactAction}
                                    className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/[0.08] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                                >
                                    {(plan.contactCtaLabel && plan.contactCtaLabel !== primaryLabel) ? plan.contactCtaLabel : 'Contact admin'}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)]">
                    <section className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Overview</p>
                        <div className="mt-4 space-y-3">
                            {descriptionBlocks.length > 0 ? descriptionBlocks.map((block, index) => (
                                <p key={index} className={`${index === 0 ? 'text-base text-slate-100' : 'text-sm text-slate-300'} leading-8`}>
                                    {block}
                                </p>
                            )) : (
                                <p className="text-sm leading-8 text-slate-300">{summary}</p>
                            )}
                        </div>
                    </section>

                    <section className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Included features</p>
                            {extraFeatureCount > 0 ? (
                                <span className="text-xs font-medium text-slate-500">+{extraFeatureCount} more features included</span>
                            ) : null}
                        </div>
                        <div className="mt-4 grid gap-3">
                            {features.length > 0 ? features.map((feature) => (
                                <div key={feature} className="flex items-start gap-3 rounded-[1rem] border border-white/8 bg-slate-950/58 px-4 py-3">
                                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-300">
                                        <Check className="h-3.5 w-3.5" />
                                    </span>
                                    <span className="text-sm leading-6 text-slate-100">{feature}</span>
                                </div>
                            )) : (
                                <p className="text-sm text-slate-400">Core features will appear here once the admin pricing content is updated.</p>
                            )}
                        </div>
                    </section>
                </div>
            </section>
        </div>
    );
}
