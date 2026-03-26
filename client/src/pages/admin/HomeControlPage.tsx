import { useEffect, useState } from 'react';
import { useHomeQuery, useSaveHomeSettings } from '../../api/queries';
import { HomeSettings } from '../../types/home';

export const HomeControlPage = () => {
  const { data } = useHomeQuery();
  const saveMutation = useSaveHomeSettings();
  const [draft, setDraft] = useState<HomeSettings | null>(null);

  useEffect(() => {
    if (data?.homeSettings) setDraft(data.homeSettings);
  }, [data]);

  if (!draft) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Home Control</h2>
      <label className="block text-sm">Hero Title <span title="Main hero heading shown on homepage">i</span>
        <input className="mt-1 h-11 w-full rounded-token border border-border bg-transparent px-3" value={draft.hero.title} onChange={(e)=>setDraft({ ...draft, hero: { ...draft.hero, title: e.target.value } })} />
      </label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.subscriptionBanner.enabled} onChange={(e)=>setDraft({ ...draft, subscriptionBanner: { ...draft.subscriptionBanner, enabled: e.target.checked } })}/> Enable Subscription Banner <span title="Toggle section visibility">i</span></label>
      <label className="block text-sm">Closing Soon Days <input type="number" className="mt-1 h-11 w-full rounded-token border border-border bg-transparent px-3" value={draft.whatsHappening.closingSoonDays} onChange={(e)=>setDraft({ ...draft, whatsHappening: { ...draft.whatsHappening, closingSoonDays: Number(e.target.value) } })}/></label>
      <label className="block text-sm">Highlighted Categories <input className="mt-1 h-11 w-full rounded-token border border-border bg-transparent px-3" value={draft.universityPreview.highlightedCategories.join(',')} onChange={(e)=>setDraft({ ...draft, universityPreview: { ...draft.universityPreview, highlightedCategories: e.target.value.split(',').map((v)=>v.trim()).filter(Boolean) } })}/></label>
      <button className="h-11 rounded-token bg-primary px-4 text-white" onClick={()=>saveMutation.mutate(draft)}>{saveMutation.isPending ? 'Saving...' : 'Save changes'}</button>
      {saveMutation.isSuccess ? <p className="text-sm text-accent">Saved successfully.</p> : null}
    </div>
  );
};

