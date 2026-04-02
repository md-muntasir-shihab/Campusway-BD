import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Award, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
    AdminBadgeItem,
    adminAssignBadge,
    adminCreateBadge,
    adminDeleteBadge,
    adminGetBadges,
    adminRevokeBadge,
    adminUpdateBadge,
} from '../../services/api';
import { showConfirmDialog } from '../../lib/appDialog';

type BadgeForm = {
    code: string;
    title: string;
    description: string;
    iconUrl: string;
    criteriaType: 'auto' | 'manual';
    minAvgPercentage: number;
    minCompletedExams: number;
    isActive: boolean;
};

const emptyBadge: BadgeForm = {
    code: '',
    title: '',
    description: '',
    iconUrl: '',
    criteriaType: 'manual' as const,
    minAvgPercentage: 0,
    minCompletedExams: 0,
    isActive: true,
};

export default function BadgeManagementPanel() {
    const [items, setItems] = useState<AdminBadgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<BadgeForm>(emptyBadge);
    const [assignStudentId, setAssignStudentId] = useState('');
    const [assignBadgeId, setAssignBadgeId] = useState('');
    const [assignNote, setAssignNote] = useState('');

    useEffect(() => {
        void loadBadges();
    }, []);

    const loadBadges = async () => {
        setLoading(true);
        try {
            const res = await adminGetBadges();
            setItems(res.data.items || []);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load badges');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyBadge);
    };

    const startEdit = (item: AdminBadgeItem) => {
        setEditingId(item._id);
        setForm({
            code: item.code || '',
            title: item.title || '',
            description: item.description || '',
            iconUrl: item.iconUrl || '',
            criteriaType: item.criteriaType || 'manual',
            minAvgPercentage: Number(item.minAvgPercentage || 0),
            minCompletedExams: Number(item.minCompletedExams || 0),
            isActive: Boolean(item.isActive),
        });
    };

    const saveBadge = async () => {
        if (!form.code.trim() || !form.title.trim()) {
            toast.error('Code and title are required');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...form,
                code: form.code.trim(),
                title: form.title.trim(),
                description: form.description.trim(),
                iconUrl: form.iconUrl.trim(),
            };
            if (editingId) {
                await adminUpdateBadge(editingId, payload);
                toast.success('Badge updated');
            } else {
                await adminCreateBadge(payload);
                toast.success('Badge created');
            }
            resetForm();
            await loadBadges();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    const removeBadge = async (id: string) => {
        const confirmed = await showConfirmDialog({
            title: 'Delete badge',
            message: 'Delete this badge?',
            confirmLabel: 'Delete',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await adminDeleteBadge(id);
            toast.success('Badge deleted');
            await loadBadges();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Delete failed');
        }
    };

    const assign = async () => {
        if (!assignStudentId.trim() || !assignBadgeId.trim()) {
            toast.error('Student ID and badge are required');
            return;
        }
        try {
            await adminAssignBadge(assignStudentId.trim(), assignBadgeId.trim(), assignNote.trim());
            toast.success('Badge assigned');
            setAssignNote('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Assignment failed');
        }
    };

    const revoke = async () => {
        if (!assignStudentId.trim() || !assignBadgeId.trim()) {
            toast.error('Student ID and badge are required');
            return;
        }
        try {
            await adminRevokeBadge(assignStudentId.trim(), assignBadgeId.trim());
            toast.success('Badge revoked');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Revoke failed');
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="rounded-2xl border border-indigo-500/10 bg-slate-900/65 p-5 space-y-3">
                <h3 className="text-white font-bold flex items-center gap-2"><Plus className="w-4 h-4 text-cyan-300" /> {editingId ? 'Edit Badge' : 'Create Badge'}</h3>
                <div className="grid grid-cols-2 gap-2">
                    <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))} placeholder="Code" className="rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                    <input value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" className="rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                </div>
                <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                <input value={form.iconUrl} onChange={(e) => setForm((prev) => ({ ...prev, iconUrl: e.target.value }))} placeholder="Icon URL" className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                <div className="grid grid-cols-3 gap-2">
                    <select value={form.criteriaType} onChange={(e) => setForm((prev) => ({ ...prev, criteriaType: e.target.value as 'auto' | 'manual' }))} className="rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none">
                        <option value="manual">Manual</option>
                        <option value="auto">Auto</option>
                    </select>
                    <input type="number" value={form.minAvgPercentage} onChange={(e) => setForm((prev) => ({ ...prev, minAvgPercentage: Number(e.target.value) }))} placeholder="Min Avg %" className="rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                    <input type="number" value={form.minCompletedExams} onChange={(e) => setForm((prev) => ({ ...prev, minCompletedExams: Number(e.target.value) }))} placeholder="Min Exams" className="rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none" />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                    Badge Active
                </label>
                <div className="flex gap-2">
                    <button type="button" disabled={saving} onClick={saveBadge} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                        {saving ? 'Saving...' : editingId ? 'Update Badge' : 'Create Badge'}
                    </button>
                    {editingId ? <button type="button" onClick={resetForm} className="rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-300">Cancel</button> : null}
                </div>
            </section>

            <section className="rounded-2xl border border-indigo-500/10 bg-slate-900/65 p-5 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-white font-bold flex items-center gap-2"><Award className="w-4 h-4 text-amber-300" /> Badge List</h3>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin text-slate-400" /> : null}
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {items.length === 0 ? (
                        <p className="text-sm text-slate-500">No badges yet.</p>
                    ) : items.map((item) => (
                        <div key={item._id} className="rounded-xl border border-indigo-500/15 bg-slate-950/65 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div>
                                    <p className="text-sm text-white font-semibold">{item.title}</p>
                                    <p className="text-[11px] text-slate-400">{item.code} • {item.criteriaType}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${item.isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {item.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{item.description || '-'}</p>
                            <div className="mt-2 flex gap-2">
                                <button type="button" onClick={() => startEdit(item)} className="rounded-lg bg-cyan-500/15 px-2.5 py-1 text-xs text-cyan-200">Edit</button>
                                <button type="button" onClick={() => removeBadge(item._id)} className="rounded-lg bg-red-500/15 px-2 py-1 text-xs text-red-200 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-indigo-500/15 bg-slate-950/65 p-3 space-y-2">
                    <p className="text-sm text-white font-semibold">Manual Assignment</p>
                    <input value={assignStudentId} onChange={(e) => setAssignStudentId(e.target.value)} placeholder="Student User ID" className="w-full rounded-lg bg-slate-900/65 border border-indigo-500/15 px-3 py-2 text-sm text-white outline-none" />
                    <select value={assignBadgeId} onChange={(e) => setAssignBadgeId(e.target.value)} className="w-full rounded-lg bg-slate-900/65 border border-indigo-500/15 px-3 py-2 text-sm text-white outline-none">
                        <option value="">Select badge</option>
                        {items.map((item) => (
                            <option key={item._id} value={item._id}>{item.title}</option>
                        ))}
                    </select>
                    <input value={assignNote} onChange={(e) => setAssignNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg bg-slate-900/65 border border-indigo-500/15 px-3 py-2 text-sm text-white outline-none" />
                    <div className="flex gap-2">
                        <button type="button" onClick={assign} className="flex-1 rounded-lg bg-emerald-600/80 px-3 py-2 text-xs font-medium text-white">Assign</button>
                        <button type="button" onClick={revoke} className="flex-1 rounded-lg bg-red-600/80 px-3 py-2 text-xs font-medium text-white">Revoke</button>
                    </div>
                </div>
            </section>
        </div>
    );
}
