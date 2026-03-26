import SiteSettingsPanel from '../components/admin/SiteSettingsPanel';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminSettingsSitePage() {
    return (
        <AdminGuardShell
            title="Site Settings"
            description="Control global branding, contact information, and social links."
            allowedRoles={['superadmin', 'admin']}
        >
            <SiteSettingsPanel />
        </AdminGuardShell>
    );
}
