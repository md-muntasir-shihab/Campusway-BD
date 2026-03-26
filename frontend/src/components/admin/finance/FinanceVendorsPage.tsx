import { useState } from 'react';
import { useFcVendors, useFcCreateVendor } from '../../../hooks/useFinanceCenterQueries';
import type { FcVendor } from '../../../types/finance';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';

type Params = Record<string, string | number | boolean | undefined>;

export default function FinanceVendorsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const params: Params = { page, limit: 20, search: search || undefined };
    const { data, isLoading } = useFcVendors(params);
    const createMut = useFcCreateVendor();

    const vendors = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.ceil(total / 20);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Vendors</h2>
                <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700">
                    <Plus size={14} /> New Vendor
                </button>
            </div>

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search vendors..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
            </div>

            {isLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">Loading...</div>
            ) : vendors.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">No vendors found.</div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {vendors.map(v => (
                        <div key={v._id} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{v.name}</p>
                                    {v.category && <p className="text-[10px] text-slate-500">{v.category}</p>}
                                </div>
                                <span className={`inline-block h-2 w-2 rounded-full ${v.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                            </div>
                            {v.email && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{v.email}</p>}
                            {v.phone && <p className="text-xs text-slate-600 dark:text-slate-400">{v.phone}</p>}
                            {v.address && <p className="mt-1 text-[10px] text-slate-500">{v.address}</p>}
                        </div>
                    ))}
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

            {showCreate && (
                <VendorModal
                    onClose={() => setShowCreate(false)}
                    onSave={data => createMut.mutate(data as Partial<FcVendor>, { onSuccess: () => setShowCreate(false) })}
                    saving={createMut.isPending}
                />
            )}
        </div>
    );
}

function VendorModal({ onClose, onSave, saving }: { onClose: () => void; onSave: (d: Partial<FcVendor>) => void; saving: boolean }) {
    const [form, setForm] = useState<Partial<FcVendor>>({ name: '', email: '', phone: '', address: '', category: '', notes: '', isActive: true });
    const set = (k: string, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" onClick={e => e.stopPropagation()}>
                <h3 className="mb-4 text-base font-semibold text-slate-800 dark:text-white">New Vendor</h3>
                <div className="grid gap-3">
                    <Field label="Name" value={form.name} onChange={v => set('name', v)} />
                    <Field label="Email" value={form.email} onChange={v => set('email', v)} />
                    <Field label="Phone" value={form.phone} onChange={v => set('phone', v)} />
                    <Field label="Category" value={form.category} onChange={v => set('category', v)} />
                    <Field label="Address" value={form.address} onChange={v => set('address', v)} />
                    <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} />
                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={form.isActive} onChange={e => set('isActive', e.target.checked)} id="v-active" />
                        <label htmlFor="v-active" className="text-xs text-slate-600 dark:text-slate-400">Active</label>
                    </div>
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

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-[10px] font-medium text-slate-500">{label}</label>
            <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
        </div>
    );
}
