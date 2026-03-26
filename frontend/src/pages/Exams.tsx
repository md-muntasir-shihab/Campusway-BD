import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Lock, Clock, CheckCircle, AlertTriangle, Calendar, BookOpen, TrendingUp, ChevronRight, Star, Zap, Loader2, RefreshCw } from 'lucide-react';
import { getStudentExams } from '../services/api';
import ProfileCompletionLock from '../components/profile/ProfileCompletionLock';

type ExamStatus = 'upcoming' | 'active' | 'in_progress' | 'completed' | 'completed_window' | 'locked';

interface ExamCard {
    _id: string; id: string; title: string; subject: string;
    totalQuestions: number; totalMarks: number; duration: number;
    startDate: string; endDate: string; resultPublishDate: string;
    status: ExamStatus; attemptsLeft: number; attemptLimit: number;
    isFeatured?: boolean;
    myResult?: { obtainedMarks: number; percentage: number; rank?: number } | null;
    resultPublished: boolean;
}

/* ─── Helpers ─── */
function getTimeLeft(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (d > 0) return `${d}d ${h}h left`;
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: ExamStatus }) {
    const config: Record<ExamStatus, { cls: string; icon: typeof Zap; label: string }> = {
        active: { cls: 'badge-success', icon: Zap, label: 'Active' },
        in_progress: { cls: 'badge-success', icon: Zap, label: 'In Progress' },
        upcoming: { cls: 'badge-warning', icon: Clock, label: 'Upcoming' },
        completed: { cls: 'badge-primary', icon: CheckCircle, label: 'Completed' },
        completed_window: { cls: 'badge-primary', icon: CheckCircle, label: 'Ended' },
        locked: { cls: 'badge-danger', icon: Lock, label: 'Locked' },
    };
    const { cls, icon: Icon, label } = config[status];
    return <span className={`${cls} text-xs`}><Icon className="w-3 h-3" />{label}</span>;
}

