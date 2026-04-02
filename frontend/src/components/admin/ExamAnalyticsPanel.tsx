import React, { useState, useEffect, useCallback } from 'react';
import { adminGetExamAnalytics, adminEvaluateResult, adminForceSubmitSession } from '../../services/api';
import toast from 'react-hot-toast';
import { Activity, X, AlertTriangle, CheckCircle, FileImage, ShieldAlert, StopCircle } from 'lucide-react';
import { showConfirmDialog } from '../../lib/appDialog';

type WrittenUploadItem = { url: string; type: 'image' | 'pdf' | 'file' };

function toUploadItem(url: string): WrittenUploadItem {
    const normalized = String(url || '').toLowerCase();
    if (normalized.endsWith('.pdf')) return { url, type: 'pdf' };
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalized)) return { url, type: 'image' };
    return { url, type: 'file' };
}

function extractWrittenUploads(student: any): WrittenUploadItem[] {
    if (Array.isArray(student?.writtenUploads) && student.writtenUploads.length > 0) {
        return student.writtenUploads
            .filter(Boolean)
            .map((entry: any) => (typeof entry === 'string' ? toUploadItem(entry) : toUploadItem(String(entry.url || ''))));
    }
    if (Array.isArray(student?.written_uploads) && student.written_uploads.length > 0) {
        return student.written_uploads.filter(Boolean).map((url: string) => toUploadItem(url));
    }
    if (!Array.isArray(student?.answers)) return [];
    return student.answers
        .map((answer: any) => answer?.writtenAnswerUrl)
        .filter((url: string | undefined) => Boolean(url))
        .map((url: string) => toUploadItem(url));
}

