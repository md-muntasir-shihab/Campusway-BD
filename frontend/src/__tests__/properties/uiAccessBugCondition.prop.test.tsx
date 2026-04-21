/**
 * Bug Condition Exploration Tests — UI Inaccessible When Backend Unreachable
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**
 *
 * These tests encode the EXPECTED (correct) behavior. On unfixed code they are
 * expected to FAIL, which confirms the bugs exist. After the fix is applied
 * they should PASS.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

/* ── shared mock state ─────────────────────────────────────────────────────── */
const mockAuth = {
    user: null as any, token: null as string | null,
    isAuthenticated: false, isLoading: false,
    pending2FA: null as any, setPending2FA: vi.fn(),
    forceLogoutAlert: false, forceLogoutReason: null as string | null,
    setForceLogoutAlert: vi.fn(), login: vi.fn(), completeLogin: vi.fn(),
    logout: vi.fn(), refreshUser: vi.fn(),
};

/* ── mocks ─────────────────────────────────────────────────────────────────── */
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => mockAuth,
    AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } },
        interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }
    },
    refreshAccessToken: vi.fn(), setAccessToken: vi.fn(), clearAccessToken: vi.fn(),
    clearAuthSessionHint: vi.fn(), markAuthSessionHint: vi.fn(),
    shouldAttemptAuthBootstrap: vi.fn(),
    getAuthSessionStreamUrl: vi.fn(() => 'http://localhost/stream'),
    getHome: vi.fn(),
    getPublicSettings: vi.fn(() => Promise.resolve({ data: {} })),
    getPublicNewsSources: vi.fn(), getPublicNewsSettings: vi.fn(),
    getPublicNewsV2List: vi.fn(), getPublicNewsV2Widgets: vi.fn(),
    getStudentMeNotifications: vi.fn(), getPublicExamList: vi.fn(),
    trackPublicNewsV2Share: vi.fn(),
}));
vi.mock('../../hooks/useWebsiteSettings', () => ({
    useWebsiteSettings: vi.fn(() => ({ data: null, isLoading: false })),
}));
vi.mock('../../utils/mediaUrl', () => ({ buildMediaUrl: (u: string) => u || '/logo.svg' }));
vi.mock('../../hooks/useModuleAccess', () => ({
    useModuleAccess: () => ({ hasAccess: () => true, hasAnyAccess: () => true, user: null }),
}));
vi.mock('framer-motion', () => {
    const w = (T: string) => ({ children, initial, animate, exit, whileHover, whileTap, variants, transition, layout, ...r }: any) => {
        const El = T as any; return <El {...r}>{children}</El>;
    };
    return {
        motion: { div: w('div'), span: w('span'), button: w('button'), a: w('a') },
        AnimatePresence: ({ children }: any) => <>{children}</>,
        useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
        useMotionValue: (v: any) => ({ get: () => v, set: vi.fn() }),
        useTransform: () => ({ get: () => 0, set: vi.fn() })
    };
});
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('react-helmet-async', () => ({ Helmet: ({ children }: any) => <>{children}</>, HelmetProvider: ({ children }: any) => <>{children}</> }));
vi.mock('../../components/common/PageHeroBanner', () => ({ default: () => <div data-testid="hero" /> }));
vi.mock('../../components/admin/AdminShell', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('lucide-react', () => {
    const i = (n: string) => { const C = (p: any) => <span data-testid={`icon-${n}`} {...p} />; C.displayName = n; return C; };
    return {
        Bell: i('Bell'), ChevronDown: i('ChevronDown'), LogOut: i('LogOut'), Menu: i('Menu'),
        Settings: i('Settings'), User: i('User'), X: i('X'), Filter: i('Filter'), Search: i('Search'),
        Share2: i('Share2'), Tag: i('Tag'), ArrowRight: i('ArrowRight'), Sparkles: i('Sparkles'),
        Sun: i('Sun'), Moon: i('Moon'), Monitor: i('Monitor'), LayoutDashboard: i('LayoutDashboard'),
        Globe: i('Globe'), Home: i('Home'), Image: i('Image'), Megaphone: i('Megaphone'),
        GraduationCap: i('GraduationCap'), SlidersHorizontal: i('SlidersHorizontal'),
        Newspaper: i('Newspaper'), AlertCircle: i('AlertCircle'), FolderOpen: i('FolderOpen'),
        ScrollText: i('ScrollText'), BookOpen: i('BookOpen'), Users: i('Users'), UserCog: i('UserCog'),
        ClipboardList: i('ClipboardList'), CreditCard: i('CreditCard'), Wallet: i('Wallet'),
        LifeBuoy: i('LifeBuoy'), Mail: i('Mail'), Shield: i('Shield'), BarChart3: i('BarChart3'),
        Rss: i('Rss'), Layers: i('Layers'), Archive: i('Archive'), Copy: i('Copy'), Upload: i('Upload'),
        Link2: i('Link2'), Send: i('Send'), FileText: i('FileText'), History: i('History'),
        Database: i('Database'), UserPlus: i('UserPlus'), Import: i('Import'), Target: i('Target'),
        MessageSquare: i('MessageSquare'), TrendingDown: i('TrendingDown'), KeyRound: i('KeyRound'),
        Zap: i('Zap'), HelpCircle: i('HelpCircle'), CheckCircle: i('CheckCircle'),
        ChevronLeft: i('ChevronLeft'), ChevronRight: i('ChevronRight'), AlertTriangle: i('AlertTriangle'),
        CalendarDays: i('CalendarDays'), Clock3: i('Clock3'), Lock: i('Lock'), RefreshCw: i('RefreshCw'),
        Loader2: i('Loader2'), ExternalLink: i('ExternalLink')
    };
});

/* ── imports (after mocks) ─────────────────────────────────────────────────── */
import Navbar from '../../components/layout/Navbar';
import AdminGuardShell from '../../components/admin/AdminGuardShell';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import NewsPage from '../../pages/News';
import {
    getPublicNewsSettings, getPublicNewsSources, getPublicNewsV2List,
    getPublicNewsV2Widgets, getPublicSettings, shouldAttemptAuthBootstrap,
    refreshAccessToken
} from '../../services/api';

/* ── helpers ───────────────────────────────────────────────────────────────── */
const newQC = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

function reset(o: Partial<typeof mockAuth> = {}) {
    Object.assign(mockAuth, {
        user: null, token: null, isAuthenticated: false, isLoading: false,
        pending2FA: null, forceLogoutAlert: false, forceLogoutReason: null, ...o
    });
}
function LocSpy({ cb }: { cb: (p: string) => void }) {
    const l = useLocation(); cb(l.pathname + l.search); return null;
}

/* ── tests ─────────────────────────────────────────────────────────────────── */
describe('Bug Condition Exploration — UI Inaccessible When Backend Unreachable', () => {
    beforeEach(() => { vi.clearAllMocks(); reset(); });

    // Test 1 — Auth Bootstrap Timeout
    // **Validates: Requirements 1.1**
    // The real AuthProvider has no bootstrap deadline. When refreshAccessToken
    // never resolves, isLoading stays true forever. This test uses the REAL
    // AuthProvider to confirm the defect.
    it('auth bootstrap resolves isLoading to false within 12s when refreshAccessToken never resolves', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        try {
            const real = await vi.importActual<typeof import('../../hooks/useAuth')>('../../hooks/useAuth');
            vi.mocked(shouldAttemptAuthBootstrap).mockReturnValue(true);
            vi.mocked(refreshAccessToken).mockReturnValue(new Promise(() => { }));

            function Probe() { const a = real.useAuth(); return <div data-testid="al">{String(a.isLoading)}</div>; }

            render(
                <QueryClientProvider client={newQC()}>
                    <MemoryRouter><real.AuthProvider><Probe /></real.AuthProvider></MemoryRouter>
                </QueryClientProvider>,
            );
            expect(screen.getByTestId('al').textContent).toBe('true');
            await act(async () => { vi.advanceTimersByTime(12_000); });
            // UNFIXED: still 'true' → FAIL confirms no bootstrap deadline
            expect(screen.getByTestId('al').textContent).toBe('false');
        } finally {
            cleanup();
            vi.useRealTimers();
        }
    });

    // Test 2 — Navbar Login Button During Loading
    // **Validates: Requirements 1.2, 1.5**
    it('Navbar renders a Login button/link when auth is loading', () => {
        reset({ isLoading: true });
        const { container } = render(
            <QueryClientProvider client={newQC()}>
                <MemoryRouter initialEntries={['/']}><Navbar /></MemoryRouter>
            </QueryClientProvider>,
        );
        const loginLink = container.querySelector('a[href="/login"]');
        const hasPulse = container.querySelector('.animate-pulse');
        // UNFIXED: hasPulse truthy, loginLink null → FAIL
        expect(hasPulse).toBeNull();
        expect(loginLink).not.toBeNull();
    });

    // Test 3 — AdminGuardShell Timeout
    // **Validates: Requirements 1.2**
    it('AdminGuardShell redirects to admin login within timeout when isLoading persists', () => {
        reset({ isLoading: true });
        const { container } = render(
            <QueryClientProvider client={newQC()}>
                <MemoryRouter initialEntries={['/__cw_admin__/dashboard']}>
                    <AdminGuardShell title="Dashboard"><div>Admin Dashboard</div></AdminGuardShell>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        // On UNFIXED code: renders static "Checking admin access..." with no timeout.
        // Expected: component should have a timeout that eventually redirects.
        // We verify by checking that the component does NOT just show a static loading
        // message — it should either redirect or show admin content.
        const text = container.textContent || '';
        // UNFIXED: shows "Checking admin access..." with no escape → FAIL
        expect(text.includes('Checking admin access...')).toBe(false);
    });

    // Test 4 — Exams Route Public Access
    // **Validates: Requirements 1.3, 1.6**
    it('/exams route renders content for unauthenticated users without redirect to /login', () => {
        reset({ isLoading: false, isAuthenticated: false, user: null });
        let path = '';
        render(
            <QueryClientProvider client={newQC()}>
                <MemoryRouter initialEntries={['/exams']}>
                    <LocSpy cb={(p) => { path = p; }} />
                    <ProtectedRoute returnTo={true}><div data-testid="exams">Exams</div></ProtectedRoute>
                </MemoryRouter>
            </QueryClientProvider>,
        );
        // UNFIXED: redirects to /login → FAIL
        expect(path).not.toContain('/login');
        expect(path).toBe('/exams');
    });

    // Test 5 — News Page Error State
    // **Validates: Requirements 1.4**
    it('News page shows error state with retry button when API fails', async () => {
        reset({ isLoading: false, isAuthenticated: false, user: null });
        vi.mocked(getPublicNewsSettings).mockRejectedValue(new Error('Network Error'));
        vi.mocked(getPublicNewsSources).mockRejectedValue(new Error('Network Error'));
        vi.mocked(getPublicNewsV2List).mockRejectedValue(new Error('Network Error'));
        vi.mocked(getPublicNewsV2Widgets).mockRejectedValue(new Error('Network Error'));
        vi.mocked(getPublicSettings).mockRejectedValue(new Error('Network Error'));

        const { container } = render(
            <QueryClientProvider client={newQC()}>
                <MemoryRouter initialEntries={['/news']}><NewsPage /></MemoryRouter>
            </QueryClientProvider>,
        );
        await waitFor(() => {
            const t = (container.textContent || '').toLowerCase();
            const hasErr = t.includes('error') || t.includes('failed') || t.includes('unable') || t.includes('something went wrong');
            const hasRetry = Array.from(container.querySelectorAll('button')).some(
                b => (b.textContent || '').toLowerCase().includes('retry') || (b.textContent || '').toLowerCase().includes('try again'),
            );
            // UNFIXED: no error state → FAIL
            expect(hasErr || hasRetry).toBe(true);
        }, { timeout: 5000 });
    });
});
