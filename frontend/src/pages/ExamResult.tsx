import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import {
    CheckCircle,
    Clock,
    Home,
    XCircle,
    ChevronRight,
    Award,
    BookOpen,
    HelpCircle,
    Info,
    ArrowLeft
} from 'lucide-react';
import { ApiExam, getExamCertificate, getExamResult } from '../services/api';
import { motion } from 'framer-motion';

interface ResultAnswer {
    questionId?: string;
    question?: string;
    isCorrect: boolean;
    selectedOption?: string;
    selectedAnswer?: string;
    correctOption?: string;
    correctAnswer?: string;
    explanation?: string;
    solutionImage?: string;
}

interface ResultPayload {
    obtainedMarks: number;
    totalMarks: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    percentage: number;
    rank?: number;
    answers?: ResultAnswer[];
    detailedAnswers?: ResultAnswer[];
}

interface ResultApiResponse {
    resultPublished: boolean;
    publishDate?: string;
    message?: string;
    exam: ApiExam;
    result?: ResultPayload;
}

function formatDateTime(input?: string) {
    if (!input) return 'TBA';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return 'TBA';
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

const CircularProgress = ({ percentage, size = 120, strokeWidth = 10 }: { percentage: number, size?: number, strokeWidth?: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    className="text-slate-100"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-indigo-600"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-black text-slate-900">{Math.round(percentage)}%</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Score</span>
            </div>
        </div>
    );
};

export default function ExamResultPage() {
    const { examId } = useParams();
    const { data: payload, isLoading: payloadLoading, error: payloadError } = useQuery({
        queryKey: ['examResult', examId],
        queryFn: async () => {
            const res = await getExamResult(examId!);
            return res.data as ResultApiResponse;
        },
        enabled: !!examId,
    });

    const { data: certificate } = useQuery({
        queryKey: ['examCertificate', examId],
        queryFn: async () => {
            const res = await getExamCertificate(examId!);
            return res.data?.eligible && res.data.certificate ? res.data.certificate : null;
        },
        enabled: !!examId && !!payload?.resultPublished,
    });

    const loading = payloadLoading;
    const error = payloadError ? (payloadError as any).response?.data?.message || 'Failed to load result.' : null;

    const answers = useMemo(() => {
        if (!payload?.resultPublished) return [];
        const result = payload.result;
        if (!result) return [];
        return result.answers || result.detailedAnswers || [];
    }, [payload]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Analyzing performance...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-center">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 mb-4">
                    <XCircle className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Oops! Something went wrong</h2>
                <p className="mt-2 text-slate-600 max-w-sm">{error}</p>
                <Link to="/student/dashboard" className="mt-8 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" /> Go back to Dashboard
                </Link>
            </div>
        );
    }

    if (!payload) return null;

    if (!payload.resultPublished) {
        return (
            <div className="min-h-screen bg-slate-50/50 py-12 px-4 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl shadow-slate-200/50 p-10 text-center relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-2 bg-amber-400" />
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-6 shadow-inner">
                        <Clock className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Result Pending</h1>
                    <p className="mt-4 text-slate-600 leading-relaxed">
                        {payload.message || 'Your performance report is being calculated. Please check back after the results are officially published.'}
                    </p>

                    <div className="mt-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-center gap-4">
                        <div className="text-left font-mono">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Expected Publication</span>
                            <span className="text-sm font-bold text-slate-800">{formatDateTime(payload.publishDate)}</span>
                        </div>
                    </div>

                    <div className="mt-10">
                        <Link
                            to="/student/dashboard"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-bold transition-all active:scale-95 shadow-lg shadow-black/10"
                        >
                            <Home className="w-4 h-4" /> Back to Dashboard
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    const result = payload.result;
    if (!result) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div>
                        <Link to="/student/dashboard" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 mb-4 transition-colors group">
                            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                            BACK TO DASHBOARD
                        </Link>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">
                            {payload.exam.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                                {payload.exam.subject || 'General Discipline'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="text-sm font-bold text-slate-500 flex items-center gap-1.5">
                                <BookOpen className="w-4 h-4" /> Performance Review
                            </span>
                        </div>
                    </div>

                    <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
                        <Info className="w-4 h-4 text-indigo-500" /> Need Help?
                    </button>
                </motion.div>

                {/* Score Summary Card */}
                <motion.section
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden"
                >
                    <div className="grid md:grid-cols-12 gap-0">
                        {/* Circular Chart */}
                        <div className="md:col-span-4 bg-gradient-to-br from-slate-50 to-white p-8 sm:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100">
                            <CircularProgress percentage={result.percentage} size={160} strokeWidth={12} />
                            {result.percentage >= 80 ? (
                                <div className="mt-6 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase mb-2">Excellent Work</span>
                                    <p className="text-sm font-bold text-slate-600">You crushed this one!</p>
                                </div>
                            ) : result.percentage >= 50 ? (
                                <div className="mt-6 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase mb-2">Good Pass</span>
                                    <p className="text-sm font-bold text-slate-600">Well played, keep growing.</p>
                                </div>
                            ) : (
                                <div className="mt-6 text-center">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase mb-2">Keep Pushing</span>
                                    <p className="text-sm font-bold text-slate-600">Rome wasn't built in a day.</p>
                                </div>
                            )}
                        </div>

                        {/* Detailed Stats */}
                        <div className="md:col-span-8 p-8 sm:p-12">
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Mark</p>
                                    <p className="text-4xl font-black text-slate-900 font-mono">
                                        <span className="text-indigo-600">{result.obtainedMarks}</span>
                                        <span className="text-slate-200 mx-1">/</span>
                                        <span className="text-slate-400 text-2xl">{result.totalMarks}</span>
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rank</p>
                                    <div className="flex items-center gap-3">
                                        <p className="text-4xl font-black text-slate-900 font-mono">
                                            {result.rank ? `#${result.rank}` : '—'}
                                        </p>
                                        <Award className={`w-8 h-8 ${result.rank && result.rank <= 3 ? 'text-amber-400' : 'text-slate-200'}`} />
                                    </div>
                                </div>
                                <div className="col-span-2 lg:col-span-1 space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                                    <div className="flex items-center gap-4 pt-1">
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-1">{result.correctCount}</div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Correct</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm mb-1">{result.wrongCount}</div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Wrong</span>
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center font-bold text-sm mb-1">{result.unansweredCount}</div>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Skip</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-12 flex flex-wrap items-center gap-4">
                                <Link
                                    to="/student/dashboard"
                                    className="px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white text-sm font-bold transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-black/10"
                                >
                                    Finish & Return
                                </Link>
                                <button
                                    onClick={() => window.print()}
                                    className="px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
                                >
                                    Download Report
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {certificate && (
                    <motion.section
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl border border-emerald-100 p-6 shadow-sm"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-900">Certificate Available</h3>
                                <p className="text-sm text-slate-600 mt-1">
                                    ID: <span className="font-mono font-semibold">{certificate.certificateId}</span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={certificate.downloadUrl}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
                                >
                                    Download Certificate
                                </a>
                                <a
                                    href={certificate.verifyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    Verify
                                </a>
                            </div>
                        </div>
                    </motion.section>
                )}

                {/* Review mode toggle / header */}
                <div className="flex items-center justify-between px-2 pt-4">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <HelpCircle className="w-6 h-6 text-indigo-500" />
                        Detailed Solutions
                    </h2>
                    <div className="text-xs font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full">
                        {answers.length} QUESTIONS REVIEWED
                    </div>
                </div>

                {/* Question Reviews */}
                <section className="space-y-5">
                    {answers.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
                                <Info className="w-8 h-8" />
                            </div>
                            <p className="text-slate-500 font-bold">Solution transparency is disabled for this exam.</p>
                        </div>
                    ) : (
                        answers.map((answer, index) => {
                            const selected = answer.selectedOption || answer.selectedAnswer;
                            const isSkipped = !selected;
                            const correct = answer.correctOption || answer.correctAnswer || 'Not available';

                            return (
                                <motion.article
                                    initial={{ opacity: 0, x: -10 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    key={`${answer.questionId || index}`}
                                    className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm transition-all hover:shadow-md ${isSkipped ? 'border-slate-200' :
                                        answer.isCorrect ? 'border-emerald-200' : 'border-rose-200'
                                        }`}
                                >
                                    <div className="p-6 sm:p-8">
                                        <div className="flex items-start gap-4 sm:gap-6">
                                            <div className="flex flex-col items-center gap-1 shrink-0">
                                                <span className={`w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-black shadow-inner ${isSkipped ? 'bg-slate-100 text-slate-500' :
                                                    answer.isCorrect ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                {answer.isCorrect ? (
                                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                                ) : isSkipped ? (
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                ) : (
                                                    <XCircle className="w-4 h-4 text-rose-500" />
                                                )}
                                            </div>

                                            <div className="flex-1 space-y-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        {!isSkipped && (
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${answer.isCorrect ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                                }`}>
                                                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                                                            </span>
                                                        )}
                                                        {isSkipped && (
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                                                Skipped
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                                                        {answer.question || `Question ${index + 1}`}
                                                    </p>
                                                </div>

                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    <div className={`p-4 rounded-2xl border transition-colors ${isSkipped ? 'bg-slate-50/50 border-slate-100 grayscale opacity-70' :
                                                        answer.isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-rose-50/30 border-rose-100'
                                                        }`}>
                                                        <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">Your Selection</span>
                                                        <p className={`text-sm font-bold ${isSkipped ? 'text-slate-400' : answer.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                            {selected || 'No option selected'}
                                                        </p>
                                                    </div>
                                                    <div className="p-4 rounded-2xl bg-indigo-50/30 border border-indigo-100/50">
                                                        <span className="text-[10px] font-black text-indigo-400 uppercase block mb-1">Correct Answer</span>
                                                        <p className="text-sm font-bold text-indigo-700">
                                                            {correct}
                                                        </p>
                                                    </div>
                                                </div>

                                                {answer.explanation && (
                                                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex gap-4">
                                                        <Info className="w-5 h-5 text-indigo-500 shrink-0" />
                                                        <div className="space-y-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase">Analysis & Explanation</span>
                                                            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed italic">{answer.explanation}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {answer.solutionImage && (
                                                    <div className="space-y-2">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase">Step-by-Step Visualization</span>
                                                        <img
                                                            src={answer.solutionImage}
                                                            alt="Detailed Solution"
                                                            className="rounded-2xl border border-slate-200 w-full max-w-2xl shadow-sm"
                                                            loading="lazy"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })
                    )}
                </section>

                <div className="py-12 border-t border-slate-200 flex flex-col items-center">
                    <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center mb-4">
                        <Award className="w-6 h-6 text-indigo-500" />
                    </div>
                    <p className="text-sm font-bold text-slate-400 mb-6">You've reached the end of the review.</p>
                    <Link
                        to="/student/dashboard"
                        className="flex items-center gap-2 text-indigo-600 font-black tracking-wider uppercase text-xs hover:gap-4 transition-all"
                    >
                        Return to Dashboard <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>

            </div>
        </div>
    );
}
