import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface ProfileCompletionLockProps {
    children: React.ReactNode;
    requiredPercentage?: number;
    message?: string;
    type?: 'blocker' | 'banner';
}

/**
 * A component that wraps content and shows a lock screen or banner if the 
 * user's profile completion is below the specific threshold.
 */
export default function ProfileCompletionLock({
    children,
    requiredPercentage = 100,
    message = "You must complete your profile 100% to access this feature. We require your valid academic background and guardian details for security.",
    type = 'blocker'
}: ProfileCompletionLockProps) {
    const { user } = useAuth();

    // Check if user is student and has profile data
    const isStudent = user?.role === 'student';
    const completion = user?.profile_completion_percentage || 0;
    const isLocked = isStudent && completion < requiredPercentage;

    if (!isLocked) {
        return <>{children}</>;
    }

    if (type === 'banner') {
        return (
            <div className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 md:p-6 flex items-start gap-4">
                    <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-amber-400 mb-1">Incomplete Profile</h3>
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">{message}</p>
                        <Link
                            to="/student/profile"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-colors"
                        >
                            Complete Profile Now <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
                {children}
            </div>
        );
    }

    return (
        <div className="relative min-h-[400px] w-full flex items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
            <div className="max-w-md text-center space-y-6">
                <div className="mx-auto w-20 h-20 bg-indigo-500/10 rounded-3xl flex items-center justify-center text-indigo-500 animate-pulse">
                    <Lock className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Access Locked</h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="pt-2">
                    <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5 font-bold">
                            <span className="text-slate-500">Current Progress</span>
                            <span className="text-indigo-500">{completion}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-indigo-500 transition-all duration-1000"
                                style={{ width: `${completion}%` }}
                            />
                        </div>
                    </div>

                    <Link
                        to="/student/profile"
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all"
                    >
                        Update My Profile <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
