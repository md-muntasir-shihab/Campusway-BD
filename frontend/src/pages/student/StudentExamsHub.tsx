import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, Clock3, Lock, PlayCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { getStudentMeExams, getStudentUpcomingExams, startExam, StudentUpcomingExam } from '../../services/api';

type TabKey = 'live' | 'upcoming' | 'completed' | 'missed';

const tabConfig: Array<{ key: TabKey; label: string }> = [
    { key: 'live', label: 'Live' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'missed', label: 'Missed' },
];

function statusBadgeLabel(exam: StudentUpcomingExam): string {
    if (!exam.canTakeExam && exam.accessDeniedReason) {
        if (exam.accessDeniedReason === 'access_group_restricted') return 'Group restricted';
        if (exam.accessDeniedReason === 'access_plan_restricted') return 'Payment pending';
        if (exam.accessDeniedReason === 'access_user_restricted') return 'Restricted';
        if (exam.accessDeniedReason === 'subscription_required') return 'Subscription required';
    }
    if (exam.status === 'live') return 'Eligible';
    if (exam.status === 'upcoming') return 'Upcoming';
    if (exam.status === 'completed') return 'Closed';
    return 'Unavailable';
}

export default function StudentExamsHub() {
    const [activeTab, setActiveTab] = useState<TabKey>('live');
    const [startingExamId, setStartingExamId] = useState('');
    const examsQuery = useQuery({
        queryKey: ['student-hub', 'exams'],
        queryFn: async () => {
            try {
                return (await getStudentMeExams()).data;
            } catch {
                const legacy = (await getStudentUpcomingExams()).data;
                const items = legacy.items || [];
                return {
                    live: items.filter((item) => item.status === 'live'),
                    upcoming: items.filter((item) => item.status === 'upcoming'),
                    missed: items.filter((item) => item.status === 'completed' && Number(item.attemptsUsed || 0) === 0),
                    completed: [],
                    all: items,
                    lastUpdatedAt: legacy.lastUpdatedAt,
                };
            }
        },
    });

    const tabData = useMemo(() => {
        const data = examsQuery.data;
        if (!data) return [] as StudentUpcomingExam[];
        if (activeTab === 'live') return data.live;
        if (activeTab === 'upcoming') return data.upcoming;
        if (activeTab === 'missed') return data.missed;
        return [];
    }, [activeTab, examsQuery.data]);

    const handleExternalExamStart = async (examId: string) => {
        try {
            setStartingExamId(examId);
            const payload = (await startExam(examId)).data;
            if (payload.redirect && payload.externalExamUrl) {
                window.location.href = payload.externalExamUrl;
                return;
            }
            toast.error('External exam link is not available right now.');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to start exam.');
        } finally {
            setStartingExamId('');
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h1 className="text-2xl font-bold">Exam Portal</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Check eligibility, payment state, and start exams from one place.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {tabConfig.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${activeTab === tab.key
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <Link
                        to="/results"
                        className="ml-auto rounded-lg px-3 py-1.5 text-sm font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200"
                    >
                        View Results
                    </Link>
                </div>
            </div>

            {examsQuery.isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="h-56 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse" />
                    ))}
                </div>
            ) : null}

            {examsQuery.isError ? (
                <div className="rounded-2xl border border-rose-300/40 bg-rose-50/70 dark:bg-rose-500/10 p-4 text-rose-700 dark:text-rose-200 text-sm">
                    Failed to load exams.
                </div>
            ) : null}

            {!examsQuery.isLoading && !examsQuery.isError && activeTab === 'completed' ? (
                <div className="grid grid-cols-1 gap-3">
                    {(examsQuery.data?.completed || []).length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500">
                            No completed exams found.
                        </div>
                    ) : (
                        (examsQuery.data?.completed || []).map((item) => (
                            <div key={item.resultId} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div>
                                    <p className="font-semibold">{item.examTitle}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.subject}  -  Attempt {item.attemptNo}</p>
                                </div>
                                <div className="text-sm">
                                    <p className="font-bold text-indigo-600 dark:text-indigo-300">{item.percentage.toFixed(2)}%</p>
                                    <p className="text-xs text-slate-500">{item.obtainedMarks}/{item.totalMarks}</p>
                                </div>
                                <Link
                                    to={`/results/${item.examId}`}
                                    className="rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                    View detail
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            ) : null}

            {!examsQuery.isLoading && !examsQuery.isError && activeTab !== 'completed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {tabData.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500">
                            No exams in this tab.
                        </div>
                    ) : (
                        tabData.map((exam) => (
                            <article key={exam._id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-semibold">{exam.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{exam.subjectBn || exam.subject}</p>
                                    </div>
                                    <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                        {statusBadgeLabel(exam)}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                                    <p className="inline-flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {new Date(exam.startDate).toLocaleString()}</p>
                                    <p className="inline-flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5" /> {exam.duration} minutes</p>
                                    <p className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Attempts left: {exam.attemptsLeft}</p>
                                </div>
                                <div className="pt-2 flex gap-2">
                                    <Link
                                        to={`/exams/${exam._id}`}
                                        className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                    >
                                        View details
                                    </Link>
                                    {exam.canTakeExam && exam.externalExamUrl ? (
                                        <button
                                            type="button"
                                            onClick={() => void handleExternalExamStart(exam._id)}
                                            disabled={startingExamId === exam._id}
                                            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center justify-center gap-1"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> {startingExamId === exam._id ? 'Opening...' : 'Take Exam'}
                                        </button>
                                    ) : exam.canTakeExam ? (
                                        <Link
                                            to={`/exam/take/${exam._id}`}
                                            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center justify-center gap-1"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> Start Exam
                                        </Link>
                                    ) : (
                                        <button
                                            disabled
                                            className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500 inline-flex items-center justify-center gap-1 cursor-not-allowed"
                                        >
                                            <Lock className="w-3.5 h-3.5" /> Locked
                                        </button>
                                    )}
                                </div>
                            </article>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}


