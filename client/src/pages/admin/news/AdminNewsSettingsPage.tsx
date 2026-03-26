import { useEffect, useState } from 'react';
import { useAdminNewsSettingsQuery, useSaveNewsSettings } from '../../../api/news';
import { NewsSettings } from '../../../types/news';

const DEFAULT_SETTINGS: Partial<NewsSettings> = {
  newsPageTitle: 'CampusWay News',
  newsPageSubtitle: 'Latest updates',
  defaultBannerUrl: '',
  defaultThumbUrl: '',
  defaultSourceIconUrl: '',
  fetchFullArticleEnabled: true,
  fullArticleFetchMode: 'both',
  appearance: {
    layoutMode: 'rss_reader',
    density: 'comfortable',
    showWidgets: {
      trending: true,
      latest: true,
      sourceSidebar: true,
      tagChips: true,
      previewPanel: true,
      breakingTicker: false
    },
    animationLevel: 'normal',
    paginationMode: 'pages'
  },
  shareTemplates: {
    whatsapp: '{title}\n{url}',
    facebook: '{title} {url}',
    messenger: '{title} {url}',
    telegram: '{title}\n{url}'
  },
  aiSettings: {
    enabled: false,
    language: 'en',
    stylePreset: 'standard',
    strictNoHallucination: true,
    maxLength: 1200,
    duplicateSensitivity: 'medium'
  },
  workflow: {
    defaultIncomingStatus: 'pending_review',
    allowScheduling: true,
    autoExpireDays: null
  }
};

