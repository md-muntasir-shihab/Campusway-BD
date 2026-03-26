import { Link } from 'react-router-dom';
import { Sparkles, Download, ExternalLink } from 'lucide-react';
import DashboardSection from './DashboardSection';
import type { DashboardResourceItem } from '../../../services/api';

interface Props {
    items: DashboardResourceItem[];
}

export default function ResourcesForYou({ items }: Props) {
    if (items.length === 0) return null;

    return (
        <DashboardSection delay={0.28}>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-500" />
                        Resources For You
                    </h3>
                    <Link to="/resources" className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                        Browse all
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.slice(0, 4).map(r => (
                        <div key={r._id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                            {r.thumbnailUrl ? (
                                <img src={r.thumbnailUrl} alt={r.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center shrink-0">
                                    <Download className="w-4 h-4 text-cyan-500" />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-medium text-slate-900 dark:text-white leading-snug line-clamp-1">{r.title}</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 capitalize">{r.type} · {r.category}</p>
                            </div>
                            {r.fileUrl && (
                                <a href={r.fileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-slate-400 hover:text-indigo-500 transition">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </DashboardSection>
    );
}
