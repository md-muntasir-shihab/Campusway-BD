import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getAdminNews } from "../../../api/newsApi";
import { useAdminNewsMutations } from "../../../hooks/useNewsMutations";

export const PendingPage = () => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["adminNewsList", "pending_review"],
    queryFn: () => getAdminNews({ status: "pending_review" })
  });
  const mutations = useAdminNewsMutations("pending_review");

  if (isLoading) return <div className="animate-pulse p-4">Loading pending queue...</div>;

  return (
    <div className="space-y-3 p-4">
      {data.map((item: any) => (
        <motion.article key={item._id} className="rounded-xl border bg-white/70 p-4 dark:bg-zinc-900/50" layout>
          <h3 className="line-clamp-2 text-base font-semibold">{item.title}</h3>
          <p className="mt-1 text-xs opacity-70">{item.sourceName}</p>
          <span className="mt-2 inline-block rounded-full bg-sky-500/10 px-2 py-1 text-xs">
            hasFullText: {item.fetchedFullText ? "yes" : "no"}
          </span>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => mutations.approveNow.mutate(item._id)} className="rounded bg-emerald-600 px-3 py-1 text-white">Approve & Publish</button>
            <button onClick={() => mutations.draft.mutate(item._id)} className="rounded bg-zinc-500 px-3 py-1 text-white">Save Draft</button>
            <button onClick={() => mutations.reject.mutate(item._id)} className="rounded bg-red-600 px-3 py-1 text-white">Reject</button>
          </div>
        </motion.article>
      ))}
    </div>
  );
};
