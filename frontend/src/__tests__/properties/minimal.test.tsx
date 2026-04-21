import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as fc from 'fast-check';
import type { ReactNode } from 'react';

vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({ user: null, token: null, isAuthenticated: false, isLoading: false, logout: vi.fn() }),
    AuthProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../../services/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } }, interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } },
    getStudentMeNotifications: vi.fn(() => Promise.resolve({ data: { notifications: [], unreadCount: 0 } })),
    getPublicSettings: vi.fn(() => Promise.resolve({ data: {} })),
    getPublicNewsSources: vi.fn(), getPublicNewsSettings: vi.fn(),
    getPublicNewsV2List: vi.fn(), getPublicNewsV2Widgets: vi.fn(),
    refreshAccessToken: vi.fn(), setAccessToken: vi.fn(), clearAccessToken: vi.fn(),
    clearAuthSessionHint: vi.fn(), markAuthSessionHint: vi.fn(),
    shouldAttemptAuthBootstrap: vi.fn(),
    getAuthSessionStreamUrl: vi.fn(() => 'http://localhost/stream'),
    getHome: vi.fn(), getPublicExamList: vi.fn(), trackPublicNewsV2Share: vi.fn(),
}));
vi.mock('../../hooks/useWebsiteSettings', () => ({
    useWebsiteSettings: vi.fn(() => ({ data: { websiteName: 'CampusWay', logoUrl: '/logo.svg' }, isLoading: false })),
}));
vi.mock('../../utils/mediaUrl', () => ({ buildMediaUrl: (u: string) => u || '/logo.svg' }));
vi.mock('../../hooks/useModuleAccess', () => ({
    useModuleAccess: () => ({ hasAccess: () => true, hasAnyAccess: () => true, user: null }),
}));
vi.mock('framer-motion', () => {
    const w = (T: string) => ({ children, ...r }: any) => { const El = T as any; return <El {...r}>{children}</El>; };
    return { motion: { div: w('div'), span: w('span'), button: w('button'), a: w('a') }, AnimatePresence: ({ children }: any) => <>{children}</>, useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }), useMotionValue: (v: any) => ({ get: () => v, set: vi.fn() }), useTransform: () => ({ get: () => 0, set: vi.fn() }) };
});
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../components/common/PageHeroBanner', () => ({ default: () => <div data-testid="hero" /> }));
vi.mock('../../components/admin/AdminShell', () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock('../../hooks/usePageHeroSettings', () => ({ usePageHeroSettings: () => ({ enabled: false }) }));
vi.mock('lucide-react', () => {
    const i = (n: string) => { const C = (p: any) => <span data-testid={`icon-${n}`} {...p} />; C.displayName = n; return C; };
    return { Bell: i('Bell'), ChevronDown: i('ChevronDown'), LogOut: i('LogOut'), Menu: i('Menu'), Settings: i('Settings'), User: i('User'), X: i('X'), Filter: i('Filter'), Search: i('Search'), Share2: i('Share2'), Tag: i('Tag'), ArrowRight: i('ArrowRight'), Sparkles: i('Sparkles'), Sun: i('Sun'), Moon: i('Moon'), Monitor: i('Monitor') };
});

import Navbar from '../../components/layout/Navbar';
import AdminGuardShell from '../../components/admin/AdminGuardShell';
import NewsPage from '../../pages/News';

describe('Minimal Navbar test', () => {
    it('renders without crashing with fc', () => {
        fc.assert(
            fc.property(fc.constantFrom('a', 'b'), (_val) => {
                const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
                const { container, unmount } = render(
                    <QueryClientProvider client={qc}>
                        <MemoryRouter><Navbar /></MemoryRouter>
                    </QueryClientProvider>,
                );
                expect(container).toBeTruthy();
                unmount();
                qc.clear();
            }),
            { numRuns: 5 },
        );
    });
});
