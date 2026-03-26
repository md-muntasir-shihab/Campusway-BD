import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import ThemeSwitchPro from '../../components/ui/ThemeSwitchPro';

export default function ChairmanDashboardPage() {
    const { user, isLoading, logout } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center cw-bg">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) return <Navigate to="/chairman/login" replace />;
    if (user.role !== 'chairman') {
        if (user.role === 'student') return <Navigate to="/dashboard" replace />;
        return <Navigate to="/__cw_admin__/dashboard" replace />;
    }

    return (
        <div className="min-h-screen cw-bg px-4 py-8">
            <div className="mx-auto w-full max-w-5xl">
                <div className="mb-4 flex items-center justify-between rounded-2xl border cw-border cw-surface p-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider cw-muted">Chairman Portal</p>
                        <h1 className="text-xl font-bold cw-text">Welcome, {user.fullName || user.username}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <ThemeSwitchPro />
                        <button type="button" className="btn-outline text-sm" onClick={() => void logout()}>Logout</button>
                    </div>
                </div>

                <div className="rounded-2xl border cw-border cw-surface p-6">
                    <p className="text-sm cw-muted">
                        Chairman dashboard is active. Operational modules can be attached here without admin surface overlap.
                    </p>
                </div>
            </div>
        </div>
    );
}

