import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ShieldAlert, Check, X, Clock, AlertTriangle } from 'lucide-react';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { adminGetPendingApprovals, adminApprovePendingAction, adminRejectPendingAction, type AdminActionApproval } from '../../../services/api';

type Toast = { show: boolean; message: string; type: 'success' | 'error' };

export default function ActionApprovalsPage() {
    const qc = useQueryClient();
    const [toast, setToast] = useState<Toast>({ show: false, message: '', type: 'success' });
    const [rejectModal, setRejectModal] = useState<{ open: boolean; item: AdminActionApproval | null; reason: string }>({ open: false, item: null, reason: '' });
    const localUserId = localStorage.getItem('cw_user_id') || '';

    const { data, isLoading, isError } = useQuery({
        queryKey: ['admin-pending-approvals'],
        queryFn: () => adminGetPendingApprovals(),
    });

    const approveMut = useMutation({
        mutationFn: adminApprovePendingAction,
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['admin-pending-approvals'] });
            showToast(res.data?.message || 'Action approved', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.message || 'Failed to approve', 'error');
        }
    });

    const rejectMut = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) => adminRejectPendingAction(id, reason),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['admin-pending-approvals'] });
            setRejectModal({ open: false, item: null, reason: '' });
            showToast(res.data?.message || 'Action rejected', 'success');
        },
        onError: (err: any) => {
            showToast(err.response?.data?.message || 'Failed to reject', 'error');
        }
    });

    const showToast = (message: string, type: Toast['type']) => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(p => ({ ...p, show: false })), 3000);
    };

    const handleApprove = (item: AdminActionApproval) => {
        if (!window.confirm('Are you sure you want to approve and execute this action?')) return;
        approveMut.mutate(item._id);
    };

    const items = data?.data?.items || [];
    const total = data?.data?.total || 0;

    if (isLoading) return (
        <AdminGuardShell title="Approval Center" description="Review actions requiring second approval">
            <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />)}
            </div>
        </AdminGuardShell>
    );

    if (isError) return (
        <AdminGuardShell title="Approval Center" description="Review actions requiring second approval">
            <div className="p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                    Failed to load pending approvals.
                </div>
            </div>
        </AdminGuardShell>
    );

    return (
        <AdminGuardShell title="Approval Center" description="Review actions requiring second admin approval">
            {toast.show && (
                <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {toast.message}
                </div>
            )}

            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Pending Requests ({total})</h2>
                    <button onClick={() => qc.invalidateQueries({ queryKey: ['admin-pending-approvals'] })} className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">Refresh</button>
                </div>

                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                            <Check className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-base font-medium text-slate-900 dark:text-slate-100">All caught up!</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">There are no pending actions requiring your approval.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map(item => {
                            // Initiator logic: user ID can be nested or string
                            const initiatorObj = typeof item.initiatedBy === 'object' ? item.initiatedBy : null;
                            const initiatorId = initiatorObj?._id || (typeof item.initiatedBy === 'string' ? item.initiatedBy : '');
                            const initiatorName = initiatorObj?.full_name || initiatorObj?.username || 'Unknown Admin';
                            const isSelf = initiatorId && initiatorId === localUserId;

                            return (
                                <div key={item._id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                                    <div className="flex flex-col border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 shrink-0 rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                                                <ShieldAlert className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                                                    {item.actionKey.replace(/\./g, ' / ').toUpperCase()}
                                                </h3>
                                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-medium text-slate-700 dark:text-slate-300">{initiatorName}</span>
                                                    <span>•</span>
                                                    <span>{item.initiatedByRole}</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(item.initiatedAt))} ago</span>
                                                </div>
                                                <div className="mt-2 text-xs font-mono text-slate-400 dark:text-slate-500">
                                                    {item.method.toUpperCase()} {item.routePath}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex shrink-0 items-center gap-2 sm:mt-0">
                                            {isSelf ? (
                                                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    Waiting for another admin
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => setRejectModal({ open: true, item, reason: '' })}
                                                        disabled={approveMut.isPending || rejectMut.isPending}
                                                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                                                        <X className="h-4 w-4" /> Reject
                                                    </button>
                                                    <button onClick={() => handleApprove(item)}
                                                        disabled={approveMut.isPending || rejectMut.isPending}
                                                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                                                        <Check className="h-4 w-4" /> Approve
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-4 text-xs dark:bg-slate-900/50">
                                        <div className="mb-2 font-medium text-slate-700 dark:text-slate-300">Request Payload Context:</div>
                                        <pre className="max-h-40 overflow-y-auto rounded-lg bg-slate-800 p-3 text-emerald-400 scrollbar-thin dark:bg-black">
                                            {JSON.stringify(item.payloadSnapshot || item.querySnapshot || {}, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Reject Modal */}
            {rejectModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Reject Approval Request</h3>
                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                                Please provide a reason for rejecting this action. The requesting admin will be notified.
                            </p>
                            <textarea
                                value={rejectModal.reason}
                                onChange={e => setRejectModal(p => ({ ...p, reason: e.target.value }))}
                                placeholder="Reason for rejection (optional)"
                                className="mt-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                rows={3}
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button onClick={() => setRejectModal({ open: false, item: null, reason: '' })} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                                    Cancel
                                </button>
                                <button onClick={() => { if (rejectModal.item) rejectMut.mutate({ id: rejectModal.item._id, reason: rejectModal.reason }); }} disabled={rejectMut.isPending} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                                    {rejectMut.isPending ? 'Rejecting...' : 'Reject Action'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminGuardShell>
    );
}
