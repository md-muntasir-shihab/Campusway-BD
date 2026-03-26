import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getStudentMeResultByExam } from '../../services/api';

export default function StudentResultDetail() {
    const { examId = '' } = useParams();
    const detailQuery = useQuery({
        queryKey: ['student-hub', 'result-detail', examId],
        queryFn: async () => (await getStudentMeResultByExam(examId)).data,
        enabled: Boolean(examId),
    });

    if (detailQuery.isLoading) {
        return <div className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse" />;
    }

    if (detailQuery.isError || !detailQuery.data?.result) {
        return (
            <div className="rounded-2xl border border-rose-300/40 bg-rose-50/70 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                Result details not found.
            </div>
        );
    }

    const result = detailQuery.data.result;

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h1 className="text-2xl font-bold">{result.examTitle}</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{result.subject}</p>

                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                        <p className="text-xs text-slate-500">Score</p>
                        <p className="font-bold text-lg">{result.obtainedMarks}/{result.totalMarks}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                        <p className="text-xs text-slate-500">Percentage</p>
                        <p className="font-bold text-lg">{Number(result.percentage || 0).toFixed(2)}%</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                        <p className="text-xs text-slate-500">Rank</p>
                        <p className="font-bold text-lg">{result.rank || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                        <p className="text-xs text-slate-500">Percentile</p>
                        <p className="font-bold text-lg">{result.percentile ?? 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h2 className="text-lg font-bold">Performance breakdown</h2>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Correct</p>
                        <p className="font-bold text-lg">{result.correctCount}</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3">
                        <p className="text-xs text-rose-700 dark:text-rose-300">Wrong</p>
                        <p className="font-bold text-lg">{result.wrongCount}</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-300">Unattempted</p>
                        <p className="font-bold text-lg">{result.unansweredCount}</p>
                    </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Time taken: {Math.max(0, Number(result.timeTaken || 0))} sec</p>
            </div>

            {Array.isArray(result.answers) && result.answers.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <h2 className="text-lg font-bold">Question-wise review</h2>
                    <div className="mt-3 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                        {result.answers.map((item: any, idx: number) => (
                            <div key={`${item.questionId || idx}`} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                                <p className="text-sm font-semibold">Q{idx + 1}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your answer: {item.selectedAnswer || 'N/A'}  -  Correct: {item.correctAnswer || 'N/A'}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <div>
                <Link to="/results" className="rounded-lg px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 inline-flex">
                    Back to results
                </Link>
            </div>
        </div>
    );
}


