import { useState, useMemo } from 'react';
import { useFcBudgets, useFcCreateBudget, useFcUpdateBudget, useFcDeleteBudget } from '../../../hooks/useFinanceCenterQueries';
import type { FcBudget, BudgetDirection } from '../../../types/finance';
import { Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Target, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { showConfirmDialog } from '../../../lib/appDialog';

type Params = Record<string, string | number | boolean | undefined>;

function fmt(n: number) { return new Intl.NumberFormat('en-BD').format(n); }

const DIR_OPTIONS: BudgetDirection[] = ['income', 'expense'];

export default function FinanceBudgetsPage() {
    const [page, setPage] = useState(1);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [showCreate, setShowCreate] = useState(false);
    const [editBudget, setEditBudget] = useState<FcBudget | null>(null);

    const params: Params = { page, limit: 20, month: monthFilter || undefined };
    const { data, isLoading } = useFcBudgets(params);
    const createMut = useFcCreateBudget();
    const updateMut = useFcUpdateBudget();
    const deleteMut = useFcDeleteBudget();

    const budgets = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    const summary = useMemo(() => {
        const totalLimit = budgets.reduce((s, b) => s + b.amountLimit, 0);
        const totalActual = budgets.reduce((s, b) => s + (b.actualSpent ?? 0), 0);
        const exceeded = budgets.filter(b => (b.actualSpent ?? 0) > b.amountLimit).length;
        const warning = budgets.filter(b => {
            const pct = b.amountLimit > 0 ? ((b.actualSpent ?? 0) / b.amountLimit) * 100 : 0;
            return pct >= (b.alertThresholdPercent ?? 80) && pct <= 100;
        }).length;
        return { totalLimit, totalActual, exceeded, warning, count: budgets.length };
    }, [budgets]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Budgets</h2>
                <div className="flex items-center gap-2">
                    <input type="month" value={monthFilter} onChange={e => { setMonthFilter(e.target.value); setPage(1); }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                    <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                        <Plus size={14} /> New Budget
                    </button>
                </div>
            </div>

            {/* Summary KPI */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniKpi icon={<Target size={16} className="text-indigo-500" />} label="Total Budget" value={`৳${fmt(summary.totalLimit)}`} />
                <MiniKpi icon={<TrendingUp size={16} className="text-blue-500" />} label="Actual Spend" value={`৳${fmt(summary.totalActual)}`} />
                <MiniKpi icon={<AlertTriangle size={16} className="text-amber-500" />} label="Warning" value={String(summary.warning)} accent={summary.warning > 0 ? 'text-amber-600' : undefined} />
                <MiniKpi icon={<ShieldCheck size={16} className="text-red-500" />} label="Exceeded" value={String(summary.exceeded)} accent={summary.exceeded > 0 ? 'text-red-600' : undefined} />
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">Loading...</div>
            ) : budgets.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No budgets for {monthFilter}.</div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {budgets.map(b => {
                        const actual = b.actualSpent ?? 0;
                        const pct = b.amountLimit > 0 ? Math.min((actual / b.amountLimit) * 100, 120) : 0;
                        const displayPct = Math.round(pct);
                        const barColor = pct > 100 ? 'bg-red-500' : pct >= (b.alertThresholdPercent ?? 80) ? 'bg-amber-500' : 'bg-green-500';
                        const statusLabel = pct > 100 ? 'Exceeded' : pct >= (b.alertThresholdPercent ?? 80) ? 'Warning' : 'Safe';
                        const statusBg = pct > 100 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : pct >= (b.alertThresholdPercent ?? 80) ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
                        return (
                            <div key={b._id} className={`rounded-xl border p-4 ${pct > 100 ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'} bg-white dark:bg-slate-900`}>
                                <div className="mb-2 flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800 dark:text-white">{b.categoryLabel}</p>
                                        <p className="text-[10px] text-slate-500">{b.accountCode} &middot; {b.month} &middot; {b.direction}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${statusBg}`}>{statusLabel}</span>
                                        <button onClick={() => setEditBudget(b)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={13} className="text-blue-500" /></button>
                                        <button onClick={async () => {
                                            const confirmed = await showConfirmDialog({
                                                title: 'Delete budget',
                                                message: 'Delete budget?',
                                                confirmLabel: 'Delete',
                                                tone: 'danger',
                                            });
                                            if (confirmed) deleteMut.mutate(b._id);
                                        }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 size={13} className="text-red-500" /></button>
                                    </div>
                                </div>
                                <div className="flex items-baseline justify-between">
                                    <p className="text-lg font-bold text-slate-800 dark:text-white">৳{fmt(actual)}</p>
                                    <p className="text-xs text-slate-500">/ ৳{fmt(b.amountLimit)}</p>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500">{displayPct}% used</span>
                                    <span className="text-[10px] text-slate-400">Alert at {b.alertThresholdPercent}%</span>
                                </div>
                                {b.notes && <p className="mt-1 text-[10px] text-slate-400">{b.notes}</p>}
                            </div>
                        );
                    })}
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

            {(showCreate || editBudget) && (
                <BudgetModal
                    budget={editBudget}
                    onClose={() => { setShowCreate(false); setEditBudget(null); }}
                    onSave={data => {
                        if (editBudget) updateMut.mutate({ id: editBudget._id, data }, { onSuccess: () => setEditBudget(null) });
                        else createMut.mutate(data as Partial<FcBudget>, { onSuccess: () => setShowCreate(false) });
                    }}
                    saving={createMut.isPending || updateMut.isPending}
                />
            )}
        </div>
    );
}

function BudgetModal({ budget, onClose, onSave, saving }: { budget: FcBudget | null; onClose: () => void; onSave: (d: Partial<FcBudget>) => void; saving: boolean }) {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [form, setForm] = useState<Partial<FcBudget>>({
        month: budget?.month ?? currentMonth,
        accountCode: budget?.accountCode ?? '',
        categoryLabel: budget?.categoryLabel ?? '',
        amountLimit: budget?.amountLimit ?? 0,
        alertThresholdPercent: budget?.alertThresholdPercent ?? 80,
        direction: budget?.direction ?? 'expense',
        notes: budget?.notes ?? '',
    });
    const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">{budget ? 'Edit Budget' : 'New Budget'}</h3>
                <div className="grid gap-3">
                    <Field label="Month" type="month" value={form.month} onChange={v => set('month', v)} />
                    <Field label="Account Code" value={form.accountCode} onChange={v => set('accountCode', v)} />
                    <Field label="Category" value={form.categoryLabel} onChange={v => set('categoryLabel', v)} />
                    <Field label="Budget Limit (BDT)" type="number" value={form.amountLimit} onChange={v => set('amountLimit', Number(v))} />
                    <Field label="Alert Threshold (%)" type="number" value={form.alertThresholdPercent} onChange={v => set('alertThresholdPercent', Number(v))} />
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-slate-500">Direction</label>
                        <select value={form.direction} onChange={e => set('direction', e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                            {DIR_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} />
                </div>
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-1.5 text-xs dark:border-slate-600 dark:text-white">Cancel</button>
                    <button onClick={() => onSave(form)} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save'}
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

function MiniKpi({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: string }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
            </div>
            <p className={`mt-1 text-lg font-bold ${accent ?? 'text-slate-800 dark:text-white'}`}>{value}</p>
        </div>
    );
}
