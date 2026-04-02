import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight, KeyRound, ShieldCheck, Smartphone } from 'lucide-react';

export default function OtpForm({
    onComplete,
    onBackToLogin,
}: {
    onComplete: (user: any) => void;
    onBackToLogin?: () => void;
}) {
    const { pending2FA, setPending2FA, completeLogin } = useAuth();
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [timer, setTimer] = useState(60);

    if (!pending2FA) return null;

    const challengeMethod = pending2FA.method === 'authenticator' ? 'authenticator' : 'email';
    const isAuthenticatorChallenge = challengeMethod === 'authenticator';

    useEffect(() => {
        let intv: ReturnType<typeof setInterval> | null = null;
        if (!isAuthenticatorChallenge && timer > 0) {
            intv = setInterval(() => setTimer((current) => current - 1), 1000);
        }
        return () => {
            if (intv) clearInterval(intv);
        };
    }, [isAuthenticatorChallenge, timer]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const trimmedOtp = otp.trim();
        const hasValidTotp = /^\d{6}$/.test(trimmedOtp);
        const hasValidBackupCode = /^[A-Za-z0-9-]{8,}$/.test(trimmedOtp);

        if (isAuthenticatorChallenge ? !(hasValidTotp || hasValidBackupCode) : !hasValidTotp) {
            toast.error(isAuthenticatorChallenge ? 'Enter a 6-digit code or a backup code' : 'Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/verify-2fa', {
                tempToken: pending2FA.tempToken,
                otp: trimmedOtp,
            });
            completeLogin(res.data.token, res.data.user);
            toast.success('Verification successful');
            onComplete(res.data.user);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (isAuthenticatorChallenge || timer > 0) return;
        setResendLoading(true);
        try {
            await api.post('/auth/resend-otp', { tempToken: pending2FA.tempToken });
            toast.success(`New code sent to ${pending2FA.maskedEmail}`);
            setTimer(60);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                    {isAuthenticatorChallenge ? (
                        <Smartphone className="h-8 w-8 text-indigo-600" />
                    ) : (
                        <ShieldCheck className="h-8 w-8 text-indigo-600" />
                    )}
                </div>
                <h2 className="mb-2 text-2xl font-bold text-slate-900">Two-Step Verification</h2>
                {isAuthenticatorChallenge ? (
                    <p className="text-sm text-slate-500">
                        Open your authenticator app and enter the latest 6-digit code,
                        or use one of your backup codes.
                    </p>
                ) : (
                    <p className="text-sm text-slate-500">
                        We've sent a verification code to <br />
                        <span className="font-semibold text-slate-700">{pending2FA.maskedEmail}</span>
                    </p>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="mb-2 block text-center text-sm font-medium text-slate-700">
                        {isAuthenticatorChallenge ? 'Enter Authenticator or Backup Code' : 'Enter 6-digit Code'}
                    </label>
                    <input
                        type="text"
                        maxLength={isAuthenticatorChallenge ? 16 : 6}
                        value={otp}
                        onChange={(e) => setOtp(isAuthenticatorChallenge ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))}
                        className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-center uppercase text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${isAuthenticatorChallenge ? 'text-xl font-semibold tracking-[0.3em]' : 'text-2xl font-bold tracking-[1em]'}`}
                        placeholder={isAuthenticatorChallenge ? 'ABC12345' : '......'}
                        autoFocus
                    />
                    {isAuthenticatorChallenge ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs leading-6 text-slate-500">
                            <div className="flex items-center gap-2 font-semibold text-slate-700">
                                <KeyRound className="h-3.5 w-3.5" />
                                Accepted formats
                            </div>
                            <p className="mt-1">Use the current 6-digit authenticator code, or paste a backup code exactly as saved.</p>
                        </div>
                    ) : null}
                </div>

                <button
                    type="submit"
                    disabled={loading || otp.trim().length < 6}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                        <>Verify & Continue <ArrowRight className="h-4 w-4" /></>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                {!isAuthenticatorChallenge ? (
                    <p className="text-sm text-slate-500">
                        Didn't receive the code?{' '}
                        <button
                            onClick={handleResend}
                            disabled={timer > 0 || resendLoading}
                            className="font-medium text-indigo-600 transition-colors hover:text-indigo-500 disabled:text-slate-400"
                        >
                            {resendLoading ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend now'}
                        </button>
                    </p>
                ) : (
                    <p className="text-sm text-slate-500">
                        If the code is rejected, check that your device time is set to automatic.
                    </p>
                )}
                <button
                    onClick={() => {
                        setPending2FA(null);
                        onBackToLogin?.();
                    }}
                    className="mt-4 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
}
