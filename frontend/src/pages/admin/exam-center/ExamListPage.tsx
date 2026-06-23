import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import {
    Plus,
    FileText,
    Loader2,
    AlertCircle,
    RefreshCw,
    Pencil,
    Copy,
    Trash2,
    Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useExamList,
    useDeleteExam,
    usePublishExam,
    useCloneExam,
} from '../../../hooks/useExamSystemQueries';
import type { ExamListItem } from '../../../api/examBuilderApi';
import { ADMIN_PATHS } from '../../../routes/adminPaths';

const STATUS_TABS = [
    { value: '', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
];

function statusBadge(status: string): string {
    switch (status) {
        case 'live':
            return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
        case 'scheduled':
            return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
        case 'completed':
        case 'closed':
            return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
        default:
            return 'bg-amber-500/15 text-amber-400 border-amber-500/30'; // draft
    }
}

function getApiErrorMessage(err: unknown, fallback: string): string {
    return (
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : fallback)
    );
}

/**
 * Exam list / management page for the Exam Center.
 *
 * Lists every exam built through the Exam Builder with status, type, question
 * count, marks, duration and participant count, plus row actions to edit,
 * publish (draft only), clone, and delete. Replaces the legacy standalone
 * "Exams" console that was removed during the Exam Center consolidation.
 */
export default function ExamListPage() {
    const navigate = useNavigate();
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading, isError, error, refetch, isFetching } = useExamList(
        statusFilter ? { status: statusFilter } : undefined,
    );
    const deleteExam = useDeleteExam();
    const publishExam = usePublishExam();
    const cloneExam = useCloneExam();

    const exams = useMemo<ExamListItem[]>(() => {
        const resp = data as { items?: ExamListItem[]; data?: { items?: ExamListItem[] } } | undefined;
        return resp?.items ?? resp?.data?.items ?? [];
    }, [data]);

    const goEdit = (id: string) => navigate(`${ADMIN_PATHS.examCenterBuilder}/${id}/edit`);

    const handlePublish = async (exam: ExamListItem) => {
        try {
            await publishExam.mutateAsync(exam._id);
            toast.success('Exam published');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to publish'));
        }
    };

    const handleClone = async (exam: ExamListItem) => {
        try {
            await cloneExam.mutateAsync(exam._id);
            toast.success('Exam cloned as a new draft');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to clone'));
        }
    };

    const handleDelete = async (exam: ExamListItem) => {
        if (!window.confirm(`Delete "${exam.title}"? This cannot be undone.`)) return;
        try {
            await deleteExam.mutateAsync(exam._id);
            toast.success('Exam deleted');
        } catch (err) {
            toast.error(getApiErrorMessage(err, 'Failed to delete'));
        }
    };

    return (
        <AdminGuardShell
            title="Exams"
            description="Browse, edit, publish, clone, and remove the exams you have built."
            requiredModule="exam_center"
        >
            <div className="space-y-4">
                {/* Header actions */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-base font-semibold text-white">All Exams</h2>
                        <button
                            type="button"
                            onClick={() => refetch()}
                            aria-label="Refresh exams"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        >
                            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate(ADMIN_PATHS.examCenterBuilderNew)}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                        <Plus className="h-4 w-4" /> New Exam
                    </button>
                </div>

                {/* Status filter tabs */}
                <div className="flex flex-wrap gap-2">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => setStatusFilter(tab.value)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${statusFilter === tab.value
                                ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                                : 'border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {isError && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {getApiErrorMessage(error, 'Failed to load exams')}
                    </div>
                )}

                {/* Exam table */}
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/40">
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Title</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Type</th>
                                <th className="px-4 py-3 text-center font-medium">Questions</th>
                                <th className="px-4 py-3 text-center font-medium">Marks</th>
                                <th className="px-4 py-3 text-center font-medium">Duration</th>
                                <th className="px-4 py-3 text-center font-medium">Participants</th>
                                <th className="px-4 py-3 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/70">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-indigo-400" />
                                    </td>
                                </tr>
                            ) : exams.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-16 text-center text-slate-500">
                                        No exams yet. Click{' '}
                                        <span className="font-semibold text-indigo-400">New Exam</span> to build one.
                                    </td>
                                </tr>
                            ) : (
                                exams.map((exam) => (
                                    <tr key={exam._id} className="hover:bg-slate-800/40">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-white">{exam.title}</div>
                                            {exam.title_bn && (
                                                <div className="text-xs text-slate-500">{exam.title_bn}</div>
                                            )}
                                            {exam.deliveryMode === 'external_link' && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
                                                    External link
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadge(exam.status)}`}
                                            >
                                                {exam.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 capitalize text-slate-400">{exam.scheduleType || '—'}</td>
                                        <td className="px-4 py-3 text-center text-slate-300">{exam.totalQuestions}</td>
                                        <td className="px-4 py-3 text-center text-slate-300">{exam.totalMarks}</td>
                                        <td className="px-4 py-3 text-center text-slate-400">
                                            {exam.duration ? `${exam.duration}m` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-300">{exam.participantCount}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => goEdit(exam._id)}
                                                    title="Edit exam"
                                                    aria-label={`Edit ${exam.title}`}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-indigo-300"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                {exam.rawStatus === 'draft' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePublish(exam)}
                                                        disabled={publishExam.isPending}
                                                        title="Publish exam"
                                                        aria-label={`Publish ${exam.title}`}
                                                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-emerald-300 disabled:opacity-50"
                                                    >
                                                        <Send className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleClone(exam)}
                                                    disabled={cloneExam.isPending}
                                                    title="Clone exam"
                                                    aria-label={`Clone ${exam.title}`}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-sky-300 disabled:opacity-50"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(exam)}
                                                    disabled={deleteExam.isPending}
                                                    title="Delete exam"
                                                    aria-label={`Delete ${exam.title}`}
                                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700 hover:text-red-400 disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminGuardShell>
    );
}
