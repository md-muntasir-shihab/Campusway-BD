import { useEffect, useState } from 'react';
import {
    Activity,
    Award,
    BarChart3,
    Brain,
    Clock,
    Lightbulb,
    Loader2,
    Target,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    Legend,
} from 'recharts';
import api from '../../../services/api';
import type { AccuracyBreakdown, RecentScoreEntry } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Local Types
// ═══════════════════════════════════════════════════════════════════════════

interface AnalyticsData {
    totalExamsTaken: number;
    averageScore: number;
    averagePercentage: number;
    topicAccuracy: Record<string, AccuracyBreakdown>;
    chapterAccuracy: Record<string, AccuracyBreakdown>;
    subjectAccuracy: Record<string, AccuracyBreakdown>;
    recentScores: RecentScoreEntry[];
    avgTimePerQuestion: number;
    currentStreak: number;
    longestStreak: number;
    xpTotal: number;
    leagueTier: string;
    weakestTopics: string[];
    aiSuggestions?: string[];
    peerComparison?: {
        studentAvg: number;
        groupAvg: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function getHeatmapColor(percentage: number): string {
    if (percentage >= 80) return 'bg-emerald-500 dark:bg-emerald-600';
    if (percentage >= 60) return 'bg-emerald-300 dark:bg-emerald-700';
    if (percentage >= 40) return 'bg-amber-400 dark:bg-amber-600';
    if (percentage >= 20) return 'bg-orange-400 dark:bg-orange-600';
    return 'bg-red-400 dark:bg-red-600';
}

function getHeatmapLabel(percentage: number): string {
    if (percentage >= 80) return 'Strong';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Average';
    if (percentage >= 20) return 'Weak';
    return 'Very Weak';
}

function formatSeconds(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function MetricCard({
    icon,
    label,
    value,
    subtext,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string | number;
    subtext?: string;
    color: string;
}) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="flex items-center gap-3 mb-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
                    {icon}
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            {subtext && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtext}</p>
            )}
        </div>
    );
}

