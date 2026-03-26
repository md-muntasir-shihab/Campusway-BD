import SystemLogsPanel from '../components/admin/SystemLogsPanel';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminSettingsLogsPage() {
    return (
        <AdminGuardShell
            title="System Logs"
            description="Inspect runtime and audit logs from a single settings page."
            allowedRoles={['superadmin', 'admin']}
        >
            <SystemLogsPanel />
        </AdminGuardShell>
    );
}

