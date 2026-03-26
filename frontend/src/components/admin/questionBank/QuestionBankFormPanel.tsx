import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save, RefreshCw, ArrowLeft } from 'lucide-react';
import {
    useBankQuestionDetail,
    useCreateBankQuestion,
    useUpdateBankQuestion,
} from '../../../hooks/useQuestionBankV2Queries';
import type { BankQuestionOption } from '../../../types/questionBank';
import AdminImageUploadField from '../AdminImageUploadField';

interface Props {
    editId: string | null;
    onDone: () => void;
}

const emptyOption = (key: 'A' | 'B' | 'C' | 'D'): BankQuestionOption => ({
    key,
    text_en: '',
    text_bn: '',
    imageUrl: '',
});

const KEYS = ['A', 'B', 'C', 'D'] as const;

export default function QuestionBankFormPanel({ editId, onDone }: Props) {
    const isEdit = !!editId;
    const { data: detail, isLoading: loadingDetail } = useBankQuestionDetail(editId || '');
    const createMut = useCreateBankQuestion();
    const updateMut = useUpdateBankQuestion();

    // Form state
    const [subject, setSubject] = useState('');
    const [moduleCategory, setModuleCategory] = useState('');
    const [topic, setTopic] = useState('');
    const [subtopic, setSubtopic] = useState('');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [languageMode, setLanguageMode] = useState<'en' | 'bn' | 'both'>('en');
    const [questionEn, setQuestionEn] = useState('');
    const [questionBn, setQuestionBn] = useState('');
    const [questionImageUrl, setQuestionImageUrl] = useState('');
    const [options, setOptions] = useState<BankQuestionOption[]>(KEYS.map(emptyOption));
    const [correctKey, setCorrectKey] = useState<'A' | 'B' | 'C' | 'D'>('A');
    const [explanationEn, setExplanationEn] = useState('');
    const [explanationBn, setExplanationBn] = useState('');
    const [explanationImageUrl, setExplanationImageUrl] = useState('');
    const [marks, setMarks] = useState(1);
    const [negativeMarks, setNegativeMarks] = useState(0);
    const [tags, setTags] = useState('');
    const [sourceLabel, setSourceLabel] = useState('');
    const [chapter, setChapter] = useState('');
    const [boardOrPattern, setBoardOrPattern] = useState('');
    const [yearOrSession, setYearOrSession] = useState('');

    // Populate form on edit
    useEffect(() => {
        if (isEdit && detail?.question) {
            const q = detail.question;
            setSubject(q.subject);
            setModuleCategory(q.moduleCategory);
            setTopic(q.topic);
            setSubtopic(q.subtopic);
            setDifficulty(q.difficulty);
            setLanguageMode(q.languageMode);
            setQuestionEn(q.question_en);
            setQuestionBn(q.question_bn);
            setQuestionImageUrl(q.questionImageUrl);
            setOptions(q.options.length >= 4 ? q.options : KEYS.map(emptyOption));
            setCorrectKey(q.correctKey);
            setExplanationEn(q.explanation_en);
            setExplanationBn(q.explanation_bn);
            setExplanationImageUrl(q.explanationImageUrl);
            setMarks(q.marks);
            setNegativeMarks(q.negativeMarks);
            setTags(q.tags.join(', '));
            setSourceLabel(q.sourceLabel);
            setChapter(q.chapter);
            setBoardOrPattern(q.boardOrPattern);
            setYearOrSession(q.yearOrSession);
        }
    }, [isEdit, detail]);

    function updateOption(index: number, field: 'text_en' | 'text_bn', value: string) {
        setOptions((prev) => prev.map((o, i) => i === index ? { ...o, [field]: value } : o));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            subject,
            moduleCategory,
            topic,
            subtopic,
            difficulty,
            languageMode,
            question_en: questionEn,
            question_bn: questionBn,
            questionImageUrl,
            options,
            correctKey,
            explanation_en: explanationEn,
            explanation_bn: explanationBn,
            explanationImageUrl,
            marks,
            negativeMarks,
            tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
            sourceLabel,
            chapter,
            boardOrPattern,
            yearOrSession,
        };

        try {
            if (isEdit && editId) {
                const result = await updateMut.mutateAsync({ id: editId, payload });
                toast.success(result.versioned ? 'New version created' : 'Question updated');
            } else {
                await createMut.mutateAsync(payload);
                toast.success('Question created');
            }
            onDone();
        } catch (err: any) {
            toast.error(err?.response?.data?.error || 'Save failed');
        }
    }

    const saving = createMut.isPending || updateMut.isPending;

    if (isEdit && loadingDetail) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-slate-500 dark:text-slate-400 text-sm">Loading question...</p>
            </div>
        );
    }

    const inputCls = 'w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-slate-900/80 dark:border-slate-700/60 dark:text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50';
    const labelCls = 'block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium';

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <button type="button" onClick={onDone} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition mb-2">
                <ArrowLeft className="w-4 h-4" /> Back to list
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{isEdit ? 'Edit Question' : 'Add New Question'}</h2>

            {/* Category row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Subject *</label>
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} required className={inputCls} placeholder="e.g. Physics" />
                </div>
                <div>
                    <label className={labelCls}>Module Category *</label>
                    <input value={moduleCategory} onChange={(e) => setModuleCategory(e.target.value)} required className={inputCls} placeholder="e.g. HSC" />
                </div>
                <div>
                    <label className={labelCls}>Topic</label>
                    <input value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} placeholder="e.g. Mechanics" />
                </div>
                <div>
                    <label className={labelCls}>Subtopic</label>
                    <input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} className={inputCls} placeholder="e.g. Newton's Laws" />
                </div>
            </div>

            {/* Meta row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)} className={inputCls}>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Language Mode</label>
                    <select value={languageMode} onChange={(e) => setLanguageMode(e.target.value as any)} className={inputCls}>
                        <option value="en">English</option>
                        <option value="bn">Bangla</option>
                        <option value="both">Both</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Marks</label>
                    <input type="number" value={marks} onChange={(e) => setMarks(Number(e.target.value))} min={0} step={0.5} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Negative Marks</label>
                    <input type="number" value={negativeMarks} onChange={(e) => setNegativeMarks(Number(e.target.value))} min={0} step={0.25} className={inputCls} />
                </div>
            </div>

            {/* Question text */}
            <div className="space-y-4">
                {(languageMode === 'en' || languageMode === 'both') && (
                    <div>
                        <label className={labelCls}>Question Text (EN) {languageMode === 'en' ? '*' : ''}</label>
                        <textarea value={questionEn} onChange={(e) => setQuestionEn(e.target.value)} rows={3} className={inputCls} placeholder="Type question in English..." required={languageMode === 'en'} />
                    </div>
                )}
                {(languageMode === 'bn' || languageMode === 'both') && (
                    <div>
                        <label className={labelCls}>Question Text (BN) {languageMode === 'bn' ? '*' : ''}</label>
                        <textarea value={questionBn} onChange={(e) => setQuestionBn(e.target.value)} rows={3} className={inputCls} placeholder="প্রশ্ন বাংলায় লিখুন..." required={languageMode === 'bn'} />
                    </div>
                )}
                <AdminImageUploadField
                    label="Question Image"
                    value={questionImageUrl}
                    onChange={setQuestionImageUrl}
                    helper="Optional diagram or prompt image for this question."
                    category="admin_upload"
                    fit="contain"
                    previewClassName="min-h-[180px]"
                    panelClassName="dark:bg-slate-900/45"
                />
            </div>

            {/* Options */}
            <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">Options</p>
                {options.map((opt, i) => (
                    <div key={opt.key} className={`p-4 rounded-xl border transition ${opt.key === correctKey ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-900/10' : 'border-slate-200 bg-slate-50 dark:border-slate-700/60 dark:bg-slate-800/30'}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 w-6">{opt.key}.</span>
                            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                                <input type="radio" name="correctKey" value={opt.key} checked={correctKey === opt.key} onChange={() => setCorrectKey(opt.key)} />
                                Correct
                            </label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(languageMode === 'en' || languageMode === 'both') && (
                                <input value={opt.text_en} onChange={(e) => updateOption(i, 'text_en', e.target.value)} className={inputCls} placeholder={`Option ${opt.key} (EN)`} />
                            )}
                            {(languageMode === 'bn' || languageMode === 'both') && (
                                <input value={opt.text_bn} onChange={(e) => updateOption(i, 'text_bn', e.target.value)} className={inputCls} placeholder={`Option ${opt.key} (BN)`} />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Explanation */}
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-300 font-semibold">Explanation</p>
                {(languageMode === 'en' || languageMode === 'both') && (
                    <textarea value={explanationEn} onChange={(e) => setExplanationEn(e.target.value)} rows={2} className={inputCls} placeholder="Explanation (EN)..." />
                )}
                {(languageMode === 'bn' || languageMode === 'both') && (
                    <textarea value={explanationBn} onChange={(e) => setExplanationBn(e.target.value)} rows={2} className={inputCls} placeholder="ব্যাখ্যা (BN)..." />
                )}
                <AdminImageUploadField
                    label="Explanation Image"
                    value={explanationImageUrl}
                    onChange={setExplanationImageUrl}
                    helper="Optional solution image shown under the explanation block."
                    category="admin_upload"
                    fit="contain"
                    previewClassName="min-h-[180px]"
                    panelClassName="dark:bg-slate-900/45"
                />
            </div>

            {/* Extra metadata */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Tags (comma-separated)</label>
                    <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputCls} placeholder="mcq, final, important" />
                </div>
                <div>
                    <label className={labelCls}>Source Label</label>
                    <input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} className={inputCls} placeholder="Dhaka Board 2023" />
                </div>
                <div>
                    <label className={labelCls}>Chapter</label>
                    <input value={chapter} onChange={(e) => setChapter(e.target.value)} className={inputCls} placeholder="Chapter 5" />
                </div>
                <div>
                    <label className={labelCls}>Board / Pattern</label>
                    <input value={boardOrPattern} onChange={(e) => setBoardOrPattern(e.target.value)} className={inputCls} />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                    <label className={labelCls}>Year / Session</label>
                    <input value={yearOrSession} onChange={(e) => setYearOrSession(e.target.value)} className={inputCls} placeholder="2023" />
                </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-2 hover:bg-indigo-500 disabled:opacity-60 transition"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isEdit ? 'Update Question' : 'Create Question'}
                </button>
                <button type="button" onClick={onDone} className="px-6 py-2.5 rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                    Cancel
                </button>
            </div>
        </form>
    );
}
