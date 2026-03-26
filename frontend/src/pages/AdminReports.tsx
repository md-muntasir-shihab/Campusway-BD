import AdminGuardShell from '../components/admin/AdminGuardShell';
import ReportsPanel from '../components/admin/ReportsPanel';

export default function AdminReportsPage() {
    return (
        <AdminGuardShell
            title="Reports"
            description="Review summary metrics, exam insights, and exportable reports."
        >
            <ReportsPanel />
        </AdminGuardShell>
    );
}
