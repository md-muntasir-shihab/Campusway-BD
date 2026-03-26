import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, RefreshCw, FileText, Users, GraduationCap, Newspaper, Briefcase, BarChart3 } from 'lucide-react';
import {
    adminExportNews,
    adminExportSubscriptionPlans,
    adminExportStudentExamHistory,
    adminExportUniversities,
    adminExportStudents,
} from '../../services/api';
import { downloadFile } from '../../utils/download';

export default function ExportsPanel() {
    const [loading, setLoading] = useState('');
    const [tableFormat, setTableFormat] = useState<'csv' | 'xlsx'>('xlsx');
    const [examHistoryFormat, setExamHistoryFormat] = useState<'csv' | 'xlsx'>('xlsx');

    const doExport = async (type: string) => {
        setLoading(type);
        try {
            if (type === 'news') {
                downloadFile(await adminExportNews(tableFormat), { filename: `news_export.${tableFormat}` });
            } else if (type === 'subscription-plans') {
                downloadFile(await adminExportSubscriptionPlans(tableFormat), { filename: `subscription_plans_export.${tableFormat}` });
            } else if (type === 'universities') {
                downloadFile(await adminExportUniversities({ format: tableFormat }), { filename: `universities_export.${tableFormat}` });
            } else if (type === 'students') {
                downloadFile(await adminExportStudents({ format: tableFormat }), { filename: `students_export.${tableFormat}` });
            } else if (type === 'exam-history') {
                downloadFile(await adminExportStudentExamHistory(examHistoryFormat), { filename: `student_exam_history.${examHistoryFormat}` });
            }
            toast.success(`${type} exported`);
        } catch {
            toast.error('Export failed');
        } finally {
            setLoading('');
        }
    };

    const items = [
        { key: 'universities', label: 'Universities', desc: 'Export all university data', icon: GraduationCap, color: 'from-indigo-500 to-blue-500', cta: `Export ${tableFormat.toUpperCase()}` },
        { key: 'students', label: 'Students', desc: 'Export student accounts', icon: Users, color: 'from-green-500 to-emerald-500', cta: `Export ${tableFormat.toUpperCase()}` },
        { key: 'news', label: 'News', desc: 'Export news articles', icon: Newspaper, color: 'from-orange-500 to-amber-500', cta: `Export ${tableFormat.toUpperCase()}` },
        { key: 'subscription-plans', label: 'Subscription Plans', desc: 'Export subscription plan listings', icon: Briefcase, color: 'from-purple-500 to-pink-500', cta: `Export ${tableFormat.toUpperCase()}` },
        { key: 'exam-history', label: 'Exam History', desc: 'Export attempts, rank and submission timeline', icon: BarChart3, color: 'from-cyan-500 to-indigo-500', cta: examHistoryFormat === 'csv' ? 'Export CSV' : 'Export XLSX' },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-white">Data Export</h2>
                <p className="text-xs text-slate-500">Download CSV and Excel exports.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                {items.map((item) => (
                    <div key={item.key} className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-6 space-y-4 hover:border-indigo-500/20 transition-colors">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                            <item.icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm">{item.label}</h3>
                            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                        </div>
                        {item.key === 'exam-history' ? (
                            <select
                                value={examHistoryFormat}
                                onChange={(e) => setExamHistoryFormat(e.target.value as 'csv' | 'xlsx')}
                                className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2 text-xs text-white outline-none"
                            >
                                <option value="xlsx">XLSX</option>
                                <option value="csv">CSV</option>
                            </select>
                        ) : (
                            <select
                                value={tableFormat}
                                onChange={(e) => setTableFormat(e.target.value as 'csv' | 'xlsx')}
                                className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2 text-xs text-white outline-none"
                            >
                                <option value="xlsx">XLSX</option>
                                <option value="csv">CSV</option>
                            </select>
                        )}
                        <button
                            onClick={() => doExport(item.key)}
                            disabled={!!loading}
                            className="w-full bg-white/5 hover:bg-white/10 text-white text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading === item.key ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {item.cta}
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-slate-900/60 rounded-2xl border border-indigo-500/10 p-5">
                <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <div>
                        <p className="text-sm text-white font-medium">Per Exam Export</p>
                        <p className="text-xs text-slate-500">Detailed single-exam export remains available from Exams tab.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
