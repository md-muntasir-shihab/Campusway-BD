import AdminGuardShell from '../components/admin/AdminGuardShell';
import CampaignBannersPanel from '../components/admin/CampaignBannersPanel';

export default function AdminCampaignBannersPage() {
    return (
        <AdminGuardShell
            title="Campaign Banners"
            description="Manage promotional campaign banners displayed on the home screen carousel."
        >
            <CampaignBannersPanel />
        </AdminGuardShell>
    );
}
