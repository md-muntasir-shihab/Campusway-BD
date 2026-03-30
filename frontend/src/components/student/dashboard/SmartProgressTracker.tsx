import { Activity, Shield, BookCheck, TrendingUp } from 'lucide-react';
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
    icon: React.ReactNode;
    detail: string;
    gradient: string;
}

function TrackBar({ label, value, icon, detail, gradient }: TrackBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-800/40 p-3 sm:p-4 transition hover:shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    {icon}
                    <span className="hidden xs:inline sm:inline">{label}</span>
                    <span className="xs:hidden sm:hidden">{label.split(' ')[0]}</span>
                </span>
                <span className={`text-sm font-bold ${
                    clamped >= 70 ? 'text-emerald-600 dark:text-emerald-400' : clamped >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-500'
                }`}>{Math.round(clamped)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${gradient}`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 truncate">{detail}</p>
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

    const overallScore = Math.round((profileScore + subHealth + examReadiness) / 3);

    return (
        <DashboardSection delay={0.08}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-500" />
                        Smart Progress
                    </h3>
                    <div className="flex items-center gap-2">
                        <TrendingUp className={`w-3.5 h-3.5 ${overallScore >= 60 ? 'text-emerald-500' : 'text-amber-500'}`} />
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Overall: {overallScore}%</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <TrackBar
                        label="Profile Readiness"
                        value={profileScore}
                        icon={<Shield className="w-3.5 h-3.5 text-indigo-400" />}
                        detail={profileScore >= header.profileCompletionThreshold ? 'Eligible for exams' : `Need ${header.profileCompletionThreshold}% to unlock exams`}
                        gradient="bg-gradient-to-r from-indigo-500 to-violet-500"
                    />
                    <TrackBar
                        label="Subscription Health"
                        value={subHealth}
                        icon={<Shield className="w-3.5 h-3.5 text-cyan-400" />}
                        detail={sub.isActive && sub.expiryDate
                            ? `Expires ${new Date(sub.expiryDate).toLocaleDateString()}`
                            : 'No active subscription'
                        }
                        gradient="bg-gradient-to-r from-cyan-500 to-blue-500"
                    />
                    <TrackBar
                        label="Exam Readiness"
                        value={examReadiness}
                        icon={<BookCheck className="w-3.5 h-3.5 text-violet-400" />}
                        detail={`${completed} completed · ${upcoming} remaining`}
                        gradient="bg-gradient-to-r from-violet-500 to-purple-500"
                    />
                </div>
            </div>
        </DashboardSection>
    );
}
