import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api, { adminGetAnalyticsDashboard } from '../../../services/api';
import AdminGuardShell from '../../../components/admin/AdminGuardShell';
import { motion } from 'framer-motion';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import {
    TrendingUp,
    Users,
    DollarSign,
    BookOpen,
    Activity,
    ClipboardList,
    RefreshCw,
    Loader2,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Award,
    BookMarked,
    Users2,
    TrendingDown,
    Flame,
    Megaphone,
    Eye,
    MousePointer,
    BarChart3,
} from 'lucide-react';

const DIFFICULTY_COLORS: Record<string, string> = {
    easy: 'rgba(34, 197, 94, 0.85)',
    medium: 'rgba(245, 158, 11, 0.85)',
    hard: 'rgba(239, 68, 68, 0.85)',
    expert: 'rgba(139, 92, 246, 0.85)',
};

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function fmt(n: number | undefined | null): string {
    if (n == null || isNaN(n)) return '0';
    return new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n);
}

function fmtCurrency(n: number | undefined | null): string {
    if (n == null || isNaN(n)) return '৳0';
    return `৳${new Intl.NumberFormat('en-BD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(n)}`;
}

function fmtPct(n: number | undefined | null): string {
    if (n == null || isNaN(n)) return '0%';
    return `${n.toFixed(1)}%`;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
    gradient: string;
    borderGlow: string;
}

