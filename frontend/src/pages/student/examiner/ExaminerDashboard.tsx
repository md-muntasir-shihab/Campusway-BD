import { useState } from 'react';
import {
    BookOpen,
    Briefcase,
    CheckCircle2,
    Clock,
    DollarSign,
    FileText,
    Loader2,
    Send,
    TrendingUp,
    Users,
    XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
    useApplyForExaminer,
    useExaminerDashboard,
    useExaminerEarnings,
} from '../../../hooks/useExamSystemQueries';
import type { ExaminerApplicationDto, ExaminerEarnings } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardData {
    isExaminer: boolean;
    applicationStatus?: 'pending' | 'approved' | 'rejected';
    questionsCreated?: number;
    examsCreated?: number;
    groupsManaged?: number;
    totalStudents?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function ApplicationForm({ onSubmit, isSubmitting }: { onSubmit: (data: ExaminerApplicationDto) => void; isSubmitting: boolean }) {
    const [formData, setFormData] = useState<ExaminerApplicationDto>({ institutionName: '', experience: '', subjects: [], reason: '' });
    const [subjectInput, setSubjectInput] = useState('');

    const handleAddSubject = () => {
        const trimmed = subjectInput.trim();
        if (trimmed && !formData.subjects?.includes(trimmed)) {
            setFormData((prev) => ({ ...prev, subjects: [...(prev.subjects ?? []), trimmed] }));
            setSubjectInput('');
        }
    };

    const handleRemoveSubject = (subject: string) => {
        setFormData((prev) => ({ ...prev, subjects: (prev.subjects ?? []).filter((s) => s !== subject) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.reason.trim()) { toast.error('Please provide a reason for your application'); return; }
        onSubmit(formData);
    };

    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-indigo-500" />
                Apply for Examiner
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Become an examiner to create questions, build exams, and earn revenue from your content.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="institution" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Institution Name</label>
                    <input id="institution" type="text" value={formData.institutionName ?? ''} onChange={(e) => setFormData((p) => ({ ...p, institutionName: e.target.value }))} placeholder="Your institution or organization" className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                    <label htmlFor="experience" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Experience</label>
                    <textarea id="experience" value={formData.experience ?? ''} onChange={(e) => setFormData((p) => ({ ...p, experience: e.target.value }))} placeholder="Describe your teaching or exam creation experience" rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none resize-none" />
                </div>
                <div>
                    <label htmlFor="subjects-input" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Subjects</label>
                    <div className="flex gap-2 mb-2">
                        <input id="subjects-input" type="text" value={subjectInput} onChange={(e) => setSubjectInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubject(); } }} placeholder="Add a subject" className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none" />
                        <button type="button" onClick={handleAddSubject} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[44px]">Add</button>
                    </div>
                    {(formData.subjects ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {(formData.subjects ?? []).map((subject) => (
                                <span key={subject} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    {subject}
                                    <button type="button" onClick={() => handleRemoveSubject(subject)} className="ml-0.5 hover:text-red-500 transition-colors" aria-label={`Remove ${subject}`}><XCircle className="h-3.5 w-3.5" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
                <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Reason for Application *</label>
                    <textarea id="reason" value={formData.reason} onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))} placeholder="Why do you want to become an examiner?" rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:border-indigo-500 focus:outline-none resize-none" required />
                </div>
                <button type="submit" disabled={isSubmitting || !formData.reason.trim()} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
            </form>
        </div>
    );
}

function ApplicationStatus({ status }: { status: string }) {
    const config = status === 'pending'
        ? { icon: <Clock className="h-6 w-6 text-amber-500" />, label: 'Application Pending', desc: 'Your application is being reviewed. You will be notified once a decision is made.', color: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' }
        : { icon: <XCircle className="h-6 w-6 text-red-500" />, label: 'Application Rejected', desc: 'Unfortunately, your application was not approved. You may reapply with updated information.', color: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' };

    return (
        <div className={`rounded-2xl border p-6 text-center ${config.color}`}>
            <div className="mx-auto mb-3">{config.icon}</div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-2">{config.label}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{config.desc}</p>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>{icon}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    );
}

function EarningsPanel({ earnings }: { earnings: ExaminerEarnings }) {
    return (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Earnings
            </h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Sales</p>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">৳{earnings.totalSales.toLocaleString()}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Commission</p>
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">-৳{earnings.commissionDeducted.toLocaleString()}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Net Earnings</p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">৳{earnings.netEarnings.toLocaleString()}</p>
                </div>
            </div>
            {earnings.recentTransactions.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Transactions</h4>
                    <div className="space-y-2">
                        {earnings.recentTransactions.map((tx) => (
                            <div key={tx._id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{tx.examTitle ?? tx.packageTitle ?? 'Transaction'}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">+৳{tx.amount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function ExaminerDashboard() {
    const { data: dashboardData, isLoading: isDashLoading, isError: isDashError } = useExaminerDashboard();
    const { data: earningsData, isLoading: isEarningsLoading } = useExaminerEarnings();
    const applyMutation = useApplyForExaminer();

    const dashboard = dashboardData?.data as DashboardData | undefined;
    const earnings = earningsData?.data as ExaminerEarnings | undefined;

    const handleApply = async (formData: ExaminerApplicationDto) => {
        try {
            await applyMutation.mutateAsync(formData);
            toast.success('Application submitted successfully!');
        } catch {
            toast.error('Failed to submit application');
        }
    };

    if (isDashLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isDashError) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <Briefcase className="mx-auto h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to load examiner dashboard</p>
                </div>
            </div>
        );
    }

    const isExaminer = dashboard?.isExaminer ?? false;
    const appStatus = dashboard?.applicationStatus;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-4xl px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-indigo-500" />
                        Examiner Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isExaminer ? 'Manage your questions, exams, and earnings' : 'Apply to become an examiner'}
                    </p>
                </div>

                {!isExaminer && !appStatus && (
                    <ApplicationForm onSubmit={(d) => void handleApply(d)} isSubmitting={applyMutation.isPending} />
                )}

                {!isExaminer && appStatus && appStatus !== 'approved' && (
                    <div className="space-y-4">
                        <ApplicationStatus status={appStatus} />
                        {appStatus === 'rejected' && <ApplicationForm onSubmit={(d) => void handleApply(d)} isSubmitting={applyMutation.isPending} />}
                    </div>
                )}

                {isExaminer && (
                    <div className="space-y-6">
                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">You are an approved examiner. Create questions and exams to earn revenue!</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard icon={<FileText className="h-4 w-4 text-white" />} label="Questions Created" value={dashboard?.questionsCreated ?? 0} color="bg-indigo-500" />
                            <StatCard icon={<BookOpen className="h-4 w-4 text-white" />} label="Exams Created" value={dashboard?.examsCreated ?? 0} color="bg-purple-500" />
                            <StatCard icon={<Users className="h-4 w-4 text-white" />} label="Groups Managed" value={dashboard?.groupsManaged ?? 0} color="bg-blue-500" />
                            <StatCard icon={<TrendingUp className="h-4 w-4 text-white" />} label="Total Students" value={dashboard?.totalStudents ?? 0} color="bg-emerald-500" />
                        </div>

                        {isEarningsLoading ? (
                            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
                        ) : earnings ? (
                            <EarningsPanel earnings={earnings} />
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}
