import { useEffect, useLayoutEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './hooks/useTheme';
import { AuthProvider } from './hooks/useAuth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomeModern';
import UniversitiesPage from './pages/Universities';
import UniversityDetailsPage from './pages/UniversityDetails';
import UniversityCategoryBrowsePage from './pages/UniversityCategoryBrowse';
import UniversityClusterBrowsePage from './pages/UniversityClusterBrowse';
import NewsPage from './pages/News';
import SingleNewsPage from './pages/SingleNews';
import { ExamsListPage } from './pages/exams/ExamsListPage';
import { ExamRunnerPage } from './pages/exams/ExamRunnerPage';
import { ExamResultPage } from './pages/exams/ExamResultPage';
import { ExamSolutionsPage } from './pages/exams/ExamSolutionsPage';
import ResourcesPage from './pages/Resources';
import ResourceDetail from './pages/ResourceDetail';
import AdminSettingsResourcesPage from './pages/AdminSettingsResources';
import ContactPage from './pages/Contact';
import HelpCenterPage from './pages/HelpCenter';
import HelpArticlePage from './pages/HelpArticle';
import SubscriptionPlansPage from './pages/SubscriptionPlans';
import SubscriptionPlanDetailPage from './pages/SubscriptionPlanDetail';
import SubscriptionPlanCheckoutPage from './pages/SubscriptionPlanCheckout';
import LoginPage from './pages/Login';
import AdminSecretLoginPage from './pages/AdminSecretLogin';
import OtpVerificationPage from './pages/OtpVerification';
import AboutPage from './pages/About';
import TermsPage from './pages/Terms';
import PrivacyPage from './pages/Privacy';
import ProfilePage from './pages/Profile';
import CertificateVerifyPage from './pages/CertificateVerify';
import AdminAccessDeniedPage from './pages/AdminAccessDenied';
import AdminSubscriptionPlansPage from './pages/AdminSubscriptionPlans';
import AdminHomeSettingsPage from './pages/AdminHomeSettings';
import AdminUniversitySettingsPage from './pages/AdminUniversitySettings';
import AdminSettingsCenterPage from './pages/AdminSettingsCenter';
import AdminSettingsReportsPage from './pages/AdminSettingsReports';
import AdminSettingsBannersPage from './pages/AdminSettingsBanners';
import AdminCampaignBannersPage from './pages/AdminCampaignBanners';
import AdminSettingsSecurityPage from './pages/AdminSettingsSecurity';
import AdminSettingsLogsPage from './pages/AdminSettingsLogs';
import AdminSettingsSitePage from './pages/AdminSettingsSite';
import AdminSettingsProfilePage from './pages/AdminSettingsProfile';
import AdminSettingsNotificationsPage from './pages/AdminSettingsNotifications';
import AdminSettingsAnalyticsPage from './pages/AdminSettingsAnalytics';
import AdminSettingsNewsPage from './pages/AdminSettingsNews';
import AdminReportsPage from './pages/AdminReports';
import AdminGuardShell from './components/admin/AdminGuardShell';
import AdminNewsConsole from './pages/admin-news/AdminNewsConsole';
import FinanceLayout from './components/admin/finance/FinanceLayout';
import StudentManagementLayout from './components/admin/students/StudentManagementLayout';
import FinanceDashboardPage from './components/admin/finance/FinanceDashboardPage';
import FinanceTransactionsPage from './components/admin/finance/FinanceTransactionsPage';
import FinanceInvoicesPage from './components/admin/finance/FinanceInvoicesPage';
import FinanceBudgetsPage from './components/admin/finance/FinanceBudgetsPage';
import FinanceRecurringPage from './components/admin/finance/FinanceRecurringPage';
import FinanceVendorsPage from './components/admin/finance/FinanceVendorsPage';
import FinanceRefundsPage from './components/admin/finance/FinanceRefundsPage';
import FinanceExportPage from './components/admin/finance/FinanceExportPage';
import FinanceImportPage from './components/admin/finance/FinanceImportPage';
import FinanceAuditLogPage from './components/admin/finance/FinanceAuditLogPage';
import FinanceSettingsPage from './components/admin/finance/FinanceSettingsPage';
import FinanceExpensesPage from './components/admin/finance/FinanceExpensesPage';
import {
    AdminDashboardPage,
    AdminUniversitiesPage,
    AdminExamsPage,
    AdminQuestionBankPage,
    AdminResourcesPage,
    AdminSupportCenterPage,
    AdminStudentsMgmtPage,
    AdminStudentCreatePage,
    AdminStudentImportExportPage,
    AdminStudentCrmTimelinePage,
    AdminStudentWeakTopicsPage,
    AdminStudentMgmtDetailPage,
    AdminStudentGroupsV2Page,
    AdminStudentGroupDetailPage,
    AdminNotificationCenterEmbeddedPage,
    AdminProfileRequestsPage,
    AdminStudentSettingsPage,
    AdminStudentSettingsEmbeddedPage,
    AdminContactPage,
    AdminSubscriptionsV2Page,
} from './pages/AdminCorePages';
import CampaignConsolePage from './pages/admin/campaigns/CampaignConsolePage';
import SubscriptionContactCenterPage from './pages/admin/campaigns/SubscriptionContactCenterPage';
import AdminHelpCenterPage from './pages/admin/help-center/AdminHelpCenterPage';
import TeamAccessConsolePage from './pages/admin/team/TeamAccessConsolePage';
import MemberDetailPage from './pages/admin/team/MemberDetailPage';
import RoleDetailPage from './pages/admin/team/RoleDetailPage';
import ActionApprovalsPage from './pages/admin/approvals/ActionApprovalsPage';
import NotFoundPage from './pages/NotFound';
import ForceLogoutModal from './components/auth/ForceLogoutModal';
import ChairmanLoginPage from './pages/chairman/ChairmanLogin';
import ChairmanDashboardPage from './pages/chairman/ChairmanDashboard';
import {
    ADMIN_ACCESS_DENIED,
    ADMIN_DASHBOARD,
    ADMIN_LOGIN,
    CHAIRMAN_DASHBOARD,
    CHAIRMAN_LOGIN,
    STUDENT_LOGIN,
    adminUi,
    legacyAdminToSecret,
} from './lib/appRoutes';
import { ADMIN_PATHS, LEGACY_ADMIN_PATH_REDIRECTS } from './routes/adminPaths';

// Student Portal Moduels
import StudentLayout from './pages/student/StudentLayout';
import StudentRegister from './pages/student/StudentRegister';
import StudentForgotPassword from './pages/student/StudentForgotPassword';
import StudentResetPassword from './pages/student/StudentResetPassword';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentProfile from './pages/student/StudentProfile';
import StudentSecurity from './pages/student/StudentSecurity';
import StudentApplications from './pages/student/StudentApplications';
import StudentExamsHub from './pages/student/StudentExamsHub';
import StudentExamDetail from './pages/student/StudentExamDetail';
import StudentResults from './pages/student/StudentResults';
import StudentResultDetail from './pages/student/StudentResultDetail';
import StudentPayments from './pages/student/StudentPayments';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentResources from './pages/student/StudentResources';
import StudentSupport from './pages/student/StudentSupport';
import StudentSupportThread from './pages/student/StudentSupportThread';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
    },
});

