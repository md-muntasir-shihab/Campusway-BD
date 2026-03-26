import { Navigate } from 'react-router-dom';
import { ADMIN_PATHS } from '../routes/adminPaths';

export default function AdminSettingsNotificationsPage() {
    return <Navigate to={ADMIN_PATHS.campaignsNotifications} replace />;
}
