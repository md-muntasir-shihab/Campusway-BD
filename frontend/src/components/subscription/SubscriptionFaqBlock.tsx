import type { SubscriptionPlansPublicSettings } from '../../services/api';

type Props = {
    settings?: SubscriptionPlansPublicSettings;
};

export default function SubscriptionFaqBlock({ settings }: Props) {
    const items = settings?.pageFaqItems || [];
    if (!items.length || settings?.pageFaqEnabled === false) {
        return null;
    }

    return (
        <section className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-950/80">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">FAQ</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {settings?.pageFaqTitle || 'Frequently Asked Questions'}
            </h2>
            <div className="mt-5 space-y-3">
                {items.map((item) => (
                    <details
                        key={item.question}
                        className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                    >
                        <summary className="cursor-pointer list-none text-sm font-semibold text-slate-950 dark:text-white">
                            {item.question}
                        </summary>
                        <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.answer}</p>
                    </details>
                ))}
            </div>
        </section>
    );
}
