import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import AuthBrandHeader from '../../components/auth/AuthBrandHeader';
import ThemeSwitchPro from '../../components/ui/ThemeSwitchPro';

export default function ChairmanLoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        try {
            const response = await login(identifier.trim(), password, { portal: 'chairman' });
            if (response?.requires2fa) {
                navigate('/otp-verify?from=chairman', { replace: true });
                return;
            }
            navigate('/chairman/dashboard', { replace: true });
        } catch (err: any) {
            setError(String(err?.response?.data?.message || 'Chairman login failed.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen cw-bg px-4 py-8">
            <div className="mx-auto flex w-full max-w-lg justify-end">
                <ThemeSwitchPro className="mb-4" />
            </div>
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg items-center justify-center">
                <div className="w-full rounded-3xl border cw-border cw-surface p-6 shadow-xl sm:p-8">
                    <AuthBrandHeader subtitle="Chairman Portal" />

                    <div className="mb-6 rounded-xl border cw-border bg-primary/5 p-3 text-xs cw-muted">
                        <div className="flex items-center gap-2 font-semibold cw-text">
                            <Shield className="h-4 w-4 text-primary" />
                            Chairman secure access
                        </div>
                        <p className="mt-1">OTP verification placeholder enabled for future extension.</p>
                    </div>

                    {error ? (
                        <div className="mb-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                            {error}
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide cw-muted">Username / Email</label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                value={identifier}
                                onChange={(event) => setIdentifier(event.target.value)}
                                className="input-field h-12 w-full"
                                placeholder="chairman@example.com"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide cw-muted">Password</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="input-field h-12 w-full"
                                placeholder="********"
                                required
                                disabled={loading}
                            />
                        </div>
                        <button type="submit" className="btn-primary h-12 w-full justify-center gap-2 rounded-xl" disabled={loading}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                            {loading ? 'Signing in...' : 'Sign In to Chairman Portal'}
                        </button>
                    </form>

                    <p className="mt-6 text-center text-sm cw-muted">
                        Student account? <Link to="/login" className="font-semibold text-primary hover:underline">Go to student login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
