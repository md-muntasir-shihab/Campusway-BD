import { Link } from 'react-router-dom';
import { Target, AlertTriangle, CheckCircle, BookOpen, ChevronRight } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardWeakTopic, DashboardResourceItem } from '../../../services/api';

interface Props {
    topics: DashboardWeakTopic[];
    weakCount: number;
    hasData: boolean;
    resources?: DashboardResourceItem[];
}

export default function WeakTopicsSection({ topics, weakCount, hasData, resources = [] }: Props) {
    if (!hasData || topics.length === 0) return null;

    const weakTopics = topics.filter(t => t.isWeak);
    const weakSubjects = new Set(weakTopics.map(t => t.subject.toLowerCase()));
    const suggestedResources = resources.filter(r =>
        weakSubjects.size === 0 ? r.isFeatured : (
            weakSubjects.has((r.category || '').toLowerCase()) ||
            weakTopics.some(t => (r.category || '').toLowerCase().includes(t.subject.toLowerCase()))
        )
    ).slice(0, 3);

    return (
        <DashboardSection delay={0.22}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-violet-500" />
                        Topic Performance
                    </h3>
                    {weakCount > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{weakCount} weak</span>
                    )}
                </div>

                <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin">
                    {topics.map(t => (
                        <div key={t.subject} className="flex items-center gap-3">
                            <div className="shrink-0">
                                {t.isWeak ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-xs text-slate-700 dark:text-slate-200 truncate">{t.subject}</p>
                                    <span className={`text-[10px] font-bold ml-2 shrink-0 ${t.isWeak ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {Math.round(t.accuracy)}%
                                    </span>
                                </div>
                                <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${t.isWeak ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                        style={{ width: `${Math.min(100, t.accuracy)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {weakCount > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-violet-400" />
                            Suggested Practice
                        </p>
                        {suggestedResources.length > 0 ? (
                            <div className="space-y-1.5">
                                {suggestedResources.map(r => (
                                    <a
                                        key={r._id}
                                        href={r.fileUrl || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-between p-2 rounded-lg bg-violet-50/50 dark:bg-violet-500/5 border border-violet-100 dark:border-violet-500/15 hover:bg-violet-100/50 dark:hover:bg-violet-500/10 transition group"
                                    >
                                        <span className="text-xs text-slate-700 dark:text-slate-200 truncate flex-1">{r.title}</span>
                                        <ChevronRight className="w-3 h-3 text-violet-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                                    </a>
                                ))}
                            </div>
                        ) : (
                            <Link
                                to="/exams"
                                className="flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                                Take a practice exam to improve
                            </Link>
                        )}
                    </div>
                )}
            </div>
        </DashboardSection>
    );
}
