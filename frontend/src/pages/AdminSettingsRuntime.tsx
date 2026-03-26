import AdminGuardShell from '../components/admin/AdminGuardShell';
import RuntimeSettingsPanel from '../components/admin/RuntimeSettingsPanel';

export default function AdminSettingsRuntimePage() {
    return (
        <AdminGuardShell
            title="Runtime Settings"
            description="Toggle feature flags and platform behaviour without redeployment."
            allowedRoles={['superadmin', 'admin']}
        >
            <RuntimeSettingsPanel />
        </AdminGuardShell>
    );
}
