import { useCallback, useState } from 'react';
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Crown,
    Loader2,
    Send,
    Shield,
    Swords,
    Trophy,
    X,
    Zap,
} from 'lucide-react';
import {
    useCreateChallenge,
    useAcceptChallenge,
    useSubmitBattleAnswer,
    useBattleHistory,
} from '../../../hooks/useExamSystemQueries';
import type {
    BattleSession,
    BattleStatus,
    BattleResult,
    PaginationParams,
} from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

type ArenaView = 'lobby' | 'battle' | 'result';

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getStatusColor(status: BattleStatus): string {
    switch (status) {
        case 'pending': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
        case 'active': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
        case 'completed': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
        case 'declined': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        case 'expired': return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
        default: return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
    }
}

function getResultLabel(result: BattleResult): string {
    switch (result) {
        case 'challenger_win': return 'Challenger Won';
        case 'opponent_win': return 'Opponent Won';
        case 'draw': return 'Draw';
        case 'pending': return 'In Progress';
        default: return result;
    }
}

function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function ChallengeForm({
    onCreateChallenge,
    isCreating,
}: {
    onCreateChallenge: (opponentId: string, topicId: string) => void;
    isCreating: boolean;
}) {
    const [opponentId, setOpponentId] = useState('');
    const [topicId, setTopicId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (opponentId.trim() && topicId.trim()) {
            onCreateChallenge(opponentId.trim(), topicId.trim());
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Swords className="h-5 w-5 text-indigo-500" />
                Create Challenge
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="opponent-id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Opponent (Student ID or Username)
                    </label>
                    <input
                        id="opponent-id"
                        type="text"
                        value={opponentId}
                        onChange={(e) => setOpponentId(e.target.value)}
                        placeholder="Enter opponent's ID"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label htmlFor="topic-id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Topic
                    </label>
                    <input
                        id="topic-id"
                        type="text"
                        value={topicId}
                        onChange={(e) => setTopicId(e.target.value)}
                        placeholder="Enter topic ID"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isCreating || !opponentId.trim() || !topicId.trim()}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                    {isCreating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                    {isCreating ? 'Sending Challenge...' : 'Send Challenge'}
                </button>
            </form>
        </div>
    );
}

function PendingChallengeCard({
    battle,
    onAccept,
    onDecline,
    isAccepting,
}: {
    battle: BattleSession;
    onAccept: (id: string) => void;
    onDecline: (id: string) => void;
    isAccepting: boolean;
}) {
    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Swords className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                        Challenge from {battle.challenger}
                    </span>
                </div>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                    {formatDuration(battle.duration)} battle
                </span>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => onAccept(battle._id)}
                    disabled={isAccepting}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50 min-h-[40px]"
                >
                    {isAccepting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Accept
                </button>
                <button
                    type="button"
                    onClick={() => onDecline(battle._id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[40px]"
                >
                    <X className="h-3.5 w-3.5" />
                    Decline
                </button>
            </div>
        </div>
    );
}

function LiveBattle({
    battle,
    currentQuestionIndex,
    selectedAnswer,
    onSelectAnswer,
    onSubmitAnswer,
    isSubmitting,
}: {
    battle: BattleSession;
    currentQuestionIndex: number;
    selectedAnswer: string | null;
    onSelectAnswer: (key: string) => void;
    onSubmitAnswer: () => void;
    isSubmitting: boolean;
}) {
    const totalQuestions = battle.questions.length;
    const optionLabels = ['A', 'B', 'C', 'D'];

    return (
        <div className="space-y-4">
            {/* Score Header */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                    <div className="text-center flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">You</p>
                        <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                            {battle.challengerScore}
                        </p>
                    </div>
                    <div className="flex flex-col items-center px-4">
                        <Swords className="h-6 w-6 text-slate-400 dark:text-slate-500 mb-1" />
                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            Q{currentQuestionIndex + 1}/{totalQuestions}
                        </span>
                    </div>
                    <div className="text-center flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400">Opponent</p>
                        <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {battle.opponentScore}
                        </p>
                    </div>
                </div>

                <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                        className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
                        style={{ width: `${totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0}%` }}
                    />
                </div>
            </div>

            {/* Question Area */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
                <span className="inline-block rounded-lg bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                    Question {currentQuestionIndex + 1}
                </span>
                <p className="text-base font-medium text-slate-800 dark:text-slate-100 mb-6">
                    Battle question #{currentQuestionIndex + 1}
                </p>

                <div className="space-y-3 mb-6">
                    {optionLabels.map((label, idx) => {
                        const key = String.fromCharCode(97 + idx);
                        const isSelected = selectedAnswer === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => onSelectAnswer(key)}
                                className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all min-h-[44px] ${isSelected
                                        ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                aria-pressed={isSelected}
                            >
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}>
                                    {isSelected ? <Check className="h-4 w-4" /> : label}
                                </span>
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                    Option {label}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={onSubmitAnswer}
                    disabled={!selectedAnswer || isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Zap className="h-4 w-4" />
                    )}
                    {isSubmitting ? 'Submitting...' : 'Lock Answer'}
                </button>
            </div>
        </div>
    );
}

function BattleResultScreen({ battle }: { battle: BattleSession }) {
    const isDraw = battle.result === 'draw';
    const isWinner = battle.result === 'challenger_win';

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
            {isDraw ? (
                <Shield className="mx-auto h-14 w-14 text-amber-500 mb-4" />
            ) : isWinner ? (
                <Trophy className="mx-auto h-14 w-14 text-yellow-500 mb-4" />
            ) : (
                <Shield className="mx-auto h-14 w-14 text-slate-400 mb-4" />
            )}

            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                {isDraw ? "It's a Draw!" : isWinner ? 'You Won!' : 'You Lost'}
            </h2>

            <div className="flex items-center justify-center gap-8 my-6">
                <div className="text-center">
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {battle.challengerScore}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">You</p>
                </div>
                <span className="text-lg font-bold text-slate-300 dark:text-slate-600">vs</span>
                <div className="text-center">
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                        {battle.opponentScore}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Opponent</p>
                </div>
            </div>

            <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                    <Zap className="h-4 w-4" />
                    +{battle.xpAwarded.challenger} XP
                </div>
                <div className="flex items-center gap-1.5 text-sm text-yellow-600 dark:text-yellow-400">
                    <Crown className="h-4 w-4" />
                    +{battle.coinsAwarded.challenger} Coins
                </div>
            </div>
        </div>
    );
}

function BattleHistoryList() {
    const [page, setPage] = useState(1);
    const params: PaginationParams = { page, limit: 10 };
    const { data, isLoading, isError } = useBattleHistory(params);

    const battles = data?.data ?? [];
    const totalPages = data?.pagination?.totalPages ?? 1;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-red-600 dark:text-red-400 text-center py-8">
                Failed to load battle history
            </p>
        );
    }

    if (battles.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <Swords className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No battles yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Challenge a friend to get started!
                </p>
            </div>
        );
    }

    return (
        <div>
            <div className="space-y-3">
                {battles.map((battle) => (
                    <div
                        key={battle._id}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Swords className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                    vs {battle.opponent}
                                </span>
                            </div>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(battle.status)}`}>
                                {battle.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>{battle.challengerScore} - {battle.opponentScore}</span>
                            <span>{getResultLabel(battle.result)}</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(battle.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page <= 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                        aria-label="Previous page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        {page} / {totalPages}
                    </span>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page >= totalPages}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-h-[40px]"
                        aria-label="Next page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function BattleArena() {
    const [view, setView] = useState<ArenaView>('lobby');
    const [activeBattle, setActiveBattle] = useState<BattleSession | null>(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const createChallengeMutation = useCreateChallenge();
    const acceptChallengeMutation = useAcceptChallenge();
    const submitAnswerMutation = useSubmitBattleAnswer();

    const handleCreateChallenge = useCallback(async (opponentId: string, topicId: string) => {
        try {
            const result = await createChallengeMutation.mutateAsync({
                opponentId,
                topicId,
            });
            setActiveBattle(result.data);
        } catch {
            // Error handled by mutation state
        }
    }, [createChallengeMutation]);

    const handleAcceptChallenge = useCallback(async (battleId: string) => {
        try {
            const result = await acceptChallengeMutation.mutateAsync(battleId);
            setActiveBattle(result.data);
            setCurrentQuestionIndex(0);
            setSelectedAnswer(null);
            setView('battle');
        } catch {
            // Error handled by mutation state
        }
    }, [acceptChallengeMutation]);

    const handleDeclineChallenge = useCallback((_battleId: string) => {
        // Decline API would be called here in production
    }, []);

    const handleSubmitBattleAnswer = useCallback(async () => {
        if (!activeBattle || !selectedAnswer) return;

        const questionId = activeBattle.questions[currentQuestionIndex];
        if (!questionId) return;

        try {
            const result = await submitAnswerMutation.mutateAsync({
                battleId: activeBattle._id,
                payload: { questionId, answer: selectedAnswer },
            });

            setActiveBattle((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    challengerScore: result.data.playerScore,
                    opponentScore: result.data.opponentScore,
                };
            });

            if (currentQuestionIndex < activeBattle.questions.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
                setSelectedAnswer(null);
            } else {
                setView('result');
            }
        } catch {
            // Error handled by mutation state
        }
    }, [activeBattle, currentQuestionIndex, selectedAnswer, submitAnswerMutation]);

    // Suppress unused variable warnings for components used in pending challenges
    void PendingChallengeCard;
    void handleAcceptChallenge;
    void handleDeclineChallenge;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-2xl px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Swords className="h-6 w-6 text-indigo-500" />
                        Battle Arena
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Challenge friends to 1v1 MCQ battles
                    </p>
                </div>

                {/* Lobby */}
                {view === 'lobby' && (
                    <>
                        <ChallengeForm
                            onCreateChallenge={(o, t) => void handleCreateChallenge(o, t)}
                            isCreating={createChallengeMutation.isPending}
                        />

                        {createChallengeMutation.isError && (
                            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                                <p className="text-sm text-red-700 dark:text-red-300">
                                    Failed to create challenge. Please try again.
                                </p>
                            </div>
                        )}

                        <div className="mt-6">
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <Clock className="h-5 w-5 text-slate-400" />
                                Battle History
                            </h2>
                            <BattleHistoryList />
                        </div>
                    </>
                )}

                {/* Live Battle */}
                {view === 'battle' && activeBattle && (
                    <LiveBattle
                        battle={activeBattle}
                        currentQuestionIndex={currentQuestionIndex}
                        selectedAnswer={selectedAnswer}
                        onSelectAnswer={setSelectedAnswer}
                        onSubmitAnswer={() => void handleSubmitBattleAnswer()}
                        isSubmitting={submitAnswerMutation.isPending}
                    />
                )}

                {/* Result */}
                {view === 'result' && activeBattle && (
                    <div className="space-y-4">
                        <BattleResultScreen battle={activeBattle} />
                        <button
                            type="button"
                            onClick={() => {
                                setView('lobby');
                                setActiveBattle(null);
                                setCurrentQuestionIndex(0);
                                setSelectedAnswer(null);
                            }}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                        >
                            Back to Lobby
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
