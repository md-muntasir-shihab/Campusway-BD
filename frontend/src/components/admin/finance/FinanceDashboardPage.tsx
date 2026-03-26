import { useMemo, useState } from 'react';
import { useFcDashboard } from '../../../hooks/useFinanceCenterQueries';
import { fcApi } from '../../../api/adminFinanceApi';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
    BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
    TrendingUp, TrendingDown, Wallet, AlertTriangle, Receipt, RefreshCw,
    DollarSign, CreditCard, FileText, Download, ArrowUpRight, ArrowDownRight,
    BookOpen, GraduationCap, Briefcase, Activity,
} from 'lucide-react';
import type { FcBudgetStatus, FcActivityItem } from '../../../types/finance';
import AdminGuideButton, { type AdminGuideButtonProps } from '../AdminGuideButton';

type InlineGuide = Omit<AdminGuideButtonProps, 'variant' | 'tone'>;

const DASHBOARD_GUIDES: Record<string, InlineGuide> = {
    month: {
        title: 'Reporting Month',
        content: 'Changes the dashboard period used for finance summaries, charts, and budget health.',
        actions: [
            { label: 'Switch reporting window', description: 'Recalculate widgets and charts for the selected month before you export or investigate an issue.' },
        ],
        affected: 'Finance staff reading dashboard totals, trends, and budget status.',
    },
    report: {
        title: 'P&L Report',
        content: 'Downloads the profit and loss report for the currently selected month.',
        actions: [
            { label: 'Export report', description: 'Generate a finance snapshot for reconciliation, audit, or offline review.' },
        ],
        affected: 'Finance reporting, audit handoff, and reconciliation workflows.',
        bestPractice: 'Confirm the month selector before exporting so the report matches the intended reporting window.',
    },
};

