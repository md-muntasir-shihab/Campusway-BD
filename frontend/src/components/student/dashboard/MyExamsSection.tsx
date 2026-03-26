import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Clock, Lock, Play, XCircle, Trophy } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentUpcomingExam, StudentExamHistoryItem } from '../../../services/api';

interface Props {
    live: StudentUpcomingExam[];
    upcoming: StudentUpcomingExam[];
    missed: StudentUpcomingExam[];
    totalUpcoming: number;
    results: { recent: StudentExamHistoryItem[] };
}

type Tab = 'live' | 'upcoming' | 'completed' | 'missed';

export default function MyExamsSection({ live, upcoming, missed, totalUpcoming, results }: Props) {
    const [tab, setTab] = useState<Tab>(live.length > 0 ? 'live' : 'upcoming');

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'live', label: 'Live', count: live.length },
        { key: 'upcoming', label: 'Upcoming', count: totalUpcoming },
        { key: 'completed', label: 'Done', count: results.recent.length },
        { key: 'missed', label: 'Missed', count: missed.length },
    ];

    return (
        <DashboardSection delay={0.18}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-500" />
                        My Exams
                    </h3>
                    <Link to="/exams" className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        View all
                    </Link>
                </div>

                <div className="flex gap-1 mb-3 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                    {tabs.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition ${
                                tab === t.key
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                            }`}
                        >
                            {t.label}
                            {t.count > 0 && (
                                <span className={`ml-0.5 text-[10px] opacity-70 ${t.key === 'missed' && t.count > 0 ? 'text-rose-500 opacity-100 font-bold' : ''}`}>
                                    ({t.count})
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-2 max-h-[240px] overflow-y-auto scrollbar-thin">
                    {tab === 'live' && (
                        live.length > 0 ? live.map(e => <ExamRow key={e._id} exam={e} variant="live" />) : <EmptyState text="No live exams right now" />
                    )}
                    {tab === 'upcoming' && (
                        upcoming.length > 0 ? upcoming.slice(0, 6).map(e => <ExamRow key={e._id} exam={e} variant="upcoming" />) : <EmptyState text="No upcoming exams" />
                    )}
                    {tab === 'completed' && (
                        results.recent.length > 0
                            ? results.recent.slice(0, 6).map((r, i) => <CompletedRow key={r.resultId || i} result={r} />)
                            : <EmptyState text="No completed exams yet" />
                    )}
                    {tab === 'missed' && (
                        missed.length > 0 ? missed.map(e => <ExamRow key={e._id} exam={e} variant="missed" />) : <EmptyState text="No missed exams — great work!" />
                    )}
                </div>
            </div>
        </DashboardSection>
    );
}

function ExamRow({ exam, variant }: { exam: StudentUpcomingExam; variant: 'live' | 'upcoming' | 'missed' }) {
    const isLocked = !exam.canTakeExam && Boolean(exam.accessDeniedReason);
    const lockReason = exam.accessDeniedReason || '';

    return (
        <div className={`flex items-center justify-between p-2.5 rounded-lg border ${
            variant === 'live'
                ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5'
                : variant === 'missed'
                    ? 'border-rose-200 dark:border-rose-500/20 bg-rose-50/30 dark:bg-rose-500/5'
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
        }`}>
            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{exam.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                    {exam.endDate && variant === 'missed' && (
                        <span className="text-[10px] text-rose-500 dark:text-rose-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            Ended {new Date(exam.endDate).toLocaleDateString()}
                        </span>
                    )}
                    {exam.startDate && variant !== 'missed' && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(exam.startDate).toLocaleDateString()}
                        </span>
                    )}
                    {isLocked && variant !== 'missed' && (
                        <span className="text-[10px] text-rose-500 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" /> {lockReason || 'Locked'}
                        </span>
                    )}
                </div>
            </div>
            <div className="shrink-0 ml-2">
                {variant === 'missed' ? (
                    <span className="flex items-center gap-1 text-[10px] font-medium text-rose-500 bg-rose-100 dark:bg-rose-500/15 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Missed
                    </span>
                ) : variant === 'live' && !isLocked ? (
                    <Link to={`/exam/${exam._id}`} className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/15 px-2.5 py-1 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-500/25 transition">
                        <Play className="w-3 h-3" /> Start
                    </Link>
                ) : isLocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                )}
            </div>
        </div>
    );
}

function CompletedRow({ result }: { result: StudentExamHistoryItem }) {
    const pct = result.percentage ?? 0;
    const passed = pct >= 40;
    return (
        <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs gap-2">
            <div className="min-w-0 flex-1">
                <p className="text-slate-700 dark:text-slate-200 truncate font-medium">
                    {result.examTitle || `Exam #${(result.examId || '').slice(-6)}`}
                </p>
                {result.rank && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 mt-0.5">
                        <Trophy className="w-2.5 h-2.5 text-amber-400" /> Rank #{result.rank}
                    </span>
                )}
            </div>
            <div className="shrink-0 flex items-center gap-2">
                <span className={`font-bold ${passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                    {pct}%
                </span>
                {result.resultId && (
                    <Link to={`/results/${result.resultId}`} className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline">
                        View
                    </Link>
                )}
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-4">{text}</p>;
}
