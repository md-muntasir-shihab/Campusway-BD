import { Activity, Shield, BookCheck } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse } from '../../../services/api';

interface Props {
    header: StudentDashboardFullResponse['header'];
    results: StudentDashboardFullResponse['results'];
    exams: StudentDashboardFullResponse['exams'];
}

interface TrackBarProps {
    label: string;
    value: number;
    color: string;
    icon: React.ReactNode;
    detail: string;
}

function TrackBar({ label, value, color, icon, detail }: TrackBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    {icon}
                    {label}
                </span>
                <span className={`text-xs font-bold ${color}`}>{Math.round(clamped)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${
                        clamped >= 70 ? 'bg-emerald-500' : clamped >= 40 ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{detail}</p>
        </div>
    );
}

export default function SmartProgressTracker({ header, results, exams }: Props) {
    const profileScore = Math.min(100, Math.max(0, header.profileCompletionPercentage));

    // Subscription health: days remaining as % of a 90-day window
    const sub = header.subscription;
    let subHealth = 0;
    if (sub.isActive && sub.expiryDate) {
        const daysLeft = Math.max(0, (new Date(sub.expiryDate).getTime() - Date.now()) / 86400000);
        subHealth = Math.min(100, (daysLeft / 90) * 100);
    }

    // Exam readiness: completed / (completed + upcoming)
    const completed = results.progress.totalExams;
    const upcoming = exams.upcoming.length + exams.live.length;
    const examReadiness = completed + upcoming > 0
        ? Math.round((completed / (completed + upcoming)) * 100)
        : completed > 0 ? 100 : 0;

    return (
        <DashboardSection delay={0.08}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Smart Progress
                </h3>

                <div className="space-y-4">
                    <TrackBar
                        label="Profile Readiness"
                        value={profileScore}
                        color={profileScore >= 70 ? 'text-emerald-600 dark:text-emerald-400' : profileScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}
                        icon={<Shield className="w-3.5 h-3.5 text-indigo-400" />}
                        detail={profileScore >= header.profileCompletionThreshold ? 'Eligible for exams' : `Need ${header.profileCompletionThreshold}% to unlock exams`}
                    />
                    <TrackBar
                        label="Subscription Health"
                        value={subHealth}
                        color={subHealth >= 50 ? 'text-emerald-600 dark:text-emerald-400' : subHealth > 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'}
                        icon={<Shield className="w-3.5 h-3.5 text-cyan-400" />}
                        detail={sub.isActive && sub.expiryDate
                            ? `Expires ${new Date(sub.expiryDate).toLocaleDateString()}`
                            : 'No active subscription'
                        }
                    />
                    <TrackBar
                        label="Exam Readiness"
                        value={examReadiness}
                        color={examReadiness >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}
                        icon={<BookCheck className="w-3.5 h-3.5 text-violet-400" />}
                        detail={`${completed} completed · ${upcoming} remaining`}
                    />
                </div>
            </div>
        </DashboardSection>
    );
}