/* ── Modal Component ── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-slate-900/65 border border-indigo-500/15 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="sticky top-0 bg-slate-900/65 px-6 py-4 border-b border-indigo-500/10 flex items-center justify-between z-10">
                    <h2 className="font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">&times;</button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function ExamAnalyticsPanel({ examId, onClose }: { examId: string; onClose: () => void }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [evaluateStudent, setEvaluateStudent] = useState<any>(null);
    const [evalForm, setEvalForm] = useState({ obtainedMarks: 0, correctCount: 0, wrongCount: 0 });
    const [saving, setSaving] = useState(false);

    const fetchAnalytics = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminGetExamAnalytics(examId);
            setData(res.data);
        } catch (err) {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [examId]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const handleForceSubmit = async (studentId: string) => {
        const confirmed = await showConfirmDialog({
            title: 'Force submit student',
            message: 'Force submit this student?',
            confirmLabel: 'Force submit',
            tone: 'danger',
        });
        if (!confirmed) return;
        try {
            await adminForceSubmitSession(examId, studentId);
            toast.success('Session force-closed');
            fetchAnalytics();
        } catch (err) {
            toast.error('Failed to force submit');
        }
    };

    const handleSaveEvaluation = async () => {
        setSaving(true);
        try {
            await adminEvaluateResult(evaluateStudent._id, { ...evalForm, status: 'evaluated' });
            toast.success('Evaluation saved successfully!');
            setEvaluateStudent(null);
            fetchAnalytics();
        } catch (err) {
            toast.error('Failed to save evaluation');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-400">Loading live analytics...</div>;
    }

    if (!data) return <div className="p-8 text-center text-slate-400">No data found.</div>;

    const { exam, totalParticipants, avgScore, totalTabSwitches, students } = data;
    const pendingCount = students.filter((s: any) => s.status === 'submitted' && extractWrittenUploads(s).length > 0).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between bg-slate-950/65 p-4 rounded-xl border border-indigo-500/10">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-indigo-400" /> Exam Monitoring: {exam.title}
                    </h2>
                    <p className="text-sm text-slate-400">Live monitoring of user sessions and cheating flags.</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-slate-900/65 p-4 rounded-xl border border-indigo-500/10">
                    <p className="text-xs text-slate-400 mb-1">Total Participants</p>
                    <p className="text-2xl font-bold text-white">{totalParticipants}</p>
                </div>
                <div className="bg-slate-900/65 p-4 rounded-xl border border-indigo-500/10">
                    <p className="text-xs text-slate-400 mb-1">Average Score</p>
                    <p className="text-2xl font-bold text-white">{avgScore?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="bg-slate-900/65 p-4 rounded-xl border border-indigo-500/10">
                    <p className="text-xs text-slate-400 mb-1">Total Tab Switches</p>
                    <p className="text-2xl font-bold text-orange-400">{totalTabSwitches}</p>
                </div>
                <div className="bg-slate-900/65 p-4 rounded-xl border border-indigo-500/10">
                    <p className="text-xs text-slate-400 mb-1">Needs Evaluation</p>
                    <p className="text-2xl font-bold text-fuchsia-400">
                        {pendingCount}
                    </p>
                </div>
            </div>

            {/* Students List */}
            <div className="bg-slate-900/65 rounded-xl border border-indigo-500/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="p-4 font-medium">Student</th>
                                <th className="p-4 font-medium">Score / Status</th>
                                <th className="p-4 font-medium text-center">Tab Switches</th>
                                <th className="p-4 font-medium">Flags</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-500/5 text-sm">
                            {students.map((s: any) => (
                                <tr key={s._id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="text-white font-medium">{s.fullName}</div>
                                        <div className="text-xs text-slate-500">@{s.username}</div>
                                    </td>
                                    <td className="p-4">
                                        {s.status === 'evaluated' ? (
                                            <div>
                                                <span className="text-emerald-400 font-bold">{s.obtainedMarks}</span>
                                                <span className="text-slate-500 text-xs"> / {s.totalMarks}</span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] bg-fuchsia-500/10 text-fuchsia-400 px-2 py-1 rounded-full uppercase font-bold tracking-wider">Awaiting Eval</span>
                                        )}
                                        {s.isAutoSubmitted && <div className="text-[10px] text-slate-500 mt-1">Auto-Submitted</div>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold ${s.tabSwitchCount > 3 ? 'text-red-400' : s.tabSwitchCount > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                            {s.tabSwitchCount || 0}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {s.cheat_flags?.length > 0 ? (
                                            <div className="flex gap-1 flex-wrap">
                                                {s.cheat_flags.slice(0, 2).map((flag: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                        <ShieldAlert className="w-3 h-3" /> {flag.split(':')[0]}
                                                    </span>
                                                ))}
                                                {s.cheat_flags.length > 2 && <span className="text-[10px] text-slate-500">+{s.cheat_flags.length - 2}</span>}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-slate-500">Clean</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {s.status === 'submitted' && extractWrittenUploads(s).length > 0 && (
                                                <button onClick={() => {
                                                    setEvaluateStudent(s);
                                                    setEvalForm({ obtainedMarks: s.obtainedMarks || 0, correctCount: s.correctCount || 0, wrongCount: s.wrongCount || 0 });
                                                }} className="bg-fuchsia-600/20 text-fuchsia-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-fuchsia-600/40 transition-colors flex items-center gap-1">
                                                    Evaluate <FileImage className="w-3 h-3" />
                                                </button>
                                            )}
                                            {!s.submittedAt && !s.status && (
                                                <button onClick={() => handleForceSubmit(s._id)} className="bg-red-500/10 text-red-400 px-2 py-1.5 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1" title="Force Submit Session">
                                                    <StopCircle className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Evaluate Modal */}
            {evaluateStudent && (
                <Modal title={`Evaluate: ${evaluateStudent.fullName}`} onClose={() => setEvaluateStudent(null)}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Student Submissions */}
                        <div className="space-y-4">
                            <h3 className="text-white font-medium flex items-center gap-2"><FileImage className="w-4 h-4 text-indigo-400" /> Written Uploads</h3>
                            <div className="bg-slate-950/65 p-4 rounded-xl border border-indigo-500/10 max-h-96 overflow-y-auto space-y-4">
                                {extractWrittenUploads(evaluateStudent).length === 0 ? (
                                    <p className="text-sm text-slate-500">No attachments uploaded.</p>
                                ) : (
                                    extractWrittenUploads(evaluateStudent).map((item: WrittenUploadItem, i: number) => (
                                        <div key={i} className="border border-indigo-500/20 rounded-lg overflow-hidden group relative">
                                            {item.type === 'image' ? (
                                                <a href={item.url} target="_blank" rel="noreferrer" className="block cursor-zoom-in">
                                                    <img src={item.url} alt={`Upload ${i}`} className="w-full h-auto object-contain hover:scale-105 transition-transform" />
                                                </a>
                                            ) : (
                                                <div className="p-4 bg-slate-950/70">
                                                    <a href={item.url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200 text-sm font-medium underline">
                                                        {item.type === 'pdf' ? 'Open PDF Attachment' : 'Open Attachment'}
                                                    </a>
                                                    <p className="text-xs text-slate-400 mt-1 break-all">{item.url}</p>
                                                </div>
                                            )}
                                            <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-xs text-white">Upload {i + 1}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Grading Form */}
                        <div className="space-y-4 border-t md:border-t-0 md:border-l border-indigo-500/10 pt-4 md:pt-0 md:pl-6">
                            <h3 className="text-white font-medium flex items-center gap-2"><CheckCircle className="w-4 h-4 text-emerald-400" /> Assign Marks</h3>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Total Obtained Marks</label>
                                <input type="number" step="0.5" value={evalForm.obtainedMarks} onChange={e => setEvalForm({ ...evalForm, obtainedMarks: Number(e.target.value) })}
                                    className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none font-bold text-lg" />
                                <p className="text-xs text-slate-500 mt-1">Out of {evaluateStudent.totalMarks}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Correct Answers</label>
                                    <input type="number" value={evalForm.correctCount} onChange={e => setEvalForm({ ...evalForm, correctCount: Number(e.target.value) })}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Wrong Answers</label>
                                    <input type="number" value={evalForm.wrongCount} onChange={e => setEvalForm({ ...evalForm, wrongCount: Number(e.target.value) })}
                                        className="w-full bg-slate-950/65 border border-indigo-500/10 rounded-xl px-4 py-2 text-white focus:border-indigo-500 outline-none" />
                                </div>
                            </div>
                            {evaluateStudent.cheat_flags?.length > 0 && (
                                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl mt-4">
                                    <h4 className="text-xs font-bold text-red-400 flex items-center gap-1 mb-2"><AlertTriangle className="w-3 h-3" /> Warning: Cheating Flags</h4>
                                    <ul className="text-xs text-red-300 list-disc list-inside space-y-1">
                                        {evaluateStudent.cheat_flags.map((flag: string, i: number) => <li key={i}>{flag}</li>)}
                                    </ul>
                                </div>
                            )}
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setEvaluateStudent(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">Cancel</button>
                                <button onClick={handleSaveEvaluation} disabled={saving} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-emerald-500 transition-colors disabled:opacity-50">
                                    {saving ? 'Saving...' : 'Save Evaluation'}
                                </button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
