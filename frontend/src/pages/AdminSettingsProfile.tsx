import AdminProfilePanel from '../components/admin/AdminProfilePanel';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminSettingsProfilePage() {
    return (
        <AdminGuardShell
            title="Admin Profile"
            description="Update profile information and account preferences."
        >
            <AdminProfilePanel />
        </AdminGuardShell>
    );
}

