import AdminGuardShell from '../components/admin/AdminGuardShell';
import DashboardConfigPanel from '../components/admin/DashboardConfigPanel';

export default function AdminSettingsDashboardConfigPage() {
    return (
        <AdminGuardShell
            title="Student Dashboard Config"
            description="Toggle dashboard features, celebration rules, and exam gating behaviour."
            allowedRoles={['superadmin', 'admin']}
        >
            <DashboardConfigPanel />
        </AdminGuardShell>
    );
}
