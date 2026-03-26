import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    ArrowLeft,
    ArrowRight,
    GraduationCap,
    LifeBuoy,
    Mail,
    Phone,
    ShieldCheck,
} from 'lucide-react';

export default function StudentForgotPassword() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    const contactAdminHref = useMemo(() => (
        `/contact?${new URLSearchParams({
            email: email.trim(),
            phone: phone.trim(),
            topic: 'password-reset',
            subject: 'Password reset help',
            message: email.trim()
                ? `I need help resetting the password for ${email.trim()}. Please verify my account and guide me through the next step.`
                : 'I need help resetting the password for my student account. Please verify my account and guide me through the next step.',
        }).toString()}`
    ), [email, phone]);

    const handleContinue = (event: React.FormEvent) => {
        event.preventDefault();
        if (!email.trim()) {
            toast.error('Please enter your student email address');
            return;
        }
        if (!phone.trim()) {
            toast.error('Please enter your phone number so admin can verify the account');
            return;
        }
        navigate(contactAdminHref);
    };

    return (
        <div className="min-h-screen bg-white text-slate-900 dark:bg-[#061226] dark:text-slate-100">
            <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[minmax(0,560px)_1fr]">
                <div className="flex items-center px-4 py-10 sm:px-6 lg:px-12 xl:px-16">
                    <div className="w-full">
                        <Link to="/" className="group mb-8 inline-flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 transition-all group-hover:shadow-indigo-500/40">
                                <GraduationCap className="h-6 w-6" />
                            </div>
                            <div>
                                <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-2xl font-bold text-transparent">
                                    CampusWay
                                </span>
                                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
                                    Student Recovery
                                </p>
                            </div>
                        </Link>

                        <div className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[#0b1a30]/90 dark:shadow-black/30 sm:p-8">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-cyan-300">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Admin Verified Recovery
                            </div>

                            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                Forgot Password
                            </h1>
                            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                                Self-service reset is disabled for student accounts. Send your recovery request to the
                                admin team and they will verify your account before restoring access.
                            </p>

                            <form onSubmit={handleContinue} className="mt-8 space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            Student Email
                                        </span>
                                        <div className="relative">
                                            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                placeholder="student@example.com"
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                                required
                                            />
                                        </div>
                                    </label>

                                    <label className="space-y-1.5">
                                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                                            Phone Number
                                        </span>
                                        <div className="relative">
                                            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(event) => setPhone(event.target.value)}
                                                placeholder="+8801XXXXXXXXX"
                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100"
                                                required
                                            />
                                        </div>
                                    </label>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-0.5 rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-cyan-300">
                                            <LifeBuoy className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                                What happens next?
                                            </p>
                                            <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                                                <li>Admin receives your password reset request in the contact inbox.</li>
                                                <li>Your email and phone number are used to verify ownership.</li>
                                                <li>You receive the next instruction after manual verification.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-600 to-cyan-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:translate-y-[-1px] hover:shadow-indigo-500/30"
                                >
                                    Contact Admin
                                    <ArrowRight className="h-4 w-4" />
                                </button>

                                <div className="flex items-center justify-between gap-3 text-sm">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:text-indigo-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Login
                                    </Link>
                                    <Link
                                        to={contactAdminHref}
                                        className="font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                                    >
                                        Open contact form
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="relative hidden overflow-hidden lg:block">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_38%),radial-gradient(circle_at_80%_20%,_rgba(6,182,212,0.2),_transparent_28%),linear-gradient(180deg,_#0f172a_0%,_#081120_100%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04)_0%,transparent_35%,rgba(255,255,255,0.02)_100%)]" />
                    <div className="relative flex h-full items-center px-12 py-16 xl:px-20">
                        <div className="max-w-xl text-white">
                            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                                Secure access restoration
                            </p>
                            <h2 className="text-4xl font-black leading-tight xl:text-5xl">
                                Student accounts are restored through verified admin support.
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-slate-200">
                                This keeps admission progress, results, and payment history protected. Share the same
                                student email and active phone number so the CampusWay team can verify the request quickly.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
