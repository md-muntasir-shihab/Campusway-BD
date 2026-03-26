import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import OtpForm from '../components/auth/OtpForm';

export default function OtpVerificationPage() {
    const { pending2FA } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const from = String(searchParams.get('from') || '').toLowerCase();
    const loginRoute = from === 'admin'
        ? '/__cw_admin__/login'
        : from === 'chairman'
            ? '/chairman/login'
            : '/login';

    useEffect(() => {
        if (!pending2FA) {
            navigate(loginRoute, { replace: true });
        }
    }, [pending2FA, navigate, loginRoute]);

    if (!pending2FA) return null;

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-600 mx-auto mb-3 flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Verify Login</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Complete your 2FA verification to continue.
                    </p>
                </div>

                <OtpForm
                    onComplete={(user) => {
                        const target = user.role === 'student'
                            ? '/dashboard'
                            : user.role === 'chairman'
                                ? '/chairman/dashboard'
                                : '/__cw_admin__/dashboard';
                        navigate(target, { replace: true });
                    }}
                    onBackToLogin={() => navigate(loginRoute, { replace: true })}
                />

                <p className="text-xs text-center text-slate-500 mt-6">
                    Need help? Contact administrator or go back to{' '}
                    <Link to={loginRoute} className="text-indigo-600 hover:underline">
                        login
                    </Link>
                    .
                </p>
            </div>
        </div>
    );
}
