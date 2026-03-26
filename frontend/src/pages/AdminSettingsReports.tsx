import ReportsPanel from '../components/admin/ReportsPanel';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminSettingsReportsPage() {
    return (
        <AdminGuardShell
            title="Reports & Automation"
            description="Review report snapshots, exam insights, and export tools."
        >
            <ReportsPanel />
        </AdminGuardShell>
    );
}
