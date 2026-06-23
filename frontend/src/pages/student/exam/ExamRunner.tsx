import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    AlertTriangle,
    BookmarkCheck,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    CloudOff,
    FileText,
    Flag,
    Loader2,
    Save,
    Send,
    Upload,
    X,
    Trash2,
} from 'lucide-react';
import {
    useStartExam,
    useSaveAnswers,
    useSubmitExam,
} from '../../../hooks/useExamSystemQueries';
import { uploadWrittenAnswer } from '../../../services/api';
import type {
    AnswerUpdate,
    DeviceInfo,
    QuestionType,
} from '../../../types/exam-system';
import ExamAntiCheatBridge from './ExamAntiCheatBridge';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const AUTO_SAVE_INTERVAL_MS = 30_000;
const SAVED_INDICATOR_DURATION_MS = 3_000;
const LOCAL_STORAGE_PREFIX = 'cw_exam_runner_';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

interface ExamQuestion {
    _id: string;
    question_en?: string;
    question_bn?: string;
    question_type: QuestionType;
    options: ExamOption[];
    marks: number;
    images?: string[];
}

interface ExamOption {
    key: string;
    text_en?: string;
    text_bn?: string;
    imageUrl?: string;
}

interface SessionData {
    sessionId: string;
    startedAt: string;
    expiresAt: string;
    questions: ExamQuestion[];
    examTitle?: string;
    durationMinutes?: number;
    attemptRevision?: number;
}

type NavQuestionStatus = 'unanswered' | 'answered' | 'review';

interface SavedAnswer {
    questionId: string;
    selectedAnswer: string;
    writtenAnswerUrl?: string;
}

interface LocalSessionBackup {
    examId: string;
    sessionId: string;
    answers: Record<string, SavedAnswer>;
    markedForReview: string[];
    currentIndex: number;
    expiresAt: string;
    savedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// localStorage Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getStorageKey(examId: string): string {
    return `${LOCAL_STORAGE_PREFIX}${examId}`;
}

function saveToLocalStorage(backup: LocalSessionBackup): void {
    try {
        localStorage.setItem(getStorageKey(backup.examId), JSON.stringify(backup));
    } catch {
        // localStorage full or unavailable
    }
}

function loadFromLocalStorage(examId: string): LocalSessionBackup | null {
    try {
        const raw = localStorage.getItem(getStorageKey(examId));
        if (!raw) return null;
        return JSON.parse(raw) as LocalSessionBackup;
    } catch {
        return null;
    }
}

function clearLocalStorage(examId: string): void {
    try {
        localStorage.removeItem(getStorageKey(examId));
    } catch {
        // ignore
    }
}

function generateDeviceFingerprint(): string {
    const parts = [
        navigator.userAgent,
        navigator.language,
        `${screen.width}x${screen.height}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    ];
    let hash = 0;
    const str = parts.join('|');
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash).toString(36);
}

function getDeviceInfo(): DeviceInfo {
    return {
        fingerprint: generateDeviceFingerprint(),
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
}

function formatTime(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** Human-readable remaining time for screen readers, e.g. "5 minutes 30 seconds remaining". */
function formatTimeSpoken(totalSeconds: number): string {
    const safe = Math.max(0, totalSeconds);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    const parts: string[] = [];
    if (mins > 0) parts.push(`${mins} minute${mins === 1 ? '' : 's'}`);
    if (secs > 0 || mins === 0) parts.push(`${secs} second${secs === 1 ? '' : 's'}`);
    return `${parts.join(' ')} remaining`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

/** Fixed top bar countdown timer — compact on mobile */
function CountdownTimer({
    remainingSeconds,
    isMobile,
}: {
    remainingSeconds: number;
    isMobile: boolean;
}) {
    const urgency =
        remainingSeconds <= 60
            ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
            : remainingSeconds <= 300
                ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
                : 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800';

    return (
        <div
            role="timer"
            aria-label={remainingSeconds >= 0 ? formatTimeSpoken(remainingSeconds) : 'Time remaining'}
            className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 border-b px-4 ${isMobile ? 'py-2' : 'py-3'
                } ${urgency}`}
        >
            <Clock className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
            <span className={`font-mono font-bold ${isMobile ? 'text-lg' : 'text-xl'}`} aria-hidden="true">
                {formatTime(remainingSeconds)}
            </span>
            {remainingSeconds <= 60 && (
                <span className="text-xs font-medium animate-pulse" aria-hidden="true">Time running out!</span>
            )}
        </div>
    );
}

