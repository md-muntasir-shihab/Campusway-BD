import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, FileText, Search } from 'lucide-react';
import { getStudentMeResources } from '../../services/api';
import { normalizeExternalUrl } from '../../utils/url';

export default function StudentResources() {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('all');

    const resourcesQuery = useQuery({
        queryKey: ['student-hub', 'resources', category, query],
        queryFn: async () => (await getStudentMeResources({
            category: category !== 'all' ? category : undefined,
            q: query.trim() || undefined,
        })).data,
    });

    const categories = useMemo(
        () => ['all', ...(resourcesQuery.data?.categories || [])],
        [resourcesQuery.data?.categories]
    );

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <h1 className="text-2xl font-bold">Resources</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDFs, links, and learning materials curated for students.</p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search resources"
                            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-9 py-2 text-sm outline-none focus:border-indigo-500"
                        />
                    </div>
                    <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                        {categories.map((item) => (
                            <option key={item} value={item}>{item}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {resourcesQuery.isLoading ? (
                    Array.from({ length: 6 }).map((_, idx) => (
                        <div key={idx} className="h-44 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/60 animate-pulse" />
                    ))
                ) : resourcesQuery.isError ? (
                    <div className="rounded-2xl border border-rose-300/40 bg-rose-50/70 dark:bg-rose-500/10 p-4 text-sm text-rose-700 dark:text-rose-200">
                        Failed to load resources.
                    </div>
                ) : (resourcesQuery.data?.items || []).length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500">
                        No resources found.
                    </div>
                ) : (
                    (resourcesQuery.data?.items || []).map((item: any) => {
                        const href = normalizeExternalUrl(item.externalUrl || item.fileUrl || '');
                        return (
                            <article key={String(item._id)} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col">
                                <p className="text-xs uppercase tracking-wide text-slate-500">{String(item.category || 'General')}</p>
                                <h2 className="font-semibold mt-1">{String(item.title || '')}</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{String(item.description || '')}</p>
                                <div className="mt-auto pt-4">
                                    {href ? (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700"
                                        >
                                            {String(item.type || '').toLowerCase() === 'pdf' ? <FileText className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                            Open
                                        </a>
                                    ) : (
                                        <button disabled className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500">
                                            Unavailable
                                        </button>
                                    )}
                                </div>
                            </article>
                        );
                    })
                )}
            </div>
        </div>
    );
}