function fmt(n: number | undefined | null) {
    if (n == null || isNaN(n)) return '0';
    return new Intl.NumberFormat('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function monthKey(offset = 0) {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const DONUT_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

export default function FinanceDashboardPage() {
    const [month, setMonth] = useState(monthKey());
    const { data, isLoading } = useFcDashboard(month);

    const months = useMemo(() => Array.from({ length: 12 }, (_, i) => monthKey(-i)), []);

    if (isLoading) return <div className="flex justify-center py-16"><span className="animate-pulse text-sm text-slate-500">Loading dashboard...</span></div>;
    if (!data) return <div className="py-8 text-center text-sm text-slate-500">No data available.</div>;

    const {
        incomeTotal = 0, expenseTotal = 0, netProfit = 0,
        receivablesTotal = 0, receivablesCount = 0,
        payablesTotal = 0, payablesCount = 0,
        refundTotal = 0,
        subscriptionRevenue = 0, examRevenue = 0, manualServiceRevenue = 0,
        activeBudgetUsagePercent = 0,
        monthOverMonthChange,
        topIncomeSources = [], topExpenseCategories = [],
        dailyCashflowTrend = [], budgetStatus = [],
        recentActivity = [],
        incomeBySource = [], expenseByCategory = [],
    } = data;

    const exceededBudgets = budgetStatus?.filter(b => b.exceeded) ?? [];
    const warningBudgets = budgetStatus?.filter(b => !b.exceeded && b.percentUsed >= b.alertThresholdPercent) ?? [];

    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Finance Dashboard</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Unified money control center</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <select
                            value={month}
                            onChange={e => setMonth(e.target.value)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                        >
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <AdminGuideButton {...DASHBOARD_GUIDES.month} tone="indigo" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fcApi.downloadPLReport(month)}
                            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                            <Download size={13} /> P&L Report
                        </button>
                        <AdminGuideButton {...DASHBOARD_GUIDES.report} tone="indigo" />
                    </div>
                </div>
            </div>

            {/* ── Primary KPI Cards (6) ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <KpiCard icon={<TrendingUp size={18} />} label="Total Income" value={`৳${fmt(incomeTotal)}`} color="green" change={monthOverMonthChange?.incomeChange} />
                <KpiCard icon={<TrendingDown size={18} />} label="Total Expense" value={`৳${fmt(expenseTotal)}`} color="red" change={monthOverMonthChange?.expenseChange} />
                <KpiCard icon={<Wallet size={18} />} label="Net Profit/Loss" value={`৳${fmt(netProfit)}`} color={netProfit >= 0 ? 'green' : 'red'} />
                <KpiCard icon={<FileText size={18} />} label="Receivables" value={`৳${fmt(receivablesTotal)}`} sub={`${receivablesCount} pending`} color="amber" />
                <KpiCard icon={<CreditCard size={18} />} label="Payables" value={`৳${fmt(payablesTotal)}`} sub={`${payablesCount} pending`} color="orange" />
                <KpiCard icon={<RefreshCw size={18} />} label="Refunds" value={`৳${fmt(refundTotal)}`} color="purple" />
            </div>

            {/* ── Secondary KPI Cards (4) ── */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SecondaryKpi icon={<BookOpen size={16} />} label="Subscription Revenue" value={`৳${fmt(subscriptionRevenue)}`} />
                <SecondaryKpi icon={<GraduationCap size={16} />} label="Exam Revenue" value={`৳${fmt(examRevenue)}`} />
                <SecondaryKpi icon={<Briefcase size={16} />} label="Manual/Service Revenue" value={`৳${fmt(manualServiceRevenue)}`} />
                <SecondaryKpi icon={<Activity size={16} />} label="Budget Usage" value={`${activeBudgetUsagePercent ? Math.round(activeBudgetUsagePercent) : 0}%`} />
            </div>

            {/* ── Income vs Expense Trend ── */}
            {dailyCashflowTrend.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Income vs Expense Trend</h3>
                    <ResponsiveContainer width="100%" height={240}>
                        <AreaChart data={dailyCashflowTrend}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip formatter={((v: number) => `৳${fmt(v)}`) as any} />
                            <Area type="monotone" dataKey="income" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} strokeWidth={2} name="Income" />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.12} strokeWidth={2} name="Expense" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Dual Donuts: Income by Source + Expense by Category ── */}
            <div className="grid gap-4 md:grid-cols-2">
                <DonutWidget title="Income by Source" data={incomeBySource.length > 0 ? incomeBySource.map(d => ({ name: d.source, value: d.total })) : topIncomeSources.map(d => ({ name: d.category, value: d.total }))} />
                <DonutWidget title="Expense by Category" data={expenseByCategory.length > 0 ? expenseByCategory.map(d => ({ name: d.category, value: d.total })) : topExpenseCategories.map(d => ({ name: d.category, value: d.total }))} />
            </div>

            {/* ── Top Income / Top Expense bar charts ── */}
            <div className="grid gap-4 md:grid-cols-2">
                <MiniBar title="Top Income Sources" data={topIncomeSources} color="#22c55e" />
                <MiniBar title="Top Expense Categories" data={topExpenseCategories} color="#ef4444" />
            </div>

            {/* ── Budget Alerts & Warnings ── */}
            {(exceededBudgets.length > 0 || warningBudgets.length > 0) && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <AlertTriangle size={15} className="text-amber-500" /> Budget Alerts
                    </h3>
                    <div className="space-y-2">
                        {exceededBudgets.map(b => <BudgetRow key={b._id} budget={b} variant="exceeded" />)}
                        {warningBudgets.map(b => <BudgetRow key={b._id} budget={b} variant="warning" />)}
                    </div>
                </div>
            )}

            {/* ── Payables Banner ── */}
            {payablesTotal > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        <DollarSign size={14} className="mr-1 inline" />
                        Outstanding Payables: ৳{fmt(payablesTotal)} ({payablesCount} pending)
                    </p>
                </div>
            )}

            {/* ── Recent Activity Feed ── */}
            {recentActivity.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Recent Activity</h3>
                    <div className="space-y-2">
                        {recentActivity.slice(0, 10).map((a) => (
                            <ActivityRow key={a._id} item={a} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── KPI Card (Primary) ─────────────────────────────────── */
function KpiCard({ icon, label, value, color, sub, change }: {
    icon: React.ReactNode; label: string; value: string; color: string; sub?: string; change?: number;
}) {
    const colors: Record<string, { bg: string; text: string; icon: string }> = {
        green: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-400', icon: 'text-green-500' },
        red: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-400', icon: 'text-red-500' },
        amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
        orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-400', icon: 'text-orange-500' },
        purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-400', icon: 'text-purple-500' },
        blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-500' },
    };
    const c = colors[color] ?? colors.blue;
    return (
        <div className={`rounded-xl border border-slate-200 ${c.bg} p-3 dark:border-slate-700`}>
            <div className={`mb-1 ${c.icon}`}>{icon}</div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`text-lg font-bold ${c.text}`}>{value}</p>
            {sub && <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>}
            {change != null && change !== 0 && (
                <div className={`mt-1 flex items-center gap-0.5 text-[10px] font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(change).toFixed(1)}% vs prev month
                </div>
            )}
        </div>
    );
}

/* ── Secondary KPI ──────────────────────────────────────── */
function SecondaryKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="text-indigo-500">{icon}</div>
            <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
}

/* ── Donut Widget ───────────────────────────────────────── */
function DonutWidget({ title, data }: { title: string; data: { name: string; value: number }[] }) {
    if (!data.length) return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
            <p className="py-6 text-center text-xs text-slate-500">No data</p>
        </div>
    );
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                    >
                        {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={((v: number) => `৳${fmt(v)}`) as any} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Mini Bar Chart ─────────────────────────────────────── */
function MiniBar({ title, data, color }: { title: string; data: { category: string; total: number }[]; color: string }) {
    if (!data.length) return null;
    return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
            <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={((v: number) => `৳${fmt(v)}`) as any} />
                    <Bar dataKey="total" fill={color} radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Budget Alert Row ───────────────────────────────────── */
function BudgetRow({ budget, variant }: { budget: FcBudgetStatus; variant: 'exceeded' | 'warning' }) {
    const pct = Math.min(budget.percentUsed, 100);
    const isExceeded = variant === 'exceeded';
    return (
        <div className={`rounded-lg border px-4 py-2 ${isExceeded ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950' : 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950'}`}>
            <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${isExceeded ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                    {budget.categoryLabel}
                </span>
                <span className={`text-xs ${isExceeded ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    ৳{fmt(budget.spent)} / ৳{fmt(budget.amountLimit)} ({budget.percentUsed.toFixed(0)}%)
                </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                    className={`h-full rounded-full transition-all ${isExceeded ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/* ── Activity Feed Row ──────────────────────────────────── */
function ActivityRow({ item }: { item: FcActivityItem }) {
    const typeIcons: Record<string, React.ReactNode> = {
        income: <TrendingUp size={12} className="text-green-500" />,
        expense: <TrendingDown size={12} className="text-red-500" />,
        invoice: <Receipt size={12} className="text-blue-500" />,
        refund: <RefreshCw size={12} className="text-purple-500" />,
        budget_alert: <AlertTriangle size={12} className="text-amber-500" />,
    };
    return (
        <div className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className="mt-0.5">{typeIcons[item.type] ?? <Activity size={12} className="text-slate-400" />}</div>
            <div className="flex-1">
                <p className="text-xs text-slate-700 dark:text-slate-300">{item.description}</p>
                <p className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
            </div>
            {item.amount != null && (
                <span className={`text-xs font-medium ${item.type === 'expense' || item.type === 'refund' ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{fmt(item.amount)}
                </span>
            )}
        </div>
    );
}