/** Save status indicator */
function SaveIndicator({
    showSaved,
    isSaving,
    isOffline,
}: {
    showSaved: boolean;
    isSaving: boolean;
    isOffline: boolean;
}) {
    if (isOffline) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400" role="status" aria-live="polite">
                <CloudOff className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Offline — answers saved locally</span>
            </div>
        );
    }
    if (isSaving) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400" role="status" aria-live="polite">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span>Saving...</span>
            </div>
        );
    }
    if (showSaved) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400" role="status" aria-live="polite">
                <Save className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Saved</span>
            </div>
        );
    }
    return null;
}

/** Question navigation panel — grid of numbered buttons */
function QuestionNavPanel({
    questions,
    answers,
    markedForReview,
    currentIndex,
    onNavigate,
}: {
    questions: ExamQuestion[];
    answers: Record<string, SavedAnswer>;
    markedForReview: Set<string>;
    currentIndex: number;
    onNavigate: (index: number) => void;
}) {
    const getStatus = (q: ExamQuestion): NavQuestionStatus => {
        if (markedForReview.has(q._id)) return 'review';
        if (answers[q._id]) return 'answered';
        return 'unanswered';
    };

    const statusStyles: Record<NavQuestionStatus, string> = {
        unanswered:
            'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        answered:
            'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        review:
            'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    };

    return (
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {questions.map((q, idx) => {
                const status = getStatus(q);
                const isActive = idx === currentIndex;
                return (
                    <button
                        key={q._id}
                        type="button"
                        onClick={() => onNavigate(idx)}
                        className={`relative min-h-[44px] min-w-[44px] rounded-lg border text-sm font-semibold transition-all ${statusStyles[status]
                            } ${isActive ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                        aria-label={`Question ${idx + 1} — ${status}`}
                        aria-current={isActive ? 'true' : undefined}
                    >
                        {idx + 1}
                        {status === 'review' && (
                            <Flag className="absolute -top-1 -right-1 h-3 w-3 text-amber-500" aria-hidden="true" />
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/** MCQ option list with radio-style selection and visual indicators */
function MCQOptions({
    question,
    selectedAnswer,
    onSelect,
}: {
    question: ExamQuestion;
    selectedAnswer: string | undefined;
    onSelect: (optionKey: string) => void;
}) {
    const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

    return (
        <div className="space-y-3" role="radiogroup" aria-label="Answer options">
            {question.options.map((opt, idx) => {
                const isSelected = selectedAnswer === opt.key;
                const optionLabel = optionLabels[idx] ?? String(idx + 1);
                return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => onSelect(opt.key)}
                        className={`flex w-full items-start gap-3 rounded-xl border-2 p-4 text-left transition-all min-h-[44px] ${isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`Option ${optionLabel}: ${opt.text_en || opt.text_bn || ''}`}
                    >
                        <span
                            aria-hidden="true"
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${isSelected
                                ? 'bg-indigo-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                        >
                            {isSelected ? <Check className="h-4 w-4" /> : optionLabel}
                        </span>
                        <span className="pt-1 text-sm text-slate-700 dark:text-slate-200">
                            {opt.text_en || opt.text_bn || '—'}
                            {opt.imageUrl && (
                                <img
                                    src={opt.imageUrl}
                                    alt={`Option ${optionLabel}`}
                                    className="mt-2 max-h-40 rounded-lg"
                                />
                            )}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

/** Written/CQ answer area — textarea + file upload placeholder */
function WrittenAnswerArea({
    questionId,
    currentAnswer,
    writtenAnswerUrl,
    onTextChange,
    onFileUpload,
    onFileRemove,
}: {
    questionId: string;
    currentAnswer: string | undefined;
    writtenAnswerUrl: string | undefined;
    onTextChange: (text: string) => void;
    onFileUpload: (file: File) => Promise<void>;
    onFileRemove: () => void;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await onFileUpload(file);
        } catch (err) {
            toast.error('Failed to upload file');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-3">
            <div className="rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 text-slate-700 dark:text-slate-200 [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b-2 [&_.ql-toolbar]:border-slate-200 dark:[&_.ql-toolbar]:border-slate-700 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-sm">
                <ReactQuill
                    theme="snow"
                    id={`written-answer-${questionId}`}
                    value={currentAnswer ?? ''}
                    onChange={onTextChange}
                    placeholder="Type your answer here..."
                />
            </div>

            {writtenAnswerUrl ? (
                <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex-1 min-w-0">
                        <a href={writtenAnswerUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            View Uploaded Answer
                        </a>
                    </div>
                    <button
                        type="button"
                        onClick={onFileRemove}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Remove uploaded answer"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            ) : (
                <>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/jpeg,image/png,application/pdf"
                        className="hidden"
                        aria-label="Upload handwritten answer file (JPG, PNG, or PDF, max 10MB)"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors min-h-[44px] disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {isUploading ? 'Uploading...' : 'Upload handwritten answer (photo)'}
                    </button>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                        Supported: JPG, PNG, PDF — Max 10MB
                    </p>
                </>
            )}
        </div>
    );
}

/** Submit confirmation dialog */
function SubmitConfirmDialog({
    answeredCount,
    unansweredCount,
    reviewCount,
    totalCount,
    isSubmitting,
    onConfirm,
    onCancel,
}: {
    answeredCount: number;
    unansweredCount: number;
    reviewCount: number;
    totalCount: number;
    isSubmitting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-dialog-title"
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
        >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40">
                        <Send className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    </div>
                    <h3 id="submit-dialog-title" className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        Submit Exam?
                    </h3>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2.5">
                        <span className="text-sm text-emerald-700 dark:text-emerald-300">Answered</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-300">
                            {answeredCount}/{totalCount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-2.5">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Unanswered</span>
                        <span className="font-bold text-slate-600 dark:text-slate-300">
                            {unansweredCount}
                        </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5">
                        <span className="text-sm text-amber-700 dark:text-amber-300">Marked for Review</span>
                        <span className="font-bold text-amber-700 dark:text-amber-300">
                            {reviewCount}
                        </span>
                    </div>
                </div>

                {unansweredCount > 0 && (
                    <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                            You have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?
                        </p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]"
                    >
                        Go Back
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ExamRunner() {
    const { examId = '' } = useParams<{ examId: string }>();
    const navigate = useNavigate();

    // ── Session state ────────────────────────────────────────────────────
    const [session, setSession] = useState<SessionData | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [startError, setStartError] = useState<string | null>(null);
    const [sessionLocked, setSessionLocked] = useState(false);

    // ── Exam state ───────────────────────────────────────────────────────
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());

    // ── UI state ─────────────────────────────────────────────────────────
    const [remainingSeconds, setRemainingSeconds] = useState<number>(-1);
    const [showSubmitDialog, setShowSubmitDialog] = useState(false);
    const [showNavSheet, setShowNavSheet] = useState(false);
    const [showSavedIndicator, setShowSavedIndicator] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // ── Refs ─────────────────────────────────────────────────────────────
    const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const savedIndicatorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoSubmitTriggeredRef = useRef(false);

    // ── Mutations ────────────────────────────────────────────────────────
    const startExamMutation = useStartExam();
    const saveAnswersMutation = useSaveAnswers(examId, session?.sessionId ?? '');
    const submitExamMutation = useSubmitExam();

    // ── Derived values ───────────────────────────────────────────────────
    const questions = session?.questions ?? [];
    const currentQuestion = questions[currentIndex] ?? null;
    const answeredCount = Object.keys(answers).length;
    const unansweredCount = questions.length - answeredCount;
    const reviewCount = markedForReview.size;

    // ── Responsive listener ──────────────────────────────────────────────
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ── Online/offline listener ──────────────────────────────────────────
    useEffect(() => {
        const goOnline = () => setIsOffline(false);
        const goOffline = () => setIsOffline(true);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, []);

    // ── Persist to localStorage on answer/review changes ─────────────────
    const persistToLocal = useCallback(() => {
        if (!session) return;
        const backup: LocalSessionBackup = {
            examId,
            sessionId: session.sessionId,
            answers,
            markedForReview: Array.from(markedForReview),
            currentIndex,
            expiresAt: session.expiresAt,
            savedAt: new Date().toISOString(),
        };
        saveToLocalStorage(backup);
    }, [answers, currentIndex, examId, markedForReview, session]);

    useEffect(() => {
        persistToLocal();
    }, [persistToLocal]);

    // ── Auto-save to server every 30 seconds ─────────────────────────────
    const performAutoSave = useCallback(async () => {
        if (!session || Object.keys(answers).length === 0) return;

        const answerUpdates: AnswerUpdate[] = Object.values(answers).map((a) => ({
            questionId: a.questionId,
            selectedAnswer: a.selectedAnswer,
            writtenAnswerUrl: a.writtenAnswerUrl,
        }));

        if (isOffline) {
            // Already persisted to localStorage above
            return;
        }

        setIsSaving(true);
        try {
            await saveAnswersMutation.mutateAsync(answerUpdates);
            setShowSavedIndicator(true);
            if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
            savedIndicatorTimerRef.current = setTimeout(
                () => setShowSavedIndicator(false),
                SAVED_INDICATOR_DURATION_MS,
            );
        } catch {
            // Save failed — localStorage backup is already in place
        } finally {
            setIsSaving(false);
        }
    }, [answers, isOffline, saveAnswersMutation, session]);

    useEffect(() => {
        if (!session) return;
        autoSaveTimerRef.current = setInterval(() => {
            void performAutoSave();
        }, AUTO_SAVE_INTERVAL_MS);
        return () => {
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
        };
    }, [performAutoSave, session]);

    // ── Countdown timer ──────────────────────────────────────────────────
    useEffect(() => {
        if (!session) return;
        const tick = () => {
            const expiresMs = new Date(session.expiresAt).getTime();
            const nowMs = Date.now();
            const diff = Math.max(0, Math.floor((expiresMs - nowMs) / 1000));
            setRemainingSeconds(diff);
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [session]);

    // ── Auto-submit on timer expiry ──────────────────────────────────────
    useEffect(() => {
        if (remainingSeconds < 0 || remainingSeconds > 0 || !session || autoSubmitTriggeredRef.current) return;
        autoSubmitTriggeredRef.current = true;
        void handleSubmit();
    }, [remainingSeconds, session]);

    // ── Session restore on mount ─────────────────────────────────────────
    useEffect(() => {
        if (!examId) return;
        const backup = loadFromLocalStorage(examId);
        if (!backup) return;

        // Check if session is still valid (not expired)
        const expiresMs = new Date(backup.expiresAt).getTime();
        if (Date.now() >= expiresMs) {
            clearLocalStorage(examId);
            return;
        }
        setRemainingSeconds(Math.max(0, Math.floor((expiresMs - Date.now()) / 1000)));

        // Restore session from localStorage
        setSession({
            sessionId: backup.sessionId,
            startedAt: '',
            expiresAt: backup.expiresAt,
            questions: [], // Will be populated by startExam or a fetch
        });
        setAnswers(backup.answers);
        setMarkedForReview(new Set(backup.markedForReview));
        setCurrentIndex(backup.currentIndex);
    }, [examId]);

    // ── Cleanup on unmount ───────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
            if (savedIndicatorTimerRef.current) clearTimeout(savedIndicatorTimerRef.current);
        };
    }, []);

    // ── Handlers ─────────────────────────────────────────────────────────

    const handleStartExam = async () => {
        if (!examId || isStarting) return;
        setIsStarting(true);
        setStartError(null);

        try {
            const deviceInfo = getDeviceInfo();
            const result = await startExamMutation.mutateAsync({ examId, deviceInfo });
            const data = result as unknown as {
                session?: { _id?: string; sessionId?: string; startedAt?: string; expiresAt?: string };
                questions?: ExamQuestion[];
                timer?: { durationMinutes?: number; startedAt?: string; expiresAt?: string; remainingSeconds?: number };
            };
            const sessionId = String(data.session?.sessionId || data.session?._id || '');
            const startedAt = String(data.timer?.startedAt || data.session?.startedAt || new Date().toISOString());
            const expiresAt = String(data.timer?.expiresAt || data.session?.expiresAt || new Date(Date.now() + 60 * 60 * 1000).toISOString());
            const initialRemainingSeconds = Number.isFinite(Number(data.timer?.remainingSeconds))
                ? Number(data.timer?.remainingSeconds)
                : Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

            const sessionData: SessionData = {
                sessionId,
                startedAt,
                expiresAt,
                questions: data.questions ?? [],
                examTitle: '',
                durationMinutes: data.timer?.durationMinutes,
            };
            setRemainingSeconds(Math.max(0, initialRemainingSeconds));
            setSession(sessionData);
            autoSubmitTriggeredRef.current = false;
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: { message?: string } } };
            setStartError(axErr?.response?.data?.message ?? 'Failed to start exam. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    const handleSelectAnswer = (questionId: string, selectedAnswer: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                questionId,
                selectedAnswer,
                writtenAnswerUrl: prev[questionId]?.writtenAnswerUrl,
            },
        }));
    };

    const handleWrittenAnswer = (questionId: string, text: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                questionId,
                selectedAnswer: text,
                writtenAnswerUrl: prev[questionId]?.writtenAnswerUrl,
            },
        }));
    };

    const handleFileUpload = async (questionId: string, file: File) => {
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
            toast.error("File size must be less than 10MB");
            return;
        }

        try {
            const res = await uploadWrittenAnswer(file);
            setAnswers((prev) => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    questionId,
                    writtenAnswerUrl: res.data.url,
                },
            }));
        } catch (error) {
            throw error;
        }
    };

    const handleFileRemove = (questionId: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                questionId,
                writtenAnswerUrl: undefined,
            },
        }));
    };

    const handleToggleReview = (questionId: string) => {
        setMarkedForReview((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) {
                next.delete(questionId);
            } else {
                next.add(questionId);
            }
            return next;
        });
    };

    const handleNavigate = (index: number) => {
        if (index >= 0 && index < questions.length) {
            setCurrentIndex(index);
            setShowNavSheet(false);
        }
    };

    const handleSubmit = async () => {
        if (!session || isSubmitting) return;
        setIsSubmitting(true);

        // Final save before submit
        await performAutoSave();

        try {
            await submitExamMutation.mutateAsync({
                examId,
                sessionId: session.sessionId,
            });
            clearLocalStorage(examId);
            navigate(`/student/exam/${examId}/result`);
        } catch {
            // If submit fails, keep the dialog open
            setIsSubmitting(false);
        }
    };

    // ── Loading state ────────────────────────────────────────────────────
    if (!session) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
                    <FileText className="mx-auto h-12 w-12 text-indigo-500 mb-4" />
                    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                        Ready to Start
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Click below to begin your exam session. Your answers will be auto-saved every 30 seconds.
                    </p>
                    {startError && (
                        <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                            <p className="text-xs text-red-700 dark:text-red-300">{startError}</p>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={() => void handleStartExam()}
                        disabled={isStarting}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
                    >
                        {isStarting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                        {isStarting ? 'Starting...' : 'Start Exam'}
                    </button>
                </div>
            </div>
        );
    }

    // ── Main exam interface ──────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Anti-cheat signal collector — active only while a session is live */}
            {session.sessionId && (
                <ExamAntiCheatBridge
                    examId={examId}
                    sessionId={session.sessionId}
                    attemptRevision={session.attemptRevision ?? 0}
                    onLock={() => {
                        setSessionLocked(true);
                        toast.error('Your exam session was locked due to suspicious activity.');
                    }}
                    onForceSubmit={() => {
                        if (autoSubmitTriggeredRef.current) return;
                        autoSubmitTriggeredRef.current = true;
                        toast.error('Exam auto-submitted due to repeated violations.');
                        void handleSubmit();
                    }}
                />
            )}

            {/* Session-locked overlay — blocks interaction after a server lock decision */}
            {sessionLocked && (
                <div
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="session-locked-title"
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
                >
                    <div className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 p-6 text-center">
                        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" aria-hidden="true" />
                        <h2 id="session-locked-title" className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">
                            Session Locked
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                            Your session was locked due to repeated suspicious activity. You can submit
                            what you have so far.
                        </p>
                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 min-h-[44px]"
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit Now
                        </button>
                    </div>
                </div>
            )}


            {/* Countdown Timer — fixed top bar */}
            <CountdownTimer remainingSeconds={remainingSeconds} isMobile={isMobile} />

            {/* Main content area with top padding for fixed timer */}
            <div className={`mx-auto max-w-5xl px-4 ${isMobile ? 'pt-14 pb-24' : 'pt-16 pb-8'}`}>
                {/* Save indicator + exam info bar */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                            Question {currentIndex + 1} of {questions.length}
                        </span>
                        {currentQuestion && (
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                                ({currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''})
                            </span>
                        )}
                    </div>
                    <SaveIndicator
                        showSaved={showSavedIndicator}
                        isSaving={isSaving}
                        isOffline={isOffline}
                    />
                </div>

                <div className={`flex gap-6 ${isMobile ? 'flex-col' : ''}`}>
                    {/* Question display area */}
                    <div className="flex-1 min-w-0">
                        {currentQuestion ? (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6">
                                {/* Question text */}
                                <div className="mb-6">
                                    <p className="text-base text-slate-800 dark:text-slate-100 leading-relaxed">
                                        {currentQuestion.question_en || currentQuestion.question_bn || 'Question text not available'}
                                    </p>
                                    {currentQuestion.images && currentQuestion.images.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {currentQuestion.images.map((img, idx) => (
                                                <img
                                                    key={idx}
                                                    src={img}
                                                    alt={`Question diagram ${idx + 1}`}
                                                    className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-700"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Answer area — MCQ or Written */}
                                {currentQuestion.question_type === 'written_cq' ? (
                                    <WrittenAnswerArea
                                        questionId={currentQuestion._id}
                                        currentAnswer={answers[currentQuestion._id]?.selectedAnswer}
                                        writtenAnswerUrl={answers[currentQuestion._id]?.writtenAnswerUrl}
                                        onTextChange={(text) => handleWrittenAnswer(currentQuestion._id, text)}
                                        onFileUpload={(file) => handleFileUpload(currentQuestion._id, file)}
                                        onFileRemove={() => handleFileRemove(currentQuestion._id)}
                                    />
                                ) : (
                                    <MCQOptions
                                        question={currentQuestion}
                                        selectedAnswer={answers[currentQuestion._id]?.selectedAnswer}
                                        onSelect={(key) => handleSelectAnswer(currentQuestion._id, key)}
                                    />
                                )}

                                {/* Mark for review + navigation */}
                                <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleReview(currentQuestion._id)}
                                        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${markedForReview.has(currentQuestion._id)
                                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                            }`}
                                    >
                                        {markedForReview.has(currentQuestion._id) ? (
                                            <BookmarkCheck className="h-4 w-4" />
                                        ) : (
                                            <Flag className="h-4 w-4" />
                                        )}
                                        {markedForReview.has(currentQuestion._id) ? 'Marked' : 'Review'}
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleNavigate(currentIndex - 1)}
                                            disabled={currentIndex === 0}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors min-h-[44px]"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                            Prev
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleNavigate(currentIndex + 1)}
                                            disabled={currentIndex === questions.length - 1}
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors min-h-[44px]"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center">
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    No questions loaded. Please wait or refresh.
                                </p>
                            </div>
                        )}

                        {/* Submit button */}
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowSubmitDialog(true)}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors min-h-[44px]"
                            >
                                <Send className="h-4 w-4" />
                                Submit Exam
                            </button>
                        </div>
                    </div>

                    {/* Desktop question navigation sidebar */}
                    {!isMobile && (
                        <div className="w-64 shrink-0">
                            <div className="sticky top-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                                    Questions
                                </h3>
                                <QuestionNavPanel
                                    questions={questions}
                                    answers={answers}
                                    markedForReview={markedForReview}
                                    currentIndex={currentIndex}
                                    onNavigate={handleNavigate}
                                />
                                <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-800" />
                                        Answered ({answeredCount})
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded bg-slate-200 dark:bg-slate-700" />
                                        Unanswered ({unansweredCount})
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded bg-amber-200 dark:bg-amber-800" />
                                        Review ({reviewCount})
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile bottom sheet toggle for question navigation */}
            {isMobile && (
                <>
                    <button
                        type="button"
                        onClick={() => setShowNavSheet(!showNavSheet)}
                        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 min-h-[44px]"
                    >
                        <FileText className="h-4 w-4" />
                        Questions ({answeredCount}/{questions.length})
                        <span className="ml-auto text-xs text-slate-400">
                            {showNavSheet ? 'Tap to close' : 'Tap to navigate'}
                        </span>
                    </button>

                    {showNavSheet && (
                        <div className="fixed inset-0 z-40" onClick={() => setShowNavSheet(false)}>
                            <div className="absolute inset-0 bg-black/30" />
                            <div
                                className="absolute bottom-12 left-0 right-0 max-h-[60vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                        Question Navigation
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowNavSheet(false)}
                                        className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        aria-label="Close question navigation"
                                    >
                                        <X className="h-4 w-4 text-slate-500" aria-hidden="true" />
                                    </button>
                                </div>
                                <QuestionNavPanel
                                    questions={questions}
                                    answers={answers}
                                    markedForReview={markedForReview}
                                    currentIndex={currentIndex}
                                    onNavigate={handleNavigate}
                                />
                                <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded bg-emerald-200 dark:bg-emerald-800" />
                                        Answered
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded bg-slate-200 dark:bg-slate-700" />
                                        Unanswered
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="h-2.5 w-2.5 rounded bg-amber-200 dark:bg-amber-800" />
                                        Review
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Submit confirmation dialog */}
            {showSubmitDialog && (
                <SubmitConfirmDialog
                    answeredCount={answeredCount}
                    unansweredCount={unansweredCount}
                    reviewCount={reviewCount}
                    totalCount={questions.length}
                    isSubmitting={isSubmitting}
                    onConfirm={() => void handleSubmit()}
                    onCancel={() => setShowSubmitDialog(false)}
                />
            )}
        </div>
    );
}
