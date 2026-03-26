import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { GraduationCap, ArrowRight, Loader2, KeyRound, LifeBuoy } from 'lucide-react';

export default function StudentResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [resetError, setResetError] = useState('');
    const navigate = useNavigate();
    const contactAdminHref = useMemo(() => (
        `/contact?${new URLSearchParams({
            topic: 'password-reset',
            subject: 'Password reset support needed',
            message: 'I opened an invalid or expired student password reset link. Please verify my account and guide me through the next recovery step.',
        }).toString()}`
    ), []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Invalid or missing reset token');
            return;
        }

        if (password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);
        setResetError('');
        try {
            await api.post('/auth/reset-password', { token, newPassword: password });
            setSuccess(true);
            toast.success('Password reset successful');

            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            const message = String(err?.response?.data?.message || 'Failed to reset password');
            if (/invalid|expired|token/i.test(message)) {
                setResetError('This link is no longer usable. Contact the admin team to verify the account and continue recovery.');
            }
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (!token && !success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 text-center dark:bg-[#061226]">
                <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-indigo-500/5 dark:border-slate-800 dark:bg-[#0b1a30]">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-rose-500/20">
                        <KeyRound className="h-8 w-8 text-red-600 dark:text-rose-300" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Invalid Reset Link</h2>
                    <p className="mb-4 text-slate-500 dark:text-slate-300">
                        This reset link is invalid or missing the required token. Student password recovery is handled
                        through verified admin support.
                    </p>
                    <div className="space-y-3">
                        <Link
                            to={contactAdminHref}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition-colors hover:bg-indigo-700"
                        >
                            <LifeBuoy className="h-4 w-4" />
                            Contact Admin
                        </Link>
                        <Link
                            to="/login"
                            className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900/60"
                        >
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex bg-white text-slate-900 dark:bg-[#061226] dark:text-slate-100">
            <div className="mx-auto flex flex-1 flex-col justify-center border-r border-slate-100 bg-white/90 px-4 sm:px-6 lg:mx-0 lg:w-[480px] lg:flex-none lg:px-12 xl:w-[560px] xl:px-24 dark:border-slate-800/70 dark:bg-[#061226]/80">
                <div className="mx-auto w-full max-w-sm">
                    <div className="mb-10 text-center lg:text-left">
                        <Link to="/" className="group mb-8 inline-flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 transition-all group-hover:shadow-indigo-500/40">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-2xl font-bold text-transparent">
                                CampusWay
                            </span>
                        </Link>

                        {!success ? (
                            <>
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Set New Password</h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                                    Please enter your new password below. Make sure it's at least 8 characters long.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 lg:mx-0 dark:bg-emerald-500/20">
                                    <KeyRound className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                                </div>
                                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Password Updated!</h2>
                                <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                                    Your password has been successfully reset. Redirecting you to the login page...
                                </p>
                            </>
                        )}
                    </div>

                    {!success ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                                    This page still supports valid admin-issued reset links. If the link expires, use the
                                    contact form so the admin team can verify your account manually.
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                        placeholder="********"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                        placeholder="********"
                                    />
                                </div>
                            </div>

                            {resetError ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                                    <p>{resetError}</p>
                                    <Link to={contactAdminHref} className="mt-2 inline-flex items-center gap-1 font-semibold hover:underline">
                                        Contact admin support
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-[#061226]"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        Reset Password <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    ) : (
                        <div className="mt-8 space-y-6">
                            <Link
                                to="/login"
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#061226]"
                            >
                                Go to Login
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900/40 lg:flex">
                <div className="absolute inset-0 z-0 bg-indigo-600">
                    <img
                        className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-multiply"
                        src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2670&auto=format&fit=crop"
                        alt="Campus View"
                    />
                </div>
                <div className="relative z-10 max-w-3xl p-12 text-white lg:p-24">
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                        <KeyRound className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mb-6 text-4xl font-bold leading-tight lg:text-5xl">Welcome back!</h2>
                    <p className="max-w-2xl text-lg font-medium leading-relaxed text-indigo-100 lg:text-xl">
                        Almost there! Set a strong password to continue your journey and manage your university applications.
                    </p>
                </div>
            </div>
        </div>
    );
}
