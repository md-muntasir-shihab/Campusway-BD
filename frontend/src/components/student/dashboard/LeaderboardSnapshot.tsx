import { Trophy } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardLeaderboardEntry } from '../../../services/api';

interface Props {
    topPerformers: DashboardLeaderboardEntry[];
    myRank: number | null;
    myAvgPercentage: number | null;
}

export default function LeaderboardSnapshot({ topPerformers, myRank, myAvgPercentage }: Props) {
    if (topPerformers.length === 0) return null;

    return (
        <DashboardSection delay={0.24}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Leaderboard
                    </h3>
                    {myRank && (
                        <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-bold">
                            Your Rank: #{myRank}
                        </span>
                    )}
                </div>

                {myAvgPercentage !== null && (
                    <div className="mb-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/15 flex items-center justify-between">
                        <span className="text-xs text-indigo-700 dark:text-indigo-300">Your Average</span>
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Math.round(myAvgPercentage)}%</span>
                    </div>
                )}

                <div className="space-y-1.5">
                    {topPerformers.slice(0, 5).map(p => (
                        <div key={p.rank} className={`flex items-center gap-2.5 p-2 rounded-lg ${
                            p.isMe ? 'bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20' : 'bg-slate-50 dark:bg-slate-800/50'
                        }`}>
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                p.rank === 1 ? 'bg-amber-400 text-white' :
                                p.rank === 2 ? 'bg-slate-300 text-slate-700' :
                                p.rank === 3 ? 'bg-amber-600 text-white' :
                                'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                                {p.rank}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium truncate ${p.isMe ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {p.name} {p.isMe && <span className="text-[10px] opacity-60">(You)</span>}
                                </p>
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white shrink-0">{Math.round(p.avgPercentage)}%</span>
                        </div>
                    ))}
                </div>
            </div>
        </DashboardSection>
    );
}