export const AdminNewsSettingsPage = () => {
  const settingsQuery = useAdminNewsSettingsQuery();
  const saveMutation = useSaveNewsSettings();
  const [draft, setDraft] = useState<Partial<NewsSettings>>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (settingsQuery.data) {
      setDraft((prev) => ({ ...prev, ...settingsQuery.data }));
    }
  }, [settingsQuery.data]);

  const appearance = draft.appearance || DEFAULT_SETTINGS.appearance!;
  const aiSettings = draft.aiSettings || DEFAULT_SETTINGS.aiSettings!;
  const workflow = draft.workflow || DEFAULT_SETTINGS.workflow!;
  const shareTemplates = draft.shareTemplates || DEFAULT_SETTINGS.shareTemplates!;

  const setWidget = (key: keyof NewsSettings['appearance']['showWidgets'], value: boolean) => {
    setDraft((prev) => ({
      ...prev,
      appearance: {
        ...(prev.appearance || DEFAULT_SETTINGS.appearance!),
        showWidgets: {
          ...((prev.appearance || DEFAULT_SETTINGS.appearance!).showWidgets),
          [key]: value
        }
      }
    }));
  };

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      saveMutation.mutate(draft as Partial<NewsSettings>);
    }}>
      <h2 className="text-2xl font-bold">News Settings Center</h2>

      <div className="token-card grid gap-3 p-4 md:grid-cols-2">
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="News page title" value={draft.newsPageTitle || ''} onChange={(event) => setDraft((prev) => ({ ...prev, newsPageTitle: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="News page subtitle" value={draft.newsPageSubtitle || ''} onChange={(event) => setDraft((prev) => ({ ...prev, newsPageSubtitle: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Default banner URL" value={draft.defaultBannerUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, defaultBannerUrl: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Default thumb URL" value={draft.defaultThumbUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, defaultThumbUrl: event.target.value }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Default source icon URL" value={draft.defaultSourceIconUrl || ''} onChange={(event) => setDraft((prev) => ({ ...prev, defaultSourceIconUrl: event.target.value }))} />
      </div>

      <div className="token-card grid gap-3 p-4 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(draft.fetchFullArticleEnabled)} onChange={(event) => setDraft((prev) => ({ ...prev, fetchFullArticleEnabled: event.target.checked }))} /> Fetch full article content</label>
        <select className="h-11 rounded-token border border-border bg-transparent px-3" value={draft.fullArticleFetchMode || 'both'} onChange={(event) => setDraft((prev) => ({ ...prev, fullArticleFetchMode: event.target.value as NewsSettings['fullArticleFetchMode'] }))}>
          <option value="rss_content">rss_content</option>
          <option value="readability_scrape">readability_scrape</option>
          <option value="both">both</option>
        </select>
      </div>

      <div className="token-card space-y-3 p-4">
        <h3 className="font-semibold">Appearance</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={appearance.layoutMode} onChange={(event) => setDraft((prev) => ({ ...prev, appearance: { ...(prev.appearance || DEFAULT_SETTINGS.appearance!), layoutMode: event.target.value as NewsSettings['appearance']['layoutMode'] } }))}>
            <option value="rss_reader">rss_reader</option>
            <option value="grid">grid</option>
            <option value="list">list</option>
          </select>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={appearance.density} onChange={(event) => setDraft((prev) => ({ ...prev, appearance: { ...(prev.appearance || DEFAULT_SETTINGS.appearance!), density: event.target.value as NewsSettings['appearance']['density'] } }))}>
            <option value="compact">compact</option>
            <option value="comfortable">comfortable</option>
          </select>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={appearance.animationLevel} onChange={(event) => setDraft((prev) => ({ ...prev, appearance: { ...(prev.appearance || DEFAULT_SETTINGS.appearance!), animationLevel: event.target.value as NewsSettings['appearance']['animationLevel'] } }))}>
            <option value="off">off</option>
            <option value="minimal">minimal</option>
            <option value="normal">normal</option>
          </select>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={appearance.paginationMode} onChange={(event) => setDraft((prev) => ({ ...prev, appearance: { ...(prev.appearance || DEFAULT_SETTINGS.appearance!), paginationMode: event.target.value as NewsSettings['appearance']['paginationMode'] } }))}>
            <option value="infinite">infinite</option>
            <option value="pages">pages</option>
          </select>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.trending} onChange={(event) => setWidget('trending', event.target.checked)} /> trending</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.latest} onChange={(event) => setWidget('latest', event.target.checked)} /> latest</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.sourceSidebar} onChange={(event) => setWidget('sourceSidebar', event.target.checked)} /> sourceSidebar</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.tagChips} onChange={(event) => setWidget('tagChips', event.target.checked)} /> tagChips</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.previewPanel} onChange={(event) => setWidget('previewPanel', event.target.checked)} /> previewPanel</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={appearance.showWidgets.breakingTicker} onChange={(event) => setWidget('breakingTicker', event.target.checked)} /> breakingTicker</label>
        </div>
      </div>

      <div className="token-card space-y-3 p-4">
        <h3 className="font-semibold">AI Settings</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(aiSettings.enabled)} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), enabled: event.target.checked } }))} /> AI enabled</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(aiSettings.strictNoHallucination)} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), strictNoHallucination: event.target.checked } }))} /> strictNoHallucination</label>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={aiSettings.language} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), language: event.target.value as NewsSettings['aiSettings']['language'] } }))}>
            <option value="en">en</option>
            <option value="bn">bn</option>
            <option value="mixed">mixed</option>
          </select>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={aiSettings.stylePreset} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), stylePreset: event.target.value as NewsSettings['aiSettings']['stylePreset'] } }))}>
            <option value="short">short</option>
            <option value="standard">standard</option>
            <option value="detailed">detailed</option>
          </select>
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={aiSettings.duplicateSensitivity} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), duplicateSensitivity: event.target.value as NewsSettings['aiSettings']['duplicateSensitivity'] } }))}>
            <option value="strict">strict</option>
            <option value="medium">medium</option>
            <option value="loose">loose</option>
          </select>
          <input type="number" className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="maxLength" value={aiSettings.maxLength || 0} onChange={(event) => setDraft((prev) => ({ ...prev, aiSettings: { ...(prev.aiSettings || DEFAULT_SETTINGS.aiSettings!), maxLength: Number(event.target.value || 0) } }))} />
        </div>
      </div>

      <div className="token-card space-y-3 p-4">
        <h3 className="font-semibold">Workflow</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <select className="h-11 rounded-token border border-border bg-transparent px-3" value={workflow.defaultIncomingStatus} onChange={(event) => setDraft((prev) => ({ ...prev, workflow: { ...(prev.workflow || DEFAULT_SETTINGS.workflow!), defaultIncomingStatus: event.target.value as NewsSettings['workflow']['defaultIncomingStatus'] } }))}>
            <option value="pending_review">pending_review</option>
          </select>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(workflow.allowScheduling)} onChange={(event) => setDraft((prev) => ({ ...prev, workflow: { ...(prev.workflow || DEFAULT_SETTINGS.workflow!), allowScheduling: event.target.checked } }))} /> allowScheduling</label>
          <input type="number" className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="autoExpireDays" value={workflow.autoExpireDays || ''} onChange={(event) => setDraft((prev) => ({ ...prev, workflow: { ...(prev.workflow || DEFAULT_SETTINGS.workflow!), autoExpireDays: event.target.value ? Number(event.target.value) : null } }))} />
        </div>
      </div>

      <div className="token-card grid gap-3 p-4 md:grid-cols-2">
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="WhatsApp template" value={shareTemplates.whatsapp} onChange={(event) => setDraft((prev) => ({ ...prev, shareTemplates: { ...(prev.shareTemplates || DEFAULT_SETTINGS.shareTemplates!), whatsapp: event.target.value } }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Facebook template" value={shareTemplates.facebook} onChange={(event) => setDraft((prev) => ({ ...prev, shareTemplates: { ...(prev.shareTemplates || DEFAULT_SETTINGS.shareTemplates!), facebook: event.target.value } }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Messenger template" value={shareTemplates.messenger} onChange={(event) => setDraft((prev) => ({ ...prev, shareTemplates: { ...(prev.shareTemplates || DEFAULT_SETTINGS.shareTemplates!), messenger: event.target.value } }))} />
        <input className="h-11 rounded-token border border-border bg-transparent px-3" placeholder="Telegram template" value={shareTemplates.telegram} onChange={(event) => setDraft((prev) => ({ ...prev, shareTemplates: { ...(prev.shareTemplates || DEFAULT_SETTINGS.shareTemplates!), telegram: event.target.value } }))} />
      </div>

      <button className="h-11 rounded-token bg-primary px-4 text-white">{saveMutation.isPending ? 'Saving...' : 'Save News Settings'}</button>
    </form>
  );
};