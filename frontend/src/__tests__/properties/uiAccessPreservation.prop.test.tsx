/**
 * Preservation Property Tests — Authenticated User Flows and Healthy Backend Behavior Unchanged
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * These tests capture the EXISTING correct behavior on the current codebase.
 * They must PASS on both unfixed and fixed code, confirming no regressions.
 *
 * Uses fast-check arbitraries to generate random user objects and news data.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import fc from 'fast-check';
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
        motion: { div: w('div'), span: w('span'), button: w('button'), a: w('a'), article: w('article') },
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
vi.mock('../../hooks/usePageHeroSettings', () => ({
    usePageHeroSettings: () => ({ enabled: false, title: '', subtitle: '', pillText: '' }),
}));
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
import NewsPage from '../../pages/News';
import {
    getPublicNewsSettings, getPublicNewsSources, getPublicNewsV2List,
    getPublicNewsV2Widgets,
} from '../../services/api';

/* ── helpers ───────────────────────────────────────────────────────────────── */
const newQC = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });

function reset(o: Partial<typeof mockAuth> = {}) {
    Object.assign(mockAuth, {
        user: null, token: null, isAuthenticated: false, isLoading: false,
        pending2FA: null, forceLogoutAlert: false, forceLogoutReason: null, ...o
    });
}

/* ── fast-check arbitraries ────────────────────────────────────────────────── */
const ADMIN_ROLES = [
    'superadmin', 'admin', 'moderator', 'editor', 'viewer', 'support_agent', 'finance_agent',
] as const;

const ALL_ROLES = [...ADMIN_ROLES, 'student', 'chairman'] as const;

const arbAdminRole = fc.constantFrom(...ADMIN_ROLES);
const arbAnyRole = fc.constantFrom(...ALL_ROLES);

// Helper: generate a 24-char hex-like string (MongoDB ObjectId-like)
const arbObjectId = fc.string({ minLength: 24, maxLength: 24 })
    .map(s => s.replace(/[^a-f0-9]/gi, '0').slice(0, 24).padEnd(24, 'a'));

const arbUser = (roleArb: fc.Arbitrary<string> = arbAnyRole) =>
    fc.record({
        _id: arbObjectId,
        username: fc.constantFrom('alice_01', 'bob_test', 'charlie99', 'diana_x', 'eve_user'),
        email: fc.constantFrom('alice@test.com', 'bob@example.org', 'charlie@mail.net', 'diana@test.com', 'eve@example.org'),
        role: roleArb,
        fullName: fc.constantFrom('Alice Smith', 'Bob Jones', 'Charlie Brown', 'Diana Prince', 'Eve Wilson'),
        profile_photo: fc.oneof(
            fc.constant(undefined as string | undefined),
            fc.constant('https://example.com/photo.jpg'),
        ),
    });

const arbNewsArticle = fc.record({
    _id: fc.integer({ min: 1, max: 99999 }).map(n => `60f${String(n).padStart(21, '0')}`),
    title: fc.constantFrom(
        'University Admission Opens 2026',
        'HSC Results Published Today',
        'New Scholarship Program Announced',
        'Campus Events This Week',
        'Exam Schedule Updated',
    ),
    slug: fc.constantFrom('admission-opens-2026', 'hsc-results-today', 'scholarship-announced', 'campus-events', 'exam-schedule'),
    shortSummary: fc.constantFrom(
        'Important update for all students.',
        'Check the latest results now.',
        'New opportunities available.',
    ),
    category: fc.constantFrom('Admission', 'Result', 'Notice', 'General'),
    sourceName: fc.constantFrom('CampusWay', 'DailyNews', 'EduPress'),
    sourceIconUrl: fc.constant('/logo.svg'),
    publishedAt: fc.constantFrom('2025-01-15T10:00:00.000Z', '2025-03-20T14:30:00.000Z', '2026-02-10T08:00:00.000Z'),
    sourceType: fc.constantFrom('manual', 'rss', 'ai_assisted'),
    fetchedFullText: fc.boolean(),
    coverImageUrl: fc.constant('/test-cover.jpg'),
});

