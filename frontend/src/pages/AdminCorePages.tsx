import { Navigate, useNavigate } from 'react-router-dom';
import AdminGuardShell from '../components/admin/AdminGuardShell';
import DashboardHome from '../components/admin/DashboardHome';
import UniversitiesPanel from '../components/admin/UniversitiesPanel';
import NewsPanel from '../components/admin/NewsPanel';

import QuestionBankConsole from '../components/admin/questionBank/QuestionBankConsole';
import FinancePanel from '../components/admin/FinancePanel';
import FinanceCenterConsole from '../components/admin/finance/FinanceCenterConsole';
import ResourcesPanel from '../components/admin/ResourcesPanel';
import SupportTicketsPanel from '../components/admin/SupportTicketsPanel';
import ContactPanel from '../components/admin/ContactPanel';
import { routeFromDashboardActionTab } from '../routes/adminPaths';
import { AdminExamsPage as StandaloneExamsPage } from './admin/exams/AdminExamsPage';
// StudentsListPage imported via StudentManagementListPage
import StudentDetailPage from './admin/students/StudentDetailPage';
import StudentGroupsPageV2 from './admin/students/StudentGroupsPage';
import AdminActionAlertsPage from './admin/notifications/AdminActionAlertsPage';
import StudentSettingsPage from './admin/students/StudentSettingsPage';
import StudentManagementListPage from './admin/students/StudentManagementListPage';
import StudentCreatePage from './admin/students/StudentCreatePage';
import StudentImportExportPage from './admin/students/StudentImportExportPage';
import StudentAudiencesPage from './admin/students/StudentAudiencesPage';
import StudentCrmTimelinePage from './admin/students/StudentCrmTimelinePage';
import StudentWeakTopicsPage from './admin/students/StudentWeakTopicsPage';
import StudentManagementDetailPage from './admin/students/StudentManagementDetailPage';
import StudentGroupDetailPage from './admin/students/StudentGroupDetailPage';
import ProfileUpdateRequestsPage from './admin/students/ProfileUpdateRequestsPage';
import SubscriptionsV2Page from './admin/subscriptions/SubscriptionsV2Page';

export function AdminDashboardPage() {
    const navigate = useNavigate();

    return (
        <AdminGuardShell
            title="Dashboard"
            description="Live snapshot of core admin modules with direct navigation shortcuts."
        >
            <DashboardHome
                universities={[]}
                exams={[]}
                users={[]}
                onTabChange={(tab) => navigate(routeFromDashboardActionTab(tab))}
            />
        </AdminGuardShell>
    );
}

export function AdminUniversitiesPage() {
    return (
        <AdminGuardShell title="Universities" description="Manage university records, mapping, and category assignments." requiredModule="universities">
            <UniversitiesPanel />
        </AdminGuardShell>
    );
}

export function AdminNewsPage() {
    return (
        <AdminGuardShell title="News" description="Create, review, and publish campus news content." requiredModule="news">
            <NewsPanel />
        </AdminGuardShell>
    );
}

export function AdminExamsPage() {
    return (
        <AdminGuardShell title="Exams" description="Create and manage exams, questions, results, and payments." requiredModule="exams">
            <StandaloneExamsPage />
        </AdminGuardShell>
    );
}

export function AdminQuestionBankPage() {
    return (
        <AdminGuardShell title="Question Bank" description="Manage questions, bilingual content, and import tools." requiredModule="question_bank">
            <QuestionBankConsole />
        </AdminGuardShell>
    );
}

export function AdminStudentsPage() {
    return <Navigate to="/__cw_admin__/student-management/list" replace />;
}

export function AdminStudentGroupsPage() {
    return <Navigate to="/__cw_admin__/student-management/groups" replace />;
}

export function AdminPaymentsPage() {
    return (
        <AdminGuardShell title="Payments" description="Review manual payments, approve transactions, and export logs." requiredModule="payments">
            <FinancePanel />
        </AdminGuardShell>
    );
}

export function AdminResourcesPage() {
    return (
        <AdminGuardShell title="Resources" description="Manage downloadable resources and visibility controls." requiredModule="resources">
            <ResourcesPanel />
        </AdminGuardShell>
    );
}

export function AdminSupportCenterPage() {
    return (
        <AdminGuardShell title="Support Center" description="Handle student tickets, replies, and resolution workflow." requiredModule="support_center">
            <SupportTicketsPanel />
        </AdminGuardShell>
    );
}

// ─── New Student Management System (v2) ───────────────────────────────────

export function AdminStudentsMgmtPage() {
    return <StudentManagementListPage />;
}

export function AdminStudentCreatePage() {
    return <StudentCreatePage />;
}

export function AdminStudentImportExportPage() {
    return <StudentImportExportPage />;
}

export function AdminStudentAudiencesPage() {
    return <StudentAudiencesPage />;
}

export function AdminStudentCrmTimelinePage() {
    return <StudentCrmTimelinePage />;
}

export function AdminStudentWeakTopicsPage() {
    return <StudentWeakTopicsPage />;
}

export function AdminProfileRequestsPage() {
    return <ProfileUpdateRequestsPage />;
}

export function AdminStudentMgmtDetailPage() {
    return <StudentManagementDetailPage />;
}

export function AdminStudentDetailPage() {
    return <StudentDetailPage />;
}

export function AdminStudentGroupsV2Page() {
    return <StudentGroupsPageV2 />;
}

export function AdminStudentGroupDetailPage() {
    return <StudentGroupDetailPage />;
}

export function AdminNotificationCenterPage() {
    return <AdminActionAlertsPage />;
}

export function AdminNotificationCenterEmbeddedPage() {
    return <AdminActionAlertsPage noShell />;
}

export function AdminStudentSettingsPage() {
    return <StudentSettingsPage />;
}

export function AdminStudentSettingsEmbeddedPage() {
    return <StudentSettingsPage noShell />;
}

export function AdminFinanceCenterPage() {
    return (
        <AdminGuardShell title="Finance Center" description="Unified financial management — income, expenses, invoices, budgets, and reports." requiredModule="finance_center">
            <FinanceCenterConsole />
        </AdminGuardShell>
    );
}

export function AdminContactPage() {
    return (
        <AdminGuardShell title="Contact Messages" description="View and manage contact form submissions." requiredModule="support_center">
            <ContactPanel />
        </AdminGuardShell>
    );
}

export function AdminSubscriptionsV2Page() {
    return (
        <AdminGuardShell title="Subscriptions" description="View and manage student subscriptions, renewals, and plan assignments." requiredModule="subscription_plans">
            <SubscriptionsV2Page />
        </AdminGuardShell>
    );
}
