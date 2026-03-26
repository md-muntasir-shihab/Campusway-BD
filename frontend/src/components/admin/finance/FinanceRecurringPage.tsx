import { useState, useMemo } from 'react';
import {
    useFcRecurringRules, useFcCreateRecurringRule, useFcUpdateRecurringRule,
    useFcDeleteRecurringRule, useFcRunRecurringRuleNow,
} from '../../../hooks/useFinanceCenterQueries';
import type { FcRecurringRule, TransactionDirection, PaymentMethod, RecurringFrequency } from '../../../types/finance';
import { Plus, Trash2, Pencil, PlayCircle, ChevronLeft, ChevronRight, RefreshCw, DollarSign, CalendarClock, ToggleRight } from 'lucide-react';

type Params = Record<string, string | number | boolean | undefined>;

function fmt(n: number) { return new Intl.NumberFormat('en-BD').format(n); }

const FREQ_OPTIONS: RecurringFrequency[] = ['monthly', 'weekly', 'yearly', 'custom'];
const DIR_OPTIONS: TransactionDirection[] = ['income', 'expense'];
const METHOD_OPTIONS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank', 'card', 'manual', 'gateway', 'upay', 'rocket'];

export default function FinanceRecurringPage() {
    const [page, setPage] = useState(1);
    const [showCreate, setShowCreate] = useState(false);
    const [editRule, setEditRule] = useState<FcRecurringRule | null>(null);

    const params: Params = { page, limit: 20 };
    const { data, isLoading } = useFcRecurringRules(params);
    const createMut = useFcCreateRecurringRule();
    const updateMut = useFcUpdateRecurringRule();
    const deleteMut = useFcDeleteRecurringRule();
    const runNowMut = useFcRunRecurringRuleNow();

    const rules = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    const summary = useMemo(() => {
        const activeRules = rules.filter(r => r.isActive);
        const totalMonthlyCost = activeRules
            .filter(r => r.direction === 'expense')
            .reduce((s, r) => {
                if (r.frequency === 'monthly') return s + r.amount;
                if (r.frequency === 'weekly') return s + r.amount * 4;
                if (r.frequency === 'yearly') return s + r.amount / 12;
                if (r.frequency === 'custom' && r.intervalDays) return s + (r.amount * 30) / r.intervalDays;
                return s + r.amount;
            }, 0);
        const nextRun = activeRules
            .map(r => r.nextRunAtUTC ? new Date(r.nextRunAtUTC).getTime() : Infinity)
            .filter(t => t > Date.now())
            .sort((a, b) => a - b)[0];
        return { activeCount: activeRules.length, totalMonthlyCost, nextRun: nextRun && nextRun !== Infinity ? new Date(nextRun).toLocaleDateString() : '—', total: rules.length };
    }, [rules]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Recurring Rules</h2>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                    <Plus size={14} /> New Rule
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniKpi icon={<RefreshCw size={16} className="text-indigo-500" />} label="Total Rules" value={String(summary.total)} />
                <MiniKpi icon={<ToggleRight size={16} className="text-green-500" />} label="Active" value={String(summary.activeCount)} />
                <MiniKpi icon={<DollarSign size={16} className="text-red-500" />} label="Monthly Cost (est)" value={`৳${fmt(Math.round(summary.totalMonthlyCost))}`} />
                <MiniKpi icon={<CalendarClock size={16} className="text-blue-500" />} label="Next Run" value={summary.nextRun} />
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">Loading...</div>
            ) : rules.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No recurring rules configured.</div>
            ) : (
                <>
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block dark:border-slate-700">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Name</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Direction</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Amount</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Frequency</th>
                                    <th className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400">Next Run</th>
                                    <th className="px-3 py-2 text-center font-medium text-slate-600 dark:text-slate-400">Active</th>
                                    <th className="px-3 py-2 text-right font-medium text-slate-600 dark:text-slate-400">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rules.map(r => (
                                    <tr key={r._id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!r.isActive ? 'opacity-50' : ''}`}>
                                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-white">{r.name}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.direction === 'income' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'}`}>
                                                {r.direction}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium">৳{fmt(r.amount)}</td>
                                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{r.frequency}{r.frequency === 'custom' && r.intervalDays ? ` (${r.intervalDays}d)` : ''}</td>
                                        <td className="px-3 py-2 text-slate-500">{r.nextRunAtUTC ? new Date(r.nextRunAtUTC).toLocaleDateString() : '—'}</td>
                                        <td className="px-3 py-2 text-center">
                                            <span className={`inline-block h-2 w-2 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => runNowMut.mutate(r._id)} disabled={runNowMut.isPending} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" title="Run now">
                                                    <PlayCircle size={13} className="text-indigo-600" />
                                                </button>
                                                <button onClick={() => setEditRule(r)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" title="Edit">
                                                    <Pencil size={13} className="text-blue-500" />
                                                </button>
                                                <button onClick={() => { if (confirm('Delete this rule?')) deleteMut.mutate(r._id); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700" title="Delete">
                                                    <Trash2 size={13} className="text-red-500" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-2 sm:hidden">
                        {rules.map(r => (
                            <div key={r._id} className={`rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 ${!r.isActive ? 'opacity-50' : ''}`}>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-slate-800 dark:text-white">{r.name}</p>
                                        <p className="text-[10px] text-slate-500">{r.categoryLabel} &middot; {r.frequency}</p>
                                    </div>
                                    <p className={`text-sm font-bold ${r.direction === 'income' ? 'text-green-600' : 'text-red-600'}`}>৳{fmt(r.amount)}</p>
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${r.direction === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.direction}</span>
                                    <span className={`inline-flex items-center gap-0.5 text-[10px] ${r.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${r.isActive ? 'bg-green-500' : 'bg-slate-300'}`} /> {r.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    {r.nextRunAtUTC && <span className="text-[10px] text-slate-500">Next: {new Date(r.nextRunAtUTC).toLocaleDateString()}</span>}
                                </div>
                                <div className="mt-2 flex justify-end gap-1">
                                    <button onClick={() => runNowMut.mutate(r._id)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><PlayCircle size={13} className="text-indigo-600" /></button>
                                    <button onClick={() => setEditRule(r)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={13} className="text-blue-500" /></button>
                                    <button onClick={() => { if (confirm('Delete?')) deleteMut.mutate(r._id); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Trash2 size={13} className="text-red-500" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
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

            {(showCreate || editRule) && (
                <RecurringRuleModal
                    rule={editRule}
                    onClose={() => { setShowCreate(false); setEditRule(null); }}
                    onSave={data => {
                        if (editRule) updateMut.mutate({ id: editRule._id, data }, { onSuccess: () => setEditRule(null) });
                        else createMut.mutate(data as Partial<FcRecurringRule>, { onSuccess: () => setShowCreate(false) });
                    }}
                    saving={createMut.isPending || updateMut.isPending}
                />
            )}
        </div>
    );
}

function RecurringRuleModal({ rule, onClose, onSave, saving }: { rule: FcRecurringRule | null; onClose: () => void; onSave: (d: Partial<FcRecurringRule>) => void; saving: boolean }) {
    const [form, setForm] = useState<Partial<FcRecurringRule>>({
        name: rule?.name ?? '',
        direction: rule?.direction ?? 'expense',
        amount: rule?.amount ?? 0,
        accountCode: rule?.accountCode ?? '',
        categoryLabel: rule?.categoryLabel ?? '',
        description: rule?.description ?? '',
        method: rule?.method ?? 'cash',
        frequency: rule?.frequency ?? 'monthly',
        dayOfMonth: rule?.dayOfMonth ?? 1,
        intervalDays: rule?.intervalDays,
        isActive: rule?.isActive ?? true,
        tags: rule?.tags ?? [],
    });
    const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">{rule ? 'Edit Recurring Rule' : 'New Recurring Rule'}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2"><Field label="Name" value={form.name} onChange={v => set('name', v)} /></div>
                    <Sel label="Direction" value={form.direction!} options={DIR_OPTIONS} onChange={v => set('direction', v)} />
                    <Field label="Amount" type="number" value={form.amount} onChange={v => set('amount', Number(v))} />
                    <Field label="Account Code" value={form.accountCode} onChange={v => set('accountCode', v)} />
                    <Field label="Category" value={form.categoryLabel} onChange={v => set('categoryLabel', v)} />
                    <Sel label="Method" value={form.method!} options={METHOD_OPTIONS} onChange={v => set('method', v)} />
                    <Sel label="Frequency" value={form.frequency!} options={FREQ_OPTIONS} onChange={v => set('frequency', v)} />
                    {(form.frequency === 'monthly' || form.frequency === 'yearly') && (
                        <Field label="Day of Month" type="number" value={form.dayOfMonth} onChange={v => set('dayOfMonth', Number(v))} />
                    )}
                    {form.frequency === 'custom' && (
                        <Field label="Interval (days)" type="number" value={form.intervalDays} onChange={v => set('intervalDays', Number(v))} />
                    )}
                    <div className="flex items-center gap-2 sm:col-span-2">
                        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} id="rr-active" />
                        <label htmlFor="rr-active" className="text-xs text-slate-600 dark:text-slate-400">Active</label>
                    </div>
                    <div className="sm:col-span-2"><Field label="Description" value={form.description} onChange={v => set('description', v)} /></div>
                    <div className="sm:col-span-2"><Field label="Tags (comma separated)" value={(form.tags ?? []).join(', ')} onChange={v => set('tags', v.split(',').map(s => s.trim()).filter(Boolean))} /></div>
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

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );
}

function MiniKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">{icon}</div>
            <div>
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
}