/* ── tests ─────────────────────────────────────────────────────────────────── */
describe('Preservation — Authenticated User Flows and Healthy Backend Behavior Unchanged', () => {
    beforeEach(() => { vi.clearAllMocks(); reset(); });

    // Property 1: For any authenticated user with valid role, Navbar renders
    // avatar area and dropdown menu (not Login button)
    // **Validates: Preservation Requirements 3.1, 3.5**
    it('Navbar renders avatar dropdown for any authenticated user (not Login button)', () => {
        fc.assert(
            fc.property(arbUser(), (user) => {
                reset({
                    isLoading: false,
                    isAuthenticated: true,
                    user,
                    token: 'test-token',
                });

                const { container, unmount } = render(
                    <QueryClientProvider client={newQC()}>
                        <MemoryRouter initialEntries={['/']}>
                            <Navbar />
                        </MemoryRouter>
                    </QueryClientProvider>,
                );

                // The auth-resolved, user-present branch should render the avatar area
                // and NOT render a Login link in the auth section
                const avatarArea = container.querySelector('.relative.group');
                const logoutButton = container.querySelector('button');
                const allLinks = Array.from(container.querySelectorAll('a'));
                const authLoginLink = allLinks.find(
                    a => a.getAttribute('href') === '/login' && a.classList.contains('btn-primary')
                );

                // Avatar area should exist (the dropdown wrapper)
                expect(avatarArea).not.toBeNull();
                // The primary Login button should NOT be rendered when user is authenticated
                expect(authLoginLink).toBeUndefined();

                unmount();
            }),
            { numRuns: 15 },
        );
    });

    // Property 2: For any authenticated admin user with allowed role,
    // AdminGuardShell renders children (admin dashboard content)
    // **Validates: Preservation Requirement 3.2**
    it('AdminGuardShell renders children for any authenticated admin with allowed role', () => {
        fc.assert(
            fc.property(arbUser(arbAdminRole), (user) => {
                reset({
                    isLoading: false,
                    isAuthenticated: true,
                    user,
                    token: 'test-token',
                });

                const { container, unmount } = render(
                    <QueryClientProvider client={newQC()}>
                        <MemoryRouter initialEntries={['/__cw_admin__/dashboard']}>
                            <AdminGuardShell title="Dashboard">
                                <div data-testid="admin-content">Admin Dashboard Content</div>
                            </AdminGuardShell>
                        </MemoryRouter>
                    </QueryClientProvider>,
                );

                // Children should be rendered
                const adminContent = container.querySelector('[data-testid="admin-content"]');
                expect(adminContent).not.toBeNull();
                expect(adminContent!.textContent).toBe('Admin Dashboard Content');

                // "Checking admin access..." should NOT be shown
                const text = container.textContent || '';
                expect(text.includes('Checking admin access...')).toBe(false);

                unmount();
            }),
            { numRuns: 15 },
        );
    });

    // Property 3: For any successful news API response with articles array,
    // News page renders article content (not loading skeletons or error state)
    // **Validates: Preservation Requirement 3.4**
    it('News page renders article cards when API returns data successfully', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(arbNewsArticle, { minLength: 1, maxLength: 5 }),
                async (articles) => {
                    reset({ isLoading: false, isAuthenticated: false, user: null });

                    const settingsData = {
                        pageTitle: 'News',
                        pageSubtitle: 'Updates',
                        headerBannerUrl: '',
                        defaultBannerUrl: '',
                        defaultThumbUrl: '',
                        defaultSourceIconUrl: '/logo.svg',
                        appearance: {
                            layoutMode: 'grid',
                            density: 'comfortable',
                            cardDensity: 'comfortable',
                            paginationMode: 'pages',
                            showWidgets: {
                                trending: false, latest: false, sourceSidebar: false,
                                tagChips: false, previewPanel: false, breakingTicker: false,
                            },
                            showSourceIcons: true,
                            showTrendingWidget: false,
                            showCategoryWidget: false,
                            showShareButtons: false,
                            animationLevel: 'normal',
                            thumbnailFallbackUrl: '',
                        },
                        shareTemplates: {},
                        shareButtons: {
                            whatsapp: false, facebook: false, messenger: false,
                            telegram: false, copyLink: false, copyText: false,
                        },
                        workflow: { allowScheduling: false, openOriginalWhenExtractionIncomplete: false },
                    };

                    vi.mocked(getPublicNewsSettings).mockResolvedValue({ data: settingsData } as any);
                    vi.mocked(getPublicNewsSources).mockResolvedValue({ data: { items: [] } } as any);
                    vi.mocked(getPublicNewsV2Widgets).mockResolvedValue({
                        data: { categories: [], tags: [], trending: [] },
                    } as any);
                    vi.mocked(getPublicNewsV2List).mockResolvedValue({
                        data: { items: articles, pages: 1, total: articles.length },
                    } as any);

                    const { container, unmount } = render(
                        <QueryClientProvider client={newQC()}>
                            <MemoryRouter initialEntries={['/news']}>
                                <NewsPage />
                            </MemoryRouter>
                        </QueryClientProvider>,
                    );

                    await waitFor(() => {
                        // At least one article title should be visible
                        const text = container.textContent || '';
                        const hasArticle = articles.some(a => text.includes(a.title));
                        expect(hasArticle).toBe(true);
                    }, { timeout: 5000 });

                    // No error state should be shown
                    const text = (container.textContent || '').toLowerCase();
                    expect(text.includes('failed to load')).toBe(false);

                    // No skeleton loaders should remain
                    const skeletons = container.querySelectorAll('.skeleton');
                    expect(skeletons.length).toBe(0);

                    unmount();
                },
            ),
            { numRuns: 10 },
        );
    });
});
