import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    BookOpen,
    Check,
    CheckCircle2,
    Loader2,
    RotateCcw,
    Trophy,
    X,
    XCircle,
} from 'lucide-react';
import {
    useStartPractice,
    useSubmitPracticeAnswer,
} from '../../../hooks/useExamSystemQueries';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

interface PracticeQuestion {
    _id: string;
    question_en?: string;
    question_bn?: string;
    options: PracticeOption[];
    marks: number;
}

interface PracticeOption {
    key: string;
    text_en?: string;
    text_bn?: string;
    imageUrl?: string;
}

interface AnswerFeedback {
    questionId: string;
    selectedAnswer: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation?: string;
}

interface SessionSummary {
    total: number;
    correct: number;
    incorrect: number;
    accuracy: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function ProgressBar({ current, total }: { current: number; total: number }) {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Question {current} of {total}
                </span>
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {percentage.toFixed(0)}%
                </span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                    className="h-2 rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function QuestionCard({
    question,
    questionIndex,
    selectedAnswer,
    feedback,
    onSelectAnswer,
    onSubmitAnswer,
    isSubmitting,
}: {
    question: PracticeQuestion;
    questionIndex: number;
    selectedAnswer: string | null;
    feedback: AnswerFeedback | null;
    onSelectAnswer: (key: string) => void;
    onSubmitAnswer: () => void;
    isSubmitting: boolean;
}) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const hasFeedback = feedback !== null;

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="mb-6">
                <span className="inline-block rounded-lg bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3">
                    Q{questionIndex + 1}
                </span>
                <p className="text-base font-medium text-slate-800 dark:text-slate-100 leading-relaxed">
                    {question.question_en || question.question_bn || 'Question text unavailable'}
                </p>
            </div>

            <div className="space-y-3 mb-6">
                {question.options.map((opt, idx) => {
                    const isSelected = selectedAnswer === opt.key;
                    const isCorrectOption = hasFeedback && feedback.correctAnswer === opt.key;
                    const isWrongSelection = hasFeedback && isSelected && !feedback.isCorrect;

                    let optionStyle = 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600';
                    if (hasFeedback && isCorrectOption) {
                        optionStyle = 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-900/20';
                    } else if (isWrongSelection) {
                        optionStyle = 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
                    } else if (isSelected && !hasFeedback) {
                        optionStyle = 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20';
                    }

                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => !hasFeedback && onSelectAnswer(opt.key)}
                            disabled={hasFeedback}
                            className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all min-h-[44px] ${optionStyle} ${hasFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                            aria-pressed={isSelected}
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${hasFeedback && isCorrectOption
                                    ? 'bg-emerald-500 text-white'
                                    : isWrongSelection
                                        ? 'bg-red-500 text-white'
                                        : isSelected && !hasFeedback
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                    }`}
                            >
                                {hasFeedback && isCorrectOption ? (
                                    <Check className="h-4 w-4" />
                                ) : isWrongSelection ? (
                                    <X className="h-4 w-4" />
                                ) : (
                                    optionLabels[idx] ?? idx + 1
                                )}
                            </span>
                            <span className="pt-1 text-sm text-slate-700 dark:text-slate-200">
                                {opt.text_en || opt.text_bn || '—'}
                                {opt.imageUrl && (
                                    <img src={opt.imageUrl} alt={`Option ${optionLabels[idx]}`} className="mt-2 max-h-40 rounded-lg" />
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>

            {hasFeedback && (
                <div className={`rounded-xl p-4 mb-4 ${feedback.isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    }`}>
                    <div className="flex items-center gap-2 mb-2">
                        {feedback.isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                        <span className={`text-sm font-semibold ${feedback.isCorrect
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-red-700 dark:text-red-300'
                            }`}>
                            {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                    </div>
                    {feedback.explanation && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {feedback.explanation}
                        </p>
                    )}
                </div>
            )}

            {!hasFeedback && (
                <button
                    type="button"
                    onClick={onSubmitAnswer}
                    disabled={!selectedAnswer || isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                    {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                    {isSubmitting ? 'Checking...' : 'Submit Answer'}
                </button>
            )}
        </div>
    );
}

function SessionSummaryCard({
    summary,
    onRestart,
    onGoBack,
}: {
    summary: SessionSummary;
    onRestart: () => void;
    onGoBack: () => void;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
            <Trophy className="mx-auto h-14 w-14 text-amber-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                Practice Complete!
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Here&apos;s how you did in this session
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.correct}</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Correct</p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.incorrect}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70">Incorrect</p>
                </div>
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 p-4">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{summary.accuracy.toFixed(0)}%</p>
                    <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Accuracy</p>
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onGoBack}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                >
                    Back to Topics
                </button>
                <button
                    type="button"
                    onClick={onRestart}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
                >
                    <RotateCcw className="h-4 w-4" />
                    Practice Again
                </button>
            </div>
        </div>
    );
}


// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function PracticeSession() {
    const { topicId = '' } = useParams<{ topicId: string }>();
    const navigate = useNavigate();

    const { data: sessionData, isLoading, isError, refetch } = useStartPractice(topicId);
    const submitAnswerMutation = useSubmitPracticeAnswer();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [feedbacks, setFeedbacks] = useState<Record<string, AnswerFeedback>>({});
    const [isComplete, setIsComplete] = useState(false);

    const sessionId = sessionData?.data?.sessionId ?? '';
    const questions = (sessionData?.data?.questions ?? []) as unknown as PracticeQuestion[];
    const currentQuestion = questions[currentIndex] ?? null;
    const currentFeedback = currentQuestion ? feedbacks[currentQuestion._id] ?? null : null;

    const handleSubmitAnswer = useCallback(async () => {
        if (!currentQuestion || !selectedAnswer || !sessionId) return;

        try {
            const result = await submitAnswerMutation.mutateAsync({
                sessionId,
                payload: { questionId: currentQuestion._id, answer: selectedAnswer },
            });

            const fb: AnswerFeedback = {
                questionId: currentQuestion._id,
                selectedAnswer,
                isCorrect: result.data.isCorrect,
                correctAnswer: result.data.correctAnswer,
                explanation: result.data.explanation,
            };

            setFeedbacks((prev) => ({ ...prev, [currentQuestion._id]: fb }));
        } catch {
            setFeedbacks((prev) => ({
                ...prev,
                [currentQuestion._id]: {
                    questionId: currentQuestion._id,
                    selectedAnswer,
                    isCorrect: false,
                    correctAnswer: '',
                    explanation: 'Failed to verify answer. Please try again.',
                },
            }));
        }
    }, [currentQuestion, selectedAnswer, sessionId, submitAnswerMutation]);

    const handleNext = useCallback(() => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex((prev) => prev + 1);
            setSelectedAnswer(null);
        } else {
            setIsComplete(true);
        }
    }, [currentIndex, questions.length]);

    const handleRestart = useCallback(() => {
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setFeedbacks({});
        setIsComplete(false);
        void refetch();
    }, [refetch]);

    const handleGoBack = useCallback(() => {
        navigate(-1);
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500 mb-3" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading practice session...</p>
                </div>
            </div>
        );
    }

    if (isError || questions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <BookOpen className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        {isError ? 'Failed to load practice session' : 'No questions available for this topic'}
                    </p>
                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    if (isComplete) {
        const allFeedbacks = Object.values(feedbacks);
        const correct = allFeedbacks.filter((f) => f.isCorrect).length;
        const summary: SessionSummary = {
            total: questions.length,
            correct,
            incorrect: questions.length - correct,
            accuracy: questions.length > 0 ? (correct / questions.length) * 100 : 0,
        };

        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
                <div className="mx-auto max-w-xl px-4 py-8">
                    <SessionSummaryCard
                        summary={summary}
                        onRestart={handleRestart}
                        onGoBack={handleGoBack}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-xl px-4 py-6">
                <div className="mb-4">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-indigo-500" />
                        Practice Session
                    </h1>
                </div>

                <ProgressBar current={currentIndex + 1} total={questions.length} />

                {currentQuestion && (
                    <QuestionCard
                        question={currentQuestion}
                        questionIndex={currentIndex}
                        selectedAnswer={selectedAnswer}
                        feedback={currentFeedback}
                        onSelectAnswer={setSelectedAnswer}
                        onSubmitAnswer={() => void handleSubmitAnswer()}
                        isSubmitting={submitAnswerMutation.isPending}
                    />
                )}

                {currentFeedback && (
                    <button
                        type="button"
                        onClick={handleNext}
                        className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 dark:bg-slate-200 px-6 py-3 text-sm font-semibold text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors min-h-[44px]"
                    >
                        {currentIndex < questions.length - 1 ? (
                            <>
                                Next Question
                                <ArrowRight className="h-4 w-4" />
                            </>
                        ) : (
                            <>
                                View Summary
                                <Trophy className="h-4 w-4" />
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
