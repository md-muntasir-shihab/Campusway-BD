import { Link } from 'react-router-dom';
import { downloadNewsExport, useAuditLogsQuery, useFetchRssNow, useAdminNewsListQuery, useAdminRssSourcesQuery } from '../../../api/news';

const StatCard = ({ label, value, to }: { label: string; value: number; to: string }) => (
  <Link to={to} className="token-card block p-4">
    <p className="text-sm text-muted">{label}</p>
    <p className="mt-1 text-2xl font-bold">{value}</p>
  </Link>
);

const toTime = (value?: string | null) => {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';
  return date.toLocaleString();
};

export const AdminNewsDashboardPage = () => {
  const fetchNow = useFetchRssNow();
  const pending = useAdminNewsListQuery('pending_review', { page: 1, limit: 1 });
  const duplicates = useAdminNewsListQuery('duplicate_review', { page: 1, limit: 1 });
  const published = useAdminNewsListQuery('published', { page: 1, limit: 1 });
  const scheduled = useAdminNewsListQuery('scheduled', { page: 1, limit: 1 });
  const auditQuery = useAuditLogsQuery('news', 1, 10);
  const rssSourcesQuery = useAdminRssSourcesQuery();

  const sources = rssSourcesQuery.data || [];
  const lastFetchedAt = sources
    .map((source) => source.lastFetchedAt || '')
    .filter(Boolean)
    .sort()
    .at(-1);
  const neverFetchedCount = sources.filter((source) => !source.lastFetchedAt).length;
  const fetchErrors = (auditQuery.data?.items || []).filter((item) => item.action.toLowerCase().includes('error'));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">News Dashboard</h2>
        <button className="h-11 rounded-token bg-primary px-4 text-white" onClick={() => fetchNow.mutate([])}>
          {fetchNow.isPending ? 'Fetching RSS...' : 'Fetch RSS Now'}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pending Review" value={pending.data?.total || 0} to="/__cw_admin__/news/pending" />
        <StatCard label="Duplicate Queue" value={duplicates.data?.total || 0} to="/__cw_admin__/news/duplicates" />
        <StatCard label="Published" value={published.data?.total || 0} to="/__cw_admin__/news/published" />
        <StatCard label="Scheduled" value={scheduled.data?.total || 0} to="/__cw_admin__/news/scheduled" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="token-card space-y-2 p-4 text-sm">
          <h3 className="font-semibold">Last Fetch Status</h3>
          <p>Latest successful fetch: <strong>{toTime(lastFetchedAt)}</strong></p>
          <p>Sources configured: <strong>{sources.length}</strong></p>
          <p>Sources never fetched: <strong>{neverFetchedCount}</strong></p>
        </div>

        <div className="token-card space-y-2 p-4 text-sm">
          <h3 className="font-semibold">Errors Panel</h3>
          {fetchErrors.length === 0 ? <p className="text-muted">No fetch errors recorded in recent audit events.</p> : null}
          {fetchErrors.map((entry) => (
            <div key={entry._id} className="rounded-lg border border-border p-2 text-xs">
              <p><strong>{entry.action}</strong> | {entry.targetType}</p>
              <p className="text-muted">{new Date(entry.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="token-card space-y-3 p-4 text-sm">
        <h3 className="font-semibold">Exports</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          <button className="rounded-lg border border-border px-2 py-1" onClick={() => downloadNewsExport({ type: 'csv' })}>Export CSV</button>
          <button className="rounded-lg border border-border px-2 py-1" onClick={() => downloadNewsExport({ type: 'xlsx' })}>Export XLSX</button>
          <button className="rounded-lg border border-border px-2 py-1" onClick={() => downloadNewsExport({ type: 'csv', status: 'pending_review' })}>Pending CSV</button>
          <button className="rounded-lg border border-border px-2 py-1" onClick={() => downloadNewsExport({ type: 'csv', status: 'duplicate_review' })}>Duplicate CSV</button>
        </div>
      </div>

      <div className="token-card space-y-2 p-4 text-sm">
        <h3 className="font-semibold">Audit Logs (latest)</h3>
        {auditQuery.isLoading ? <p className="text-muted">Loading logs...</p> : null}
        {(auditQuery.data?.items || []).map((log) => (
          <div key={log._id} className="rounded-lg border border-border p-2 text-xs">
            <p><strong>{log.action}</strong> | {log.targetType} | {log.targetId || '-'}</p>
            <p className="text-muted">{new Date(log.createdAt).toLocaleString()} {log.actorId ? `| ${log.actorId}` : ''}</p>
          </div>
        ))}
      </div>
    </div>
  );
};