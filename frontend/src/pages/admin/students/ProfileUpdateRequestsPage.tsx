import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    adminApproveProfileUpdateRequest,
    adminGetProfileUpdateRequests,
    adminRejectProfileUpdateRequest,
    type AdminProfileUpdateRequestItem,
} from '../../../services/api';
import { adminUi } from '../../../lib/appRoutes';

type RequestStatus = 'pending' | 'approved' | 'rejected';

const statusTone: Record<RequestStatus, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200',
};

function getStudentName(item: AdminProfileUpdateRequestItem) {
    if (!item.student_id || typeof item.student_id === 'string') return 'Unknown student';
    return item.student_id.full_name || item.student_id.username || item.student_id.email || 'Unknown student';
}

export default function ProfileUpdateRequestsPage() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState<RequestStatus>('pending');
    const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

    const requestsQuery = useQuery({
        queryKey: ['admin', 'profile-update-requests', status],
        queryFn: async () => (await adminGetProfileUpdateRequests({ status })).data.items || [],
    });

    const refresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['admin', 'profile-update-requests'] });
        await queryClient.invalidateQueries({ queryKey: ['admin', 'actionable-alerts'] });
    };

    const approveMutation = useMutation({
        mutationFn: async (id: string) => adminApproveProfileUpdateRequest(id),
        onSuccess: async () => {
            toast.success('Request approved');
            await refresh();
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Approve failed'),
    });

    const rejectMutation = useMutation({
        mutationFn: async ({ id, feedback }: { id: string; feedback?: string }) => adminRejectProfileUpdateRequest(id, feedback),
        onSuccess: async () => {
            toast.success('Request rejected');
            await refresh();
        },
        onError: (error: any) => toast.error(error?.response?.data?.message || 'Reject failed'),
    });

    const items = requestsQuery.data || [];
    const totalChanges = useMemo(
        () => items.reduce((count, item) => count + Object.keys(item.requested_changes || {}).length, 0),
        [items],
    );

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold">Profile Update Requests</h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Review requested profile changes before they modify protected student fields.
                        </p>
                    </div>
                    <button
                        onClick={() => void refresh()}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    {(['pending', 'approved', 'rejected'] as RequestStatus[]).map((item) => (
                        <button
                            key={item}
                            onClick={() => setStatus(item)}
                            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                                status === item
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                        >
                            {item[0].toUpperCase() + item.slice(1)}
                        </button>
                    ))}
                    <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                        {items.length} requests, {totalChanges} field changes
                    </span>
                </div>
            </div>

            {requestsQuery.isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    ))}
                </div>
            ) : requestsQuery.isError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    Failed to load profile update requests.
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    No {status} profile update requests found.
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((item) => {
                        const feedback = rejectReason[item._id] || '';
                        return (
                            <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-bold">{getStudentName(item)}</h3>
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[item.status]}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            Submitted {new Date(item.createdAt).toLocaleString()}
                                        </p>
                                        {item.student_id && typeof item.student_id !== 'string' && (
                                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                {item.student_id.email}
                                            </p>
                                        )}
                                        {item.student_id && typeof item.student_id !== 'string' ? (
                                            <Link
                                                to={adminUi(`student-management/students/${String(item.student_id._id || '')}`)}
                                                className="mt-2 inline-flex rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-indigo-500/30 dark:text-indigo-300 dark:hover:bg-indigo-500/10"
                                            >
                                                Open student profile
                                            </Link>
                                        ) : null}
                                    </div>
                                    {item.status === 'pending' && (
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                onClick={() => approveMutation.mutate(item._id)}
                                                disabled={approveMutation.isPending}
                                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => rejectMutation.mutate({ id: item._id, feedback })}
                                                disabled={rejectMutation.isPending}
                                                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {Object.entries(item.requested_changes || {}).map(([field, nextValue]) => (
                                        <div key={field} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <Clock3 className="h-4 w-4 text-amber-500" />
                                                <p className="text-sm font-semibold capitalize">{field.replace(/_/g, ' ')}</p>
                                            </div>
                                            <div className="mt-3 space-y-2 text-sm">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Current</p>
                                                    <p className="mt-1 rounded-lg bg-slate-100 px-3 py-2 dark:bg-slate-800">
                                                        {String(item.currentValues?.[field] ?? 'Not set')}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Requested</p>
                                                    <p className="mt-1 rounded-lg bg-indigo-50 px-3 py-2 dark:bg-indigo-500/10">
                                                        {String(nextValue ?? '')}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {item.status === 'pending' && (
                                    <div className="mt-4">
                                        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                            Rejection note
                                        </label>
                                        <textarea
                                            value={feedback}
                                            onChange={(event) => setRejectReason((prev) => ({ ...prev, [item._id]: event.target.value }))}
                                            rows={2}
                                            placeholder="Optional reason for rejection"
                                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800"
                                        />
                                    </div>
                                )}

                                {item.admin_feedback && (
                                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                                        {item.admin_feedback}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
