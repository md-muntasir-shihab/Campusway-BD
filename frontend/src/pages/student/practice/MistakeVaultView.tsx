import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AlertCircle,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Filter,
    Loader2,
    RotateCcw,
    Search,
    XCircle,
} from 'lucide-react';
import {
    useMistakes,
    useCreateRetrySession,
} from '../../../hooks/useExamSystemQueries';
import type { MasteryStatus, MistakeVaultEntry, MistakeVaultFilters } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const MASTERY_CONFIG: Record<MasteryStatus, { label: string; color: string; icon: React.ReactNode }> = {
    weak: {
        label: 'Weak',
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
        icon: <XCircle className="h-3.5 w-3.5" />,
    },
    still_weak: {
        label: 'Still Weak',
        color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: <AlertCircle className="h-3.5 w-3.5" />,
    },
    mastered: {
        label: 'Mastered',
        color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
};

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function MasteryBadge({ status }: { status: MasteryStatus }) {
    const config = MASTERY_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
            {config.icon}
            {config.label}
        </span>
    );
}

function FilterBar({
    filters,
    onFilterChange,
}: {
    filters: MistakeVaultFilters;
    onFilterChange: (updates: Partial<MistakeVaultFilters>) => void;
}) {
    const [showFilters, setShowFilters] = useState(false);

    return (
        <div className="mb-4">
            <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[40px]"
            >
                <Filter className="h-4 w-4" />
                Filters
            </button>

            {showFilters && (
                <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                            <label htmlFor="filter-subject" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Subject
                            </label>
                            <input
                                id="filter-subject"
                                type="text"
                                value={filters.subject ?? ''}
                                onChange={(e) => onFilterChange({ subject: e.target.value || undefined })}
                                placeholder="Filter by subject"
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="filter-chapter" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Chapter
                            </label>
                            <input
                                id="filter-chapter"
                                type="text"
                                value={filters.chapter ?? ''}
                                onChange={(e) => onFilterChange({ chapter: e.target.value || undefined })}
                                placeholder="Filter by chapter"
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="filter-topic" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Topic
                            </label>
                            <input
                                id="filter-topic"
                                type="text"
                                value={filters.topic ?? ''}
                                onChange={(e) => onFilterChange({ topic: e.target.value || undefined })}
                                placeholder="Filter by topic"
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="filter-mastery" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Mastery Status
                            </label>
                            <select
                                id="filter-mastery"
                                value={filters.masteryStatus ?? ''}
                                onChange={(e) => onFilterChange({ masteryStatus: (e.target.value || undefined) as MasteryStatus | undefined })}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                            >
                                <option value="">All</option>
                                <option value="weak">Weak</option>
                                <option value="still_weak">Still Weak</option>
                                <option value="mastered">Mastered</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="filter-date-from" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Date From
                            </label>
                            <input
                                id="filter-date-from"
                                type="date"
                                value={filters.dateFrom ?? ''}
                                onChange={(e) => onFilterChange({ dateFrom: e.target.value || undefined })}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label htmlFor="filter-date-to" className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                                Date To
                            </label>
                            <input
                                id="filter-date-to"
                                type="date"
                                value={filters.dateTo ?? ''}
                                onChange={(e) => onFilterChange({ dateTo: e.target.value || undefined })}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MistakeCounts({ mistakes }: { mistakes: MistakeVaultEntry[] }) {
    const subjectCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const m of mistakes) {
            if (m.subject) {
                map.set(m.subject, (map.get(m.subject) ?? 0) + 1);
            }
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    }, [mistakes]);

    const topicCounts = useMemo(() => {
        const map = new Map<string, number>();
        for (const m of mistakes) {
            if (m.topic) {
                map.set(m.topic, (map.get(m.topic) ?? 0) + 1);
            }
        }
        return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
    }, [mistakes]);

    if (subjectCounts.length === 0 && topicCounts.length === 0) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {subjectCounts.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
                        Mistakes by Subject
                    </h3>
                    <div className="space-y-2">
                        {subjectCounts.map(([subject, count]) => (
                            <div key={subject} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{subject}</span>
                                <span className="text-sm font-bold text-red-600 dark:text-red-400 shrink-0 ml-2">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {topicCounts.length > 0 && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
                        Top Mistake Topics
                    </h3>
                    <div className="space-y-2">
                        {topicCounts.map(([topic, count]) => (
                            <div key={topic} className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{topic}</span>
                                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MistakeRow({ entry }: { entry: MistakeVaultEntry }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        Question: {entry.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {entry.subject && <span>{entry.subject}</span>}
                        {entry.chapter && <><span>·</span><span>{entry.chapter}</span></>}
                        {entry.topic && <><span>·</span><span>{entry.topic}</span></>}
                    </div>
                </div>
                <MasteryBadge status={entry.masteryStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                    Your answer: {entry.selectedAnswer}
                </span>
                <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Correct: {entry.correctAnswer}
                </span>
                <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(entry.attemptDate).toLocaleDateString()}
                </span>
                {entry.retryCount > 0 && (
                    <span className="flex items-center gap-1">
                        <RotateCcw className="h-3.5 w-3.5" />
                        {entry.retryCount} retries
                    </span>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function MistakeVaultView() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState<MistakeVaultFilters>({ page: 1, limit: PAGE_SIZE });

    const { data, isLoading, isError } = useMistakes(filters);
    const retrySessionMutation = useCreateRetrySession();

    const mistakes = data?.data ?? [];
    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages ?? 1;
    const currentPage = filters.page ?? 1;

    const handleFilterChange = (updates: Partial<MistakeVaultFilters>) => {
        setFilters((prev) => ({ ...prev, ...updates, page: 1 }));
    };

    const handlePageChange = (page: number) => {
        setFilters((prev) => ({ ...prev, page }));
    };

    const handleRetryMistakes = async () => {
        try {
            const result = await retrySessionMutation.mutateAsync({
                subject: filters.subject,
                chapter: filters.chapter,
                topic: filters.topic,
                masteryStatus: filters.masteryStatus,
            });
            if (result.data?.sessionId) {
                navigate(`/student/practice/session/${result.data.sessionId}`);
            }
        } catch {
            // Error handled by mutation state
        }
    };

    if (isLoading && mistakes.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <Search className="mx-auto h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        Failed to load mistake vault
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-3xl px-4 py-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <BookOpen className="h-6 w-6 text-indigo-500" />
                            Mistake Vault
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Review your mistakes and master them through practice
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void handleRetryMistakes()}
                        disabled={retrySessionMutation.isPending || mistakes.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                    >
                        {retrySessionMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RotateCcw className="h-4 w-4" />
                        )}
                        Retry Mistakes
                    </button>
                </div>

                <FilterBar filters={filters} onFilterChange={handleFilterChange} />

                <MistakeCounts mistakes={mistakes} />

                {mistakes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <CheckCircle2 className="h-12 w-12 text-emerald-300 dark:text-emerald-700 mb-3" />
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            No mistakes found
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            Keep practicing to track your mistakes here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {mistakes.map((entry) => (
                            <MistakeRow key={entry._id} entry={entry} />
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-6">
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage <= 1}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Prev
                        </button>
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Page {currentPage} of {totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                            aria-label="Next page"
                        >
                            Next
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
