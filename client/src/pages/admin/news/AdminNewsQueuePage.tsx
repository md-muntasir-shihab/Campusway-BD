import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useAdminNewsListQuery,
  useAdminWorkflowMutation,
  useDeleteAdminNewsItem,
  useSaveAdminNewsItem,
  useAdminNewsSettingsQuery,
  useAdminRssSourcesQuery
} from '../../../api/news';
import { NewsStatus } from '../../../types/news';

const ACTION_LABELS: Record<NewsStatus, string> = {
  pending_review: 'Pending Review',
  duplicate_review: 'Duplicate Queue',
  draft: 'Drafts',
  published: 'Published',
  scheduled: 'Scheduled',
  rejected: 'Rejected'
};

export const AdminNewsQueuePage = ({
  status,
  title,
  extraFilters
}: {
  status: NewsStatus;
  title?: string;
  extraFilters?: Record<string, unknown>;
}) => {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sourceId, setSourceId] = useState('');
  const filters = { page, limit: 20, q, sourceId, ...(extraFilters || {}) };
  const listQuery = useAdminNewsListQuery(status, filters);
  const workflowMutation = useAdminWorkflowMutation();
  const deleteMutation = useDeleteAdminNewsItem();
  const saveMutation = useSaveAdminNewsItem();
  const settingsQuery = useAdminNewsSettingsQuery();
  const sourcesQuery = useAdminRssSourcesQuery();

  const items = listQuery.data?.items || [];
  const pages = listQuery.data?.pages || 1;
  const header = title || ACTION_LABELS[status];
  const fallbackBanner = settingsQuery.data?.defaultBannerUrl || settingsQuery.data?.defaultThumbUrl || 'https://placehold.co/600x320';

  const runSchedule = (id: string) => {
    const val = window.prompt('Schedule datetime (ISO format)', new Date(Date.now() + 60 * 60 * 1000).toISOString());
    if (!val) return;
    workflowMutation.mutate({ action: 'schedule', id, body: { scheduledAt: val } });
  };

  const canApprove = useMemo(() => ['pending_review', 'duplicate_review', 'draft', 'scheduled'].includes(status), [status]);
  const canSchedule = useMemo(() => ['pending_review', 'draft'].includes(status), [status]);
  const canMoveToDraft = useMemo(() => ['pending_review', 'duplicate_review'].includes(status), [status]);
  const canReject = useMemo(() => ['pending_review', 'duplicate_review', 'draft'].includes(status), [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{header}</h2>
        <Link to="/__cw_admin__/news/editor/new" className="h-11 rounded-token bg-primary px-4 py-2 text-white">Create Manual News</Link>
      </div>

      <div className="token-card grid gap-3 p-3 md:grid-cols-3">
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Search title/source" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className="h-11 rounded-token border border-border bg-transparent px-3" value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
          <option value="">All sources</option>
          {(sourcesQuery.data || []).map((source) => <option key={source._id} value={source._id}>{source.name}</option>)}
        </select>
        <button className="h-11 rounded-token border border-border px-4" onClick={() => listQuery.refetch()}>Refresh</button>
      </div>

      <div className="space-y-3">
        {listQuery.isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => <div key={idx} className="token-card h-32 animate-pulse" />)
        ) : items.length === 0 ? (
          <div className="token-card p-6 text-sm text-muted">No items in this queue.</div>
        ) : (
          items.map((item) => (
            <article key={item._id} className="token-card space-y-3 p-4">
              <div className="grid gap-3 md:grid-cols-[120px_1fr]">
                <img src={item.coverImageUrl || fallbackBanner} alt={item.title} className="h-24 w-full rounded-lg object-cover" />
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>{item.sourceName || 'CampusWay'}</span>
                    <span>|</span>
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.fetchedFullText ? <span className="rounded-full border border-border px-2 py-0.5">hasFullText</span> : <span className="rounded-full border border-border px-2 py-0.5">summary only</span>}
                    {status === 'duplicate_review' && item.duplicateOfNewsId ? <span className="rounded-full border border-border px-2 py-0.5">Duplicate of {item.duplicateOfNewsId}</span> : null}
                    {item.isAiSelected ? <span className="rounded-full border border-primary px-2 py-0.5 text-primary">AI Selected</span> : null}
                  </div>
                  <h3 className="mt-1 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.shortSummary}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Link className="rounded-lg border border-border px-2 py-1" to={`/__cw_admin__/news/editor/${item._id}`}>Edit</Link>

                {canApprove ? (
                  <button className="rounded-lg border border-border px-2 py-1" onClick={() => workflowMutation.mutate({ action: 'approvePublish', id: item._id })}>Approve & Publish</button>
                ) : null}
                {canSchedule ? (
                  <button className="rounded-lg border border-border px-2 py-1" onClick={() => runSchedule(item._id)}>Schedule</button>
                ) : null}
                {canMoveToDraft ? (
                  <button className="rounded-lg border border-border px-2 py-1" onClick={() => workflowMutation.mutate({ action: 'moveToDraft', id: item._id })}>Move to Draft</button>
                ) : null}
                {canReject ? (
                  <button className="rounded-lg border border-border px-2 py-1" onClick={() => workflowMutation.mutate({ action: 'reject', id: item._id })}>Reject</button>
                ) : null}

                {status === 'pending_review' ? (
                  <button className="rounded-lg border border-border px-2 py-1" onClick={() => saveMutation.mutate({ _id: item._id, isAiSelected: true })}>Mark AI Selected</button>
                ) : null}

                {status === 'duplicate_review' ? (
                  <>
                    <button className="rounded-lg border border-border px-2 py-1" onClick={() => workflowMutation.mutate({ action: 'publishAnyway', id: item._id })}>Publish anyway</button>
                    <button className="rounded-lg border border-border px-2 py-1" onClick={() => {
                      const targetNewsId = window.prompt('Target existing news ID to merge into', item.duplicateOfNewsId || '');
                      if (!targetNewsId) return;
                      workflowMutation.mutate({ action: 'mergeDuplicate', id: item._id, body: { targetNewsId } });
                    }}>Merge into existing</button>
                  </>
                ) : null}

                <button className="rounded-lg border border-rose-400 px-2 py-1 text-rose-600" onClick={() => {
                  if (!window.confirm('Delete this item?')) return;
                  deleteMutation.mutate(item._id);
                }}>Delete</button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button className="h-10 rounded-token border border-border px-3" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>Previous</button>
        <span className="text-sm text-muted">{page} / {pages}</span>
        <button className="h-10 rounded-token border border-border px-3" disabled={page >= pages} onClick={() => setPage((prev) => Math.min(pages, prev + 1))}>Next</button>
      </div>
    </div>
  );
};