import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Settings, RefreshCw } from 'lucide-react';
import { useQBSettings, useUpdateQBSettings } from '../../../hooks/useQuestionBankV2Queries';
import type { QuestionBankSettings } from '../../../types/questionBank';

export default function QuestionBankSettingsPanel() {
    const { data: settings, isLoading } = useQBSettings();
    const updateMut = useUpdateQBSettings();

    const [form, setForm] = useState<Partial<QuestionBankSettings>>({});

    useEffect(() => { if (settings) setForm(settings); }, [settings]);

    function handleSave() {
        updateMut.mutate(form, { onSuccess: () => toast.success('Settings saved') });
    }

    if (isLoading) return <p className="text-slate-500 dark:text-slate-400 text-sm p-4">Loading settings…</p>;

    const label = 'text-sm font-medium text-slate-600 dark:text-slate-300';
    const input = 'mt-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none';

    return (
        <div className="space-y-6 max-w-2xl">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-400" /> Question Bank Settings</h2>

            <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-700/60 dark:bg-slate-900/40 p-6 space-y-5">
                {/* Versioning */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className={label}>Auto-version on edit if used</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Create a new version instead of overwriting when a question has been used in exams</p>
                    </div>
                    <Toggle checked={!!form.versioningOnEditIfUsed} onChange={(v) => setForm({ ...form, versioningOnEditIfUsed: v })} />
                </div>

                {/* Archive instead of delete */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className={label}>Archive instead of delete</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Soft-delete questions to the archive rather than permanently deleting</p>
                    </div>
                    <Toggle checked={!!form.archiveInsteadOfDelete} onChange={(v) => setForm({ ...form, archiveInsteadOfDelete: v })} />
                </div>

                {/* Duplicate detection */}
                <div>
                    <label className={label}>Duplicate Detection Sensitivity</label>
                    <select value={String(form.duplicateDetectionSensitivity ?? 0.85)} onChange={(e) => setForm({ ...form, duplicateDetectionSensitivity: parseFloat(e.target.value) })} className={`w-full ${input}`}>
                        <option value="1">Exact (content hash match)</option>
                        <option value="0.85">Fuzzy (normalized text match)</option>
                        <option value="0">Off</option>
                    </select>
                </div>

                {/* Default marks */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={label}>Default Marks</label>
                        <input type="number" step="0.5" value={form.defaultMarks ?? 1} onChange={(e) => setForm({ ...form, defaultMarks: +e.target.value })} className={`w-full ${input}`} />
                    </div>
                    <div>
                        <label className={label}>Default Negative Marks</label>
                        <input type="number" step="0.25" value={form.defaultNegativeMarks ?? 0} onChange={(e) => setForm({ ...form, defaultNegativeMarks: +e.target.value })} className={`w-full ${input}`} />
                    </div>
                </div>

                {/* Import size limit */}
                <div>
                    <label className={label}>Max Import Rows</label>
                    <input type="number" value={form.importSizeLimit ?? 500} onChange={(e) => setForm({ ...form, importSizeLimit: +e.target.value })} className={`w-full ${input}`} />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Maximum rows per import file</p>
                </div>
            </div>

            <button onClick={handleSave} disabled={updateMut.isPending} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 disabled:opacity-60 transition">
                {updateMut.isPending && <RefreshCw className="w-4 h-4 animate-spin" />} Save Settings
            </button>
        </div>
    );
}

/* ---- Toggle ---- */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-700'}`}
        >
            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}
