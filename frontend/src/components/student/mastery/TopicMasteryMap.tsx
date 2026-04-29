import { useEffect, useState } from 'react';
import {
    BookOpen,
    Loader2,
    Map,
    Star,
    Target,
    TrendingUp,
    Zap,
} from 'lucide-react';
import api from '../../../services/api';
import type { TopicMastery, TopicMasteryLevel } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const MASTERY_CONFIG: Record<TopicMasteryLevel, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
    beginner: {
        label: 'Beginner',
        color: 'text-slate-600 dark:text-slate-300',
        bgColor: 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600',
        icon: <BookOpen className="h-4 w-4" />,
    },
    intermediate: {
        label: 'Intermediate',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700',
        icon: <Target className="h-4 w-4" />,
    },
    advanced: {
        label: 'Advanced',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700',
        icon: <TrendingUp className="h-4 w-4" />,
    },
    mastered: {
        label: 'Mastered',
        color: 'text-emerald-700 dark:text-emerald-300',
        bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700',
        icon: <Star className="h-4 w-4" />,
    },
};

const MASTERY_ORDER: TopicMasteryLevel[] = ['beginner', 'intermediate', 'advanced', 'mastered'];

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function MasteryLegend() {
    return (
        <div className="flex flex-wrap gap-3 mb-4">
            {MASTERY_ORDER.map((level) => {
                const config = MASTERY_CONFIG[level];
                return (
                    <span key={level} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}>
                        {config.icon}
                        {config.label}
                    </span>
                );
            })}
        </div>
    );
}

function MasteryStats({ topics }: { topics: TopicMastery[] }) {
    const counts: Record<TopicMasteryLevel, number> = { beginner: 0, intermediate: 0, advanced: 0, mastered: 0 };
    for (const t of topics) {
        counts[t.masteryLevel] = (counts[t.masteryLevel] ?? 0) + 1;
    }
    const total = topics.length;

    return (
        <div className="grid grid-cols-4 gap-2 mb-4">
            {MASTERY_ORDER.map((level) => {
                const config = MASTERY_CONFIG[level];
                const count = counts[level];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                    <div key={level} className={`rounded-lg border p-3 text-center ${config.bgColor}`}>
                        <p className={`text-lg font-bold ${config.color}`}>{count}</p>
                        <p className={`text-[10px] font-medium ${config.color} opacity-70`}>{config.label} ({pct}%)</p>
                    </div>
                );
            })}
        </div>
    );
}

function TopicCard({ topic }: { topic: TopicMastery }) {
    const config = MASTERY_CONFIG[topic.masteryLevel];
    const accuracy = topic.totalAttempts > 0 ? Math.round((topic.correctCount / topic.totalAttempts) * 100) : 0;

    return (
        <div className={`rounded-xl border p-4 transition-all hover:shadow-sm ${config.bgColor}`}>
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bgColor} ${config.color}`}>
                        {config.icon}
                    </div>
                    <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${config.color}`}>{topic.topic}</p>
                        {topic.subject && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{topic.subject}</p>}
                    </div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${config.bgColor} ${config.color}`}>
                    {config.label}
                </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{accuracy}% accuracy</span>
                <span>{topic.totalAttempts} attempts</span>
                {topic.lastPracticeDate && <span>Last: {new Date(topic.lastPracticeDate).toLocaleDateString()}</span>}
            </div>

            <div className="mt-2 h-1.5 w-full rounded-full bg-white/50 dark:bg-slate-800/50">
                <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${topic.masteryLevel === 'mastered' ? 'bg-emerald-500'
                        : topic.masteryLevel === 'advanced' ? 'bg-purple-500'
                            : topic.masteryLevel === 'intermediate' ? 'bg-blue-500'
                                : 'bg-slate-400'
                        }`}
                    style={{ width: `${accuracy}%` }}
                />
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function TopicMasteryMap() {
    const [topics, setTopics] = useState<TopicMastery[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchMastery() {
            try {
                setIsLoading(true);
                const response = await api.get<{ success: boolean; data: TopicMastery[] }>('/v1/student/topic-mastery');
                if (!cancelled) {
                    setTopics(response.data.data ?? []);
                    setError(null);
                }
            } catch {
                if (!cancelled) setError('Failed to load topic mastery data');
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        void fetchMastery();
        return () => { cancelled = true; };
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Map className="h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
        );
    }

    if (topics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Map className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No mastery data yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Practice topics to build your mastery map</p>
            </div>
        );
    }

    // Group by subject
    const bySubject: Record<string, TopicMastery[]> = {};
    for (const topic of topics) {
        const key = topic.subject ?? 'Other';
        if (!bySubject[key]) bySubject[key] = [];
        bySubject[key].push(topic);
    }

    const subjectEntries = Object.entries(bySubject);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Map className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Topic Mastery Map</h2>
            </div>

            <MasteryLegend />
            <MasteryStats topics={topics} />

            {subjectEntries.map(([subject, subjectTopics]) => (
                <div key={subject}>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">{subject}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subjectTopics
                            .sort((a: TopicMastery, b: TopicMastery) => MASTERY_ORDER.indexOf(b.masteryLevel) - MASTERY_ORDER.indexOf(a.masteryLevel))
                            .map((topic: TopicMastery) => (
                                <TopicCard key={topic._id} topic={topic} />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