/** App shells that should NOT render the public navbar/footer */
const FULL_SCREEN_PREFIXES = ['/exam/take/', '/campusway-secure-admin', '/admin-dashboard', '/admin', '/__cw_admin__', '/chairman', '/login', '/otp-verify'];
const STUDENT_APP_PREFIXES = ['/student/', '/dashboard', '/profile', '/results', '/payments', '/notifications', '/support'];
const STUDENT_STANDALONE_ROUTES = new Set<string>([]);

import { useWebsiteSettings } from './hooks/useWebsiteSettings';
import useHomeLiveUpdates from './hooks/useHomeLiveUpdates';
import SEO from './components/common/SEO';

function resolveRouteTitle(pathname: string, siteName: string, defaultTitle: string): string | null {
    const withSite = (label: string) => `${label} | ${siteName}`;

    if (pathname === '/') return defaultTitle;
    if (pathname === '/universities') return withSite('Universities');
    if (pathname === '/services') return withSite('Subscription Plans');
    if (pathname === '/news') return withSite('News');
    if (pathname === '/exam-portal' || pathname === '/exams/landing' || pathname === '/exams') return withSite('Exams');
    if (pathname === '/resources') return withSite('Resources');
    if (pathname.startsWith('/resources/')) return null;
    if (pathname === '/contact') return withSite('Contact');
    if (pathname === '/help-center') return withSite('Help Center');
    if (pathname.startsWith('/help-center/')) return null;
    if (pathname === '/pricing') return withSite('Subscription Plans');
    if (pathname === '/subscription-plans') return withSite('Subscription Plans');
    if (pathname.startsWith('/subscription-plans/checkout/')) return withSite('Subscription Checkout');
    if (pathname.startsWith('/subscription-plans/')) return withSite('Subscription Plan Details');
    if (pathname === '/subscription') return withSite('Subscription Plans');
    if (pathname === '/subscriptions') return withSite('Subscription Plans');
    if (pathname === STUDENT_LOGIN) return withSite('Student Login');
    if (pathname === CHAIRMAN_LOGIN) return withSite('Chairman Login');
    if (pathname === ADMIN_LOGIN) return withSite('Admin Login');
    if (pathname === '/support') return withSite('Student Support');
    if (pathname.startsWith('/support/')) return withSite('Support Ticket');
    if (pathname === '/notifications') return withSite('Student Notifications');
    if (pathname === '/payments') return withSite('Student Payments');
    if (pathname === '/results') return withSite('Student Results');
    if (pathname.startsWith('/__cw_admin__/settings')) return withSite('Admin Settings');
    if (pathname === ADMIN_DASHBOARD) return withSite('Admin Dashboard');
    if (pathname === '/__cw_admin__/universities') return withSite('Admin Universities');
    if (pathname === '/__cw_admin__/students') return withSite('Admin Students');
    if (pathname === '/__cw_admin__/student-groups') return withSite('Admin Student Groups');
    if (pathname === '/__cw_admin__/payments') return withSite('Admin Payments');
    if (pathname === '/__cw_admin__/exams') return withSite('Admin Exams');
    if (pathname === '/__cw_admin__/resources') return withSite('Admin Resources');
    if (pathname.startsWith('/__cw_admin__/finance')) return withSite('Admin Finance Center');
    if (pathname.startsWith('/__cw_admin__/subscriptions/plans')) return withSite('Admin Subscription Plans');
    if (pathname.startsWith('/__cw_admin__/subscription-plans')) return withSite('Admin Subscription Plans');
    if (pathname === '/__cw_admin__/support-center') return withSite('Admin Support Center');
    if (pathname === '/__cw_admin__/contact') return withSite('Admin Contact Messages');
    if (pathname === '/__cw_admin__/notification-center') return withSite('Admin Actionable Alerts');
    if (pathname === '/__cw_admin__/help-center') return withSite('Admin Help Center');
    if (pathname === '/__cw_admin__/settings/notifications') return withSite('Admin Notification Settings');
    if (pathname === '/__cw_admin__/notifications/test-send') return withSite('Admin Campaign Platform');
    if (pathname === '/__cw_admin__/notifications/triggers') return withSite('Admin Notification Triggers');
    if (pathname.startsWith('/__cw_admin__/campaigns')) return withSite('Admin Campaign Platform');
    if (pathname === '/__cw_admin__/reports') return withSite('Admin Reports');
    if (pathname === '/__cw_admin__/question-bank') return withSite('Admin Question Bank');
    if (pathname.startsWith('/__cw_admin__/team/')) return withSite('Admin Team & Access Control');
    if (pathname === '/__cw_admin__/settings/home-control') return withSite('Admin Home Control');
    if (pathname === '/__cw_admin__/settings/university-settings') return withSite('Admin University Settings');
    if (pathname === '/__cw_admin__/settings/banner-manager') return withSite('Admin Banner Manager');
    if (pathname === '/__cw_admin__/settings/security-center') return withSite('Admin Security Center');
    if (pathname === '/__cw_admin__/settings/system-logs') return withSite('Admin System Logs');
    if (pathname === '/__cw_admin__/settings/admin-profile') return withSite('Admin Profile');
    if (pathname === ADMIN_ACCESS_DENIED) return withSite('Admin Access Denied');
    if (pathname.startsWith('/__cw_admin__/news')) return withSite('Admin News');
    if (pathname.startsWith('/campusway-secure-admin')) return withSite('Admin Dashboard');
    if (pathname === CHAIRMAN_DASHBOARD) return withSite('Chairman Dashboard');
    if (pathname.startsWith('/dashboard')) return withSite('Student Dashboard');
    if (pathname === '/profile/security') return withSite('Security Center');

    // Page-level title handlers manage these dynamic pages.
    if (pathname.startsWith('/news/')) return null;
    if (pathname.startsWith('/services/')) return null;
    if (pathname.startsWith('/university/')) return null;
    if (pathname.startsWith('/universities/')) return null;

    if (/^\/exam\/[^/]+$/.test(pathname) || pathname.startsWith('/exam/take/')) return withSite('Exam');
    if (/^\/exam\/[^/]+\/result$/.test(pathname) || pathname.startsWith('/exam/result/')) return withSite('Exam Result');
    if (/^\/exam\/[^/]+\/solutions$/.test(pathname)) return withSite('Exam Solutions');

    return defaultTitle;
}

