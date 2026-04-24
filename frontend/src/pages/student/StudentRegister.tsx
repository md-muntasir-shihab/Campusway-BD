import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, ArrowRight, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function StudentRegister() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: '',
    });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post('/auth/register', {
                ...formData,
                role: 'student',
            });
            toast.success(res.data.message || 'Registration successful! Please check your email.');
            navigate('/login');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

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
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Create an account</h2>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
                            Already have an account?{' '}
                            <Link
                                to="/login"
                                className="font-medium text-indigo-600 transition-colors hover:text-indigo-500 dark:text-cyan-300 dark:hover:text-cyan-200"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 pb-20 sm:pb-0">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Full Name</label>
                            <input
                                type="text"
                                name="fullName"
                                required
                                value={formData.fullName}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
                            <input
                                type="text"
                                name="username"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                placeholder="johndoe123"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Email address</label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500"
                                placeholder="********"
                            />
                        </div>

                        <div className="sticky bottom-0 bg-white/95 dark:bg-[#061226]/95 backdrop-blur py-3 px-4 -mx-4 sm:static sm:bg-transparent sm:dark:bg-transparent sm:backdrop-blur-none sm:py-0 sm:px-0 sm:mx-0">
                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-6 sm:mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent bg-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-[#061226]"
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        Create Account <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900/40 lg:flex">
                <div className="absolute inset-0 z-0 bg-cyan-600">
                    <img
                        className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-multiply"
                        src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=2670&auto=format&fit=crop"
                        alt="Campus Library"
                    />
                </div>
                <div className="relative z-10 max-w-3xl p-12 text-white lg:p-24">
                    <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 backdrop-blur">
                        <GraduationCap className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="mb-6 text-4xl font-bold leading-tight lg:text-5xl">Start shaping your tomorrow.</h2>
                    <p className="max-w-2xl text-lg font-medium leading-relaxed text-cyan-100 lg:text-xl">
                        Access hundreds of university programs, manage your applications, and track your progress all in one secure portal.
                    </p>
                </div>
            </div>
        </div>
    );
}
