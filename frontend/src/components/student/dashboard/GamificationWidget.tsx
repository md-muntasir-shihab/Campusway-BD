import { Flame, Star, Trophy, Lock } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { StudentDashboardFullResponse, StudentBadgeItem } from '../../../services/api';

interface Props {
    results: StudentDashboardFullResponse['results'];
}

function computeStreak(recent: StudentDashboardFullResponse['results']['recent']): number {
    if (recent.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const seen = new Set<string>();
    for (const r of recent) {
        const d = new Date(((r as unknown) as Record<string, unknown>).submittedAt as string || '');
        if (!isNaN(d.getTime())) {
            d.setHours(0, 0, 0, 0);
            seen.add(d.toISOString());
        }
    }
    let streak = 0;
    const cursor = new Date(today);
    while (seen.has(cursor.toISOString())) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

const LOCKED_BADGES = [
    { title: 'Speed Demon', icon: '⚡', desc: 'Finish 5 exams in record time' },
    { title: 'Perfectionist', icon: '💯', desc: 'Score 100% on any exam' },
    { title: 'Consistent', icon: '📅', desc: '7-day streak' },
];

export default function GamificationWidget({ results }: Props) {
    const streak = computeStreak(results.recent);
    const points = results.progress.totalExams * 10 + Math.round((results.progress.avgScore || 0) * 0.5);
    const earnedBadges: StudentBadgeItem[] = results.badges || [];

    return (
        <DashboardSection delay={0.25}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Your Achievements
                </h3>

                {/* Stats row */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/15">
                        <Flame className={`w-6 h-6 ${streak > 0 ? 'text-orange-500' : 'text-slate-300 dark:text-slate-600'}`} />
                        <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{streak}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Day Streak</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/15">
                        <Star className="w-6 h-6 text-violet-500" />
                        <div>
                            <p className="text-lg font-bold text-slate-900 dark:text-white leading-none">{points}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">Points</p>
                        </div>
                    </div>
                </div>

                {/* Earned badges */}
                {earnedBadges.length > 0 && (
                    <div className="mb-3">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Earned</p>
                        <div className="flex flex-wrap gap-1.5">
                            {earnedBadges.map(b => (
                                <span
                                    key={b._id}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-500/5 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-500/25"
                                >
                                    🏅 {b.title}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Locked badges */}
                <div>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Locked</p>
                    <div className="space-y-1.5">
                        {LOCKED_BADGES.map(b => (
                            <div
                                key={b.title}
                                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 opacity-60"
                            >
                                <span className="text-base opacity-40">{b.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{b.title}</p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{b.desc}</p>
                                </div>
                                <Lock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardSection>
    );
}
