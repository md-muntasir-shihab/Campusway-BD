import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ADMIN_ROLES = new Set(['superadmin', 'admin', 'moderator', 'editor', 'viewer']);

export default function AdminAccessDeniedPage() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-text">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/__cw_admin__/login" replace />;
    }

    if (ADMIN_ROLES.has(user.role)) {
        return <Navigate to="/__cw_admin__/dashboard" replace />;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-text">
            <div className="w-full max-w-xl rounded-2xl border border-danger/30 bg-card p-8 shadow-card">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
                    <ShieldAlert className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-center text-2xl font-bold">Access Denied</h1>
                <p className="mt-2 text-center text-sm text-text-muted">
                    Your current account role does not have permission to access the admin panel.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                    <Link to="/" className="btn-outline text-sm">
                        Back to Home
                    </Link>
                    <Link to="/__cw_admin__/login" className="btn-primary text-sm">
                        Login with another account
                    </Link>
                </div>
            </div>
        </div>
    );
}
