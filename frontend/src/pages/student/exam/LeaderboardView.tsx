import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Award,
    ChevronLeft,
    ChevronRight,
    Crown,
    Loader2,
    Medal,
    Trophy,
    Users,
} from 'lucide-react';
import {
    useExamLeaderboard,
    useWeeklyLeaderboard,
    useGlobalLeaderboard,
} from '../../../hooks/useExamSystemQueries';
import type { LeaderboardEntry, LeaderboardType, PaginationParams } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const TABS: { key: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { key: 'exam', label: 'Exam', icon: <Trophy className="h-4 w-4" /> },
    { key: 'group', label: 'Group', icon: <Users className="h-4 w-4" /> },
    { key: 'weekly', label: 'Weekly', icon: <Medal className="h-4 w-4" /> },
    { key: 'global', label: 'Global', icon: <Crown className="h-4 w-4" /> },
    { key: 'subject', label: 'Subject', icon: <Award className="h-4 w-4" /> },
];

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getRankBadge(rank: number): React.ReactNode {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-slate-500 dark:text-slate-400">#{rank}</span>;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function LeaderboardRow({
    entry,
    isCurrentUser,
}: {
    entry: LeaderboardEntry;
    isCurrentUser: boolean;
}) {
    return (
        <div
            className={`flex items-center gap-4 rounded-xl border px-4 py-3 transition-colors ${isCurrentUser
                    ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                }`}
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                {getRankBadge(entry.rank)}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isCurrentUser
                        ? 'text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-800 dark:text-slate-100'
                    }`}>
                    {entry.displayName}
                    {isCurrentUser && (
                        <span className="ml-2 text-xs font-medium text-indigo-500 dark:text-indigo-400">(You)</span>
                    )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Score: {entry.score} · {entry.percentage.toFixed(1)}%
                </p>
            </div>

            <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {entry.percentage.toFixed(1)}%
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                    {formatTime(entry.timeTaken)}
                </p>
            </div>
        </div>
    );
}

function PaginationControls({
    page,
    totalPages,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    onPageChange: (p: number) => void;
}) {
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-3 pt-4">
            <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                aria-label="Previous page"
            >
                <ChevronLeft className="h-4 w-4" />
                Prev
            </button>
            <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
            </span>
            <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                aria-label="Next page"
            >
                Next
                <ChevronRight className="h-4 w-4" />
            </button>
        </div>
    );
}

function MyRankCard({ entry }: { entry: LeaderboardEntry }) {
    return (
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 p-4 mb-4">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">Your Rank</p>
            <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                    {getRankBadge(entry.rank)}
                </div>
                <div className="flex-1">
                    <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
                        #{entry.rank}
                    </p>
                    <p className="text-sm text-indigo-600/70 dark:text-indigo-400/70">
                        Score: {entry.score} · {entry.percentage.toFixed(1)}% · {formatTime(entry.timeTaken)}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Content Components
// ═══════════════════════════════════════════════════════════════════════════

function ExamLeaderboardTab({ examId }: { examId: string }) {
    const [page, setPage] = useState(1);
    const params: PaginationParams = { page, limit: PAGE_SIZE };
    const { data, isLoading, isError } = useExamLeaderboard(examId, params);

    if (isLoading) return <LoadingState />;
    if (isError || !data?.data) return <ErrorState />;

    const leaderboard = data.data;
    const entries = leaderboard.entries ?? [];
    const myEntry = leaderboard.myEntry;
    const totalPages = leaderboard.pagination?.totalPages ?? 1;

    return (
        <div>
            {myEntry && <MyRankCard entry={myEntry} />}
            {entries.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <LeaderboardRow
                            key={entry._id}
                            entry={entry}
                            isCurrentUser={myEntry?._id === entry._id}
                        />
                    ))}
                </div>
            )}
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function WeeklyLeaderboardTab() {
    const [page, setPage] = useState(1);
    const params: PaginationParams = { page, limit: PAGE_SIZE };
    const { data, isLoading, isError } = useWeeklyLeaderboard(params);

    if (isLoading) return <LoadingState />;
    if (isError || !data?.data) return <ErrorState />;

    const leaderboard = data.data;
    const entries = leaderboard.entries ?? [];
    const myEntry = leaderboard.myEntry;
    const totalPages = leaderboard.pagination?.totalPages ?? 1;

    return (
        <div>
            {myEntry && <MyRankCard entry={myEntry} />}
            {entries.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <LeaderboardRow
                            key={entry._id}
                            entry={entry}
                            isCurrentUser={myEntry?._id === entry._id}
                        />
                    ))}
                </div>
            )}
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function GlobalLeaderboardTab() {
    const [page, setPage] = useState(1);
    const params: PaginationParams = { page, limit: PAGE_SIZE };
    const { data, isLoading, isError } = useGlobalLeaderboard(params);

    if (isLoading) return <LoadingState />;
    if (isError || !data?.data) return <ErrorState />;

    const leaderboard = data.data;
    const entries = leaderboard.entries ?? [];
    const myEntry = leaderboard.myEntry;
    const totalPages = leaderboard.pagination?.totalPages ?? 1;

    return (
        <div>
            {myEntry && <MyRankCard entry={myEntry} />}
            {entries.length === 0 ? (
                <EmptyState />
            ) : (
                <div className="space-y-2">
                    {entries.map((entry) => (
                        <LeaderboardRow
                            key={entry._id}
                            entry={entry}
                            isCurrentUser={myEntry?._id === entry._id}
                        />
                    ))}
                </div>
            )}
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
    );
}

function PlaceholderTab({ label }: { label: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {label} leaderboard coming soon
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Check back after more data is available.
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Shared States
// ═══════════════════════════════════════════════════════════════════════════

function LoadingState() {
    return (
        <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
    );
}

function ErrorState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Failed to load leaderboard
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Please try again later.
            </p>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                No entries yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Be the first to appear on the leaderboard!
            </p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function LeaderboardView() {
    const { examId = '' } = useParams<{ examId: string }>();
    const [activeTab, setActiveTab] = useState<LeaderboardType>('exam');

    const renderTabContent = () => {
        switch (activeTab) {
            case 'exam':
                return <ExamLeaderboardTab examId={examId} />;
            case 'weekly':
                return <WeeklyLeaderboardTab />;
            case 'global':
                return <GlobalLeaderboardTab />;
            case 'group':
                return <PlaceholderTab label="Group" />;
            case 'subject':
                return <PlaceholderTab label="Subject" />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-2xl px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-indigo-500" />
                        Leaderboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        See how you rank against other students
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-6 overflow-x-auto">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors min-h-[40px] ${activeTab === tab.key
                                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            aria-pressed={activeTab === tab.key}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {renderTabContent()}
            </div>
        </div>
    );
}
