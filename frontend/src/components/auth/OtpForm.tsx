import { useState, FormEvent, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

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

    useEffect(() => {
        let intv: any;
        if (timer > 0) {
            intv = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(intv);
    }, [timer]);

    if (!pending2FA) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (otp.length < 6) {
            toast.error('Please enter a valid 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/verify-2fa', {
                tempToken: pending2FA.tempToken,
                otp
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
        if (timer > 0) return;
        setResendLoading(true);
        try {
            await api.post('/auth/resend-otp', { tempToken: pending2FA.tempToken });
            toast.success('New code sent to ' + pending2FA.maskedEmail);
            setTimer(60);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to resend code');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div className="w-full">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Two-Step Verification</h2>
                <p className="text-sm text-slate-500">
                    We've sent a verification code to <br />
                    <span className="font-semibold text-slate-700">{pending2FA.maskedEmail}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2 text-center">Enter 6-digit Code</label>
                    <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center tracking-[1em] text-2xl font-bold px-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all uppercase"
                        placeholder="••••••"
                        autoFocus
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>Verify & Continue <ArrowRight className="w-4 h-4" /></>
                    )}
                </button>
            </form>

            <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                    Didn't receive the code?{' '}
                    <button
                        onClick={handleResend}
                        disabled={timer > 0 || resendLoading}
                        className="font-medium text-indigo-600 hover:text-indigo-500 disabled:text-slate-400 transition-colors"
                    >
                        {resendLoading ? 'Sending...' : timer > 0 ? `Resend in ${timer}s` : 'Resend now'}
                    </button>
                </p>
                <button
                    onClick={() => {
                        setPending2FA(null);
                        onBackToLogin?.();
                    }}
                    className="mt-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                >
                    Back to login
                </button>
            </div>
        </div>
    );
}
