import { Check, Minus, X } from 'lucide-react';
import type { SubscriptionPlanPublic, SubscriptionPlansPublicSettings } from '../../services/api';

type Props = {
    plans: SubscriptionPlanPublic[];
    settings?: SubscriptionPlansPublicSettings;
};

function renderValue(plan: SubscriptionPlanPublic, key: string) {
    const value = (plan as unknown as Record<string, unknown>)[key];
    if (typeof value === 'boolean') {
        if (value) {
            return <Check className="mx-auto h-4 w-4 text-emerald-500" />;
        }
        return <X className="mx-auto h-4 w-4 text-rose-500" />;
    }
    if (value === null || value === undefined || value === '') {
        return <Minus className="mx-auto h-4 w-4 text-slate-400" />;
    }
    return <span className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">{String(value)}</span>;
}

export default function SubscriptionComparisonTable({ plans, settings }: Props) {
    const rows = settings?.comparisonRows || [];

    if (!plans.length || !rows.length || settings?.comparisonEnabled === false) {
        return null;
    }

    return (
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/80">
            <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Comparison</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                    {settings?.comparisonTitle || 'Compare Plans'}
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {settings?.comparisonSubtitle || 'See what changes as you upgrade.'}
                </p>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                        <tr>
                            <th className="sticky left-0 bg-white px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                                Feature
                            </th>
                            {plans.map((plan) => (
                                <th key={plan.id} className="px-4 py-3 text-center">
                                    <div className="rounded-2xl bg-slate-100 px-4 py-3 dark:bg-slate-900">
                                        <p className="text-sm font-semibold text-slate-950 dark:text-white">{plan.name}</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{plan.priceLabel || plan.validityLabel}</p>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr key={row.key}>
                                <td className="sticky left-0 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">
                                    {row.label}
                                </td>
                                {plans.map((plan) => (
                                    <td key={`${plan.id}-${row.key}`} className="rounded-2xl bg-slate-50 px-4 py-3 text-center dark:bg-slate-900/70">
                                        {renderValue(plan, row.key)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
