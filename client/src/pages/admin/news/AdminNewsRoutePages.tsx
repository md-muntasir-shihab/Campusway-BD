import { AdminNewsQueuePage } from './AdminNewsQueuePage';

export const AdminNewsPendingPage = () => <AdminNewsQueuePage status="pending_review" />;
export const AdminNewsDuplicatesPage = () => <AdminNewsQueuePage status="duplicate_review" />;
export const AdminNewsDraftsPage = () => <AdminNewsQueuePage status="draft" />;
export const AdminNewsPublishedPage = () => <AdminNewsQueuePage status="published" />;
export const AdminNewsScheduledPage = () => <AdminNewsQueuePage status="scheduled" />;
export const AdminNewsRejectedPage = () => <AdminNewsQueuePage status="rejected" />;
export const AdminNewsAiSelectedPage = () => <AdminNewsQueuePage status="pending_review" title="AI Selected" extraFilters={{ isAiSelected: true }} />;

