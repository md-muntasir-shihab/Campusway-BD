import { Outlet, Navigate, Link, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
    Bell,
    BookOpenCheck,
    CreditCard,
    Home,
    LifeBuoy,
    MenuSquare,
    LogOut,
    NotebookText,
    Shield,
    ChevronRight,
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
    { label: 'Overview', path: '/dashboard', icon: <Home className="w-4 h-4" />, mobile: true },
    { label: 'Exams', path: '/student/exams-hub', icon: <BookOpenCheck className="w-4 h-4" />, mobile: true },
    { label: 'Results', path: '/results', icon: <NotebookText className="w-4 h-4" />, mobile: true },
    { label: 'Payments', path: '/payments', icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Notifications', path: '/notifications', icon: <Bell className="w-4 h-4" /> },
    { label: 'Security', path: '/profile/security', icon: <Shield className="w-4 h-4" />, mobile: true },
    { label: 'Resources', path: '/student/resources', icon: <MenuSquare className="w-4 h-4" /> },
    { label: 'Support', path: '/support', icon: <LifeBuoy className="w-4 h-4" /> },
];

function isActivePath(currentPath: string, targetPath: string): boolean {
    if (targetPath === '/dashboard') {
        return currentPath === '/dashboard' || currentPath === '/student/dashboard' || currentPath === '/profile';
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
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
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
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
            <GlobalAlertGate />
            <div className="flex-1 mx-auto w-full max-w-7xl px-4 md:px-6 py-5 md:py-8 flex gap-8">
                {/* Premium Desktop Sidebar */}
                <aside className="hidden xl:block w-[260px] shrink-0">
                    <div className="sticky top-[88px] rounded-3xl border border-white/60 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] p-4 space-y-2">
                        <div className="px-3 pb-4 pt-2">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Navigation</h2>
                        </div>
                        {NAV_ITEMS.map((item) => {
                            const active = isActivePath(location.pathname, item.path);
                            return (
                                <Link
                                    key={`side-${item.path}`}
                                    to={item.path}
                                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 ${active
                                        ? 'bg-white dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/50 dark:border-indigo-500/20'
                                        : 'text-slate-600 hover:bg-white/60 dark:text-slate-400 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent cursor-pointer'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg transition-colors duration-300 ${active ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-transparent text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
                                            {item.icon}
                                        </div>
                                        {item.label}
                                    </div>
                                    {active && <ChevronRight className="w-4 h-4 text-indigo-400 dark:text-indigo-500 opacity-60" />}
                                </Link>
                            );
                        })}
                    </div>
                </aside>

                <main className="flex-1 min-w-0 pb-20 md:pb-6 flex flex-col items-center xl:items-start">
                    {/* Modern Header */}
                    <header className="w-full max-w-5xl sticky top-[76px] z-20 mb-6 flex items-center justify-between rounded-2xl border border-white/60 bg-white/70 px-4 py-3 backdrop-blur-md shadow-sm dark:border-white/10 dark:bg-slate-900/60 transition-all duration-300">
                        <div className="min-w-0 flex items-center gap-3">
                            <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400"></div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Student Portal</p>
                                <p className="truncate text-base font-bold text-slate-800 dark:text-slate-100">
                                    {activeItem?.label || 'Overview'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-all duration-300 hover:shadow-sm"
                            title="Logout"
                        >
                            <span className="hidden sm:inline">Logout</span>
                            <LogOut className="w-4 h-4 text-slate-400" />
                        </button>
                    </header>
                    <div className="w-full max-w-5xl">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Premium Mobile Nav */}
            <nav className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-2 py-2 pb-safe">
                <div className="flex items-center justify-around max-w-md mx-auto">
                    {mobileNavItems.map((item) => {
                        const active = isActivePath(location.pathname, item.path);
                        return (
                            <Link
                                key={`mobile-${item.path}`}
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-all duration-300 ${active
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <div className={`p-1 rounded-xl transition-all duration-300 ${active ? 'scale-110 mb-0.5' : 'scale-100 mb-1'}`}>
                                    {item.icon}
                                </div>
                                <span className={`text-[10px] whitespace-nowrap transition-all duration-300 ${active ? 'font-bold opacity-100' : 'font-medium opacity-80'}`}>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
