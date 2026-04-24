import { useState } from 'react';
import { CheckCircle, XCircle, FileText, ArrowRight } from 'lucide-react';
import {
    useReviewProfileChange,
    type ProfileChangeRequest,
} from '../../../hooks/useApprovalQueries';

function FieldDiff({ field, before, after }: { field: string; before: unknown; after: unknown }) {
    const fmt = (v: unknown) => (v == null || v === '' ? '—' : String(v));
    return (
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800/50">
            <span className="min-w-[120px] font-medium text-slate-700 dark:text-slate-300">{field}</span>
            <span className="text-red-600 line-through dark:text-red-400">{fmt(before)}</span>
            <ArrowRight size={14} className="shrink-0 text-slate-400" />
            <span className="font-medium text-green-700 dark:text-green-400">{fmt(after)}</span>
        </div>
    );
}

function ReviewModal({
    request,
    onClose,
}: {
    request: ProfileChangeRequest;
    onClose: () => void;
}) {
    const [feedback, setFeedback] = useState('');
    const reviewMut = useReviewProfileChange();

    const studentName =
        typeof request.student_id === 'object'
            ? request.student_id.full_name || request.student_id.email || 'Student'
            : 'Student';

    const changedFields = Object.keys(request.requested_changes || {});

    const handleAction = (action: 'approve' | 'reject') => {
        reviewMut.mutate(
            { id: request._id, action, feedback: action === 'reject' ? feedback : undefined },
            { onSuccess: () => onClose() },
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Review Profile Change
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {studentName} — submitted {new Date(request.createdAt).toLocaleDateString()}
                </p>

                {/* Field-by-field diff */}
                <div className="mt-4 space-y-2">
                    {changedFields.map((field) => (
                        <FieldDiff
                            key={field}
                            field={field}
                            before={request.previous_values?.[field]}
                            after={request.requested_changes[field]}
                        />
                    ))}
                    {changedFields.length === 0 && (
                        <p className="text-sm text-slate-400">No changes to review.</p>
                    )}
                </div>

                {/* Feedback textarea */}
                <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={2}
                    placeholder="Feedback (required for rejection)"
                    className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />

                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleAction('reject')}
                        disabled={!feedback.trim() || reviewMut.isPending}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                    >
                        Reject
                    </button>
                    <button
                        onClick={() => handleAction('approve')}
                        disabled={reviewMut.isPending}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-40"
                    >
                        Approve
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ProfileChangeReviewPanel({ requests }: { requests: ProfileChangeRequest[] }) {
    const [reviewTarget, setReviewTarget] = useState<ProfileChangeRequest | null>(null);

    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
                <FileText size={40} className="text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No pending profile changes</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full text-left text-sm min-w-[580px]">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Student</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Changed Fields</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Submitted</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {requests.map((req) => {
                            const studentName =
                                typeof req.student_id === 'object'
                                    ? req.student_id.full_name || req.student_id.email || 'Unknown'
                                    : 'Unknown';
                            const fields = Object.keys(req.requested_changes || {});
                            return (
                                <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{studentName}</td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        <div className="flex flex-wrap gap-1">
                                            {fields.map((f) => (
                                                <span
                                                    key={f}
                                                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                        {new Date(req.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setReviewTarget(req)}
                                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                                        >
                                            Review
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {reviewTarget && (
                <ReviewModal request={reviewTarget} onClose={() => setReviewTarget(null)} />
            )}
        </div>
    );
}
