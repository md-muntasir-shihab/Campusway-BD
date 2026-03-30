import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { getAdminNews } from "../../../api/newsApi";
import { useAdminNewsMutations } from "../../../hooks/useNewsMutations";
import {
    CheckCircle2, FileEdit, XCircle, ExternalLink, Clock, Globe, Image as ImageIcon, FileText, Loader2,
} from "lucide-react";
import { SEO } from "../../../components/common/SEO";

export const PendingPage = () => {
    const { data = [], isLoading } = useQuery({
        queryKey: ["adminNewsList", "pending_review"],
        queryFn: () => getAdminNews({ status: "pending_review" }),
    });
    const mutations = useAdminNewsMutations("pending_review");

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-12 gap-3 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Loading pending review queue...</span>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <SEO title="Pending News Review" description="Review and approve pending news articles on CampusWay admin." />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Pending Review</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {data.length} article{data.length !== 1 ? 's' : ''} waiting for review
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    Auto-refreshes every 30s
                </div>
            </div>

            {data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <CheckCircle2 className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-lg font-semibold">All caught up!</p>
                    <p className="text-sm mt-1">No articles pending review right now.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data.map((item: any) => (
                        <motion.article
                            key={item._id}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                            layout
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                        >
                            {/* Image or placeholder */}
                            <div className="relative h-40 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 overflow-hidden">
                                {item.imageUrl ? (
                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
                                        <ImageIcon className="w-10 h-10 opacity-40" />
                                    </div>
                                )}
                                {/* Source badge */}
                                <div className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-black/50 backdrop-blur-sm px-2 py-1 text-[10px] font-semibold text-white">
                                    <Globe className="w-3 h-3" />
                                    {item.sourceName || 'Unknown'}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">{item.title}</h3>

                                {item.summary && (
                                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{item.summary}</p>
                                )}

                                {/* Meta info */}
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${item.fetchedFullText ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                        <FileText className="w-3 h-3" />
                                        {item.fetchedFullText ? 'Full text' : 'Summary only'}
                                    </span>
                                    {item.category && (
                                        <span className="inline-flex items-center rounded-md bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">
                                            {item.category}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={() => mutations.approveNow.mutate(item._id)}
                                        disabled={mutations.approveNow.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => mutations.draft.mutate(item._id)}
                                        disabled={mutations.draft.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition disabled:opacity-60"
                                    >
                                        <FileEdit className="w-3.5 h-3.5" />
                                        Draft
                                    </button>
                                    <button
                                        onClick={() => mutations.reject.mutate(item._id)}
                                        disabled={mutations.reject.isPending}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition disabled:opacity-60"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                        Reject
                                    </button>
                                    {item.sourceUrl && (
                                        <a
                                            href={item.sourceUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition ml-auto"
                                        >
                                            <ExternalLink className="w-3 h-3" /> Source
                                        </a>
                                    )}
                                </div>
                            </div>
                        </motion.article>
                    ))}
                </div>
            )}
        </div>
    );
};
