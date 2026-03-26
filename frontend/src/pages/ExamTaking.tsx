import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { AxiosError } from 'axios';
import {
    ApiExam,
    ApiExamSession,
    ApiQuestion,
    ExamAnswerMap,
    getExamAttemptState,
    getExamAttemptStreamUrl,
    logExamAttemptEvent,
    startExam,
    submitExamAttempt,
    trackAnalyticsEvent,
    uploadWrittenAnswer,
    getStudentExamDetails,
} from '../services/api';
import { useExamTimer } from '../hooks/useExamTimer';
import { useAntiCheat } from '../hooks/useAntiCheat';
import { useAutoSave } from '../hooks/useAutoSave';
import { motion } from 'framer-motion';
import {
    CheckCircle,
    Shield,
    Info,
    AlertTriangle,
    Clock,
    Target,
    ChevronRight,
    Lock,
    Eye,
    Monitor
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import ExamHeader from '../components/exam/ExamHeader';
import ExamSidebar from '../components/exam/ExamSidebar';
import QuestionCard from '../components/exam/QuestionCard';
import ExamSubmitModal from '../components/exam/ExamSubmitModal';
import ProfileCompletionLock from '../components/profile/ProfileCompletionLock';
import { AlertCircle, Loader2 } from 'lucide-react';

type SubmitReason = 'manual' | 'auto_timeout';

export default function ExamTakingPage() {
    const { examId } = useParams();
    const navigate = useNavigate();

    const [exam, setExam] = useState<ApiExam | null>(null);
    const [session, setSession] = useState<ApiExamSession | null>(null);
    const [questions, setQuestions] = useState<ApiQuestion[]>([]);
    const [loading, setLoading] = useState(true);

    const [answers, setAnswers] = useState<ExamAnswerMap>({});
    const [markedForReview, setMarkedForReview] = useState<Set<string>>(new Set());
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attemptRevision, setAttemptRevision] = useState(0);
    const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
    const [showMobilePalette, setShowMobilePalette] = useState(false);

    const [isLandingMode, setIsLandingMode] = useState(true);
    const [rulesAgreed, setRulesAgreed] = useState(false);
    const [startingEvent, setStartingEvent] = useState(false);
    const [hasScrolledInstructions, setHasScrolledInstructions] = useState(false);
    const instructionsScrollRef = useRef<HTMLDivElement | null>(null);
    const [serverOffsetMs, setServerOffsetMs] = useState(0);
    const [autosaveIntervalMs, setAutosaveIntervalMs] = useState(5000);
    const [eligibility, setEligibility] = useState<{
        eligible: boolean;
        reasons: string[];
    } | null>(null);

    const warnedThresholdsRef = useRef<Set<number>>(new Set());

    const hydrateSessionAnswers = useCallback((nextSession: ApiExamSession) => {
        setSession(nextSession);
        setAttemptRevision(Number(nextSession.attemptRevision || 0));
        const mapped: ExamAnswerMap = {};
        for (const answer of nextSession.savedAnswers || []) {
            mapped[String(answer.questionId)] = {
                selectedAnswer: answer.selectedAnswer,
                writtenAnswerUrl: answer.writtenAnswerUrl,
            };
        }
        setAnswers(mapped);
    }, []);

    const handleStartExam = useCallback(async () => {
        if (!examId) return;
        setStartingEvent(true);
        try {
            const { data } = await startExam(examId);

            if (data.redirect && data.externalExamUrl) {
                window.location.href = data.externalExamUrl;
                return;
            }

            setExam(data.exam);
            setQuestions(data.questions || []);
            if (typeof (data as any).serverOffsetMs === 'number') {
                setServerOffsetMs(Number((data as any).serverOffsetMs));
            } else if ((data as any).serverNow) {
                const offset = new Date(String((data as any).serverNow)).getTime() - Date.now();
                if (Number.isFinite(offset)) setServerOffsetMs(offset);
            }
            const autosaveSec = Number((data as any).autosaveIntervalSec || (data as any).exam?.autosave_interval_sec || (data as any).exam?.autosaveIntervalSec || 5);
            if (Number.isFinite(autosaveSec) && autosaveSec >= 3) {
                setAutosaveIntervalMs(Math.floor(autosaveSec * 1000));
            }
            if (data.session) {
                hydrateSessionAnswers(data.session);
            }
            void trackAnalyticsEvent({
                eventName: 'exam_started',
                module: 'exams',
                source: 'student',
                meta: { examId, attemptId: data.session?.sessionId || '', entry: 'exam_take' },
            }).catch(() => undefined);
            setIsLandingMode(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to start exam.');
            navigate('/student/dashboard');
        } finally {
            setStartingEvent(false);
            setLoading(false);
        }
    }, [examId, navigate, hydrateSessionAnswers]);

    const { data: examDetailsData } = useQuery({
        queryKey: ['examDetails', examId],
        queryFn: async () => {
            const { data } = await getStudentExamDetails(examId!);
            return data;
        },
        enabled: !!examId && isLandingMode,
        staleTime: 0,
    });

    useEffect(() => {
        if (!examDetailsData) return;
        const data = examDetailsData;
        setExam(data.exam);
        if (data.eligibility) {
            setEligibility({
                eligible: Boolean(data.eligibility.eligible),
                reasons: data.eligibility.reasons || [],
            });
        } else {
            setEligibility(null);
        }
        const autosaveSec = Number((data as any).exam?.autosave_interval_sec || (data as any).exam?.autosaveIntervalSec || 5);
        if (Number.isFinite(autosaveSec) && autosaveSec >= 3) {
            setAutosaveIntervalMs(Math.floor(autosaveSec * 1000));
        }
        if ((data as any).serverNow) {
            const offset = new Date(String((data as any).serverNow)).getTime() - Date.now();
            if (Number.isFinite(offset)) setServerOffsetMs(offset);
        }

        const canAutoStart = data.eligibility ? Boolean(data.eligibility.eligible) : true;
        if (canAutoStart && (data.hasActiveSession || !data.exam.require_instructions_agreement)) {
            handleStartExam().catch(() => undefined);
        } else {
            setLoading(false);
        }
    }, [examDetailsData, handleStartExam]);

    useEffect(() => {
        if (!isLandingMode) return;
        const node = instructionsScrollRef.current;
        if (!node) return;

        const frame = window.requestAnimationFrame(() => {
            const requiresScroll = node.scrollHeight > node.clientHeight + 4;
            if (!requiresScroll) {
                setHasScrolledInstructions(true);
            }
        });

        return () => window.cancelAnimationFrame(frame);
    }, [isLandingMode, exam?.instructions]);

    const syncAttemptState = useCallback(async (latestRevision?: number) => {
        if (!examId || !session?.sessionId) return;
        try {
            const { data } = await getExamAttemptState(examId, session.sessionId);
            setExam(data.exam);
            setQuestions(data.questions || []);
            const autosaveSec = Number((data as any).exam?.autosave_interval_sec || (data as any).exam?.autosaveIntervalSec || 5);
            if (Number.isFinite(autosaveSec) && autosaveSec >= 3) {
                setAutosaveIntervalMs(Math.floor(autosaveSec * 1000));
            }
            if ((data as any).serverNow) {
                const offset = new Date(String((data as any).serverNow)).getTime() - Date.now();
                if (Number.isFinite(offset)) setServerOffsetMs(offset);
            }
            hydrateSessionAnswers(data.session);
            if (typeof latestRevision === 'number') {
                setAttemptRevision(latestRevision);
            }
        } catch {
            // Non-blocking fallback, user can keep working on local state
        }
    }, [examId, session?.sessionId, hydrateSessionAnswers]);

    const { flushQueue, isSaving, isOffline, latestAttemptRevision, lastSavedAt } = useAutoSave({
        examId: examId || '',
        attemptId: session?.sessionId,
        answers,
        attemptRevision,
        intervalMs: autosaveIntervalMs,
        enabled: Boolean(session?.sessionId) && !session?.sessionLocked,
        onRevisionChange: setAttemptRevision,
        onStaleAttempt: (latest) => {
            setAttemptRevision(latest);
            syncAttemptState(latest).catch(() => undefined);
        },
        onHydrateCachedAnswers: (cachedAnswers) => {
            setAnswers((prev) => (Object.keys(prev).length > 0 ? prev : cachedAnswers));
        },
    });

    useEffect(() => {
        if (latestAttemptRevision !== attemptRevision) {
            setAttemptRevision(latestAttemptRevision);
        }
    }, [latestAttemptRevision, attemptRevision]);

    const handleFinalSubmit = useCallback(async (reason: SubmitReason = 'manual') => {
        if (!examId || !session?.sessionId || isSubmitting || session.sessionLocked) return;

        setIsSubmitting(true);
        try {
            await flushQueue();

            const answersPayload = Object.entries(answers).map(([questionId, answer]) => ({
                questionId,
                selectedAnswer: answer.selectedAnswer,
                writtenAnswerUrl: answer.writtenAnswerUrl,
            }));

            const { data } = await submitExamAttempt(examId, session.sessionId, {
                answers: answersPayload,
                attemptRevision,
                submissionType: reason === 'manual' ? 'manual' : 'auto_timeout',
                isAutoSubmit: reason !== 'manual',
            });

            if (typeof data.attemptRevision === 'number') {
                setAttemptRevision(data.attemptRevision);
            }

            toast.success(data.message || 'Exam submitted successfully.');
            void trackAnalyticsEvent({
                eventName: 'exam_submitted',
                module: 'exams',
                source: 'student',
                meta: { examId, attemptId: session.sessionId, reason },
            }).catch(() => undefined);
            const resultPath = `/exam/result/${examId}`;
            setShowSubmitModal(false);
            setIsSubmitting(false);
            // Use hard navigation to guarantee route transition after a locked-in submit.
            window.location.assign(resultPath);
            return;
        } catch (error) {
            const axiosError = error as AxiosError<{ message?: string; latestRevision?: number }>;
            const status = axiosError.response?.status;

            if (status === 409) {
                const latest = Number(axiosError.response?.data?.latestRevision);
                if (Number.isFinite(latest)) {
                    setAttemptRevision(latest);
                    await syncAttemptState(latest);
                }
                toast.error('Exam state changed on server. Synced latest attempt; please submit again.');
            } else if (status === 423) {
                toast.error('Session is locked and cannot be submitted. Contact admin.');
            } else {
                toast.error(axiosError.response?.data?.message || 'Submit failed. Please try again.');
            }

            setShowSubmitModal(false);
            setIsSubmitting(false);
        }
    }, [examId, session?.sessionId, session?.sessionLocked, isSubmitting, flushQueue, answers, attemptRevision, navigate, syncAttemptState]);

    const submitRef = useRef(handleFinalSubmit);
    useEffect(() => {
        submitRef.current = handleFinalSubmit;
    }, [handleFinalSubmit]);

    const onTimeUp = useCallback(() => {
        submitRef.current('auto_timeout').catch(() => undefined);
    }, []);

    const { formattedTime, isTimeUp, timeLeftSeconds } = useExamTimer(session?.expiresAt, onTimeUp, serverOffsetMs);

    useEffect(() => {
        warnedThresholdsRef.current.clear();
    }, [session?.sessionId]);

    useEffect(() => {
        if (timeLeftSeconds === null) return;
        const warnings = [
            { threshold: 600, label: '10 minutes' },
            { threshold: 300, label: '5 minutes' },
            { threshold: 60, label: '1 minute' },
        ];

        for (const warning of warnings) {
            if (timeLeftSeconds <= warning.threshold && !warnedThresholdsRef.current.has(warning.threshold)) {
                warnedThresholdsRef.current.add(warning.threshold);
                toast.error(`Only ${warning.label} remaining.`);
            }
        }
    }, [timeLeftSeconds]);

    useEffect(() => {
        if (!examId || !session?.sessionId || isLandingMode) return;

        const streamUrl = getExamAttemptStreamUrl(examId, session.sessionId);
        const stream = new EventSource(streamUrl, { withCredentials: true });

        const parsePayload = (event: MessageEvent) => {
            try {
                return JSON.parse(event.data || '{}') as Record<string, unknown>;
            } catch {
                return {} as Record<string, unknown>;
            }
        };

        stream.addEventListener('timer-sync', (event) => {
            const payload = parsePayload(event as MessageEvent);
            const serverNowRaw = payload.serverNow;
            if (typeof serverNowRaw === 'string') {
                const offset = new Date(serverNowRaw).getTime() - Date.now();
                if (Number.isFinite(offset)) setServerOffsetMs(offset);
            }
            const revision = Number(payload.attemptRevision);
            if (Number.isFinite(revision)) {
                setAttemptRevision((prev) => Math.max(prev, revision));
            }
        });

        stream.addEventListener('revision-update', (event) => {
            const payload = parsePayload(event as MessageEvent);
            const revision = Number(payload.revision);
            if (Number.isFinite(revision)) {
                setAttemptRevision((prev) => Math.max(prev, revision));
            }
        });

        stream.addEventListener('policy-warning', () => {
            toast.error('Security warning detected. Further violations may end your attempt.');
        });

        stream.addEventListener('attempt-locked', (event) => {
            const payload = parsePayload(event as MessageEvent);
            toast.error('Exam session locked due to security policy.');
            setSession((prev) => (prev ? { ...prev, sessionLocked: true, lockReason: String(payload.reason || '') } : prev));
        });

        stream.addEventListener('forced-submit', () => {
            toast.error('Your attempt was force-submitted by admin.');
            navigate(`/exam/result/${examId}`, { replace: true });
        });

        return () => {
            stream.close();
        };
    }, [examId, session?.sessionId, isLandingMode, navigate]);

    useEffect(() => {
        if (questions.length === 0) return;
        setActiveQuestionIndex((prev) => Math.min(prev, questions.length - 1));
    }, [questions.length]);

    const onAntiCheatLog = useCallback(async (event: {
        eventType: 'tab_switch' | 'fullscreen_exit' | 'copy_attempt' | 'error';
        metadata?: Record<string, unknown>;
        timestamp: string;
    }) => {
        if (!examId || !session?.sessionId || isSubmitting) return;
        try {
            const { data } = await logExamAttemptEvent(examId, session.sessionId, {
                ...event,
                attemptRevision,
            });

            if (typeof data.attemptRevision === 'number') {
                setAttemptRevision(data.attemptRevision);
            }

            if (data.action === 'auto_submitted') {
                toast.error('Security policy triggered auto-submit.');
                navigate(`/exam/result/${examId}`, { replace: true });
            } else if (data.action === 'locked') {
                toast.error('Security policy locked your exam session.');
                setSession((prev) => (prev ? { ...prev, sessionLocked: true, lockReason: data.lockReason || 'policy_lock' } : prev));
            }
        } catch (error) {
            const axiosError = error as AxiosError<{ latestRevision?: number }>;
            if (axiosError.response?.status === 409) {
                const latest = Number(axiosError.response?.data?.latestRevision);
                if (Number.isFinite(latest)) {
                    setAttemptRevision(latest);
                    await syncAttemptState(latest);
                }
            } else if (axiosError.response?.status === 423) {
                toast.error('Session was locked by exam policy. Please contact admin.');
            }
        }
    }, [examId, session?.sessionId, isSubmitting, attemptRevision, navigate, syncAttemptState]);

    useAntiCheat(onAntiCheatLog, {
        enabled: Boolean(session?.sessionId) && !isLandingMode && !session?.sessionLocked,
        enforceFullscreen: Boolean(exam?.security_policies?.require_fullscreen),
        disableContextMenu: true,
        blockClipboardShortcuts: true,
        showToasts: true,
    });

    const handleSelectOption = (questionId: string, optionId: string) => {
        if (isTimeUp || isSubmitting || session?.sessionLocked) return;
        const nextAnswer = { ...answers[questionId], selectedAnswer: optionId };
        setAnswers((prev) => ({ ...prev, [questionId]: nextAnswer }));
    };

    const handleWrittenUpload = async (questionId: string, file: File) => {
        if (isTimeUp || isSubmitting || session?.sessionLocked) return;

        const toastId = toast.loading('Uploading file...');
        try {
            const { data } = await uploadWrittenAnswer(file);
            const nextAnswer = { ...answers[questionId], writtenAnswerUrl: data.url };
            setAnswers((prev) => ({ ...prev, [questionId]: nextAnswer }));
            toast.success('File uploaded.', { id: toastId });
        } catch {
            toast.error('File upload failed. Please try again.', { id: toastId });
        }
    };

    const handleToggleReview = (questionId: string) => {
        setMarkedForReview((prev) => {
            const next = new Set(prev);
            if (next.has(questionId)) next.delete(questionId);
            else next.add(questionId);
            return next;
        });
    };

    const goToQuestionIndex = useCallback((nextIndex: number) => {
        const bounded = Math.max(0, Math.min(questions.length - 1, nextIndex));
        setActiveQuestionIndex(bounded);
        void flushQueue();
        const qId = questions[bounded]?._id;
        if (!qId) return;
        const element = document.getElementById(`question-${qId}`);
        if (!element) return;
        const y = element.getBoundingClientRect().top + window.scrollY - 100;
        window.scrollTo({ top: y, behavior: 'smooth' });
    }, [flushQueue, questions]);

    const scrollToQuestion = (questionId: string) => {
        const targetIndex = questionIds.indexOf(questionId);
        if (targetIndex === -1) return;
        setShowMobilePalette(false);
        goToQuestionIndex(targetIndex);
    };

    const answeredKeys = useMemo(
        () => new Set(Object.keys(answers).filter((key) => answers[key].selectedAnswer || answers[key].writtenAnswerUrl)),
        [answers]
    );
    const questionIds = useMemo(() => questions.map((question) => question._id), [questions]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!exam || (!isLandingMode && (!session || questions.length === 0))) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                    <AlertCircle className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    {!exam ? 'Failed to load exam' : 'Session Initialization Failed'}
                </h1>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                    {!exam
                        ? 'We could not retrieve the exam data. It might have expired or been deleted.'
                        : 'We could not initialize your exam session. Please try refreshing the page.'}
                </p>
                <button
                    onClick={() => navigate('/student/dashboard')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    if (!isLandingMode && questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                    <Loader2 className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">No Questions Found</h1>
                <p className="text-slate-600 max-w-md mx-auto mb-6">
                    We could not find any questions for this exam. Please contact the administrator.
                </p>
                <button
                    onClick={() => navigate('/student/dashboard')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                    Back to Exams
                </button>
            </div>
        );
    }

    if (isLandingMode) {
        return (
            <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-3xl w-full bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden"
                >
                    <div className="h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600" />

                    <div className="p-8 md:p-12">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                            <div>
                                <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-wider text-xs uppercase mb-2">
                                    <Target className="w-4 h-4" />
                                    <span>Official Assessment</span>
                                </div>
                                <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">{exam?.title}</h1>
                                <p className="text-slate-500 font-medium mt-1">{exam?.subject || 'General Assessment'}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Duration</div>
                                        <div className="text-sm font-bold text-slate-700">{exam?.duration} Mins</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Status</div>
                                        <div className="text-sm font-bold text-slate-700">Eligible</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-10">
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Info className="w-5 h-5 text-indigo-500" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Instructions</h3>
                                </div>
                                <div
                                    ref={instructionsScrollRef}
                                    onScroll={(event) => {
                                        if (hasScrolledInstructions) return;
                                        const target = event.currentTarget;
                                        const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 8;
                                        if (reachedBottom) setHasScrolledInstructions(true);
                                    }}
                                    className="max-h-60 overflow-y-auto prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed bg-slate-50/50 p-6 rounded-2xl border border-slate-100"
                                >
                                    <ReactMarkdown>{exam?.instructions || 'Ensure you have a stable internet connection and a quiet environment. Once started, the timer cannot be paused.'}</ReactMarkdown>
                                </div>
                                {!hasScrolledInstructions && (
                                    <p className="text-[11px] text-amber-600 mt-2 font-semibold">
                                        Scroll to the end of instructions to enable agreement.
                                    </p>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Lock className="w-5 h-5 text-amber-500" />
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Security Policies</h3>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        { icon: Monitor, label: 'Enforced Fullscreen', desc: 'Exit will be logged and may trigger auto-submit.', enabled: exam?.security_policies?.require_fullscreen },
                                        { icon: Eye, label: 'Anti-Tab Switch', desc: 'Moving focus away from this window is recorded.', enabled: true },
                                        { icon: AlertTriangle, label: 'Clipboard Lock', desc: 'Copying or pasting content is strictly disabled.', enabled: true }
                                    ].map((policy, idx) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * idx }}
                                            className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
                                        >
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${policy.enabled ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                <policy.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-700">{policy.label}</div>
                                                <div className="text-[11px] text-slate-500 font-medium group-hover:text-slate-600 transition-colors">{policy.desc}</div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-100">
                            {eligibility && !eligibility.eligible && (
                                <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                    <p className="text-sm font-semibold text-rose-700">You are currently not eligible to start this exam.</p>
                                    <p className="mt-1 text-xs text-rose-600">{eligibility.reasons.join(', ')}</p>
                                </div>
                            )}
                            <motion.div
                                whileHover={{ scale: 1.01 }}
                                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all ${hasScrolledInstructions ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'} ${rulesAgreed ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'}`}
                                onClick={() => {
                                    if (!hasScrolledInstructions) return;
                                    setRulesAgreed(!rulesAgreed);
                                }}
                            >
                                <div className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${rulesAgreed ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {rulesAgreed && <CheckCircle className="w-4 h-4 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-bold text-slate-800">Agreement & Integrity Pledge</div>
                                    <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                                        I confirm that I am the authorized user for this account. I pledge to adhere to the exam rules and maintain academic integrity. I understand that my activities are monitored.
                                    </p>
                                </div>
                            </motion.div>

                            <button
                                onClick={handleStartExam}
                                disabled={!rulesAgreed || startingEvent || !hasScrolledInstructions || Boolean(eligibility && !eligibility.eligible)}
                                className="w-full mt-8 h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-2xl shadow-xl shadow-indigo-200/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
                            >
                                {startingEvent ? (
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Allocating Session...</span>
                                    </div>
                                ) : (
                                    <>
                                        <span>Start Secure Examination Session</span>
                                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[11px] text-slate-400 font-medium mt-6">
                                Securing session via RSA High-Encryption • CampusWay Proctoring v4.2
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <ProfileCompletionLock
            type="blocker"
            message="Secure Exam Access: Your profile must be 100% complete to sit for this exam. Please ensure your identity and academic documents are verified."
        >
            <div className="min-h-screen bg-slate-50/50">
                <ExamHeader
                    exam={exam}
                    session={session}
                    timeLeftFormatted={formattedTime}
                    isTimeUp={isTimeUp}
                    isSaving={isSaving}
                    isOffline={isOffline}
                    answeredCount={answeredKeys.size}
                    totalQuestions={exam.totalQuestions}
                    lastSavedAt={lastSavedAt}
                />

                {session?.sessionLocked && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 font-medium">
                            This attempt is locked by exam security policy.
                            {session.lockReason ? ` Reason: ${session.lockReason}.` : ''}
                        </div>
                    </div>
                )}

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="flex-1 space-y-4 pb-40 lg:pb-10">
                            {questions.map((question, index) => (
                                <div
                                    key={question._id}
                                    id={`question-${question._id}`}
                                    className="block mb-8 scroll-mt-24"
                                >
                                    <QuestionCard
                                        question={question}
                                        questionNumber={index + 1}
                                        selectedOption={answers[question._id]?.selectedAnswer}
                                        isMarkedForReview={markedForReview.has(question._id)}
                                        onSelectOption={(opt) => handleSelectOption(question._id, opt)}
                                        onToggleReview={() => handleToggleReview(question._id)}
                                        onWrittenUpload={(file) => handleWrittenUpload(question._id, file)}
                                        writtenUploadUrl={answers[question._id]?.writtenAnswerUrl}
                                    />
                                </div>
                            ))}
                        </div>

                        <aside className="hidden lg:block w-full lg:w-80 flex-shrink-0">
                            <ExamSidebar
                                totalQuestions={exam.totalQuestions}
                                answeredKeys={answeredKeys}
                                markedForReviewKeys={markedForReview}
                                questionIds={questionIds}
                                onScrollToQuestion={scrollToQuestion}
                                onSubmitClick={() => setShowSubmitModal(true)}
                            />
                        </aside>
                    </div>
                </main>

                {questionIds.length > 0 && (
                    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold text-slate-700">
                                Answered {answeredKeys.size}/{exam.totalQuestions}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowMobilePalette(true)}
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                            >
                                Palette
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowSubmitModal(true)}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white"
                            >
                                Finish Exam
                            </button>
                        </div>
                    </div>
                )}

                {showMobilePalette && (
                    <div className="lg:hidden fixed inset-0 z-50 bg-black/45" onClick={() => setShowMobilePalette(false)}>
                        <div
                            className="absolute bottom-0 left-0 right-0 max-h-[72vh] overflow-y-auto rounded-t-3xl bg-white p-4"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900">Question Palette</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowMobilePalette(false)}
                                    className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                                >
                                    Close
                                </button>
                            </div>
                            <div className="grid grid-cols-6 gap-2">
                                {questionIds.map((qId, idx) => {
                                    const isAnswered = answeredKeys.has(qId);
                                    const isReview = markedForReview.has(qId);
                                    const isActive = idx === activeQuestionIndex;
                                    const baseColor = isActive
                                        ? 'bg-indigo-600 text-white border-indigo-700'
                                        : isAnswered
                                            ? 'bg-emerald-500 text-white border-emerald-600'
                                            : isReview
                                                ? 'bg-amber-400 text-amber-900 border-amber-500'
                                                : 'bg-slate-50 text-slate-700 border-slate-300';
                                    return (
                                        <button
                                            key={`mobile-q-${qId}`}
                                            type="button"
                                            onClick={() => scrollToQuestion(qId)}
                                            className={`h-11 min-w-11 rounded-lg border text-sm font-semibold ${baseColor}`}
                                        >
                                            {idx + 1}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <ExamSubmitModal
                    isOpen={showSubmitModal || isTimeUp}
                    onClose={() => setShowSubmitModal(false)}
                    onConfirm={() => handleFinalSubmit('manual')}
                    totalQuestions={exam.totalQuestions}
                    answeredCount={answeredKeys.size}
                    markedForReviewCount={markedForReview.size}
                    isTimeUp={isTimeUp}
                    isSubmitting={isSubmitting}
                />
            </div>
        </ProfileCompletionLock>
    );
}
