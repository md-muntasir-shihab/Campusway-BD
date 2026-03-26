import { useQuery } from "@tanstack/react-query";
import { getAdminNews } from "../../../api/newsApi";
import { useAdminNewsMutations } from "../../../hooks/useNewsMutations";

export const DuplicatePage = () => {
  const { data = [] } = useQuery({
    queryKey: ["adminNewsList", "duplicate_review"],
    queryFn: () => getAdminNews({ status: "duplicate_review" })
  });
  const mutations = useAdminNewsMutations("duplicate_review");

  return (
    <div className="grid gap-3 p-4">
      {data.map((item: any) => (
        <div key={item._id} className="rounded-xl border p-4">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="text-xs">Duplicate of: {item.duplicateOfNewsId || "unknown"}</p>
          <div className="mt-2 flex gap-2">
            <button className="rounded bg-emerald-600 px-2 py-1 text-white" onClick={() => mutations.approveNow.mutate(item._id)}>Publish anyway</button>
            <button className="rounded bg-zinc-600 px-2 py-1 text-white" onClick={() => mutations.draft.mutate(item._id)}>Keep as draft</button>
            <button className="rounded bg-red-600 px-2 py-1 text-white" onClick={() => mutations.reject.mutate(item._id)}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
};
