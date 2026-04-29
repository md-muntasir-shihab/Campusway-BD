import {
    Pencil,
    Trash2,
    CheckCircle2,
    XCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import type { PaginationMeta } from '../../../types/exam-system';

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Truncate text to a max length with ellipsis. */
function truncate(text: string | undefined, max = 80): string {
    if (!text) return '—';
    return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Badge color map for difficulty. */
const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    hard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    expert: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

/** Badge color map for status. */
const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    published: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    archived: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
    flagged: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

/** Badge color map for review status. */
const REVIEW_COLORS: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
};

/** Type label map. */
const TYPE_LABELS: Record<string, string> = {
    mcq: 'MCQ',
    written_cq: 'Written',
    fill_blank: 'Fill Blank',
    true_false: 'T/F',
    image_mcq: 'Img MCQ',
};

// ─── Props ───────────────────────────────────────────────────────────────

interface QuestionTableProps {
    questions: Record<string, unknown>[];
    isLoading: boolean;
    selectedIds: Set<string>;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: () => void;
    onEdit: (id: string) => void;
    onArchive: (id: string) => void;
    onReview: (id: string, action: 'approve' | 'reject') => void;
    pagination?: PaginationMeta;
    onPageChange: (page: number) => void;
}

// ─── Loading Skeleton ────────────────────────────────────────────────────

function TableSkeleton() {
    return (
        <div className="animate-pulse space-y-2" role="status" aria-label="Loading questions">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-800">
                    <div className="h-4 w-4 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 flex-1 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                </div>
            ))}
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Question list table with selection, actions, review buttons, and pagination.
 */
export default function QuestionTable({
    questions,
    isLoading,
    selectedIds,
    onToggleSelect,
    onToggleSelectAll,
    onEdit,
    onArchive,
    onReview,
    pagination,
    onPageChange,
}: QuestionTableProps) {
    if (isLoading) return <TableSkeleton />;

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-16 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <p className="text-sm">No questions found</p>
                <p className="mt-1 text-xs">Try adjusting your filters or create a new question</p>
            </div>
        );
    }

    const allSelected = questions.length > 0 && selectedIds.size === questions.length;

    return (
        <div>
            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/60">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={onToggleSelectAll}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                                    aria-label="Select all questions"
                                />
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                Question
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                Type
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                Difficulty
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                Status
                            </th>
                            <th className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                Review
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                Marks
                            </th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {questions.map((q) => {
                            const id = q._id as string;
                            const questionText =
                                (q.question_en as string) || (q.question_bn as string) || (q.questionText as string) || '';
                            const qType = (q.question_type as string) || 'mcq';
                            const difficulty = (q.difficulty as string) || 'medium';
                            const status = (q.status as string) || 'draft';
                            const reviewStatus = (q.review_status as string) || 'pending';
                            const marks = (q.marks as number) ?? 1;

                            return (
                                <tr
                                    key={id}
                                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                >
                                    {/* Checkbox */}
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(id)}
                                            onChange={() => onToggleSelect(id)}
                                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600"
                                            aria-label={`Select question ${id}`}
                                        />
                                    </td>

                                    {/* Question text (truncated) */}
                                    <td className="max-w-xs px-4 py-3 text-slate-900 dark:text-white">
                                        <span title={questionText}>{truncate(questionText)}</span>
                                    </td>

                                    {/* Type */}
                                    <td className="px-4 py-3">
                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                            {TYPE_LABELS[qType] ?? qType}
                                        </span>
                                    </td>

                                    {/* Difficulty */}
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-xs font-medium ${DIFFICULTY_COLORS[difficulty] ?? ''}`}
                                        >
                                            {difficulty}
                                        </span>
                                    </td>

                                    {/* Status */}
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[status] ?? ''}`}
                                        >
                                            {status}
                                        </span>
                                    </td>

                                    {/* Review status */}
                                    <td className="px-4 py-3">
                                        <span
                                            className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${REVIEW_COLORS[reviewStatus] ?? ''}`}
                                        >
                                            {reviewStatus}
                                        </span>
                                    </td>

                                    {/* Marks */}
                                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">
                                        {marks}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Review buttons (only for pending) */}
                                            {reviewStatus === 'pending' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => onReview(id, 'approve')}
                                                        className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                                                        title="Approve"
                                                        aria-label="Approve question"
                                                    >
                                                        <CheckCircle2 size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onReview(id, 'reject')}
                                                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
                                                        title="Reject"
                                                        aria-label="Reject question"
                                                    >
                                                        <XCircle size={16} />
                                                    </button>
                                                </>
                                            )}

                                            {/* Edit */}
                                            <button
                                                type="button"
                                                onClick={() => onEdit(id)}
                                                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                                title="Edit"
                                                aria-label="Edit question"
                                            >
                                                <Pencil size={16} />
                                            </button>

                                            {/* Archive */}
                                            <button
                                                type="button"
                                                onClick={() => onArchive(id)}
                                                className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                                                title="Archive"
                                                aria-label="Archive question"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        Showing {(pagination.page - 1) * pagination.limit + 1}–
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} questions
                    </p>
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                            aria-label="Previous page"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {/* Page numbers (show up to 5 pages around current) */}
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                            .filter(
                                (p) =>
                                    p === 1 ||
                                    p === pagination.totalPages ||
                                    Math.abs(p - pagination.page) <= 2,
                            )
                            .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                                if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                                    acc.push('ellipsis');
                                }
                                acc.push(p);
                                return acc;
                            }, [])
                            .map((item, idx) =>
                                item === 'ellipsis' ? (
                                    <span
                                        key={`ellipsis-${idx}`}
                                        className="px-2 text-sm text-slate-400 dark:text-slate-500"
                                    >
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => onPageChange(item as number)}
                                        className={`min-w-[2rem] rounded-lg border px-2 py-1.5 text-sm font-medium transition ${pagination.page === item
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-300'
                                                : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700'
                                            }`}
                                    >
                                        {item}
                                    </button>
                                ),
                            )}

                        <button
                            type="button"
                            onClick={() => onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                            aria-label="Next page"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
