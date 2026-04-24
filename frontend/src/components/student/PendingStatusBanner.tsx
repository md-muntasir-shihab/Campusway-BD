import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function PendingStatusBanner() {
    const { user } = useAuth();

    if (!user || user.role !== 'student' || user.status !== 'pending') return null;

    return (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-full text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
                <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                    Account Pending Approval
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                    Your profile is awaiting admin approval. During this time, you can view your profile and announcements, but access to exams, resources, payments, and support is restricted. You'll be notified once your account is approved.
                </p>
            </div>
        </div>
    );
}
