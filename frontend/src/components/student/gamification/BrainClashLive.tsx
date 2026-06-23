import { useState, useEffect, useRef, useMemo } from 'react';
import {
    useBrainClashDetails,
    useJoinBrainClashQueue,
    useLeaveBrainClashQueue,
    useSubmitBrainClashAnswer,
    useBrainClashLiveStream,
    useBrainClashHistory,
} from '../../../hooks/useExamSystemQueries';
import { useHierarchyTree } from '../../../hooks/useExamSystemQueries';
import { toast } from 'react-hot-toast';

interface BrainClashLiveProps {
    onBack?: () => void;
}

export default function BrainClashLive({ onBack }: BrainClashLiveProps) {
    const [gameState, setGameState] = useState<'lobby' | 'matching' | 'playing' | 'completed'>('lobby');
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [currentBattleId, setCurrentBattleId] = useState<string>('');
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string>('');
    const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState<boolean>(false);
    const [timeLeft, setTimeLeft] = useState<number>(15);
    const [matchTimer, setMatchTimer] = useState<number>(0);

    // Live scores local sync
    const [challengerScore, setChallengerScore] = useState<number>(0);
    const [opponentScore, setOpponentScore] = useState<number>(0);
    const [isDraw, setIsDraw] = useState<boolean>(false);
    const [winnerId, setWinnerId] = useState<string | null>(null);

    // Question response feedback
    const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

    // Timers reference
    const questionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const matchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const questionStartRef = useRef<number>(Date.now());

    // Fetch subjects list for matchmaking filter
    const { data: tree } = useHierarchyTree();
    const subjects = useMemo(() => {
        const treeData = (tree as any)?.data ?? tree;
        const groups = treeData?.groups || [];
        const result: Array<{ _id: string; name: string }> = [];
        for (const g of groups) {
            for (const sg of g.children || []) {
                for (const sub of sg.children || []) {
                    result.push({ _id: sub._id, name: sub.title?.en || sub.code || sub._id });
                }
            }
        }
        return result;
    }, [tree]);

    // History and mutations
    const { data: historyData, refetch: refetchHistory } = useBrainClashHistory({ page: 1, limit: 10 });
    const joinQueueMutation = useJoinBrainClashQueue();
    const leaveQueueMutation = useLeaveBrainClashQueue();
    const submitAnswerMutation = useSubmitBrainClashAnswer(currentBattleId);

    // Battle Details Query (only when active/playing/completed)
    const { data: battleRaw, refetch: refetchDetails } = useBrainClashDetails(currentBattleId);
    const battle = (battleRaw as any)?.data ?? battleRaw as any;

    // Check who is player vs opponent
    const studentId = (window as any).__USER_ID__ || ''; // fallback or local auth profile
    const isChallenger = battle ? battle.challenger?._id === studentId : true;
    const opponent = battle ? (isChallenger ? battle.opponent : battle.challenger) : null;
    const player = battle ? (isChallenger ? battle.challenger : battle.opponent) : null;

    // SSE Realtime Updates Hook
    useBrainClashLiveStream(
        currentBattleId,
        (event) => {
            if (event.type === 'answer_processed' || event.type === 'battle_complete') {
                setChallengerScore(event.challengerScore);
                setOpponentScore(event.opponentScore);
            }
            if (event.type === 'battle_complete') {
                setWinnerId(event.winner);
                setIsDraw(event.winner === null);
                setGameState('completed');
                refetchHistory();
            }
        },
        gameState === 'playing',
    );

    // Matchmaking Timer
    useEffect(() => {
        if (gameState === 'matching') {
            matchTimerRef.current = setInterval(() => {
                setMatchTimer((prev) => prev + 1);
            }, 1000);
        } else {
            if (matchTimerRef.current) clearInterval(matchTimerRef.current);
            setMatchTimer(0);
        }
        return () => {
            if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        };
    }, [gameState]);

    // Question Timer & auto progression
    useEffect(() => {
        if (gameState === 'playing' && battle && !hasAnsweredCurrent) {
            setTimeLeft(battle.timePerQuestion || 15);
            questionStartRef.current = Date.now();

            questionTimerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        // Time out! Auto submit empty answer
                        handleAnswerSubmit('');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        };
    }, [gameState, currentQuestionIndex, battle, hasAnsweredCurrent]);

    const handleStartMatchmaking = async () => {
        setGameState('matching');
        try {
            const res = await joinQueueMutation.mutateAsync(selectedSubject || undefined);
            if (res?.data?.battleId) {
                setCurrentBattleId(res.data.battleId);
                setCurrentQuestionIndex(0);
                setHasAnsweredCurrent(false);
                setSelectedAnswer('');
                setGameState('playing');
                toast.success('Opponent Found! Battle Starting...');
            }
        } catch (err: any) {
            if (err?.response?.status === 408) {
                toast.error('Matchmaking timed out. No opponents online.');
            } else {
                toast.error(err?.message || 'Matchmaking failed');
            }
            setGameState('lobby');
        }
    };

    const handleCancelMatchmaking = async () => {
        try {
            await leaveQueueMutation.mutateAsync();
            toast.success('Matchmaking cancelled');
        } catch {
            // ignore
        }
        setGameState('lobby');
    };

    const handleAnswerSubmit = async (key: string) => {
        if (hasAnsweredCurrent) return;
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);

        setSelectedAnswer(key);
        setHasAnsweredCurrent(true);

        const timeTakenMs = Date.now() - questionStartRef.current;
        const currentQ = battle?.questionSnapshots?.[currentQuestionIndex];

        if (!currentQ) return;

        const correct = key.trim().toUpperCase() === (currentQ.correctKey || '').trim().toUpperCase();
        setIsAnswerCorrect(correct);

        try {
            await submitAnswerMutation.mutateAsync({
                questionIndex: currentQuestionIndex,
                selectedAnswer: key,
                timeTakenMs,
            });
        } catch (err: any) {
            toast.error(err?.message || 'Failed to submit answer');
        }

        // Show feedback for 2 seconds, then advance
        setTimeout(() => {
            const nextIdx = currentQuestionIndex + 1;
            const totalQ = battle?.totalQuestions || 10;

            if (nextIdx < totalQ) {
                setCurrentQuestionIndex(nextIdx);
                setSelectedAnswer('');
                setHasAnsweredCurrent(false);
                setIsAnswerCorrect(null);
            } else {
                // If it was the last question, we wait for SSE 'battle_complete' event
                toast.loading('Waiting for opponent to finish...', { id: 'waiting-opponent' });
            }
        }, 2000);
    };

    // Helper for circular progress SVG stroke
    const totalTime = battle?.timePerQuestion || 15;
    const strokeDashoffset = 251.2 - (251.2 * timeLeft) / totalTime;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col justify-between">
            {/* Header */}
            <div className="flex justify-between items-center max-w-4xl mx-auto w-full mb-6">
                <button
                    onClick={gameState === 'playing' ? undefined : onBack}
                    disabled={gameState === 'playing'}
                    className="flex items-center space-x-2 text-slate-400 hover:text-white transition duration-200 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>{gameState === 'playing' ? 'In Battle' : 'Back to Profile'}</span>
                </button>

                <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                    BRAIN CLASH: 1V1
                </h1>

                <div className="w-10"></div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col justify-center items-center max-w-4xl mx-auto w-full">
                {/* ─── LOBBY STATE ─── */}
                {gameState === 'lobby' && (
                    <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
                        <div className="w-24 h-24 bg-indigo-500/10 border border-indigo-500/30 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold">Live Multiplayer Duel</h2>
                            <p className="text-slate-400 text-sm mt-1">Challenge a random player to a live 15-second response speed-clash.</p>
                        </div>

                        <div className="space-y-2 text-left">
                            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Subject (Optional)</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                aria-label="Select subject"
                                className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            >
                                <option value="">Any Subject / Random Pool</option>
                                {subjects.map((sub: any) => (
                                    <option key={sub._id} value={sub._id}>{sub.name}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={handleStartMatchmaking}
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] font-bold rounded-xl transition duration-200 shadow-lg shadow-indigo-600/25"
                        >
                            Find Competitor
                        </button>

                        {/* Recent History Table */}
                        {(historyData as any)?.data?.items && (historyData as any).data.items.length > 0 && (
                            <div className="pt-6 border-t border-slate-800 text-left">
                                <h3 className="text-sm font-semibold text-slate-400 mb-3">Recent Clashes</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                    {(historyData as any).data.items.map((h: any) => {
                                        const isWinner = h.winner?._id === studentId;
                                        const isChall = h.challenger?._id === studentId;
                                        const oppName = isChall ? h.opponent?.fullName : h.challenger?.fullName;
                                        const playerScore = isChall ? h.challengerScore : h.opponentScore;
                                        const oppScore = isChall ? h.opponentScore : h.challengerScore;

                                        return (
                                            <div key={h._id} className="flex justify-between items-center bg-slate-950/40 border border-slate-900 rounded-lg p-2 text-xs">
                                                <span className="font-medium truncate max-w-[120px]">{oppName}</span>
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-slate-300">{playerScore} - {oppScore}</span>
                                                    {h.winner ? (
                                                        <span className={`px-1.5 py-0.5 rounded font-bold uppercase text-[9px] ${
                                                            isWinner ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                        }`}>
                                                            {isWinner ? 'W' : 'L'}
                                                        </span>
                                                    ) : (
                                                        <span className="px-1.5 py-0.5 rounded font-bold uppercase text-[9px] bg-slate-500/10 text-slate-400">
                                                            D
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── MATCHMAKING QUEUE STATE ─── */}
                {gameState === 'matching' && (
                    <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-8">
                        <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                            {/* Rotating Ring */}
                            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                            {/* Inner Pulsing Radar */}
                            <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center animate-pulse">
                                <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold">Matching Competitor</h2>
                            <p className="text-slate-400 text-sm mt-1">Looking for a student ready to clash...</p>
                            <span className="inline-block mt-4 px-3 py-1 bg-slate-950 rounded-full text-xs font-mono text-indigo-400 border border-slate-850">
                                elapsed: {matchTimer}s
                            </span>
                        </div>

                        <button
                            onClick={handleCancelMatchmaking}
                            className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold rounded-xl transition duration-200"
                        >
                            Cancel Search
                        </button>
                    </div>
                )}

                {/* ─── IN-BATTLE GAMEPLAY STATE ─── */}
                {gameState === 'playing' && battle && (
                    <div className="w-full space-y-6">
                        {/* Match Scoreboard / Participants */}
                        <div className="grid grid-cols-3 items-center bg-slate-900/60 border border-slate-850 rounded-2xl p-4 backdrop-blur-md">
                            {/* Player info */}
                            <div className="flex items-center space-x-3">
                                <img
                                    src={player?.profile_photo || 'https://via.placeholder.com/150'}
                                    alt="Player"
                                    className="w-10 h-10 rounded-full border-2 border-indigo-500"
                                />
                                <div className="truncate">
                                    <p className="text-xs font-semibold text-slate-400">Player (You)</p>
                                    <p className="font-bold text-sm truncate">{player?.fullName}</p>
                                </div>
                            </div>

                            {/* Center Score & Timer */}
                            <div className="flex flex-col items-center">
                                <div className="flex items-center space-x-4">
                                    <span className="text-2xl font-black text-indigo-400">{isChallenger ? challengerScore : opponentScore}</span>
                                    <span className="text-slate-500 font-bold">:</span>
                                    <span className="text-2xl font-black text-rose-400">{isChallenger ? opponentScore : challengerScore}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Live Score</span>
                            </div>

                            {/* Opponent info */}
                            <div className="flex items-center justify-end space-x-3 text-right">
                                <div className="truncate">
                                    <p className="text-xs font-semibold text-slate-400">Opponent</p>
                                    <p className="font-bold text-sm truncate">{opponent?.fullName || 'Searching...'}</p>
                                </div>
                                <img
                                    src={opponent?.profile_photo || 'https://via.placeholder.com/150'}
                                    alt="Opponent"
                                    className="w-10 h-10 rounded-full border-2 border-rose-500"
                                />
                            </div>
                        </div>

                        {/* Question Card & Timer */}
                        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                            {/* Circular Question timer */}
                            <div className="absolute top-4 right-4 w-12 h-12">
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="24" cy="24" r="16" stroke="#1e293b" strokeWidth="3" fill="transparent" />
                                    <circle
                                        cx="24"
                                        cy="24"
                                        r="16"
                                        stroke={timeLeft > 5 ? '#6366f1' : '#f43f5e'}
                                        strokeWidth="3"
                                        fill="transparent"
                                        strokeDasharray="100.4"
                                        strokeDashoffset={strokeDashoffset}
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold font-mono">
                                    {timeLeft}
                                </span>
                            </div>

                            {/* Progress Indicator */}
                            <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-full">
                                Question {currentQuestionIndex + 1} of {battle.totalQuestions || 10}
                            </span>

                            {/* Question text */}
                            <h3 className="text-lg md:text-xl font-bold pt-4 leading-relaxed">
                                {battle.questionSnapshots?.[currentQuestionIndex]?.questionText}
                            </h3>

                            {/* Options list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                {battle.questionSnapshots?.[currentQuestionIndex]?.options?.map((opt: string, idx: number) => {
                                    const key = ['A', 'B', 'C', 'D'][idx];
                                    const isSelected = selectedAnswer === key;
                                    const correctKey = (battle.questionSnapshots?.[currentQuestionIndex]?.correctKey || '').trim().toUpperCase();

                                    let buttonStyle = 'bg-slate-950 hover:bg-slate-900 border-slate-800';

                                    if (hasAnsweredCurrent) {
                                        if (key === correctKey) {
                                            buttonStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold';
                                        } else if (isSelected) {
                                            buttonStyle = 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold';
                                        } else {
                                            buttonStyle = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => handleAnswerSubmit(key)}
                                            disabled={hasAnsweredCurrent}
                                            className={`flex items-center space-x-4 border rounded-2xl p-4 text-left transition duration-200 outline-none ${buttonStyle}`}
                                        >
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-850 text-slate-400'
                                            }`}>
                                                {key}
                                            </span>
                                            <span className="flex-1 text-sm font-medium">{opt}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── BATTLE COMPLETED STATE ─── */}
                {gameState === 'completed' && (
                    <div className="w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
                        {/* Winner/Loser Banner */}
                        {isDraw ? (
                            <div>
                                <div className="w-20 h-20 bg-slate-500/10 border border-slate-500/30 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-black mt-4">IT'S A DRAW!</h2>
                                <p className="text-slate-400 text-sm mt-1">Both of you scored same points. Intense match!</p>
                            </div>
                        ) : winnerId === studentId ? (
                            <div>
                                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                    <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-black text-emerald-400 mt-4">VICTORY!</h2>
                                <p className="text-slate-400 text-sm mt-1">Excellent speed and correctness!</p>
                            </div>
                        ) : (
                            <div>
                                <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto">
                                    <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-3xl font-black text-rose-400 mt-4">DEFEAT</h2>
                                <p className="text-slate-400 text-sm mt-1">Good effort! Try again to secure the crown.</p>
                            </div>
                        )}

                        {/* Final score card */}
                        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex justify-around items-center">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">Your Score</p>
                                <p className="text-2xl font-black">{isChallenger ? challengerScore : opponentScore}</p>
                            </div>
                            <div className="w-[1px] h-10 bg-slate-850"></div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">Opponent</p>
                                <p className="text-2xl font-black">{isChallenger ? opponentScore : challengerScore}</p>
                            </div>
                        </div>

                        {/* Rewards */}
                        <div className="flex justify-center space-x-4">
                            <span className="flex items-center space-x-1.5 px-3 py-1 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs font-bold">
                                <span>+{winnerId === studentId ? '100' : '25'} XP</span>
                            </span>
                            {winnerId === studentId && (
                                <span className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-bold">
                                    <span>+20 Coins</span>
                                </span>
                            )}
                        </div>

                        <button
                            onClick={() => {
                                setGameState('lobby');
                                setChallengerScore(0);
                                setOpponentScore(0);
                                setWinnerId(null);
                                setIsDraw(false);
                                setHasAnsweredCurrent(false);
                                setSelectedAnswer('');
                            }}
                            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 font-bold rounded-xl transition duration-200"
                        >
                            Return to Lobby
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
