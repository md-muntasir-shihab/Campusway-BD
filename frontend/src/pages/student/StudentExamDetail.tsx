import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, CreditCard, PlayCircle } from 'lucide-react';
import { getStudentMeExamById, startExam } from '../../services/api';

export default function StudentExamDetail() {
    const { examId = '' } = useParams();
    const navigate = useNavigate();
    const [starting, setStarting] = useState(false);

    const detailQuery = useQuery({
        queryKey: ['student-hub', 'exam-detail', examId],
        queryFn: async () => (await getStudentMeExamById(examId)).data,
        enabled: Boolean(examId),
    });

    const checks = useMemo(() => detailQuery.data?.eligibility?.checks || null, [detailQuery.data]);
    const canStart = Boolean(detailQuery.data?.eligibility?.eligible);

    if (detailQuery.isLoading) {
        return <div className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse" />;
    }

    if (detailQuery.isError || !detailQuery.data?.exam) {
        return (
            <div className="rounded-2xl border border-rose-300/40 bg-rose-50/70 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                Exam details could not be loaded.
            </div>
        );
    }

    const exam = detailQuery.data.exam;

    const handleStartExam = async () => {
        if (!exam?._id || starting) return;
        setStarting(true);
        try {
            const response = await startExam(String(exam._id));
            const payload = response.data || {};
            if (payload.redirect && payload.externalExamUrl) {
                window.location.href = payload.externalExamUrl;
                return;
            }
            navigate(`/exam/${exam._id}`);
        } catch {
            navigate(`/exam/${exam._id}`);
        } finally {
            setStarting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">{exam.title}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{exam.subjectBn || exam.subject || 'Exam detail'}</p>
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                        <p>Duration: {exam.duration} min</p>
                        <p>Total Questions: {exam.totalQuestions}</p>
                        <p>Total Marks: {exam.totalMarks}</p>
                    </div>
                </div>

                <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                    <p>Start: {new Date(exam.startDate).toLocaleString()}</p>
                    <p>End: {new Date(exam.endDate).toLocaleString()}</p>
                    <p>Attempts left: {exam.attemptsLeft}</p>
                    <p>Negative marking: {exam.negativeMarking ? `Yes (${exam.negativeMarkValue})` : 'No'}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-lg font-bold">Eligibility</h2>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className={`rounded-xl border p-3 ${checks?.profileScore?.passed ? 'border-emerald-300/50 bg-emerald-50/60 dark:bg-emerald-500/10' : 'border-amber-300/50 bg-amber-50/70 dark:bg-amber-500/10'}`}>
                        <p className="font-semibold inline-flex items-center gap-1.5">
                            {checks?.profileScore?.passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            Profile score
                        </p>
                        <p className="text-xs mt-1">Required {checks?.profileScore?.required}% • Current {checks?.profileScore?.current}%</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${checks?.payment?.passed ? 'border-emerald-300/50 bg-emerald-50/60 dark:bg-emerald-500/10' : 'border-amber-300/50 bg-amber-50/70 dark:bg-amber-500/10'}`}>
                        <p className="font-semibold inline-flex items-center gap-1.5">
                            {checks?.payment?.passed ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                            Payment
                        </p>
                        <p className="text-xs mt-1">
                            {checks?.payment?.required ? `Pending due: ৳${Number(checks?.payment?.pendingDue || 0).toLocaleString()}` : 'No payment required'}
                        </p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {canStart ? (
                        <button
                            onClick={() => void handleStartExam()}
                            disabled={starting}
                            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                            <PlayCircle className="w-4 h-4" /> {starting ? 'Starting...' : 'Start Exam'}
                        </button>
                    ) : (
                        <button
                            onClick={() => navigate('/payments')}
                            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600"
                        >
                            <CreditCard className="w-4 h-4" /> Go to Payment
                        </button>
                    )}
                    <Link to="/exams" className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        Back to Exams
                    </Link>
                </div>
            </div>
        </div>
    );
}
