import { useState } from 'react';
import { useAdminRssSourcesQuery, useDeleteRssSource, useFetchRssNow, useSaveRssSource, useTestRssSource, useUploadNewsMedia } from '../../../api/news';
import { RssSource } from '../../../types/news';

const EMPTY_SOURCE: Partial<RssSource> = {
  name: '',
  rssUrl: '',
  siteUrl: '',
  iconType: 'url',
  iconUrl: '',
  categoryTags: [],
  enabled: true,
  fetchIntervalMinutes: 30,
  priority: 0
};

export const AdminNewsSourcesPage = () => {
  const sourcesQuery = useAdminRssSourcesQuery();
  const saveMutation = useSaveRssSource();
  const testMutation = useTestRssSource();
  const deleteMutation = useDeleteRssSource();
  const fetchNowMutation = useFetchRssNow();
  const uploadMutation = useUploadNewsMedia();
  const [draft, setDraft] = useState<Partial<RssSource>>(EMPTY_SOURCE);

  const shiftPriority = (source: RssSource, delta: number) => {
    saveMutation.mutate({ _id: source._id, priority: source.priority + delta });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">RSS Sources</h2>
        <button className="h-11 rounded-token bg-primary px-4 text-white" onClick={() => fetchNowMutation.mutate([])}>
          {fetchNowMutation.isPending ? 'Fetching...' : 'Fetch Now'}
        </button>
      </div>

      <form
        className="token-card grid gap-3 p-4 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          saveMutation.mutate(draft as RssSource, {
            onSuccess: () => setDraft(EMPTY_SOURCE)
          });
        }}
      >
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Source name" value={draft.name || ''} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="RSS URL" value={draft.rssUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, rssUrl: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Site URL" value={draft.siteUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, siteUrl: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Icon URL" value={draft.iconUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, iconUrl: event.target.value, iconType: 'url' }))} />

        <div className="space-y-2">
          <label className="text-sm text-muted">Icon upload</label>
          <input type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            uploadMutation.mutate(file, {
              onSuccess: (result) => setDraft((prev) => ({ ...prev, iconUrl: result.url, iconType: 'upload' }))
            });
          }} />
        </div>

        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Category tags (comma separated)" value={(draft.categoryTags || []).join(',')} onChange={(event) => setDraft((prev) => ({ ...prev, categoryTags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }))} />

        <div className="grid grid-cols-3 gap-2">
          <select className="h-11 rounded-token border border-border bg-transparent px-2" value={String(draft.fetchIntervalMinutes || 30)} onChange={(event) => setDraft((prev) => ({ ...prev, fetchIntervalMinutes: Number(event.target.value) as 15 | 30 | 60 | 360 }))}>
            <option value="15">15m</option>
            <option value="30">30m</option>
            <option value="60">60m</option>
            <option value="360">6h</option>
          </select>
          <input type="number" className="h-11 rounded-token border border-border bg-transparent px-2" placeholder="Priority" value={draft.priority ?? 0} onChange={(event) => setDraft((prev) => ({ ...prev, priority: Number(event.target.value) }))} />
          <button className="h-11 rounded-token border border-border">{saveMutation.isPending ? 'Saving...' : 'Save'}</button>
        </div>
      </form>

      <div className="space-y-3">
        {(sourcesQuery.data || []).map((source) => (
          <article key={source._id} className="token-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{source.name}</h3>
                <p className="text-xs text-muted">{source.rssUrl}</p>
                <p className="text-xs text-muted">Interval: {source.fetchIntervalMinutes}m | Priority: {source.priority}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <button className="rounded-lg border border-border px-2 py-1" onClick={() => setDraft(source)}>Edit</button>
                <button className="rounded-lg border border-border px-2 py-1" onClick={() => testMutation.mutate(source._id)}>Test RSS</button>
                <button className="rounded-lg border border-border px-2 py-1" onClick={() => saveMutation.mutate({ _id: source._id, enabled: !source.enabled })}>{source.enabled ? 'Disable' : 'Enable'}</button>
                <button className="rounded-lg border border-border px-2 py-1" onClick={() => shiftPriority(source, -1)}>Priority -</button>
                <button className="rounded-lg border border-border px-2 py-1" onClick={() => shiftPriority(source, 1)}>Priority +</button>
                <button className="rounded-lg border border-rose-400 px-2 py-1 text-rose-600" onClick={() => {
                  if (!window.confirm('Delete source?')) return;
                  deleteMutation.mutate(source._id);
                }}>Delete</button>
              </div>
            </div>
            {testMutation.data?.preview && testMutation.variables === source._id ? (
              <div className="rounded-lg border border-border p-3 text-xs">
                <p className="mb-2 font-semibold">Latest feed preview:</p>
                <ul className="space-y-1">
                  {testMutation.data.preview.map((item, index) => {
                    const entry = item as { title: string; link: string };
                    return <li key={index}><a className="text-primary" href={entry.link} target="_blank" rel="noreferrer">{entry.title}</a></li>;
                  })}
                </ul>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
};