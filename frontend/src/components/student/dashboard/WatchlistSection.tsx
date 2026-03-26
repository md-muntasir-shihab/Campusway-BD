import { Bookmark, Building, BookOpen, FileText, Newspaper } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardWatchlistSummary } from '../../../services/api';

interface Props {
    watchlist: DashboardWatchlistSummary;
}

const typeConfig = {
    university: { label: 'Universities', icon: Building, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10' },
    resource: { label: 'Resources', icon: BookOpen, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10' },
    exam: { label: 'Exams', icon: FileText, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
    news: { label: 'News', icon: Newspaper, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
} as const;

export default function WatchlistSection({ watchlist }: Props) {
    if (watchlist.total === 0) return null;

    return (
        <DashboardSection delay={0.26}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Bookmark className="w-4 h-4 text-rose-500" />
                        Saved Items
                    </h3>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{watchlist.total} saved</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(typeConfig) as [keyof typeof typeConfig, (typeof typeConfig)[keyof typeof typeConfig]][]).map(([key, cfg]) => {
                        const count = watchlist[key === 'university' ? 'universities' : key === 'resource' ? 'resources' : key === 'exam' ? 'exams' : 'news'];
                        return (
                            <div key={key} className={`text-center p-2.5 rounded-xl ${cfg.color} border border-current/10`}>
                                <cfg.icon className="w-4 h-4 mx-auto mb-1" />
                                <p className="text-base font-bold">{count}</p>
                                <p className="text-[10px] opacity-70">{cfg.label}</p>
                            </div>
                        );
                    })}
                </div>

                {watchlist.recentItems.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-1.5">Recently saved</p>
                        {watchlist.recentItems.slice(0, 3).map(item => (
                            <div key={item._id} className="flex items-center justify-between py-1">
                                <span className="text-[10px] text-slate-600 dark:text-slate-300 capitalize">{item.itemType}</span>
                                <span className="text-[10px] text-slate-400">{new Date(item.savedAt).toLocaleDateString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardSection>
    );
}
