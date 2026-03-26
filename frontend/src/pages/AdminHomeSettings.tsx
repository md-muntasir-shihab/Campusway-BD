import HomeSettingsPanel from '../components/admin/HomeSettingsPanel';
import AdminGuardShell from '../components/admin/AdminGuardShell';

export default function AdminHomeSettingsPage() {
    return (
        <AdminGuardShell title="Home Control" description="Control section visibility, highlights, featured universities, and live sync settings.">
            <HomeSettingsPanel />
        </AdminGuardShell>
    );
}
