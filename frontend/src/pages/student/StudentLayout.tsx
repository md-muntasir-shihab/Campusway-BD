import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
    Bell,
    BookOpenCheck,
    CreditCard,
    Home,
    LifeBuoy,
    MenuSquare,
    UserRound,
    LogOut,
    NotebookText,
    Shield,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import GlobalAlertGate from '../../components/student/GlobalAlertGate';

type NavItem = {
    label: string;
    path: string;
    icon: ReactNode;
    mobile?: boolean;
};

const NAV_ITEMS: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <Home className="w-4 h-4" />, mobile: true },
    { label: 'Exams', path: '/student/exams-hub', icon: <BookOpenCheck className="w-4 h-4" />, mobile: true },
    { label: 'Results', path: '/results', icon: <NotebookText className="w-4 h-4" />, mobile: true },
    { label: 'Payments', path: '/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Notifications', path: '/notifications', icon: <Bell className="w-4 h-4" /> },
    { label: 'Profile', path: '/profile', icon: <UserRound className="w-4 h-4" />, mobile: true },
    { label: 'Security', path: '/profile/security', icon: <Shield className="w-4 h-4" />, mobile: true },
    { label: 'Resources', path: '/student/resources', icon: <MenuSquare className="w-4 h-4" /> },
    { label: 'Support', path: '/support', icon: <LifeBuoy className="w-4 h-4" /> },
];

function isActivePath(currentPath: string, targetPath: string): boolean {
    if (targetPath === '/dashboard') {
        return currentPath === '/dashboard' || currentPath === '/student/dashboard';
    }
    if (targetPath === '/profile') {
        return currentPath === '/profile' || currentPath === '/student/profile';
    }
    if (targetPath === '/profile/security') {
        return currentPath === '/profile/security' || currentPath === '/student/security';
    }
    if (targetPath === '/results') {
        return currentPath === '/results' || currentPath.startsWith('/results/');
    }
    if (targetPath === '/student/exams-hub') {
        return currentPath === '/student/exams-hub' || currentPath.startsWith('/exams/');
    }
    if (targetPath === '/student/resources') {
        return currentPath === '/student/resources';
    }
    return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

export default function StudentLayout() {
    const { isAuthenticated, isLoading, user, logout } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user && user.role !== 'student') {
        if (user.role === 'chairman') return <Navigate to="/chairman/dashboard" replace />;
        return <Navigate to="/__cw_admin__/dashboard" replace />;
    }

    const mobileNavItems = NAV_ITEMS.filter((item) => item.mobile);
    const activeItem = NAV_ITEMS.find((item) => isActivePath(location.pathname, item.path));

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            <GlobalAlertGate />
            <div className="mx-auto max-w-7xl px-4 md:px-6 py-5 md:py-6 flex gap-6">
                <aside className="hidden xl:block w-64 shrink-0">
                    <div className="sticky top-[88px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1">
                        {NAV_ITEMS.map((item) => {
                            const active = isActivePath(location.pathname, item.path);
                            return (
                                <Link
                                    key={`side-${item.path}`}
                                    to={item.path}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${active
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                <main className="flex-1 min-w-0 pb-20 md:pb-6">
                    <header className="sticky top-[76px] z-20 mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
                        <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Student Portal</p>
                            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {activeItem?.label || 'Dashboard'}
                            </p>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                            title="Logout"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Logout</span>
                        </button>
                    </header>
                    <Outlet />
                </main>
            </div>

            <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur px-3 py-2">
                <div className="grid grid-cols-4 gap-2">
                    {mobileNavItems.map((item) => {
                        const active = isActivePath(location.pathname, item.path);
                        return (
                            <Link
                                key={`mobile-${item.path}`}
                                to={item.path}
                                className={`inline-flex flex-col items-center justify-center rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${active
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                            >
                                {item.icon}
                                <span className="mt-0.5 truncate">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