/* ─── Exam Card ─── */
function ExamCardComponent({ exam }: { exam: ExamCard }) {
    const timeLeft = exam.status === 'active' || exam.status === 'in_progress'
        ? getTimeLeft(exam.endDate)
        : exam.status === 'upcoming' ? getTimeLeft(exam.startDate) : null;
    const canStart = (exam.status === 'active' || exam.status === 'in_progress') && exam.attemptsLeft > 0;
    const examId = exam._id || exam.id;

    return (
        <div className={`card p-0 overflow-hidden flex flex-col relative ${exam.status === 'locked' ? 'opacity-80' : ''}`}>
            {exam.isFeatured && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-primary" />}
            <div className="p-4 sm:p-5 flex flex-col flex-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <StatusBadge status={exam.status} />
                            {exam.isFeatured && <span className="badge bg-accent/10 text-accent text-[10px]"><Star className="w-3 h-3" />Featured</span>}
                        </div>
                        <h3 className="text-sm sm:text-base font-heading font-semibold dark:text-dark-text leading-snug line-clamp-2">{exam.title}</h3>
                        <p className="text-xs text-text-muted dark:text-dark-text/50 mt-1">{exam.subject}</p>
                    </div>
                    {exam.status === 'locked' && <Lock className="w-5 h-5 text-text-muted dark:text-dark-text/40 flex-shrink-0" />}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                        { label: 'Questions', value: exam.totalQuestions },
                        { label: 'Marks', value: exam.totalMarks },
                        { label: 'Duration', value: `${exam.duration}m` },
                    ].map(s => (
                        <div key={s.label} className="bg-background dark:bg-dark-bg rounded-lg p-2 text-center">
                            <p className="text-sm font-bold dark:text-dark-text">{s.value}</p>
                            <p className="text-[9px] text-text-muted dark:text-dark-text/50 uppercase">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Dates */}
                <div className="space-y-1 mb-3 text-xs text-text-muted dark:text-dark-text/50">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 flex-shrink-0 text-primary" />
                        <span>Starts: {new Date(exam.startDate).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 flex-shrink-0 text-danger" />
                        <span>Ends: {new Date(exam.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                </div>

                {/* Time left */}
                {timeLeft && (
                    <div className={`flex items-center gap-1.5 text-xs font-semibold mb-3 ${exam.status === 'active' || exam.status === 'in_progress' ? 'text-success' : 'text-warning'}`}>
                        <Clock className="w-3.5 h-3.5" /> {timeLeft}
                    </div>
                )}

                {/* Score */}
                {exam.myResult && (
                    <div className="flex items-center gap-3 bg-background dark:bg-dark-bg rounded-xl p-3 mb-3">
                        <div className="flex-1">
                            <p className="text-[10px] text-text-muted uppercase tracking-wide">Your Score</p>
                            <p className="text-xl font-bold text-success">{exam.myResult.percentage}%</p>
                        </div>
                        {exam.myResult.rank && (
                            <div className="text-right">
                                <p className="text-[10px] text-text-muted uppercase tracking-wide">Rank</p>
                                <p className="text-xl font-bold text-primary dark:text-primary-300">#{exam.myResult.rank}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Result not published note */}
                {(exam.status === 'completed' || exam.status === 'completed_window') && !exam.resultPublished && (
                    <p className="text-xs text-text-muted dark:text-dark-text/50 flex items-center gap-1 mb-3">
                        <Clock className="w-3 h-3" /> Result pending: {new Date(exam.resultPublishDate).toLocaleDateString()}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-card-border dark:border-dark-border">
                    <span className="text-xs text-text-muted dark:text-dark-text/50">
                        {exam.status !== 'completed' && exam.status !== 'completed_window'
                            ? `${exam.attemptsLeft}/${exam.attemptLimit} attempts left`
                            : 'Submitted'}
                    </span>
                    {(exam.status === 'active' || exam.status === 'in_progress') && (
                        canStart ? (
                            <Link to={`/exam/take/${examId}`} className="btn-primary text-xs gap-1.5 py-2 px-3">
                                {exam.status === 'in_progress' ? <><RefreshCw className="w-3.5 h-3.5" />Resume</> : <><Zap className="w-3.5 h-3.5" />Start Exam</>}
                            </Link>
                        ) : (
                            <button
                                type="button"
                                disabled
                                className="btn-outline opacity-50 cursor-not-allowed text-xs gap-1.5 py-2 px-3"
                            >
                                <Lock className="w-3.5 h-3.5" /> Access Restricted
                            </button>
                        )
                    )}
                    {exam.status === 'upcoming' && (
                        <span className="text-xs text-text-muted flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Not started yet</span>
                    )}
                    {(exam.status === 'completed' || exam.status === 'completed_window') && (
                        <Link to={`/exam/result/${examId}`} className="btn-outline text-xs gap-1.5 py-2 px-3">
                            <BookOpen className="w-3.5 h-3.5" />
                            {exam.resultPublished ? 'View Result' : 'View Summary'}
                        </Link>
                    )}
                    {exam.status === 'locked' && (
                        <span className="text-xs text-danger flex items-center gap-1"><Lock className="w-3.5 h-3.5" />Subscription required</span>
                    )}
                </div>
            </div>
        </div>
    );
}

function ExamCardSkeleton() {
    return (
        <div className="card p-4 sm:p-5 animate-pulse space-y-3">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="grid grid-cols-3 gap-2">
                <div className="h-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
                <div className="h-14 rounded-lg bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-4/6 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-10 w-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
    );
}

/* ─── Subscription Gate ─── */
/* ─── Main Exams Page ─── */
export default function ExamsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const { data, isLoading: loading, error: queryError } = useQuery({
        queryKey: ['exams'],
        queryFn: async () => {
            const res = await getStudentExams();
            return res.data as { exams: ExamCard[]; subscriptionActive: boolean };
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    const exams = data?.exams || [];
    const error = queryError ? (queryError as any).response?.data?.message || 'Failed to load exams.' : '';

    // Gate 1: Auth session bootstrap
    if (authLoading) return (
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
            <div className="card p-8 sm:p-12 max-w-md w-full text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 text-primary animate-spin" />
                <h1 className="section-title text-xl sm:text-2xl mb-3">Checking session</h1>
                <p className="text-text-muted dark:text-dark-text/60 text-sm">
                    Please wait while we verify your account access and load exam eligibility rules for this device.
                </p>
            </div>
        </div>
    );

    // Gate 2: Must be logged in
    if (!user) return (
        <div className="min-h-screen flex items-center justify-center px-4 py-16">
            <div className="card p-8 sm:p-12 max-w-md w-full text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                    <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-primary dark:text-primary-300" />
                </div>
                <h1 className="section-title text-xl sm:text-2xl mb-3">Login Required</h1>
                <p className="text-text-muted dark:text-dark-text/60 text-sm mb-6">
                    Please log in with your admin-created account to access the exam portal.
                </p>
                <Link to="/login" className="btn-primary w-full gap-2">
                    <Lock className="w-4 h-4" /> Sign In to Continue
                </Link>
            </div>
        </div>
    );

    const byStatus = (...statuses: ExamStatus[]) => exams.filter(e => statuses.includes(e.status));
    const activeExams = byStatus('active', 'in_progress');
    const upcomingExams = byStatus('upcoming');
    const completedExams = byStatus('completed', 'completed_window');
    const lockedExams = byStatus('locked');

    const stats = [
        { label: 'Active Exams', value: activeExams.length, icon: Zap, color: 'text-success bg-success/10 dark:bg-success/20' },
        { label: 'Upcoming', value: upcomingExams.length, icon: Clock, color: 'text-warning bg-warning/10 dark:bg-warning/20' },
        { label: 'Completed', value: completedExams.length, icon: CheckCircle, color: 'text-primary bg-primary/10 dark:bg-primary/20' },
        {
            label: 'Avg. Score', value: completedExams.filter(e => e.myResult).length > 0
                ? `${Math.round(completedExams.reduce((a, e) => a + (e.myResult?.percentage || 0), 0) / completedExams.filter(e => e.myResult).length)}%`
                : '--', icon: TrendingUp, color: 'text-accent bg-accent/10 dark:bg-accent/20'
        },
    ];

    function Section({ title, exams }: { title: string; exams: ExamCard[] }) {
        if (exams.length === 0) return null;
        return (
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-heading font-bold dark:text-dark-text flex items-center gap-2">
                        {title} <span className="text-sm font-normal text-text-muted dark:text-dark-text/50">({exams.length})</span>
                    </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {exams.map(e => <ExamCardComponent key={e._id || e.id} exam={e} />)}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Hero */}
            <section className="page-hero">
                <div className="section-container relative py-10 sm:py-14">
                    <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 mb-4">
                        <BookOpen className="w-4 h-4 text-accent" />
                        <span className="text-sm text-white/90">Exam Portal</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold mb-2">
                        Welcome, <span className="text-accent">{user.fullName?.split(' ')[0] || user.username}</span>
                    </h1>
                    <p className="text-white/70 text-sm sm:text-base">Your personalized exam dashboard</p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
                        {stats.map(s => (
                            <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 sm:p-4">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                                    <s.icon className="w-4 h-4" />
                                </div>
                                <p className="text-xl sm:text-2xl font-bold">{s.value}</p>
                                <p className="text-xs text-white/60 mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section-container py-8 sm:py-10 space-y-10">
                {/* Loading */}
                {loading && (
                    <div className="space-y-6" aria-live="polite">
                        <div className="flex flex-col items-center justify-center pt-4 gap-3">
                            <Loader2 className="w-9 h-9 text-primary animate-spin" />
                            <p className="text-sm text-text-muted dark:text-dark-text/60">
                                Loading your exams, checking access gates, and preparing the latest schedule.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                            <ExamCardSkeleton />
                            <ExamCardSkeleton />
                            <ExamCardSkeleton />
                        </div>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <AlertTriangle className="w-10 h-10 text-danger" />
                        <p className="text-base font-semibold dark:text-dark-text">{error}</p>
                        <button onClick={() => window.location.reload()} className="btn-primary gap-2 text-sm">
                            <RefreshCw className="w-4 h-4" /> Retry
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        <ProfileCompletionLock
                            type="banner"
                            requiredPercentage={100}
                            message="Complete your profile to unlock all available exams and sit for your university entrance tests."
                        >
                            <Section title="Active Exams" exams={activeExams} />
                        </ProfileCompletionLock>
                        <Section title="Upcoming Exams" exams={upcomingExams} />
                        <Section title="Completed Exams" exams={completedExams} />

                        {lockedExams.length > 0 && (
                            <div>
                                <h2 className="text-lg font-heading font-bold dark:text-dark-text flex items-center gap-2 mb-4">
                                    Locked Exams <span className="text-sm font-normal text-text-muted">({lockedExams.length})</span>
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {lockedExams.map(e => <ExamCardComponent key={e._id} exam={e} />)}
                                </div>
                                <div className="mt-4 flex items-center gap-2 p-4 bg-warning/5 dark:bg-warning/10 border border-warning/20 rounded-2xl">
                                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                                    <p className="text-sm text-text-muted dark:text-dark-text/70">
                                        Upgrade your subscription to unlock additional exams.
                                        <Link to="/contact" className="text-primary dark:text-primary-300 hover:text-accent ml-1.5 font-medium inline-flex items-center gap-0.5">
                                            Contact Admin <ChevronRight className="w-3 h-3" />
                                        </Link>
                                    </p>
                                </div>
                            </div>
                        )}

                        {exams.length === 0 && (
                            <div className="text-center py-16">
                                <BookOpen className="w-12 h-12 mx-auto text-text-muted/30 mb-4" />
                                <h3 className="text-lg font-semibold dark:text-dark-text mb-2">No exams available</h3>
                                <p className="text-sm text-text-muted dark:text-dark-text/50">Check back later for new exams.</p>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    );
}