function StatCard({ icon, label, value, sub, gradient, borderGlow }: StatCardProps) {
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md transition-shadow hover:shadow-lg ${borderGlow}`}
        >
            <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-md ${gradient}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {label}
                    </p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                        {value}
                    </p>
                    {sub && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-medium">
                            <Flame size={12} className="text-amber-500 animate-pulse" /> {sub}
                        </p>
                    )}
                </div>
            </div>
            {/* Background absolute subtle glow element */}
            <div className={`absolute -right-6 -bottom-6 h-20 w-20 rounded-full opacity-5 blur-xl ${gradient}`} />
        </motion.div>
    );
}

function DashboardSkeleton() {
    return (
        <div className="min-w-0 space-y-6 animate-pulse">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                <div className="h-7 w-64 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-2 h-4 w-48 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-800/80 dark:bg-slate-900/60">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                                <div className="h-5 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800/80 dark:bg-slate-900/60">
                        <div className="mb-4 h-4 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                        <div className="h-64 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AnalysisHubPage() {
    const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [activeTab, setActiveTab] = useState<'overview' | 'ads'>('overview');

    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['admin-analytics-dashboard', timeRange],
        queryFn: async () => {
            const res = await adminGetAnalyticsDashboard({ range: timeRange });
            return res.data;
        },
    });

    const { data: adStatsData, isLoading: adStatsLoading, refetch: refetchAdStats } = useQuery({
        queryKey: ['adminAdRevenueStats'],
        queryFn: async () => {
            const res = await api.get('/admin/ads/revenue-stats');
            return res.data?.data;
        },
        enabled: activeTab === 'ads',
    });

    if (isLoading) {
        return (
            <AdminGuardShell title="Analysis Hub" description="Centralized metrics, finances, and exams" requiredLegacyPermission="canViewReports">
                <DashboardSkeleton />
            </AdminGuardShell>
        );
    }

    if (error || !data) {
        return (
            <AdminGuardShell title="Analysis Hub" description="Centralized metrics, finances, and exams" requiredLegacyPermission="canViewReports">
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200/60 bg-red-50/50 p-12 text-center dark:border-red-950/40 dark:bg-red-950/10">
                    <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
                    <div>
                        <p className="text-base font-bold text-slate-800 dark:text-white">Failed to Load Dashboard Data</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {error instanceof Error ? error.message : 'Please check your connection and authorization permissions.'}
                        </p>
                    </div>
                    <button
                        onClick={() => refetch()}
                        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
                    >
                        <RefreshCw size={16} /> Retry Fetching
                    </button>
                </div>
            </AdminGuardShell>
        );
    }

    const {
        platform,
        today,
        dailyAttempts,
        userGrowth,
        difficultyDistribution,
        examStats,
        subjectHeatmap,
        revenue,
    } = data;

    const hasUserGrowth = Boolean(userGrowth && userGrowth.length > 0);
    const hasDailyAttempts = Boolean(dailyAttempts && dailyAttempts.length > 0);

    return (
        <AdminGuardShell title="Analysis Hub" description="Centralized intelligence and platform-wide performance telemetry" requiredLegacyPermission="canViewReports">
            <div className="space-y-6">
                {/* ── Sub Navigation Tabs ── */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md w-fit">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'overview'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        <BarChart3 size={15} /> Platform Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('ads')}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'ads'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        <Megaphone size={15} /> Ad Performance & Revenue
                    </button>
                </div>

                {activeTab === 'ads' ? (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                icon={<DollarSign size={22} />}
                                label="Total Ad Revenue"
                                value={fmtCurrency(adStatsData?.totalRevenue ?? 0)}
                                sub="Native ad earnings"
                                gradient="bg-gradient-to-tr from-emerald-500 to-teal-500"
                                borderGlow="hover:border-emerald-500/30"
                            />
                            <StatCard
                                icon={<Eye size={22} />}
                                label="Total Impressions"
                                value={fmt(adStatsData?.totalImpressions ?? 0)}
                                sub="Ad views tracked"
                                gradient="bg-gradient-to-tr from-indigo-500 to-purple-500"
                                borderGlow="hover:border-indigo-500/30"
                            />
                            <StatCard
                                icon={<MousePointer size={22} />}
                                label="Total Clicks"
                                value={fmt(adStatsData?.totalClicks ?? 0)}
                                sub="User engagements"
                                gradient="bg-gradient-to-tr from-amber-500 to-orange-500"
                                borderGlow="hover:border-amber-500/30"
                            />
                            <StatCard
                                icon={<TrendingUp size={22} />}
                                label="Average CTR"
                                value={`${(adStatsData?.overallCTR ?? 0).toFixed(2)}%`}
                                sub="Click-through rate"
                                gradient="bg-gradient-to-tr from-pink-500 to-rose-500"
                                borderGlow="hover:border-pink-500/30"
                            />
                        </div>

                        {/* Recharts Charts for Ads */}
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                            {/* Revenue & Impression Trend */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                            <TrendingUp size={16} className="text-emerald-500" />
                                            Daily Ad Revenue Trend
                                        </h3>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            Recorded earnings per day across active campaigns.
                                        </p>
                                    </div>
                                    <button onClick={() => refetchAdStats()} className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                                        <RefreshCw size={14} className={adStatsLoading ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                <div className="h-64 w-full">
                                    {adStatsData?.dailyBreakdown && adStatsData.dailyBreakdown.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={adStatsData.dailyBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="adRevGrad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.3)" />
                                                <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                                <Area type="monotone" dataKey="revenue" name="Revenue (৳)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#adRevGrad)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                                            No ad revenue data recorded yet.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Placement Performance Chart */}
                            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                        <BarChart3 size={16} className="text-indigo-500" />
                                        Placement Performance (CTR %)
                                    </h3>
                                    <p className="text-xs text-slate-400 dark:text-slate-500">
                                        Click-through rates categorized by placement position.
                                    </p>
                                </div>
                                <div className="h-64 w-full">
                                    {adStatsData?.topPlacements && adStatsData.topPlacements.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={adStatsData.topPlacements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.3)" />
                                                <XAxis dataKey="placement" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                                <Tooltip contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }} />
                                                <Bar dataKey="ctr" name="CTR (%)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                                            No placement analytics data available.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                {/* ── Header Controls ── */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            Platform Telemetry Insights
                            {isFetching && <Loader2 className="animate-spin text-indigo-500 h-4 w-4" />}
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Aggregate overview metrics retrieved from live system instances.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                            <Calendar size={14} /> Lookback:
                        </span>
                        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                            {(['daily', 'weekly', 'monthly'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setTimeRange(r)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        timeRange === r
                                            ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {r === 'daily' ? '30 Days' : r === 'weekly' ? '90 Days' : '1 Year'}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => refetch()}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-500 transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
                        </button>

                        {import.meta.env.VITE_OPENPANEL_CLIENT_ID && (
                            <a
                                href="https://openpanel.dev"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 text-xs font-bold transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                title="Open OpenPanel Web Analytics Dashboard"
                            >
                                <ArrowUpRight size={14} /> OpenPanel
                            </a>
                        )}
                    </div>
                </div>

                {/* ── Stats Metrics Grid ── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                    <StatCard
                        icon={<Users size={22} />}
                        label="Active Students"
                        value={fmt(platform.activeStudents)}
                        sub={`${today.recentSignups} signups today`}
                        gradient="bg-gradient-to-tr from-indigo-500 to-purple-500"
                        borderGlow="hover:border-indigo-500/30"
                    />
                    <StatCard
                        icon={<DollarSign size={22} />}
                        label="Total Revenue"
                        value={fmtCurrency(platform.totalRevenue)}
                        sub="Verified package sales"
                        gradient="bg-gradient-to-tr from-emerald-500 to-teal-500"
                        borderGlow="hover:border-emerald-500/30"
                    />
                    <StatCard
                        icon={<Activity size={22} />}
                        label="Total Attempts"
                        value={fmt(platform.totalAttempts)}
                        sub="Submissions generated"
                        gradient="bg-gradient-to-tr from-pink-500 to-rose-500"
                        borderGlow="hover:border-pink-500/30"
                    />
                    <StatCard
                        icon={<BookOpen size={22} />}
                        label="Active Exams"
                        value={fmt(platform.totalExams)}
                        sub={`${today.activeExamsToday} active templates`}
                        gradient="bg-gradient-to-tr from-sky-500 to-blue-500"
                        borderGlow="hover:border-sky-500/30"
                    />
                    <StatCard
                        icon={<ClipboardList size={22} />}
                        label="Total Questions"
                        value={fmt(platform.totalQuestions)}
                        sub="In active question pools"
                        gradient="bg-gradient-to-tr from-amber-500 to-orange-500"
                        borderGlow="hover:border-amber-500/30"
                    />
                    <StatCard
                        icon={<Users2 size={22} />}
                        label="Student Groups"
                        value={fmt(platform.totalGroups)}
                        sub="Organized clusters"
                        gradient="bg-gradient-to-tr from-cyan-500 to-indigo-500"
                        borderGlow="hover:border-cyan-500/30"
                    />
                </div>

                {/* ── Charts: User growth and Daily attempts ── */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* User Growth Chart */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <TrendingUp size={16} className="text-indigo-500" />
                                    Student Registration Growth
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Daily record of student account registrations.
                                </p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {hasUserGrowth ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={userGrowth} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.3)" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(15, 23, 42, 0.9)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                fontSize: '11px',
                                            }}
                                        />
                                        <Area type="monotone" dataKey="users" name="New Users" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#userGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                                    No registration data available in selected window.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Daily Attempts Chart */}
                    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <Activity size={16} className="text-emerald-500" />
                                    Exam Attempt Activity
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                    Number of exam submissions compiled in this period.
                                </p>
                            </div>
                        </div>
                        <div className="h-64 w-full">
                            {hasDailyAttempts ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyAttempts} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="attemptGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(226, 232, 240, 0.3)" />
                                        <XAxis dataKey="date" tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <YAxis tickLine={false} axisLine={false} style={{ fontSize: 10, fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'rgba(15, 23, 42, 0.9)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: '#fff',
                                                fontSize: '11px',
                                            }}
                                        />
                                        <Area type="monotone" dataKey="attempts" name="Submissions" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#attemptGrad)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-slate-400 text-xs">
                                    No submission attempts recorded in this period.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Table & side statistics grid ── */}
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    {/* Exam Performance Statistics */}
                    <div className="xl:col-span-2 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Award size={16} className="text-purple-500" />
                                Exam Diagnostics Report
                            </h3>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                                Detailed score ranges and submission metrics for the top active exams.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800/50 text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="py-3 pr-4">Exam Name</th>
                                        <th className="py-3 px-4 text-center">Attempts</th>
                                        <th className="py-3 px-4 text-center">Avg. Score</th>
                                        <th className="py-3 px-4 text-center">Highest</th>
                                        <th className="py-3 px-4 text-center">Lowest</th>
                                        <th className="py-3 pl-4 text-right">Completion Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {examStats && examStats.length > 0 ? (
                                        examStats.map((item, idx) => (
                                            <tr key={idx} className="border-b border-slate-100/60 dark:border-slate-800/30 text-slate-600 dark:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                                <td className="py-3.5 pr-4 font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
                                                    {item.title}
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-bold text-slate-700 dark:text-slate-400">
                                                    {item.participants}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    <span className="px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                                        {fmtPct(item.avgScore)}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-medium text-emerald-600 dark:text-emerald-400">
                                                    {fmtPct(item.highestScore)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center font-medium text-rose-500 dark:text-rose-400">
                                                    {fmtPct(item.lowestScore)}
                                                </td>
                                                <td className="py-3.5 pl-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 font-bold text-slate-800 dark:text-slate-200">
                                                        <span>{fmtPct(item.completionRate)}</span>
                                                        <div className="w-12 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden hidden sm:block">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                                                                style={{ width: `${Math.min(100, item.completionRate)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                No exam data compiled yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Breakdown, Difficulty distribution, and subject breakdown */}
                    <div className="space-y-6">
                        {/* Difficulty Distribution Chart */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-3">
                                <BookMarked size={16} className="text-amber-500" />
                                Question Pool Difficulty
                            </h3>
                            <div className="flex items-center justify-between gap-4">
                                <div className="h-32 w-32 shrink-0">
                                    {difficultyDistribution && difficultyDistribution.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={difficultyDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={36}
                                                    outerRadius={50}
                                                    paddingAngle={3}
                                                    dataKey="count"
                                                >
                                                    {difficultyDistribution.map((entry, index) => (
                                                        <Cell
                                                            key={`cell-${index}`}
                                                            fill={DIFFICULTY_COLORS[entry.level.toLowerCase()] || PIE_COLORS[index % PIE_COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-slate-300 text-[10px]">
                                            Empty
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-2 text-xs">
                                    {difficultyDistribution && difficultyDistribution.length > 0 ? (
                                        difficultyDistribution.map((entry, index) => {
                                            const pct = entry.count / (difficultyDistribution.reduce((acc, c) => acc + c.count, 0) || 1);
                                            return (
                                                <div key={index} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                                    <span className="flex items-center gap-1.5 font-medium capitalize">
                                                        <span
                                                            className="h-2.5 w-2.5 rounded-full"
                                                            style={{
                                                                backgroundColor: DIFFICULTY_COLORS[entry.level.toLowerCase()] || PIE_COLORS[index % PIE_COLORS.length]
                                                            }}
                                                        />
                                                        {entry.level}
                                                    </span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {entry.count} ({fmtPct(pct * 100)})
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-slate-400">No question data found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Subject Heatmap / Breakdown */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 mb-3">
                                <Activity size={16} className="text-indigo-500" />
                                Subject Submissions Breakdown
                            </h3>
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                                {subjectHeatmap && subjectHeatmap.length > 0 ? (
                                    subjectHeatmap.map((item, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                <span className="truncate max-w-[150px]">{item.subject}</span>
                                                <span className="font-bold">{item.attempts} attempts ({fmtPct(item.avgScore)} avg)</span>
                                            </div>
                                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 opacity-80"
                                                    style={{ width: `${Math.min(100, item.avgScore)}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-xs py-4 text-center">No subject details compiled yet.</p>
                                )}
                            </div>
                        </div>

                        {/* Financial Ledger Snapshot */}
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/60 backdrop-blur-md">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <DollarSign size={16} className="text-emerald-500" />
                                    Ledger Transactions
                                </h3>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    Live Log
                                </span>
                            </div>

                            <div className="space-y-2.5 max-h-56 overflow-y-auto text-xs pr-1">
                                {revenue?.recentTransactions && revenue.recentTransactions.length > 0 ? (
                                    revenue.recentTransactions.map((tx, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between border-b border-slate-100/80 dark:border-slate-800/40 pb-2 hover:bg-slate-50/20 transition-colors"
                                        >
                                            <div className="space-y-0.5">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    Package Purchase
                                                </span>
                                                <span className="block text-[10px] text-slate-400">
                                                    {tx.date}
                                                </span>
                                            </div>
                                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                                +{fmtCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-center py-4">No recent purchases recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
        </AdminGuardShell>
    );
}
