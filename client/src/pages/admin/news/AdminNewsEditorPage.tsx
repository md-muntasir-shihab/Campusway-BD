import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminNewsItemQuery, useAdminNewsSettingsQuery, useAdminWorkflowMutation, useSaveAdminNewsItem, useUploadNewsMedia } from '../../../api/news';
import { NewsItem } from '../../../types/news';

const EMPTY_NEWS: Partial<NewsItem> = {
  status: 'draft',
  title: '',
  slug: '',
  shortSummary: '',
  fullContent: '',
  coverImageUrl: '',
  coverSource: 'default',
  tags: [],
  category: 'education',
  originalArticleUrl: '',
  sourceName: 'CampusWay'
};

export const AdminNewsEditorPage = () => {
  const { id = 'new' } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const itemQuery = useAdminNewsItemQuery(isNew ? '' : id);
  const saveMutation = useSaveAdminNewsItem();
  const workflowMutation = useAdminWorkflowMutation();
  const uploadMutation = useUploadNewsMedia();
  const settingsQuery = useAdminNewsSettingsQuery();

  const [draft, setDraft] = useState<Partial<NewsItem>>(EMPTY_NEWS);

  useEffect(() => {
    if (itemQuery.data && !isNew) {
      setDraft(itemQuery.data);
    }
  }, [itemQuery.data, isNew]);

  const previewCover = useMemo(
    () =>
      draft.coverImageUrl
      || settingsQuery.data?.defaultBannerUrl
      || settingsQuery.data?.defaultThumbUrl
      || 'https://placehold.co/1200x600',
    [draft.coverImageUrl, settingsQuery.data?.defaultBannerUrl, settingsQuery.data?.defaultThumbUrl]
  );

  const save = (status: 'draft' | 'published' | 'scheduled' | 'rejected') => {
    const payload = {
      ...draft,
      _id: isNew ? undefined : id,
      status,
      tags: draft.tags || []
    };
    saveMutation.mutate(payload, {
      onSuccess: (saved) => {
        if (status === 'published') {
          workflowMutation.mutate({ action: 'approvePublish', id: saved._id });
        }
        if (isNew && saved?._id) navigate(`/__cw_admin__/news/editor/${saved._id}`);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{isNew ? 'Create News' : 'Edit News'}</h2>
        <Link className="h-11 rounded-token border border-border px-4 py-2" to="/__cw_admin__/news/pending">Back to queue</Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="space-y-3">
          <div className="token-card space-y-3 p-4">
            <input className="h-11 w-full rounded-token border border-border bg-transparent px-3" placeholder="Title" value={draft.title || ''} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
            <textarea className="min-h-[84px] w-full rounded-token border border-border bg-transparent p-3" placeholder="Short summary" value={draft.shortSummary || ''} onChange={(event) => setDraft((prev) => ({ ...prev, shortSummary: event.target.value }))} />
            <textarea className="min-h-[240px] w-full rounded-token border border-border bg-transparent p-3" placeholder="Full content (HTML or markdown-like text)" value={draft.fullContent || ''} onChange={(event) => setDraft((prev) => ({ ...prev, fullContent: event.target.value }))} />
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-11 w-full rounded-token border border-border bg-transparent px-3" placeholder="Category" value={draft.category || ''} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} />
              <input className="h-11 w-full rounded-token border border-border bg-transparent px-3" placeholder="Tags comma separated" value={(draft.tags || []).join(',')} onChange={(event) => setDraft((prev) => ({ ...prev, tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }))} />
              <input className="h-11 w-full rounded-token border border-border bg-transparent px-3" placeholder="Original article URL" value={draft.originalArticleUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, originalArticleUrl: event.target.value }))} />
              <select className="h-11 w-full rounded-token border border-border bg-transparent px-3" value={draft.coverSource || 'default'} onChange={(event) => {
                const coverSource = event.target.value as NewsItem['coverSource'];
                setDraft((prev) => ({
                  ...prev,
                  coverSource,
                  coverImageUrl: coverSource === 'default' ? '' : (prev.coverImageUrl || '')
                }));
              }}>
                <option value="rss">Use extracted</option>
                <option value="admin">Upload custom</option>
                <option value="default">Use default</option>
              </select>
            </div>
            {draft.coverSource !== 'default' ? (
              <input className="h-11 w-full rounded-token border border-border bg-transparent px-3" placeholder="Cover image URL" value={draft.coverImageUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, coverImageUrl: event.target.value }))} />
            ) : null}
            <div>
              <label className="mb-2 block text-sm text-muted">Upload cover</label>
              <input type="file" accept="image/*" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                uploadMutation.mutate(file, {
                  onSuccess: (result) => {
                    setDraft((prev) => ({ ...prev, coverImageUrl: result.url, coverSource: 'admin' }));
                  }
                });
              }} />
            </div>
          </div>

          <div className="token-card flex flex-wrap gap-2 p-4 text-xs">
            <button className="rounded-lg border border-border px-3 py-2" onClick={() => save('draft')}>{saveMutation.isPending ? 'Saving...' : 'Save Draft'}</button>
            <button className="rounded-lg border border-border px-3 py-2" onClick={() => save('published')}>Publish Now</button>
            <button className="rounded-lg border border-border px-3 py-2" onClick={() => {
              const scheduledAt = window.prompt('Schedule datetime (ISO)', new Date(Date.now() + 3600_000).toISOString());
              if (!scheduledAt) return;
              saveMutation.mutate({ ...draft, _id: isNew ? undefined : id, status: 'scheduled', scheduledAt } as Partial<NewsItem> & { _id?: string }, {
                onSuccess: (saved) => workflowMutation.mutate({ action: 'schedule', id: saved._id, body: { scheduledAt } })
              });
            }} disabled={!settingsQuery.data?.workflow?.allowScheduling}>Schedule</button>
            {!isNew ? <button className="rounded-lg border border-border px-3 py-2" onClick={() => workflowMutation.mutate({ action: 'reject', id })}>Reject</button> : null}
            <Link className="rounded-lg border border-border px-3 py-2" to={draft.slug ? `/news/${draft.slug}` : '/news'} target="_blank">Preview as public</Link>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="token-card p-4">
            <h3 className="mb-2 font-semibold">Preview</h3>
            <img src={previewCover} alt={draft.title || 'Preview'} className="h-48 w-full rounded-xl object-cover" />
            <h4 className="mt-3 text-lg font-semibold">{draft.title || 'Untitled'}</h4>
            <p className="mt-2 text-sm text-muted">{draft.shortSummary || 'Summary preview appears here.'}</p>
          </div>
          <div className="token-card p-4 text-xs text-muted">
            Cover source rule: when set to default, no URL is stored so global default banner changes apply retroactively.
          </div>
        </aside>
      </div>
    </div>
  );
};

