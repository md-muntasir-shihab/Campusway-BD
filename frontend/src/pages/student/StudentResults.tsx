import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Trophy } from 'lucide-react';
import { getStudentMeResults } from '../../services/api';

export default function StudentResults() {
    const navigate = useNavigate();
    const resultsQuery = useQuery({
        queryKey: ['student-hub', 'results'],
        queryFn: async () => (await getStudentMeResults()).data,
    });

    if (resultsQuery.isLoading) {
        return <div className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse" />;
    }

    if (resultsQuery.isError) {
        return (
            <div className="rounded-2xl border border-rose-300/40 bg-rose-50/70 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                Failed to load results.
            </div>
        );
    }

    const items = resultsQuery.data?.items || [];
    const progress = resultsQuery.data?.progress;
    const points = Number(resultsQuery.data?.leaderboardPoints || 0);

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-5">
                <h1 className="text-2xl font-bold">Results & Ranking</h1>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/50 shadow-sm p-3">
                        <p className="text-xs text-slate-500">Total attempts</p>
                        <p className="font-bold text-lg">{progress?.totalExams || 0}</p>
                    </div>
                    <div className="rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/50 shadow-sm p-3">
                        <p className="text-xs text-slate-500">Average score</p>
                        <p className="font-bold text-lg">{Number(progress?.avgScore || 0).toFixed(2)}%</p>
                    </div>
                    <div className="rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/50 shadow-sm p-3">
                        <p className="text-xs text-slate-500">Best score</p>
                        <p className="font-bold text-lg">{Number(progress?.bestScore || 0).toFixed(2)}%</p>
                    </div>
                    <div className="rounded-xl bg-white/40 dark:bg-slate-800/40 border border-white/40 dark:border-slate-700/50 shadow-sm p-3">
                        <p className="text-xs text-slate-500 inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" /> Leaderboard points</p>
                        <p className="font-bold text-lg">{points.toFixed(0)}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-white/40 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-sm p-5">
                <h2 className="font-bold text-lg inline-flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Exam Results</h2>
                <div className="mt-4 space-y-3">
                    {items.length === 0 ? (
                        <p className="text-sm text-slate-500">No results available yet.</p>
                    ) : (
                        items.map((item) => (
                            <div key={item.resultId} className="rounded-xl border border-white/40 dark:border-slate-700/50 bg-white/40 dark:bg-slate-800/40 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors">
                                <div>
                                    <p className="font-semibold">{item.examTitle}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.submittedAt).toLocaleString()}</p>
                                </div>
                                <div className="text-sm">
                                    <p>{item.obtainedMarks}/{item.totalMarks}</p>
                                    <p className="font-semibold text-indigo-600 dark:text-indigo-300">{item.percentage.toFixed(2)}% {item.rank ? ` -  Rank ${item.rank}` : ''}</p>
                                </div>
                                <button
                                    onClick={() => navigate(`/results/${item.examId}`)}
                                    className="rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    View details
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}


