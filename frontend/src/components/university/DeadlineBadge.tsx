import type { UrgencyState } from '../../lib/apiClient';

const toneMap: Record<UrgencyState, string> = {
    open: 'text-emerald-700 bg-emerald-100 border-emerald-200 dark:text-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/35',
    closing_soon: 'text-amber-700 bg-amber-100 border-amber-200 dark:text-amber-200 dark:bg-amber-500/15 dark:border-amber-500/35',
    closed: 'text-rose-700 bg-rose-100 border-rose-200 dark:text-rose-200 dark:bg-rose-500/15 dark:border-rose-500/35',
    upcoming: 'text-sky-700 bg-sky-100 border-sky-200 dark:text-sky-200 dark:bg-sky-500/15 dark:border-sky-500/35',
    unknown: 'text-slate-500 bg-slate-100 border-slate-200 dark:text-slate-300 dark:bg-slate-800/70 dark:border-slate-700',
};

const labelMap: Record<UrgencyState, string> = {
    open: 'Open',
    closing_soon: 'Closing soon',
    closed: 'Closed',
    upcoming: 'Upcoming',
    unknown: 'N/A',
};

interface DeadlineBadgeProps {
    urgencyState: UrgencyState;
    className?: string;
}

export default function DeadlineBadge({ urgencyState, className = '' }: DeadlineBadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${toneMap[urgencyState]} ${className}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {labelMap[urgencyState]}
        </span>
    );
}
