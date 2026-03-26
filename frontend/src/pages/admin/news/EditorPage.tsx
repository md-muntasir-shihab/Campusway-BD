import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminNews } from "../../../api/newsApi";
import { useAdminNewsMutations } from "../../../hooks/useNewsMutations";

export const EditorPage = ({ id }: { id: string }) => {
  const { data = [] } = useQuery({ queryKey: ["adminNewsItem", id], queryFn: () => getAdminNews({ id }) });
  const item = data[0];
  const [form, setForm] = useState<any>(item || {});
  const mutations = useAdminNewsMutations(item?.status || "draft");

  if (!item) return <div className="p-4">Not found</div>;

  return (
    <div className="space-y-3 p-4">
      <input className="w-full rounded border p-2" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <textarea className="w-full rounded border p-2" value={form.shortSummary || ""} onChange={(e) => setForm({ ...form, shortSummary: e.target.value })} />
      <textarea className="min-h-56 w-full rounded border p-2" value={form.fullContent || ""} onChange={(e) => setForm({ ...form, fullContent: e.target.value })} />
      <div className="flex flex-wrap gap-2">
        <button className="rounded bg-zinc-700 px-3 py-1 text-white" onClick={() => mutations.edit.mutate({ id, payload: { ...form, status: "draft" } })}>Save Draft</button>
        <button className="rounded bg-emerald-700 px-3 py-1 text-white" onClick={() => mutations.approveNow.mutate(id)}>Publish now</button>
        <button className="rounded bg-amber-700 px-3 py-1 text-white" onClick={() => mutations.schedule.mutate({ id, scheduledAt: new Date(Date.now() + 3600_000).toISOString() })}>Schedule +1h</button>
        <button className="rounded bg-red-700 px-3 py-1 text-white" onClick={() => mutations.reject.mutate(id)}>Reject</button>
      </div>
    </div>
  );
};
