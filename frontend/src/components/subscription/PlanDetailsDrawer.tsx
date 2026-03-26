import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, X } from 'lucide-react';
import type { SubscriptionPlanPublic } from '../../services/api';
import { resolveSubscriptionPlanPrimaryLabel } from './subscriptionAction';
import { getSubscriptionTheme } from './subscriptionTheme';

type Props = {
    open: boolean;
    plan: SubscriptionPlanPublic | null;
    onClose: () => void;
    onDismissToContact?: (plan: SubscriptionPlanPublic) => void;
    onPrimaryAction: (plan: SubscriptionPlanPublic) => void;
};

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

function MetaPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</span>
            <span className="ml-2 text-sm font-medium text-slate-100">{value}</span>
        </div>
    );
}

export default function PlanDetailsDrawer({ open, plan, onClose, onDismissToContact, onPrimaryAction }: Props) {
    const theme = getSubscriptionTheme(plan?.themeKey);
    const descriptionBlocks = paragraphBlocks(plan?.fullDescription || plan?.shortDescription || '').slice(0, 2);
    const visibleFeatures = plan?.fullFeatures?.length
        ? plan.fullFeatures
        : (plan?.visibleFeatures?.length ? plan.visibleFeatures : (plan?.features || []));
    const featurePreview = visibleFeatures.slice(0, 6);
    const remainingFeatureCount = Math.max(visibleFeatures.length - featurePreview.length, 0);
    const primaryLabel = plan ? resolveSubscriptionPlanPrimaryLabel(plan) : 'Continue';
    const dismissToContact = onDismissToContact || onClose;
    const priceText = plan
        ? (plan.isFree || plan.priceBDT <= 0
            ? 'Free'
            : `${plan.currency || 'BDT'}${Number(plan.priceBDT || 0).toLocaleString()}`)
        : '';
    const metaItems = plan ? [
        { label: 'Billing', value: plan.billingCycle === 'one_time' ? 'One time' : (plan.billingCycle || 'Monthly') },
        { label: 'Validity', value: plan.validityLabel || plan.durationLabel || 'Admin managed' },
        { label: 'Support', value: plan.supportLevel || 'Standard' },
    ] : [];

    return (
        <AnimatePresence>
            {open && plan ? (
                <motion.div
                    className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/74 p-4 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.section
                        initial={{ opacity: 0, y: 20, scale: 0.985 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.985 }}
                        transition={{ duration: 0.2 }}
                        onClick={(event) => event.stopPropagation()}
                        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.9rem] border border-white/10 bg-slate-950/96 shadow-[0_40px_140px_rgba(2,6,23,0.7)]"
                    >
                        <div className={`absolute inset-x-0 top-0 h-36 bg-gradient-to-br ${theme.shell} opacity-75`} />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_24%),linear-gradient(180deg,rgba(15,23,42,0.08),rgba(2,6,23,0.74)_34%,rgba(2,6,23,0.98)_74%)]" />

                        <button
                            type="button"
                            onClick={() => dismissToContact(plan)}
                            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-slate-950/55 text-slate-100 transition hover:bg-white/10"
                            aria-label="Go to contact"
                            title="Go to contact"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <div className="relative border-b border-white/8 px-5 pb-5 pt-6 sm:px-6">
                            <div className="flex flex-wrap items-center gap-2">
                                {plan.badgeText ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${theme.badge}`}>{plan.badgeText}</span> : null}
                                {plan.isFeatured ? (
                                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                                        Popular
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-4 space-y-3">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black tracking-tight text-white sm:text-[2.35rem]">{plan.name}</h2>
                                    <p className="max-w-2xl text-sm leading-7 text-slate-300">
                                        {plan.tagline || plan.shortDescription || 'Plan details are managed from the admin pricing center.'}
                                    </p>
                                </div>

                                <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.045] px-4 py-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Price</p>
                                    <div className="mt-2 flex flex-wrap items-end gap-2">
                                        <p className="text-[2.15rem] font-black tracking-[-0.05em] text-white">{priceText}</p>
                                        <span className="pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                            / {plan.billingCycle === 'one_time' ? 'one time' : (plan.billingCycle || 'monthly')}
                                        </span>
                                    </div>
                                    {plan.oldPrice ? (
                                        <p className="mt-1 text-xs text-slate-500 line-through">
                                            {plan.currency || 'BDT'}{Number(plan.oldPrice).toLocaleString()}
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2.5">
                                {metaItems.map((item) => (
                                    <MetaPill key={item.label} label={item.label} value={item.value} />
                                ))}
                            </div>
                        </div>

                        <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                            <div className="space-y-5">
                                <section className="rounded-[1.35rem] border border-white/10 bg-slate-950/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Overview</h3>
                                    <div className="mt-3 space-y-3">
                                        {descriptionBlocks.length > 0 ? descriptionBlocks.map((block, index) => (
                                            <p
                                                key={index}
                                                className={`${index === 0 ? 'text-base text-slate-100' : 'text-[15px] text-slate-300'} max-w-3xl leading-[1.9] tracking-[0.01em]`}
                                            >
                                                {block}
                                            </p>
                                        )) : (
                                            <p className="text-[15px] leading-[1.9] tracking-[0.01em] text-slate-300">
                                                Full plan description will be managed from admin.
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-[1.35rem] border border-white/10 bg-slate-950/72 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-5">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <h3 className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">Included Features</h3>
                                        {remainingFeatureCount > 0 ? (
                                            <span className="text-xs font-medium text-slate-500">+{remainingFeatureCount} more included after activation</span>
                                        ) : null}
                                    </div>
                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                        {featurePreview.length > 0 ? featurePreview.map((feature) => (
                                            <div key={`${plan.id || plan._id}-${feature}`} className="flex items-start gap-3 rounded-[0.95rem] border border-white/8 bg-white/[0.035] px-3.5 py-3">
                                                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/14 text-emerald-300">
                                                    <Check className="h-3.5 w-3.5" />
                                                </span>
                                                <span className="text-sm leading-6 text-slate-100">{feature}</span>
                                            </div>
                                        )) : (
                                            <p className="text-sm text-slate-400">No detailed features added yet.</p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </div>

                        <div className="relative border-t border-white/8 bg-slate-950/96 px-5 py-4 sm:px-6">
                            <div className="flex flex-col gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.045] p-4 sm:flex-row sm:items-center">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-white">{primaryLabel}</p>
                                    <p className="text-xs leading-5 text-slate-400">
                                        Only the essential plan details are shown here. You can contact the admin team anytime for the full activation flow.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onPrimaryAction(plan)}
                                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:scale-[1.01] ${theme.cta}`}
                                >
                                    {primaryLabel}
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-slate-200"
                            >
                                Back to plans
                            </button>
                        </div>
                    </motion.section>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}
