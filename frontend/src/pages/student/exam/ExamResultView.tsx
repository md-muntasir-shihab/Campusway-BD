import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Award,
    CheckCircle2,
    Clock,
    HelpCircle,
    Trophy,
    XCircle,
} from 'lucide-react';
import { useExamResult } from '../../../hooks/useExamSystemQueries';
import MathText from '../../../components/exam/MathText';
import api from '../../../services/api';
import type { ScoreBreakdown } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

interface QuestionOption {
    key: string;
    text_en?: string;
    text_bn?: string;
    imageUrl?: string;
    isCorrect: boolean;
}

interface QuestionReviewItem {
    questionId: string;
    questionIndex: number;
    question_en?: string;
    question_bn?: string;
    options: QuestionOption[];
    selectedAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation_en?: string;
    explanation_bn?: string;
    marks: number;
    negativeMarks: number;
}

interface DetailedResultResponse {
    scoreBreakdown: ScoreBreakdown;
    questions: QuestionReviewItem[];
    examTitle?: string;
    rank?: number;
    totalParticipants?: number;
    resultPublished: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function formatTimeTaken(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
        return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
}

function getScoreColor(percentage: number): string {
    if (percentage >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 60) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

function getScoreBgColor(percentage: number): string {
    if (percentage >= 80) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
    if (percentage >= 60) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    if (percentage >= 40) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

/** Score breakdown card */
function ScoreCard({
    label,
    value,
    icon,
    colorClass,
}: {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    colorClass: string;
}) {
    return (
        <div className={`rounded-xl border p-4 ${colorClass}`}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs font-medium uppercase tracking-wide opacity-70">
                    {label}
                </span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

/** Results pending state */
function ResultsPending({ onBack }: { onBack: () => void }) {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Results Pending
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                    Your exam has been submitted successfully. Results will be available once the
                    examiner publishes them. Please check back later.
                </p>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </button>
            </div>
        </div>
    );
}

/** Per-question review item */
function QuestionReview({
    item,
}: {
    item: QuestionReviewItem;
}) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Question header */}
            <div
                className={`flex items-center gap-3 px-4 py-3 border-b ${item.isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                    : item.selectedAnswer === null
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    }`}
            >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-200">
                    {item.questionIndex + 1}
                </span>
                <div className="flex-1 min-w-0">
                    <MathText inline className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">
                        {item.question_en || item.question_bn || 'Question text unavailable'}
                    </MathText>
                </div>
                <div className="shrink-0">
                    {item.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : item.selectedAnswer === null ? (
                        <HelpCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                    ) : (
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="p-4 space-y-2">
                {item.options.map((opt, idx) => {
                    const isStudentAnswer = opt.key === item.selectedAnswer;
                    const isCorrectOption = opt.isCorrect;

                    let optionStyle =
                        'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300';
                    if (isCorrectOption) {
                        optionStyle =
                            'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
                    }
                    if (isStudentAnswer && !isCorrectOption) {
                        optionStyle =
                            'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
                    }

                    return (
                        <div
                            key={opt.key}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${optionStyle}`}
                        >
                            <span
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isCorrectOption
                                    ? 'bg-emerald-500 text-white'
                                    : isStudentAnswer
                                        ? 'bg-red-500 text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}
                            >
                                {isCorrectOption ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : isStudentAnswer ? (
                                    <XCircle className="h-3.5 w-3.5" />
                                ) : (
                                    optionLabels[idx] ?? idx + 1
                                )}
                            </span>
                            <span className="flex-1 text-sm break-words">
                                <MathText inline className="inline">
                                    {opt.text_en || opt.text_bn || '—'}
                                </MathText>
                                {opt.imageUrl && (
                                    <img
                                        src={opt.imageUrl}
                                        alt={`Option ${optionLabels[idx]}`}
                                        className="mt-2 max-h-32 rounded-lg"
                                    />
                                )}
                            </span>
                            {isStudentAnswer && (
                                <span className="shrink-0 text-xs font-medium">
                                    Your answer
                                </span>
                            )}
                            {isCorrectOption && !isStudentAnswer && (
                                <span className="shrink-0 text-xs font-medium">
                                    Correct
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Explanation */}
            {(item.explanation_en || item.explanation_bn) && (
                <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">
                        Explanation
                    </p>
                    <MathText className="text-sm text-slate-700 dark:text-slate-200 break-words">
                        {item.explanation_en || item.explanation_bn || ''}
                    </MathText>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ExamResultView() {
    const { examId = '' } = useParams<{ examId: string }>();
    const navigate = useNavigate();

    // ── Fetch basic result via React Query hook ──────────────────────────
    const {
        data: basicResult,
        isLoading: isBasicLoading,
        error: basicError,
    } = useExamResult(examId);

    // ── Fetch detailed result with per-question data ─────────────────────
    const [detailedResult, setDetailedResult] = useState<DetailedResultResponse | null>(null);
    const [isDetailedLoading, setIsDetailedLoading] = useState(false);
    const [detailedError, setDetailedError] = useState<string | null>(null);

    useEffect(() => {
        if (!examId) return;

        let cancelled = false;
        setIsDetailedLoading(true);
        setDetailedError(null);

        api.get<DetailedResultResponse>(`/v1/exams/${examId}/result/detailed`)
            .then((res) => {
                if (!cancelled) {
                    setDetailedResult(res.data);
                }
            })
            .catch((err: unknown) => {
                if (!cancelled) {
                    const axErr = err as { response?: { status?: number; data?: { message?: string } } };
                    // If 403 or specific "not published" error, treat as pending
                    if (axErr?.response?.status === 403) {
                        setDetailedResult({
                            scoreBreakdown: {} as ScoreBreakdown,
                            questions: [],
                            resultPublished: false,
                        });
                    } else {
                        setDetailedError(
                            axErr?.response?.data?.message ?? 'Failed to load detailed results.',
                        );
                    }
                }
            })
            .finally(() => {
                if (!cancelled) setIsDetailedLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [examId]);

    // ── Derive score breakdown from either source ────────────────────────
    // The detailed endpoint returns the full breakdown; the basic hook
    // returns the unwrapped ScoreBreakdown via the axios response interceptor.
    // The interceptor unwraps the API envelope, so at runtime basicResult
    // is a ScoreBreakdown, but the generic type still shows ApiResponse.
    const scoreBreakdown: ScoreBreakdown | null =
        detailedResult?.scoreBreakdown?.totalMarks != null
            ? detailedResult.scoreBreakdown
            : basicResult != null
                ? (basicResult as unknown as ScoreBreakdown)
                : null;

    const isLoading = isBasicLoading || isDetailedLoading;

    const handleBack = () => {
        navigate('/student/dashboard');
    };

    // ── Results pending state ────────────────────────────────────────────
    if (!isLoading && detailedResult && !detailedResult.resultPublished) {
        return <ResultsPending onBack={handleBack} />;
    }

    // ── Loading skeleton ─────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 animate-pulse">
                    {/* Header skeleton */}
                    <div className="mb-6">
                        <div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800 mb-3" />
                        <div className="h-7 w-64 rounded bg-slate-200 dark:bg-slate-800 mb-2" />
                        <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                    </div>
                    {/* Pass/fail banner skeleton */}
                    <div className="h-16 rounded-xl bg-slate-200 dark:bg-slate-800 mb-6" />
                    {/* Score cards skeleton */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="h-20 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        ))}
                    </div>
                    {/* Count bars skeleton */}
                    <div className="h-10 rounded-xl bg-slate-200 dark:bg-slate-800 mb-8" />
                    {/* Question review skeleton */}
                    <div className="h-5 w-44 rounded bg-slate-200 dark:bg-slate-800 mb-4" />
                    <div className="space-y-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── Error state ──────────────────────────────────────────────────────
    if (basicError || detailedError) {
        const errorMessage =
            detailedError ??
            (basicError instanceof Error ? basicError.message : 'Failed to load results.');

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-center">
                    <XCircle className="mx-auto h-10 w-10 text-red-500 mb-3" />
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Error Loading Results
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        {errorMessage}
                    </p>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // ── No data state ────────────────────────────────────────────────────
    if (!scoreBreakdown) {
        return <ResultsPending onBack={handleBack} />;
    }

    // ── Main result view ─────────────────────────────────────────────────
    const {
        obtainedMarks,
        totalMarks,
        percentage,
        passed,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSeconds,
    } = scoreBreakdown;

    const questions = detailedResult?.questions ?? [];
    const rank = detailedResult?.rank;
    const totalParticipants = detailedResult?.totalParticipants;
    const examTitle = detailedResult?.examTitle;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
                {/* Header */}
                <div className="mb-6">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </button>
                    {examTitle && (
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                            {examTitle}
                        </h1>
                    )}
                    <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300">
                        Exam Results
                    </h2>
                </div>

                {/* Pass/Fail banner */}
                <div
                    className={`rounded-xl border p-4 mb-6 flex items-center gap-3 ${passed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                        }`}
                >
                    {passed ? (
                        <Trophy className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                        <XCircle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <div>
                        <p
                            className={`text-sm font-bold ${passed
                                ? 'text-emerald-700 dark:text-emerald-300'
                                : 'text-red-700 dark:text-red-300'
                                }`}
                        >
                            {passed ? 'Congratulations! You Passed!' : 'You Did Not Pass'}
                        </p>
                        <p
                            className={`text-xs ${passed
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}
                        >
                            {passed
                                ? 'Great job on your exam performance.'
                                : 'Keep practicing and try again. You can do it!'}
                        </p>
                    </div>
                </div>

                {/* Score breakdown cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                    <ScoreCard
                        label="Total Score"
                        value={`${obtainedMarks}/${totalMarks}`}
                        icon={
                            <Award
                                className={`h-4 w-4 ${getScoreColor(percentage)}`}
                            />
                        }
                        colorClass={getScoreBgColor(percentage)}
                    />
                    <ScoreCard
                        label="Percentage"
                        value={`${percentage.toFixed(2)}%`}
                        icon={
                            <Trophy
                                className={`h-4 w-4 ${getScoreColor(percentage)}`}
                            />
                        }
                        colorClass={getScoreBgColor(percentage)}
                    />
                    {rank != null && (
                        <ScoreCard
                            label="Rank"
                            value={
                                totalParticipants
                                    ? `#${rank} / ${totalParticipants}`
                                    : `#${rank}`
                            }
                            icon={
                                <Trophy className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            }
                            colorClass="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
                        />
                    )}
                    <ScoreCard
                        label="Time Taken"
                        value={formatTimeTaken(timeTakenSeconds)}
                        icon={
                            <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                        }
                        colorClass="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                    />
                    <ScoreCard
                        label="Correct"
                        value={correctCount}
                        icon={
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        }
                        colorClass="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    />
                    <ScoreCard
                        label="Incorrect"
                        value={incorrectCount}
                        icon={
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        }
                        colorClass="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    />
                    <ScoreCard
                        label="Unanswered"
                        value={unansweredCount}
                        icon={
                            <HelpCircle className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        }
                        colorClass="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    />
                </div>

                {/* Correct / Incorrect / Unanswered count bars */}
                {(() => {
                    const total = correctCount + incorrectCount + unansweredCount;
                    if (total === 0) return null;
                    const correctPct = (correctCount / total) * 100;
                    const incorrectPct = (incorrectCount / total) * 100;
                    const unansweredPct = (unansweredCount / total) * 100;
                    return (
                        <div className="mb-8">
                            <div className="flex items-center gap-4 mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                                    Correct {correctCount}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                                    Incorrect {incorrectCount}
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    Unanswered {unansweredCount}
                                </span>
                            </div>
                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                {correctPct > 0 && (
                                    <div
                                        className="bg-emerald-500 transition-all duration-500"
                                        style={{ width: `${correctPct}%` }}
                                        title={`Correct: ${correctCount} (${correctPct.toFixed(1)}%)`}
                                    />
                                )}
                                {incorrectPct > 0 && (
                                    <div
                                        className="bg-red-500 transition-all duration-500"
                                        style={{ width: `${incorrectPct}%` }}
                                        title={`Incorrect: ${incorrectCount} (${incorrectPct.toFixed(1)}%)`}
                                    />
                                )}
                                {unansweredPct > 0 && (
                                    <div
                                        className="bg-slate-300 dark:bg-slate-600 transition-all duration-500"
                                        style={{ width: `${unansweredPct}%` }}
                                        title={`Unanswered: ${unansweredCount} (${unansweredPct.toFixed(1)}%)`}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })()}

                {/* Per-question review */}
                {questions.length > 0 && (
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">
                            Question Review
                        </h3>
                        <div className="space-y-4">
                            {questions.map((q) => (
                                <QuestionReview key={q.questionId} item={q} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
