import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Lock } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse } from '../../../services/api';

interface Props {
    header: StudentDashboardFullResponse['header'];
    gatingMessage?: string;
}

export default function ProfileCompletion({ header, gatingMessage }: Props) {
    const pct = Math.min(100, Math.max(0, header.profileCompletionPercentage));
    const threshold = Math.min(100, Math.max(1, header.profileCompletionThreshold || 60));
    const isLow = pct < threshold;
    const isBlocked = !header.isProfileEligible;
    const missingFields = [...new Set((header.missingFields || []).filter(Boolean))];

    return (
        <DashboardSection delay={0.1}>
            <div className={`rounded-2xl border p-4 transition-colors ${
                isBlocked
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/5'
                    : isLow
                        ? 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5'
                        : 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
            }`}>
                <div className="mb-2 flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                        {isBlocked
                            ? <Lock className="h-4 w-4 text-rose-500" />
                            : isLow
                                ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                                : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        Profile Completion
                    </h3>
                    <span className={`text-sm font-bold ${
                        isBlocked ? 'text-rose-600 dark:text-rose-400'
                            : isLow ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                    }`}>{pct}%</span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${
                            isBlocked ? 'bg-rose-400' : isLow ? 'bg-amber-400' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${pct}%` }}
                    />
                </div>

                {isBlocked && gatingMessage ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-rose-700 dark:text-rose-300">
                        <Lock className="h-3 w-3 shrink-0" />
                        {gatingMessage}
                    </p>
                ) : null}

                {!isBlocked && !isLow && pct >= 70 && missingFields.length === 0 ? (
                    <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        Great! Your profile meets the requirements.
                    </p>
                ) : null}

                {missingFields.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {missingFields.map((field) => (
                            <span
                                key={field}
                                className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/40 dark:bg-slate-800 dark:text-amber-300"
                            >
                                + {field}
                            </span>
                        ))}
                    </div>
                ) : null}

                <Link
                    to="/profile"
                    className={`inline-block mt-3 text-xs font-medium hover:underline ${
                        isBlocked ? 'text-rose-600 dark:text-rose-400'
                            : isLow ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                >
                    {isBlocked ? 'Unlock exam access ->' : 'Complete profile ->'}
                </Link>
            </div>
        </DashboardSection>
    );
}
