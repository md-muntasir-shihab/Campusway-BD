import { Calendar, AlertTriangle } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardImportantDate } from '../../../services/api';

interface Props {
    dates: DashboardImportantDate[];
}

const urgencyStyle = {
    critical: 'border-l-rose-500 bg-rose-50/50 dark:bg-rose-500/5',
    high: 'border-l-amber-500 bg-amber-50/50 dark:bg-amber-500/5',
    normal: 'border-l-indigo-500 bg-slate-50 dark:bg-slate-800/50',
};

export default function ImportantDates({ dates }: Props) {
    if (dates.length === 0) return null;

    return (
        <DashboardSection delay={0.34}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
                    <Calendar className="w-4 h-4 text-rose-400" />
                    Important Dates
                </h3>

                <div className="space-y-2">
                    {dates.slice(0, 5).map((d, i) => (
                        <div key={i} className={`flex items-center justify-between p-2.5 rounded-lg border-l-4 ${urgencyStyle[d.urgency]}`}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                {d.urgency === 'critical' && <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />}
                                <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{d.label}</p>
                            </div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 shrink-0 ml-2 font-medium">
                                {new Date(d.date).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardSection>
    );
}