function RouteScrollReset() {
    const location = useLocation();
    const previousRouteRef = useRef({ pathname: location.pathname, search: location.search });

    useLayoutEffect(() => {
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        const previousRoute = previousRouteRef.current;
        const routeChanged = previousRoute.pathname !== location.pathname || previousRoute.search !== location.search;
        previousRouteRef.current = { pathname: location.pathname, search: location.search };

        if (!routeChanged) return;

        if (location.hash) {
            const anchorId = decodeURIComponent(location.hash.replace(/^#/, ''));
            if (anchorId) {
                const target = document.getElementById(anchorId);
                if (target) {
                    target.scrollIntoView({ block: 'start' });
                    return;
                }
            }
        }

        const scrollingElement = document.scrollingElement;
        if (scrollingElement) {
            scrollingElement.scrollTop = 0;
            scrollingElement.scrollLeft = 0;
        }
        document.documentElement.scrollTop = 0;
        document.documentElement.scrollLeft = 0;
        document.body.scrollTop = 0;
        document.body.scrollLeft = 0;
        window.scrollTo(0, 0);
    }, [location.hash, location.pathname, location.search]);

    return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const path = location.pathname;
    const isStudentAppRoute =
        STUDENT_STANDALONE_ROUTES.has(path) ||
        STUDENT_APP_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    const isFullScreen = FULL_SCREEN_PREFIXES.some((prefix) => path.startsWith(prefix));
    const { data: settings } = useWebsiteSettings();
    useHomeLiveUpdates(!isFullScreen && !isStudentAppRoute);

    // Dynamically update title + favicon from route + admin settings.
    useEffect(() => {
        const siteName = String(settings?.websiteName || 'CampusWay').trim() || 'CampusWay';
        const defaultTitle = String(settings?.metaTitle || `${siteName} - Admission Gateway`).trim() || `${siteName} - Admission Gateway`;
        const routeTitle = resolveRouteTitle(path, siteName, defaultTitle);
        if (routeTitle) {
            document.title = routeTitle;
        }

        const favicon = String(settings?.favicon || '/favicon.ico').trim() || '/favicon.ico';
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = favicon;
    }, [path, settings]);

    if (isFullScreen) return <><SEO /><RouteScrollReset /><ForceLogoutModal />{children}</>;
    
    return (
        <div className="min-h-screen flex flex-col bg-transparent transition-colors duration-300">
            <SEO />
            <RouteScrollReset />
            <Navbar />
            <main className="flex-1">{children}</main>
            {!isStudentAppRoute && <Footer />}
            <ForceLogoutModal />
        </div>
    );
}

function LegacyExamTakeRedirect() {
    const { examId } = useParams<{ examId: string }>();
    const location = useLocation();
    if (!examId) return <Navigate to="/exams" replace />;
    return <Navigate to={`/exam/${examId}${location.search}`} replace />;
}

function LegacyStudentExamStartRedirect() {
    const { examId } = useParams<{ examId: string }>();
    const location = useLocation();
    if (!examId) return <Navigate to="/exams" replace />;
    return <Navigate to={`/exam/${examId}${location.search}`} replace />;
}

function LegacyExamResultRedirect() {
    const { examId } = useParams<{ examId: string }>();
    const location = useLocation();
    if (!examId) return <Navigate to="/exams" replace />;
    return <Navigate to={`/exam/${examId}/result${location.search}`} replace />;
}

function LegacyStudentResultRedirect() {
    const { examId } = useParams<{ examId: string }>();
    if (!examId) return <Navigate to="/results" replace />;
    return <Navigate to={`/results/${examId}`} replace />;
}

function LegacyAdminRedirect() {
    const location = useLocation();
    const target = legacyAdminToSecret(location.pathname, location.search, location.hash);
    return <Navigate to={target} replace />;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <AppLayout>
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/universities" element={<UniversitiesPage />} />
                                <Route path="/universities/category/:categorySlug" element={<UniversityCategoryBrowsePage />} />
                                <Route path="/universities/cluster/:clusterSlug" element={<UniversityClusterBrowsePage />} />
                                <Route path="/university/:slug" element={<UniversityDetailsPage />} />
                                <Route path="/universities/:slug" element={<UniversityDetailsPage />} />
                                <Route path="/services" element={<Navigate to="/subscription-plans" replace />} />
                                <Route path="/services/:slug" element={<Navigate to="/subscription-plans" replace />} />
                                <Route path="/news" element={<NewsPage />} />
                                <Route path="/news/:slug" element={<SingleNewsPage />} />
                                <Route path="/exam-portal" element={<Navigate to="/exams" replace />} />
                                <Route path="/exams/landing" element={<Navigate to="/exams" replace />} />
                                <Route path="/exams" element={<ExamsListPage />} />
                                <Route path="/exams/:examId/start" element={<LegacyStudentExamStartRedirect />} />
                                <Route path="/exam/:examId" element={<ExamRunnerPage />} />
                                <Route path="/exam/:examId/result" element={<ExamResultPage />} />
                                <Route path="/exam/:examId/solutions" element={<ExamSolutionsPage />} />
                                <Route path="/exam/take/:examId" element={<LegacyExamTakeRedirect />} />
                                <Route path="/exam/result/:examId" element={<LegacyExamResultRedirect />} />
                                <Route path="/certificate/verify/:certificateId" element={<CertificateVerifyPage />} />
                                <Route path="/resources" element={<ResourcesPage />} />
                                <Route path="/resources/:slug" element={<ResourceDetail />} />
                                <Route path="/contact" element={<ContactPage />} />
                                <Route path="/help-center" element={<HelpCenterPage />} />
                                <Route path="/help-center/:slug" element={<HelpArticlePage />} />
                                <Route path="/pricing" element={<Navigate to="/subscription-plans" replace />} />
                                <Route path="/subscription-plans" element={<SubscriptionPlansPage />} />
                                <Route path="/subscription-plans/checkout/:slug" element={<SubscriptionPlanCheckoutPage />} />
                                <Route path="/subscription-plans/:planId" element={<SubscriptionPlanDetailPage />} />
                                <Route path="/subscription" element={<Navigate to="/subscription-plans" replace />} />
                                <Route path="/subscriptions" element={<Navigate to="/subscription-plans" replace />} />
                                <Route path={STUDENT_LOGIN} element={<LoginPage />} />
                                <Route path={CHAIRMAN_LOGIN} element={<ChairmanLoginPage />} />
                                <Route path={CHAIRMAN_DASHBOARD} element={<ChairmanDashboardPage />} />
                                <Route path="/otp-verify" element={<OtpVerificationPage />} />
                                <Route path="/profile-center" element={<ProfilePage />} />
                                <Route path="/about" element={<AboutPage />} />
                                <Route path="/terms" element={<TermsPage />} />
                                <Route path="/privacy" element={<PrivacyPage />} />
                                <Route path="/campusway-secure-admin" element={<Navigate to={ADMIN_DASHBOARD} replace />} />
                                <Route path="/campusway-secure-admin/*" element={<LegacyAdminRedirect />} />
                                <Route path="/admin-dashboard" element={<Navigate to={ADMIN_DASHBOARD} replace />} />

                                <Route path={ADMIN_LOGIN} element={<AdminSecretLoginPage />} />
                                <Route path={ADMIN_ACCESS_DENIED} element={<AdminAccessDeniedPage />} />
                                <Route path={ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
                                <Route path={ADMIN_PATHS.universities} element={<AdminUniversitiesPage />} />
                                <Route path={adminUi('universities/import')} element={<AdminUniversitiesPage />} />
                                <Route path={adminUi('universities/export')} element={<AdminUniversitiesPage />} />
                                <Route path={adminUi('universities/:id/edit')} element={<AdminUniversitiesPage />} />
                                <Route path={ADMIN_PATHS.news} element={<Navigate to={adminUi('news/dashboard')} replace />} />
                                <Route path={adminUi('news/*')} element={<AdminNewsConsole />} />
                                <Route path={ADMIN_PATHS.exams} element={<AdminExamsPage />} />
                                <Route path={ADMIN_PATHS.questionBank} element={<AdminQuestionBankPage />} />
                                <Route path={adminUi('question-bank/*')} element={<AdminQuestionBankPage />} />
                                <Route path={ADMIN_PATHS.students} element={<Navigate to={adminUi('student-management/list')} replace />} />
                                <Route path={ADMIN_PATHS.studentGroups} element={<Navigate to={adminUi('student-management/groups')} replace />} />
                                <Route path={adminUi('subscription-plans')} element={<Navigate to={adminUi('subscriptions/plans')} replace />} />
                                <Route path={adminUi('subscription-plans/new')} element={<Navigate to={adminUi('subscriptions/plans/new')} replace />} />
                                <Route path={adminUi('subscription-plans/:id')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={adminUi('subscription-plans/:id/edit')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={adminUi('subscriptions/plans')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={adminUi('subscriptions/plans/new')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={adminUi('subscriptions/plans/:id')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={adminUi('subscriptions/plans/:id/edit')} element={<AdminSubscriptionPlansPage />} />
                                <Route path={ADMIN_PATHS.subscriptionsV2} element={<AdminSubscriptionsV2Page />} />
                                <Route path={ADMIN_PATHS.resources} element={<AdminResourcesPage />} />
                                <Route path={ADMIN_PATHS.supportCenter} element={<AdminSupportCenterPage />} />
                                <Route path={ADMIN_PATHS.helpCenterAdmin} element={<AdminHelpCenterPage />} />
                                <Route path={ADMIN_PATHS.contact} element={<AdminContactPage />} />
                                <Route path={ADMIN_PATHS.payments} element={<Navigate to={adminUi('finance/transactions')} replace />} />
                                <Route path={adminUi('finance')} element={<Navigate to={adminUi('finance/dashboard')} replace />} />
                                <Route path={adminUi('finance/*')} element={<FinanceLayout />}>
                                    <Route path="dashboard" element={<FinanceDashboardPage />} />
                                    <Route path="transactions" element={<FinanceTransactionsPage />} />
                                    <Route path="invoices" element={<FinanceInvoicesPage />} />
                                    <Route path="expenses" element={<FinanceExpensesPage />} />
                                    <Route path="budgets" element={<FinanceBudgetsPage />} />
                                    <Route path="recurring" element={<FinanceRecurringPage />} />
                                    <Route path="vendors" element={<FinanceVendorsPage />} />
                                    <Route path="refunds" element={<FinanceRefundsPage />} />
                                    <Route path="export" element={<FinanceExportPage />} />
                                    <Route path="import" element={<FinanceImportPage />} />
                                    <Route path="audit-log" element={<FinanceAuditLogPage />} />
                                    <Route path="settings" element={<FinanceSettingsPage />} />
                                </Route>
                                <Route path={adminUi('reports')} element={<AdminReportsPage />} />
                                <Route path={adminUi('settings')} element={<AdminSettingsCenterPage />} />
                                <Route path={adminUi('settings/home-control')} element={<AdminHomeSettingsPage />} />
                                <Route path={adminUi('settings/university-settings')} element={<AdminUniversitySettingsPage />} />
                                <Route path={adminUi('settings/site-settings')} element={<AdminSettingsSitePage />} />
                                <Route path={adminUi('settings/banner-manager')} element={<AdminSettingsBannersPage />} />
                                <Route path={adminUi('campaign-banners')} element={<AdminCampaignBannersPage />} />
                                <Route path={adminUi('settings/security-center')} element={<AdminSettingsSecurityPage />} />
                                <Route path={adminUi('settings/system-logs')} element={<AdminSettingsLogsPage />} />
                                <Route path={adminUi('settings/reports')} element={<AdminSettingsReportsPage />} />
                                <Route path={adminUi('settings/notifications')} element={<AdminSettingsNotificationsPage />} />
                                <Route path={adminUi('settings/analytics')} element={<AdminSettingsAnalyticsPage />} />
                                <Route path={adminUi('settings/news')} element={<AdminSettingsNewsPage />} />
                                <Route path={adminUi('settings/resource-settings')} element={<AdminSettingsResourcesPage />} />
                                <Route path={adminUi('settings/admin-profile')} element={<AdminSettingsProfilePage />} />
                                <Route path={adminUi('settings/home')} element={<Navigate to={adminUi('settings/home-control')} replace />} />
                                <Route path={adminUi('settings/site')} element={<Navigate to={adminUi('settings/site-settings')} replace />} />
                                <Route path={adminUi('settings/banners')} element={<Navigate to={adminUi('settings/banner-manager')} replace />} />
                                <Route path={adminUi('settings/security')} element={<Navigate to={adminUi('settings/security-center')} replace />} />
                                <Route path={adminUi('settings/logs')} element={<Navigate to={adminUi('settings/system-logs')} replace />} />
                                <Route path={adminUi('settings/profile')} element={<Navigate to={adminUi('settings/admin-profile')} replace />} />
                                {/* Student Management OS Console */}
                                <Route path={adminUi('student-management')} element={<Navigate to={adminUi('student-management/list')} replace />} />
                                <Route path={adminUi('student-management/*')} element={<StudentManagementLayout />}>
                                    <Route path="list" element={<AdminStudentsMgmtPage />} />
                                    <Route path="create" element={<AdminStudentCreatePage />} />
                                    <Route path="import-export" element={<AdminStudentImportExportPage />} />
                                    <Route path="groups" element={<AdminStudentGroupsV2Page />} />
                                    <Route path="groups/:id" element={<AdminStudentGroupDetailPage />} />
                                    <Route path="audiences" element={<Navigate to={`${ADMIN_PATHS.campaignsContactCenter}?tab=members`} replace />} />
                                    <Route path="crm-timeline" element={<AdminStudentCrmTimelinePage />} />
                                    <Route path="weak-topics" element={<AdminStudentWeakTopicsPage />} />
                                    <Route path="profile-requests" element={<AdminProfileRequestsPage />} />
                                    <Route path="notifications" element={<AdminNotificationCenterEmbeddedPage />} />
                                    <Route path="settings" element={<AdminStudentSettingsEmbeddedPage />} />
                                    <Route path="students/:id" element={<AdminStudentMgmtDetailPage />} />
                                </Route>
                                {/* New Student Management System v2 */}
                                <Route path={adminUi('students-v2')} element={<Navigate to={adminUi('student-management/list')} replace />} />
                                <Route path={adminUi('students-v2/:id')} element={<Navigate to={adminUi('student-management/list')} replace />} />
                                <Route path={adminUi('student-groups-v2')} element={<Navigate to={adminUi('student-management/groups')} replace />} />
                                <Route path={adminUi('notification-center')} element={<Navigate to={`${ADMIN_PATHS.campaignsDashboard}?view=notifications`} replace />} />
                                {/* Campaign Platform */}
                                <Route path={ADMIN_PATHS.notificationTestSend} element={<Navigate to={ADMIN_PATHS.campaignsNew} replace />} />
                                <Route path={ADMIN_PATHS.notificationTriggers} element={<Navigate to={`${ADMIN_PATHS.campaignsDashboard}?view=triggers`} replace />} />
                                <Route path={ADMIN_PATHS.campaignsDashboard} element={<CampaignConsolePage />} />
                                <Route path={ADMIN_PATHS.campaignsList} element={<CampaignConsolePage />} />
                                <Route path={ADMIN_PATHS.campaignsNew} element={<CampaignConsolePage />} />
                                <Route path={ADMIN_PATHS.campaignsContactCenter} element={<SubscriptionContactCenterPage />} />
                                <Route path={ADMIN_PATHS.campaignsTemplates} element={<CampaignConsolePage />} />
                                <Route path={ADMIN_PATHS.campaignsSettings} element={<CampaignConsolePage />} />
                                <Route path={ADMIN_PATHS.campaignsLogs} element={<CampaignConsolePage />} />
                                {/* Data Hub */}
                                <Route path={ADMIN_PATHS.dataHub} element={<Navigate to={`${ADMIN_PATHS.campaignsContactCenter}?tab=export`} replace />} />
                                <Route path={ADMIN_PATHS.dataHubHistory} element={<Navigate to={`${ADMIN_PATHS.campaignsContactCenter}?tab=logs`} replace />} />
                                {/* Team & Access Control */}
                                <Route path={ADMIN_PATHS.teamMembers} element={<TeamAccessConsolePage />} />
                                <Route path={adminUi('team/members/:id')} element={<MemberDetailPage />} />
                                <Route path={ADMIN_PATHS.teamRoles} element={<TeamAccessConsolePage />} />
                                <Route path={adminUi('team/roles/:id')} element={<RoleDetailPage />} />
                                <Route path={ADMIN_PATHS.teamPermissions} element={<TeamAccessConsolePage />} />
                                <Route path={ADMIN_PATHS.teamApprovalRules} element={<TeamAccessConsolePage />} />
                                <Route path={ADMIN_PATHS.teamActivity} element={<TeamAccessConsolePage />} />
                                <Route path={ADMIN_PATHS.teamSecurity} element={<TeamAccessConsolePage />} />
                                <Route path={ADMIN_PATHS.teamInvites} element={<TeamAccessConsolePage />} />
                                <Route path={ADMIN_PATHS.approvals} element={<ActionApprovalsPage />} />
                                <Route path={adminUi('settings/student-settings')} element={<AdminStudentSettingsPage />} />
                                {Object.entries(LEGACY_ADMIN_PATH_REDIRECTS).map(([legacyPath, targetPath]) => (
                                    <Route key={legacyPath} path={legacyPath} element={<Navigate to={targetPath} replace />} />
                                ))}
                                <Route path="/__cw_admin__" element={<Navigate to={ADMIN_DASHBOARD} replace />} />

                                <Route path="/admin/login" element={<Navigate to={ADMIN_LOGIN} replace />} />
                                <Route path="/admin/*" element={<LegacyAdminRedirect />} />

                                {/* Student Portal Routes */}
                                <Route path="/student/login" element={<Navigate to={STUDENT_LOGIN} replace />} />
                                <Route path="/student-login" element={<Navigate to={STUDENT_LOGIN} replace />} />
                                <Route path="/student/register" element={<StudentRegister />} />
                                <Route path="/student/forgot-password" element={<StudentForgotPassword />} />
                                <Route path="/student/reset-password" element={<StudentResetPassword />} />
                                <Route path="/student" element={<Navigate to="/dashboard" replace />} />
                                <Route path="/student/exams" element={<Navigate to="/exams" replace />} />
                                <Route path="/student/results" element={<Navigate to="/results" replace />} />
                                <Route path="/student/results/:examId" element={<LegacyStudentResultRedirect />} />
                                <Route path="/student/payments" element={<Navigate to="/payments" replace />} />
                                <Route path="/student/notifications" element={<Navigate to="/notifications" replace />} />
                                <Route path="/student/support" element={<Navigate to="/support" replace />} />
                                <Route element={<StudentLayout />}>
                                    <Route path="/dashboard" element={<StudentDashboard />} />
                                    <Route path="/profile" element={<StudentProfile />} />
                                    <Route path="/profile/security" element={<StudentSecurity />} />
                                    <Route path="/student/exams-hub" element={<StudentExamsHub />} />
                                    <Route path="/exams/:examId" element={<StudentExamDetail />} />
                                    <Route path="/results" element={<StudentResults />} />
                                    <Route path="/results/:examId" element={<StudentResultDetail />} />
                                    <Route path="/payments" element={<StudentPayments />} />
                                    <Route path="/notifications" element={<StudentNotifications />} />
                                    <Route path="/student/resources" element={<StudentResources />} />
                                    <Route path="/support" element={<StudentSupport />} />
                                    <Route path="/support/:ticketId" element={<StudentSupportThread />} />
                                    <Route path="/student/dashboard" element={<StudentDashboard />} />
                                    <Route path="/student/profile" element={<StudentProfile />} />
                                    <Route path="/student/security" element={<StudentSecurity />} />
                                    <Route path="/student/applications" element={<StudentApplications />} />
                                </Route>

                                <Route path="*" element={<NotFoundPage />} />
                            </Routes>
                        </AppLayout>
                    </BrowserRouter>
                </AuthProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
