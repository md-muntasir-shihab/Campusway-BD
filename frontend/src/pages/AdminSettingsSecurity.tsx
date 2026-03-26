import SecurityCenterLayout from '../components/admin/SecurityCenterLayout';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminSettingsSecurityPage() {
    return (
        <AdminGuardShell
            title="Security Center"
            description="Monitor, configure, and audit platform security from one place."
            allowedRoles={['superadmin', 'admin']}
        >
            <SecurityCenterLayout />
        </AdminGuardShell>
    );
}
