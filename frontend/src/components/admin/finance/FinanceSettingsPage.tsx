import { useState, useEffect } from 'react';
import { useFcSettings, useFcUpdateSettings } from '../../../hooks/useFinanceCenterQueries';
import { FcSettings } from '../../../types/finance';
import { Settings, Save, Plus, X } from 'lucide-react';

export default function FinanceSettingsPage() {
    const { data: settings, isLoading } = useFcSettings();
    const update = useFcUpdateSettings();

    const [form, setForm] = useState<Partial<FcSettings>>({});
    const [newCenter, setNewCenter] = useState('');

    useEffect(() => {
        if (settings) setForm({ ...(settings as { data?: FcSettings }).data ?? settings as unknown as FcSettings });
    }, [settings]);

    const set = <K extends keyof FcSettings>(key: K, value: FcSettings[K]) =>
        setForm(prev => ({ ...prev, [key]: value }));

    const addCostCenter = () => {
        const trimmed = newCenter.trim();
        if (!trimmed) return;
        const centers = [...(form.costCenters ?? [])];
        if (!centers.includes(trimmed)) centers.push(trimmed);
        set('costCenters', centers);
        setNewCenter('');
    };

    const removeCostCenter = (c: string) =>
        set('costCenters', (form.costCenters ?? []).filter(x => x !== c));

    const handleSave = () => {
        const { _id, key, lastEditedByAdminId, ...payload } = form as FcSettings;
        update.mutate(payload);
    };

    if (isLoading) return <p className="text-sm text-slate-400">Loading settings...</p>;

    const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Finance Settings</h2>
                <button onClick={handleSave} disabled={update.isPending} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                    <Save size={14} /> {update.isPending ? 'Saving...' : 'Save'}
                </button>
            </div>

            {update.isSuccess && <p className="text-xs text-green-600">Settings saved.</p>}
            {update.isError && <p className="text-xs text-red-600">Failed to save settings.</p>}

            <div className="grid gap-6 md:grid-cols-2">
                {/* General */}
                <Section title="General">
                    <Field label="Default Currency">
                        <input value={form.defaultCurrency ?? 'BDT'} onChange={e => set('defaultCurrency', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Receipt Required Above (BDT)">
                        <input type="number" min={0} value={form.receiptRequiredAboveAmount ?? 0} onChange={e => set('receiptRequiredAboveAmount', +e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Export Footer Note">
                        <input value={form.exportFooterNote ?? ''} onChange={e => set('exportFooterNote', e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                {/* Approval */}
                <Section title="Approval & Features">
                    <Toggle label="Require Approval for Expense" checked={form.requireApprovalForExpense ?? false} onChange={v => set('requireApprovalForExpense', v)} />
                    <Toggle label="Require Approval for Income" checked={form.requireApprovalForIncome ?? false} onChange={v => set('requireApprovalForIncome', v)} />
                    <Toggle label="Enable Budget Module" checked={form.enableBudgets ?? false} onChange={v => set('enableBudgets', v)} />
                    <Toggle label="Enable Recurring Engine" checked={form.enableRecurringEngine ?? false} onChange={v => set('enableRecurringEngine', v)} />
                </Section>

                {/* Communication Costs */}
                <Section title="Communication Costs">
                    <Field label="SMS Cost Per Message (BDT)">
                        <input type="number" min={0} step={0.01} value={form.smsCostPerMessageBDT ?? 0} onChange={e => set('smsCostPerMessageBDT', +e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Email Cost Per Message (BDT)">
                        <input type="number" min={0} step={0.01} value={form.emailCostPerMessageBDT ?? 0} onChange={e => set('emailCostPerMessageBDT', +e.target.value)} className={inputCls} />
                    </Field>
                </Section>

                {/* Cost Centers */}
                <Section title="Cost Centers">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {(form.costCenters ?? []).map(c => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                {c}
                                <button onClick={() => removeCostCenter(c)} className="text-indigo-400 hover:text-indigo-600"><X size={10} /></button>
                            </span>
                        ))}
                        {(form.costCenters ?? []).length === 0 && <span className="text-[10px] text-slate-400">No cost centers defined.</span>}
                    </div>
                    <div className="flex gap-2">
                        <input value={newCenter} onChange={e => setNewCenter(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCostCenter())} placeholder="Add cost center..." className={inputCls} />
                        <button onClick={addCostCenter} className="shrink-0 rounded-lg bg-indigo-100 px-2 py-1.5 text-indigo-600 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50">
                            <Plus size={14} />
                        </button>
                    </div>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                <Settings size={14} className="text-slate-400" /> {title}
            </h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{label}</label>
            {children}
        </div>
    );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{label}</span>
            <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
        </label>
    );
}
