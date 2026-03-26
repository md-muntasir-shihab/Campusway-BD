import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, Pencil, Layers, RefreshCw, X } from 'lucide-react';
import {
    useSetList, useCreateSet, useUpdateSet, useDeleteSet, useResolveSetQuestions,
} from '../../../hooks/useQuestionBankV2Queries';
import type { QuestionBankSet, BankQuestion } from '../../../types/questionBank';

type Difficulty = 'easy' | 'medium' | 'hard';

export default function QuestionBankSetsPanel() {
    const [editing, setEditing] = useState<QuestionBankSet | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [resolvedId, setResolvedId] = useState<string | null>(null);

    const { data: sets = [], isLoading } = useSetList();
    const createMut = useCreateSet();
    const updateMut = useUpdateSet();
    const deleteMut = useDeleteSet();

    function handleNew() { setEditing(null); setShowForm(true); }
    function handleEdit(s: QuestionBankSet) { setEditing(s); setShowForm(true); }
    function handleDelete(id: string) {
        if (!confirm('Delete this set?')) return;
        deleteMut.mutate(id, { onSuccess: () => toast.success('Set deleted') });
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Question Sets</h2>
                <button onClick={handleNew} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition">
                    <Plus className="w-4 h-4" /> New Set
                </button>
            </div>

            {isLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Loading…</p>}

            {!isLoading && sets.length === 0 && !showForm && (
                <p className="text-slate-500 text-sm">No sets yet. Create one to group questions.</p>
            )}

            {/* List */}
            {!showForm && sets.map((s) => (
                <div key={s._id} className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40 flex items-center justify-between">
                    <div className="min-w-0">
                        <h3 className="text-slate-900 dark:text-white font-semibold truncate">{s.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{s.mode} — {s.mode === 'manual' ? `${s.selectedBankQuestionIds?.length || 0} questions` : 'Rule-based'}</p>
                        {s.description && <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 truncate">{s.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setResolvedId(s._id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition" title="Preview">
                            <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(s)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-900 dark:hover:text-white transition" title="Edit">
                            <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s._id)} className="p-2 rounded-lg hover:bg-white/5 text-rose-400 hover:text-rose-300 transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            {/* Form */}
            {showForm && <SetForm initial={editing} onClose={() => setShowForm(false)} onSave={async (body) => {
                if (editing) {
                    await updateMut.mutateAsync({ id: editing._id, payload: body });
                    toast.success('Set updated');
                } else {
                    await createMut.mutateAsync(body);
                    toast.success('Set created');
                }
                setShowForm(false);
            }} saving={createMut.isPending || updateMut.isPending} />}

            {/* Resolve preview modal */}
            {resolvedId && <ResolvePreview setId={resolvedId} onClose={() => setResolvedId(null)} />}
        </div>
    );
}

/* ---- Set Form ---- */
interface SetFormProps { initial: QuestionBankSet | null; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void>; saving: boolean; }

function SetForm({ initial, onClose, onSave, saving }: SetFormProps) {
    const [name, setName] = useState(initial?.name || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [mode, setMode] = useState<'manual' | 'rule_based'>(initial?.mode || 'manual');
    const [questionIds, setQuestionIds] = useState(initial?.selectedBankQuestionIds?.join(', ') || '');

    // Rule‑based fields
    const [totalQuestions, setTotalQuestions] = useState(initial?.rules?.totalQuestions || 20);
    const [subjects, setSubjects] = useState(initial?.rules?.subject || '');
    const [topics, setTopics] = useState(initial?.rules?.topics?.join(', ') || '');
    const [diffEasy, setDiffEasy] = useState(initial?.rules?.difficultyMix?.easy || 30);
    const [diffMedium, setDiffMedium] = useState(initial?.rules?.difficultyMix?.medium || 50);
    const [diffHard, setDiffHard] = useState(initial?.rules?.difficultyMix?.hard || 20);

    async function submit() {
        if (!name.trim()) { toast.error('Name is required'); return; }
        const body: Record<string, unknown> = { name: name.trim(), description: description.trim(), mode };
        if (mode === 'manual') {
            body.selectedBankQuestionIds = questionIds.split(',').map((s) => s.trim()).filter(Boolean);
        } else {
            body.rules = {
                totalQuestions,
                subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean),
                topics: topics.split(',').map((s) => s.trim()).filter(Boolean),
                difficultyMix: { easy: diffEasy, medium: diffMedium, hard: diffHard } as Record<Difficulty, number>,
            };
        }
        await onSave(body);
    }

    const label = 'text-sm font-medium text-slate-600 dark:text-slate-300';
    const input = 'w-full mt-1 px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none';

    return (
        <div className="border border-slate-200 rounded-2xl bg-white dark:border-slate-700/60 dark:bg-slate-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-slate-900 dark:text-white font-semibold">{initial ? 'Edit Set' : 'New Set'}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div><label className={label}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={input} /></div>
            <div><label className={label}>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={input} /></div>

            <div>
                <label className={label}>Mode</label>
                <select value={mode} onChange={(e) => setMode(e.target.value as 'manual' | 'rule_based')} className={`mt-1 ${input}`}>
                    <option value="manual">Manual (pick questions)</option>
                    <option value="rule_based">Rule-based (auto‑sample)</option>
                </select>
            </div>

            {mode === 'manual' && (
                <div>
                    <label className={label}>Question IDs (comma-separated)</label>
                    <textarea value={questionIds} onChange={(e) => setQuestionIds(e.target.value)} rows={3} placeholder="Paste bank question IDs…" className={input} />
                </div>
            )}

            {mode === 'rule_based' && (
                <div className="space-y-3">
                    <div><label className={label}>Total Questions</label><input type="number" value={totalQuestions} onChange={(e) => setTotalQuestions(+e.target.value)} className={input} /></div>
                    <div><label className={label}>Subjects (comma-separated)</label><input value={subjects} onChange={(e) => setSubjects(e.target.value)} className={input} /></div>
                    <div><label className={label}>Topics (comma-separated)</label><input value={topics} onChange={(e) => setTopics(e.target.value)} className={input} /></div>
                    <div className="grid grid-cols-3 gap-3">
                        <div><label className={label}>Easy %</label><input type="number" value={diffEasy} onChange={(e) => setDiffEasy(+e.target.value)} className={input} /></div>
                        <div><label className={label}>Medium %</label><input type="number" value={diffMedium} onChange={(e) => setDiffMedium(+e.target.value)} className={input} /></div>
                        <div><label className={label}>Hard %</label><input type="number" value={diffHard} onChange={(e) => setDiffHard(+e.target.value)} className={input} /></div>
                    </div>
                </div>
            )}

            <div className="flex gap-3 pt-2">
                <button onClick={submit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 disabled:opacity-60 flex items-center gap-2 transition">
                    {saving && <RefreshCw className="w-4 h-4 animate-spin" />} {initial ? 'Update Set' : 'Create Set'}
                </button>
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition">Cancel</button>
            </div>
        </div>
    );
}

/* ---- Resolve Preview ---- */
function ResolvePreview({ setId, onClose }: { setId: string; onClose: () => void }) {
    const { data, isLoading } = useResolveSetQuestions(setId);
    const questions: BankQuestion[] = data ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-400" /> Resolved Questions</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                {isLoading && <p className="text-slate-500 dark:text-slate-400 text-sm">Resolving…</p>}
                {!isLoading && questions.length === 0 && <p className="text-slate-500 text-sm">No questions match this set's criteria.</p>}
                <div className="space-y-2">
                    {questions.map((q) => (
                        <div key={q._id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-900/40 text-sm">
                            <p className="text-slate-900 dark:text-white truncate">{q.question_en || q.question_bn}</p>
                            <span className="text-slate-500 text-xs">{q.subject} • {q.difficulty} • {q.marks} marks</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
