import { useState } from 'react';
import { useFcRefunds, useFcCreateRefund, useFcProcessRefund } from '../../../hooks/useFinanceCenterQueries';
import type { RefundStatus } from '../../../types/finance';
import { Plus, CheckCircle, XCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type Params = Record<string, string | number | boolean | undefined>;

function fmt(n: number) { return new Intl.NumberFormat('en-BD').format(n); }

const STATUS_COLORS: Record<string, string> = {
    requested: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_OPTIONS: RefundStatus[] = ['requested', 'approved', 'paid', 'rejected'];

export default function FinanceRefundsPage() {
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectNote, setRejectNote] = useState('');

    const params: Params = { page, limit: 20, status: statusFilter || undefined, search: search || undefined };
    const { data, isLoading } = useFcRefunds(params);
    const createMut = useFcCreateRefund();
    const processMut = useFcProcessRefund();

    const refunds = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Refunds</h2>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                    <Plus size={14} /> New Refund
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Search refund code..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                        className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                </div>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                    <option value="">All statuses</option>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">Loading...</div>
            ) : refunds.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No refunds found.</div>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Code</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Reason</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Status</th>
                                <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Date</th>
                                <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {refunds.map(r => (
                                <tr key={r._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{r.refundCode}</td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-800 dark:text-white">৳{fmt(r.amountBDT)}</td>
                                    <td className="max-w-[200px] truncate px-3 py-2 text-slate-600 dark:text-slate-400">{r.reason}</td>
                                    <td className="px-3 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</span></td>
                                    <td className="px-3 py-2 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                                    <td className="px-3 py-2 text-right">
                                        {r.status === 'requested' && (
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => processMut.mutate({ id: r._id, action: 'approve' })} className="rounded p-1 hover:bg-green-50 dark:hover:bg-green-900/20" title="Approve">
                                                    <CheckCircle size={13} className="text-green-600" />
                                                </button>
                                                <button onClick={() => { setRejectId(r._id); setRejectNote(''); }} className="rounded p-1 hover:bg-red-50 dark:hover:bg-red-900/20" title="Reject">
                                                    <XCircle size={13} className="text-red-600" />
                                                </button>
                                            </div>
                                        )}
                                        {r.rejectionNote && <p className="text-[10px] italic text-slate-400 mt-0.5">{r.rejectionNote}</p>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
                    <div className="flex gap-1">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-600 dark:text-white"><ChevronLeft size={14} /></button>
                        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg border px-2 py-1 text-xs disabled:opacity-40 dark:border-slate-600 dark:text-white"><ChevronRight size={14} /></button>
                    </div>
                </div>
            )}

            {/* Reject modal */}
            {rejectId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setRejectId(null)}>
                    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">Reject Refund</h3>
                        <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Rejection reason..." rows={3}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setRejectId(null)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs dark:border-slate-600 dark:text-white">Cancel</button>
                            <button onClick={() => { processMut.mutate({ id: rejectId, action: 'reject', rejectionNote: rejectNote }, { onSuccess: () => setRejectId(null) }); }} className="rounded-lg bg-red-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-red-700">Reject</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreate && (
                <RefundCreateModal
                    onClose={() => setShowCreate(false)}
                    onSave={data => createMut.mutate(data, { onSuccess: () => setShowCreate(false) })}
                    saving={createMut.isPending}
                />
            )}
        </div>
    );
}

function RefundCreateModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (d: { amountBDT: number; reason: string; originalPaymentId?: string; financeTxnId?: string; studentId?: string }) => void; saving: boolean }) {
    const [form, setForm] = useState({ amountBDT: 0, reason: '', originalPaymentId: '', financeTxnId: '', studentId: '' });
    const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">New Refund</h3>
                <div className="grid gap-3">
                    <Field label="Amount (BDT)" type="number" value={form.amountBDT} onChange={v => set('amountBDT', Number(v))} />
                    <Field label="Reason" value={form.reason} onChange={v => set('reason', v)} />
                    <Field label="Original Payment ID (opt)" value={form.originalPaymentId} onChange={v => set('originalPaymentId', v)} />
                    <Field label="Finance Txn ID (opt)" value={form.financeTxnId} onChange={v => set('financeTxnId', v)} />
                    <Field label="Student ID (opt)" value={form.studentId} onChange={v => set('studentId', v)} />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs dark:border-slate-600 dark:text-white">Cancel</button>
                    <button onClick={() => onSave({ ...form, originalPaymentId: form.originalPaymentId || undefined, financeTxnId: form.financeTxnId || undefined, studentId: form.studentId || undefined })} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value?: string | number; onChange: (v: string) => void; type?: string }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">{label}</label>
            <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
        </div>
    );
}
