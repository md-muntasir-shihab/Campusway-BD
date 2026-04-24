import { useState } from 'react';
import { CheckCircle, XCircle, Users } from 'lucide-react';
import {
    useApproveRegistration,
    useRejectRegistration,
    useBulkApproveRegistrations,
    type PendingRegistration,
} from '../../../hooks/useApprovalQueries';

function RejectModal({
    open,
    onClose,
    onConfirm,
    loading,
}: {
    open: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    loading: boolean;
}) {
    const [reason, setReason] = useState('');

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reject Registration</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Please provide a reason for rejecting this registration.
                </p>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Rejection reason (required)"
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
                />
                <div className="mt-4 flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={!reason.trim() || loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                    >
                        {loading ? 'Rejecting...' : 'Reject'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RegistrationApprovalTable({ registrations }: { registrations: PendingRegistration[] }) {
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [rejectTarget, setRejectTarget] = useState<string | null>(null);
    const [bulkRejectOpen, setBulkRejectOpen] = useState(false);

    const approveMut = useApproveRegistration();
    const rejectMut = useRejectRegistration();
    const bulkMut = useBulkApproveRegistrations();

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === registrations.length) setSelected(new Set());
        else setSelected(new Set(registrations.map((r) => r._id)));
    };

    const handleApprove = (id: string) => {
        approveMut.mutate(id, { onSuccess: () => setSelected((p) => { const n = new Set(p); n.delete(id); return n; }) });
    };

    const handleReject = (reason: string) => {
        if (!rejectTarget) return;
        rejectMut.mutate({ id: rejectTarget, reason }, {
            onSuccess: () => {
                setRejectTarget(null);
                setSelected((p) => { const n = new Set(p); n.delete(rejectTarget); return n; });
            },
        });
    };

    const handleBulkApprove = () => {
        bulkMut.mutate({ userIds: [...selected], action: 'approve' }, {
            onSuccess: () => setSelected(new Set()),
        });
    };

    const handleBulkReject = (reason: string) => {
        bulkMut.mutate({ userIds: [...selected], action: 'reject', reason }, {
            onSuccess: () => { setSelected(new Set()); setBulkRejectOpen(false); },
        });
    };

    if (registrations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-16 dark:border-slate-700 dark:bg-slate-900">
                <Users size={40} className="text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No pending registrations</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Bulk actions */}
            {selected.size > 0 && (
                <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 dark:border-indigo-800 dark:bg-indigo-900/20">
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                        {selected.size} selected
                    </span>
                    <button
                        onClick={handleBulkApprove}
                        disabled={bulkMut.isPending}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-40"
                    >
                        Approve All
                    </button>
                    <button
                        onClick={() => setBulkRejectOpen(true)}
                        disabled={bulkMut.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
                    >
                        Reject All
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto -mx-3 px-3 md:mx-0 md:px-0 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                <table className="w-full text-left text-sm min-w-[640px]">
                    <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                            <th className="px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selected.size === registrations.length && registrations.length > 0}
                                    onChange={toggleAll}
                                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    aria-label="Select all registrations"
                                />
                            </th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Name</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Email</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Phone</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Registered</th>
                            <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {registrations.map((r) => (
                            <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(r._id)}
                                        onChange={() => toggleSelect(r._id)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                        aria-label={`Select ${r.full_name}`}
                                    />
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{r.full_name}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.email}</td>
                                <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{r.phone_number || '—'}</td>
                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                    {new Date(r.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-1.5">
                                        <button
                                            onClick={() => handleApprove(r._id)}
                                            disabled={approveMut.isPending}
                                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                                            title="Approve"
                                        >
                                            <CheckCircle size={14} /> Approve
                                        </button>
                                        <button
                                            onClick={() => setRejectTarget(r._id)}
                                            disabled={rejectMut.isPending}
                                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                                            title="Reject"
                                        >
                                            <XCircle size={14} /> Reject
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Reject modals */}
            <RejectModal
                open={!!rejectTarget}
                onClose={() => setRejectTarget(null)}
                onConfirm={handleReject}
                loading={rejectMut.isPending}
            />
            <RejectModal
                open={bulkRejectOpen}
                onClose={() => setBulkRejectOpen(false)}
                onConfirm={handleBulkReject}
                loading={bulkMut.isPending}
            />
        </div>
    );
}
