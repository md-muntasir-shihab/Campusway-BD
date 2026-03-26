import toast from 'react-hot-toast';
import { RefreshCw, BarChart3, Target, AlertTriangle, SkipForward, Eye } from 'lucide-react';
import { useQBAnalytics, useRefreshAllAnalytics } from '../../../hooks/useQuestionBankV2Queries';
import type { AnalyticsSummary } from '../../../types/questionBank';

export default function QuestionBankAnalyticsPanel() {
    const { data, isLoading } = useQBAnalytics();
    const refreshMut = useRefreshAllAnalytics();

    const analytics: AnalyticsSummary | undefined = data;

    function handleRefresh() {
        refreshMut.mutate(undefined, { onSuccess: () => toast.success('Analytics refreshed') });
    }

    if (isLoading) return <p className="text-slate-500 dark:text-slate-400 text-sm p-4">Loading analytics…</p>;
    if (!analytics) return <p className="text-slate-500 text-sm p-4">No analytics data available.</p>;

    return (
        <div className="space-y-8 max-w-6xl">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-400" /> Question Bank Analytics</h2>
                <button onClick={handleRefresh} disabled={refreshMut.isPending} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-60 dark:bg-slate-800 dark:border-slate-700/60 dark:text-slate-300 dark:hover:text-white transition">
                    <RefreshCw className={`w-4 h-4 ${refreshMut.isPending ? 'animate-spin' : ''}`} /> Refresh All
                </button>
            </div>

            {/* Distribution cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DistributionCard title="By Subject" items={analytics.summary?.bySubject ?? []} />
                <DistributionCard title="By Category" items={analytics.summary?.byCategory ?? []} />
                <DistributionCard title="By Difficulty" items={analytics.summary?.byDifficulty ?? []} />
            </div>

            {/* Spotlight lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SpotlightList title="Most Used" icon={<Target className="w-4 h-4 text-indigo-400" />} items={analytics.mostUsed as unknown as Record<string, unknown>[]} valueKey="totalAppearances" valueLabel="uses" />
                <SpotlightList title="Low Accuracy" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} items={analytics.lowAccuracy as unknown as Record<string, unknown>[]} valueKey="accuracyPercent" valueLabel="%" />
                <SpotlightList title="High Skip Rate" icon={<SkipForward className="w-4 h-4 text-rose-400" />} items={analytics.highSkip as unknown as Record<string, unknown>[]} valueKey="totalSkipped" valueLabel="skips" />
                <SpotlightList title="Never Used" icon={<Eye className="w-4 h-4 text-slate-400" />} items={analytics.neverUsed as unknown as Record<string, unknown>[]} valueKey="_id" valueLabel="" showAsPlain />
            </div>

            {/* Topic performance heatmap */}
            {analytics.topicPerformance && analytics.topicPerformance.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Topic Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="text-sm w-full">
                            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                                <tr>
                                    <th className="p-2 text-left font-medium">Topic</th>
                                    <th className="p-2 text-right font-medium">Questions</th>
                                    <th className="p-2 text-right font-medium">Avg Accuracy</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {analytics.topicPerformance.map((tp, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                                        <td className="p-2 text-slate-900 dark:text-white">{typeof tp._id === 'object' ? `${tp._id.subject} — ${tp._id.topic}` : (tp._id || '—')}</td>
                                        <td className="p-2 text-right text-slate-600 dark:text-slate-300">{tp.totalQuestions}</td>
                                        <td className="p-2 text-right">
                                            <span className={`font-medium ${tp.avgAccuracy >= 60 ? 'text-emerald-400' : tp.avgAccuracy >= 30 ? 'text-amber-400' : 'text-rose-400'}`}>
                                                {tp.avgAccuracy.toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---- Distribution Card ---- */
function DistributionCard({ title, items }: { title: string; items: { _id: string; count: number }[] }) {
    const total = items.reduce((s, i) => s + i.count, 0) || 1;
    return (
        <div className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">{title}</h4>
            <div className="space-y-2">
                {items.map((item) => {
                    const pct = ((item.count / total) * 100).toFixed(0);
                    return (
                        <div key={item._id}>
                            <div className="flex items-center justify-between text-xs mb-0.5">
                                <span className="text-slate-600 dark:text-slate-300 truncate">{item._id || '(none)'}</span>
                                <span className="text-slate-400 dark:text-slate-500">{item.count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && <p className="text-slate-500 text-xs">No data</p>}
            </div>
        </div>
    );
}

/* ---- Spotlight List ---- */
function SpotlightList({ title, icon, items, valueKey, valueLabel, showAsPlain }: {
    title: string; icon: React.ReactNode; items: Record<string, unknown>[]; valueKey: string; valueLabel: string; showAsPlain?: boolean;
}) {
    return (
        <div className="p-4 rounded-2xl border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-900/40">
            <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">{icon} {title}</h4>
            {items.length === 0 && <p className="text-slate-500 text-xs">None</p>}
            <div className="space-y-1.5">
                {items.slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-slate-900 dark:text-white truncate max-w-[75%]">{String(item.question_en || item.question_bn || item.bankQuestionId || item._id || '—')}</span>
                        {!showAsPlain && <span className="text-slate-500 dark:text-slate-400">{String(item[valueKey] ?? '')} {valueLabel}</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
