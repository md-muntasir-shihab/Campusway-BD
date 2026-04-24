import { CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { useResetVerification } from '../../../hooks/useApprovalQueries';

interface VerificationStatusBadgeProps {
    studentId: string;
    phoneVerifiedAt?: string | null;
    emailVerifiedAt?: string | null;
    onReset?: () => void;
}

function Badge({
    label,
    verified,
    verifiedAt,
    onReset,
    loading,
}: {
    label: string;
    verified: boolean;
    verifiedAt?: string | null;
    onReset: () => void;
    loading: boolean;
}) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <div className="flex items-center gap-2">
                {verified ? (
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                ) : (
                    <XCircle size={16} className="text-slate-400 dark:text-slate-500" />
                )}
                <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                {verified ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Verified{verifiedAt ? ` · ${new Date(verifiedAt).toLocaleDateString()}` : ''}
                    </span>
                ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                        Not verified
                    </span>
                )}
            </div>
            {verified && (
                <button
                    onClick={onReset}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                    title="Reset verification"
                >
                    <RotateCcw size={12} />
                    Reset
                </button>
            )}
        </div>
    );
}

export default function VerificationStatusBadge({
    studentId,
    phoneVerifiedAt,
    emailVerifiedAt,
    onReset,
}: VerificationStatusBadgeProps) {
    const resetMut = useResetVerification();

    const handleReset = (type: 'phone' | 'email') => {
        resetMut.mutate({ id: studentId, type }, {
            onSuccess: () => onReset?.(),
        });
    };

    return (
        <div className="space-y-0.5">
            <Badge
                label="Phone"
                verified={!!phoneVerifiedAt}
                verifiedAt={phoneVerifiedAt}
                onReset={() => handleReset('phone')}
                loading={resetMut.isPending}
            />
            <Badge
                label="Email"
                verified={!!emailVerifiedAt}
                verifiedAt={emailVerifiedAt}
                onReset={() => handleReset('email')}
                loading={resetMut.isPending}
            />
        </div>
    );
}
