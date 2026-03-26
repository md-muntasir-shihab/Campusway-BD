import AdminGuardShell from '../components/admin/AdminGuardShell';
import AnalyticsSettingsPanel from '../components/admin/AnalyticsSettingsPanel';

export default function AdminSettingsAnalyticsPage() {
    return (
        <AdminGuardShell
            title="Analytics Settings"
            description="Control privacy-safe analytics logging, event toggles, and exports."
        >
            <AnalyticsSettingsPanel />
        </AdminGuardShell>
    );
}
