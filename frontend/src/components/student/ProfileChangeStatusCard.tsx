import { Clock, CheckCircle2, XCircle, FileText } from 'lucide-react';
import { useProfileUpdateRequestStatus } from '../../hooks/useOtpQueries';

const FIELD_LABELS: Record<string, string> = {
    full_name: 'Full Name',
    phone_number: 'Phone Number',
    email: 'Email',
    guardian_name: 'Guardian Name',
    guardian_phone: 'Guardian Phone',
    ssc_batch: 'SSC Batch',
    hsc_batch: 'HSC Batch',
    department: 'Department',
    roll_number: 'Roll Number',
    registration_id: 'Registration ID',
    institution_name: 'Institution Name',
    college_name: 'College Name',
};

const statusConfig = {
    pending: {
        icon: Clock,
        label: 'Pending Review',
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-500/20',
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: 'text-amber-600 dark:text-amber-400',
        textColor: 'text-amber-800 dark:text-amber-200',
        subtextColor: 'text-amber-700 dark:text-amber-400',
    },
    approved: {
        icon: CheckCircle2,
        label: 'Approved',
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-500/20',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
        textColor: 'text-emerald-800 dark:text-emerald-200',
        subtextColor: 'text-emerald-700 dark:text-emerald-400',
    },
    rejected: {
        icon: XCircle,
        label: 'Rejected',
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-200 dark:border-red-500/20',
        iconBg: 'bg-red-100 dark:bg-red-500/20',
        iconColor: 'text-red-600 dark:text-red-400',
        textColor: 'text-red-800 dark:text-red-200',
        subtextColor: 'text-red-700 dark:text-red-400',
    },
} as const;

export default function ProfileChangeStatusCard() {
    const { data, isLoading } = useProfileUpdateRequestStatus();

    if (isLoading || !data?.request) return null;

    const request = data.request;
    const config = statusConfig[request.status];
    const StatusIcon = config.icon;
    const changedFields = Object.keys(request.requested_changes || {});

    return (
        <div className={`${config.bg} border ${config.border} rounded-2xl overflow-hidden`}>
            {/* Header */}
            <div className="p-4 flex items-center gap-3">
                <div className={`p-2 ${config.iconBg} rounded-full ${config.iconColor} flex-shrink-0`}>
                    <StatusIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${config.textColor}`}>
                            Profile Change: {config.label}
                        </p>
                    </div>
                    <p className={`text-xs ${config.subtextColor} mt-0.5`}>
                        Submitted {new Date(request.createdAt).toLocaleDateString()}
                        {request.reviewed_at && ` · Reviewed ${new Date(request.reviewed_at).toLocaleDateString()}`}
                    </p>
                </div>
            </div>

            {/* Pending: show field diff */}
            {request.status === 'pending' && changedFields.length > 0 && (
                <div className="px-4 pb-4">
                    <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl border border-amber-100 dark:border-amber-500/10 overflow-hidden">
                        <div className="px-3 py-2 border-b border-amber-100 dark:border-amber-500/10">
                            <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                Fields Awaiting Approval
                            </p>
                        </div>
                        <div className="divide-y divide-amber-100 dark:divide-amber-500/10">
                            {changedFields.map((field) => (
                                <div key={field} className="px-3 py-2.5 flex items-start gap-3">
                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-28 flex-shrink-0 pt-0.5">
                                        {FIELD_LABELS[field] || field}
                                    </span>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <p className="text-xs text-slate-400 line-through truncate">
                                            {String(request.previous_values?.[field] ?? '—')}
                                        </p>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                                            {String(request.requested_changes[field] ?? '—')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected: show admin feedback */}
            {request.status === 'rejected' && request.admin_feedback && (
                <div className="px-4 pb-4">
                    <div className="bg-white/60 dark:bg-slate-800/40 rounded-xl border border-red-100 dark:border-red-500/10 p-3">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Admin Feedback</p>
                        <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{request.admin_feedback}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