function ScoreLineChart({ scores }: { scores: RecentScoreEntry[] }) {
    const chartData = scores.map((s, i) => ({
        name: `#${i + 1}`,
        percentage: s.percentage,
        score: s.score,
    }));

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Score Trend (Last {scores.length} Exams)
            </h3>
            {scores.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    No exam data yet
                </p>
            ) : (
                <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#94a3b8" />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="percentage"
                            stroke="#6366f1"
                            strokeWidth={2}
                            dot={{ fill: '#6366f1', r: 4 }}
                            activeDot={{ r: 6 }}
                            name="Percentage"
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

function SubjectRadarChart({ subjectAccuracy }: { subjectAccuracy: Record<string, AccuracyBreakdown> }) {
    const entries = Object.entries(subjectAccuracy);
    const chartData = entries.map(([name, acc]) => ({
        subject: name.length > 12 ? name.slice(0, 12) + '…' : name,
        accuracy: acc.percentage,
        fullMark: 100,
    }));

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                Subject-wise Performance
            </h3>
            {entries.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    No subject data yet
                </p>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={chartData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                        <Radar
                            name="Accuracy %"
                            dataKey="accuracy"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.3}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </RadarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

function ChapterHeatmap({ chapterAccuracy }: { chapterAccuracy: Record<string, AccuracyBreakdown> }) {
    const items = Object.entries(chapterAccuracy).map(([name, acc]) => ({
        name,
        percentage: acc.percentage,
    }));

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-500" />
                Chapter Strength / Weakness
            </h3>
            {items.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">
                    No chapter data yet
                </p>
            ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {items.map((item) => (
                        <div
                            key={item.name}
                            className={`rounded-lg p-3 text-center ${getHeatmapColor(item.percentage)}`}
                            title={`${item.name}: ${item.percentage.toFixed(0)}% — ${getHeatmapLabel(item.percentage)}`}
                        >
                            <p className="text-xs font-medium text-white truncate">{item.name}</p>
                            <p className="text-lg font-bold text-white">{item.percentage.toFixed(0)}%</p>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Strong (80%+)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-300" /> Good (60-79%)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Average (40-59%)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-orange-400" /> Weak (20-39%)</span>
                <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400" /> Very Weak (&lt;20%)</span>
            </div>
        </div>
    );
}

function PeerComparisonCard({ studentAvg, groupAvg }: { studentAvg: number; groupAvg: number }) {
    const diff = studentAvg - groupAvg;
    const isAbove = diff >= 0;

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Peer Comparison
            </h3>
            <div className="flex items-center gap-6">
                <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Your Average</p>
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {studentAvg.toFixed(1)}%
                    </p>
                </div>
                <div className="text-center">
                    <p className={`text-sm font-bold ${isAbove ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isAbove ? '+' : ''}{diff.toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">vs group</p>
                </div>
                <div className="flex-1 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Group Average</p>
                    <p className="text-2xl font-bold text-slate-600 dark:text-slate-300">
                        {groupAvg.toFixed(1)}%
                    </p>
                </div>
            </div>
        </div>
    );
}

function AISuggestions({ suggestions }: { suggestions: string[] }) {
    if (suggestions.length === 0) return null;

    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                AI Improvement Suggestions
            </h3>
            <ul className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <Brain className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{suggestion}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchAnalytics() {
            try {
                setIsLoading(true);
                const response = await api.get<{ success: boolean; data: AnalyticsData }>(
                    '/v1/student/analytics',
                );
                if (!cancelled) {
                    setData(response.data.data);
                    setError(null);
                }
            } catch {
                if (!cancelled) {
                    setError('Failed to load analytics data');
                }
            } finally {
                if (!cancelled) {
                    setIsLoading(false);
                }
            }
        }

        void fetchAnalytics();
        return () => { cancelled = true; };
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <Activity className="mx-auto h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        {error ?? 'No analytics data available'}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            <div className="mx-auto max-w-5xl px-4 py-6">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Activity className="h-6 w-6 text-indigo-500" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Track your performance and identify areas for improvement
                    </p>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <MetricCard
                        icon={<Target className="h-4 w-4 text-white" />}
                        label="Accuracy Rate"
                        value={`${data.averagePercentage.toFixed(1)}%`}
                        subtext={`${data.totalExamsTaken} exams taken`}
                        color="bg-indigo-500"
                    />
                    <MetricCard
                        icon={<Clock className="h-4 w-4 text-white" />}
                        label="Avg Time / Question"
                        value={formatSeconds(data.avgTimePerQuestion)}
                        color="bg-purple-500"
                    />
                    <MetricCard
                        icon={<TrendingUp className="h-4 w-4 text-white" />}
                        label="Current Streak"
                        value={`${data.currentStreak} days`}
                        subtext={`Best: ${data.longestStreak} days`}
                        color="bg-emerald-500"
                    />
                    <MetricCard
                        icon={<Award className="h-4 w-4 text-white" />}
                        label="Total XP"
                        value={data.xpTotal.toLocaleString()}
                        subtext={`League: ${data.leagueTier}`}
                        color="bg-amber-500"
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                    <ScoreLineChart scores={data.recentScores} />
                    <SubjectRadarChart subjectAccuracy={data.subjectAccuracy} />
                </div>

                {/* Heatmap */}
                <div className="mb-6">
                    <ChapterHeatmap chapterAccuracy={data.chapterAccuracy} />
                </div>

                {/* Peer Comparison + AI Suggestions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {data.peerComparison && (
                        <PeerComparisonCard
                            studentAvg={data.peerComparison.studentAvg}
                            groupAvg={data.peerComparison.groupAvg}
                        />
                    )}
                    <AISuggestions suggestions={data.aiSuggestions ?? data.weakestTopics.map(
                        (t) => `Focus on improving "${t}" — it's one of your weakest areas.`
                    )} />
                </div>
            </div>
        </div>
    );
}
