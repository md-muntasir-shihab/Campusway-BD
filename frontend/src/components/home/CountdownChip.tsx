import { Clock } from 'lucide-react';

interface CountdownChipProps {
  targetDate: string | undefined;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function daysUntil(dateStr: string | undefined): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function urgencyTone(days: number): 'danger' | 'warning' | 'success' | 'muted' {
  if (days <= 3) return 'danger';
  if (days <= 7) return 'warning';
  if (days > 900) return 'muted';
  return 'success';
}

const toneStyles: Record<ReturnType<typeof urgencyTone>, string> = {
  danger: 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 ring-1 ring-red-500/20',
  warning: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 ring-1 ring-amber-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500/20',
  muted: 'bg-gray-200/60 text-gray-500 dark:bg-gray-700/60 dark:text-gray-400 ring-1 ring-gray-300/30 dark:ring-gray-600/30',
};

const toneSolid: Record<ReturnType<typeof urgencyTone>, string> = {
  danger: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  success: 'bg-emerald-500 text-white',
  muted: 'bg-gray-400 text-white dark:bg-gray-600',
};

function formatCountdown(days: number): string {
  if (days === 0) return 'Today!';
  if (days === 1) return '1 day left';
  if (days > 900) return 'TBD';
  return `${days} days left`;
}

export default function CountdownChip({
  targetDate,
  className = '',
  showIcon = true,
  size = 'sm',
}: CountdownChipProps) {
  const days = daysUntil(targetDate);
  const tone = urgencyTone(days);
  const sizeClass = size === 'md' ? 'px-3 py-1 text-xs' : 'px-2.5 py-0.5 text-[11px]';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap ${sizeClass} ${toneStyles[tone]} ${
        tone === 'danger' ? 'animate-pulse' : ''
      } ${className}`}
    >
      {showIcon && <Clock className={size === 'md' ? 'w-3.5 h-3.5' : 'w-3 h-3'} />}
      {formatCountdown(days)}
    </span>
  );
}

/** Solid badge variant — used as floating badge overlay on cards */
export function CountdownBadge({
  targetDate,
  className = '',
}: {
  targetDate: string | undefined;
  className?: string;
}) {
  const days = daysUntil(targetDate);
  const tone = urgencyTone(days);
  return (
    <span
      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${toneSolid[tone]} ${
        tone === 'danger' ? 'animate-pulse' : ''
      } ${className}`}
    >
      <Clock className="w-3 h-3" />
      {formatCountdown(days)}
    </span>
  );
}

/** Progress bar showing how much time has elapsed */
export function DeadlineProgress({
  startDate,
  endDate,
  className = '',
}: {
  startDate?: string;
  endDate?: string;
  className?: string;
}) {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  const total = end - start;
  if (total <= 0) return null;
  const elapsed = Math.max(0, Math.min(now - start, total));
  const pct = Math.round((elapsed / total) * 100);
  const tone = urgencyTone(daysUntil(endDate));

  const barColor: Record<string, string> = {
    danger: 'bg-red-500',
    warning: 'bg-amber-500',
    success: 'bg-emerald-500',
    muted: 'bg-gray-400',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{pct}% elapsed</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
