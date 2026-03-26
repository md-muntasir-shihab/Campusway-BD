import AdminGuardShell from '../components/admin/AdminGuardShell';
import AdminNewsSettingsHub from './admin-news/sections/AdminNewsSettingsHub';

export default function AdminSettingsNewsPage() {
    return (
        <AdminGuardShell
            title="News Settings"
            description="Configure news page branding, AI workflow, share templates, and RSS defaults."
            allowedRoles={['superadmin', 'admin', 'moderator']}
        >
            <AdminNewsSettingsHub initialPanel="appearance" />
        </AdminGuardShell>
    );
}
