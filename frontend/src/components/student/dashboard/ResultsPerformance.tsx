import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentExamHistoryItem, StudentBadgeItem, StudentExamHistoryResponse } from '../../../services/api';

interface Props {
    recent: StudentExamHistoryItem[];
    progress: StudentExamHistoryResponse['progress'];
    badges: StudentBadgeItem[];
}

export default function ResultsPerformance({ recent, progress, badges }: Props) {
    if (recent.length === 0) return null;

    const avgScore = progress?.avgScore || 0;
    const overallTrend = recent.length >= 2
        ? (recent[0].percentage ?? 0) - (recent[1].percentage ?? 0)
        : 0;

    return (
        <DashboardSection delay={0.2}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Results & Performance
                        {overallTrend !== 0 && (
                            <span className={`flex items-center gap-0.5 text-[10px] font-medium ml-1 ${overallTrend > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {overallTrend > 0
                                    ? <><TrendingUp className="w-3 h-3" /> +{overallTrend.toFixed(1)}%</>
                                    : <><TrendingDown className="w-3 h-3" /> {overallTrend.toFixed(1)}%</>
                                }
                            </span>
                        )}
                    </h3>
                    <Link to="/results" className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        View all
                    </Link>
                </div>

                {progress && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
                        <StatCard label="Total Exams" value={progress.totalExams} />
                        <StatCard label="Avg Score" value={`${Math.round(avgScore)}%`} />
                        <StatCard label="Best" value={`${Math.round(progress.bestScore || 0)}%`} />
                    </div>
                )}

                <div className="space-y-1.5 max-h-[180px] overflow-y-auto scrollbar-thin">
                    {recent.slice(0, 5).map((r, idx) => {
                        const pct = r.percentage ?? 0;
                        const trendVsAvg = pct - avgScore;
                        const trendVsPrev = idx < recent.length - 1 ? pct - (recent[idx + 1].percentage ?? 0) : null;
                        return (
                            <div key={r.resultId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                                <p className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0">{r.examTitle || 'Exam'}</p>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className={`text-xs font-bold ${pct >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        {pct}%
                                    </span>
                                    {trendVsPrev !== null && (
                                        <span className={`text-[10px] font-medium flex items-center ${trendVsPrev > 0 ? 'text-emerald-500' : trendVsPrev < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                            {trendVsPrev > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : trendVsPrev < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : '—'}
                                        </span>
                                    )}
                                    {trendVsAvg > 5 && <span className="text-[9px] text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1 py-0.5 rounded">↑ avg</span>}
                                    {trendVsAvg < -5 && <span className="text-[9px] text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-1 py-0.5 rounded">↓ avg</span>}
                                    {r.rank && <span className="text-[10px] text-slate-400">#{r.rank}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {badges.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1"><Award className="w-3 h-3" /> Badges</p>
                        <div className="flex flex-wrap gap-1.5">
                            {badges.map(b => (
                                <span key={b._id} className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20">
                                    🏅 {b.title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardSection>
    );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{value}</p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
        </div>
    );
}
