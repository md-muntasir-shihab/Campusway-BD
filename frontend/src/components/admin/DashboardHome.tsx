import { useMemo, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    BookOpen,
    Clock3,
    CreditCard,
    FolderOpen,
    GraduationCap,
    HelpCircle,
    Home,
    KeyRound,
    Megaphone,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    TriangleAlert,
    UserSquare2,
    Users,
} from 'lucide-react';
import { adminGetDashboardSummary, type AdminDashboardSummary } from '../../services/api';
import { useModuleAccess } from '../../hooks/useModuleAccess';
import AdminGuideButton from './AdminGuideButton';

interface DashboardHomeProps {
    universities: any[];
    exams: any[];
    users: any[];
    onTabChange: (tab: string) => void;
}

type SummaryCard = {
    key: string;
    title: string;
    description: string;
    value: string;
    icon: ComponentType<{ className?: string }>;
    actionLabel: string;
    actionTab: string;
    module: string;
};

function valueText(value: number): string {
    if (!Number.isFinite(value)) return '0';
    return new Intl.NumberFormat('en-US').format(value);
}

export default function DashboardHome({ universities, exams, users, onTabChange }: DashboardHomeProps) {
    const { hasAnyAccess } = useModuleAccess();
    const summaryQuery = useQuery({
        queryKey: ['admin-dashboard-summary'],
        queryFn: async () => (await adminGetDashboardSummary()).data as AdminDashboardSummary,
        refetchInterval: 60_000,
        refetchOnWindowFocus: false,
    });

    const fallbackSummary: AdminDashboardSummary = {
        universities: {
            total: universities.length,
            active: universities.length,
            featured: universities.filter((item) => Boolean((item as { featured?: boolean }).featured)).length,
        },
        home: {
            highlightedCategories: 0,
            featuredUniversities: 0,
            enabledSections: 0,
        },
        news: {
            pendingReview: 0,
            publishedToday: 0,
        },
        exams: {
            upcoming: exams.filter((exam) => String((exam as { status?: string }).status || '').toLowerCase() === 'scheduled').length,
            live: exams.filter((exam) => String((exam as { status?: string }).status || '').toLowerCase() === 'live').length,
        },
        questionBank: {
            totalQuestions: 0,
        },
        students: {
            totalActive: users.filter((user) => String((user as { role?: string }).role || '') === 'student').length,
            pendingPayment: 0,
            suspended: 0,
        },
        payments: {
            pendingApprovals: 0,
            paidToday: 0,
        },
        financeCenter: {
            pendingApprovals: 0,
            paidToday: 0,
        },
        subscriptions: {
            activeSubscribers: 0,
            renewalDue: 0,
            activePlans: 0,
        },
        resources: {
            publicResources: 0,
            featuredResources: 0,
        },
        campaigns: {
            totalCampaigns: 0,
            queuedOrProcessing: 0,
            failedToday: 0,
        },
        supportCenter: {
            unreadMessages: 0,
            unreadTickets: 0,
            unreadContactMessages: 0,
        },
        teamAccess: {
            activeStaff: 0,
            pendingInvites: 0,
            activeRoles: 0,
        },
        security: {
            unreadAlerts: 0,
            criticalAlerts: 0,
            db: 'down',
        },
        systemStatus: {
            db: 'down',
            timeUTC: new Date().toISOString(),
        },
    };

    const summary = useMemo<AdminDashboardSummary>(() => {
        const incoming = summaryQuery.data;
        if (!incoming) return fallbackSummary;
        return {
            ...fallbackSummary,
            ...incoming,
            universities: { ...fallbackSummary.universities, ...incoming.universities },
            home: { ...fallbackSummary.home, ...incoming.home },
            news: { ...fallbackSummary.news, ...incoming.news },
            exams: { ...fallbackSummary.exams, ...incoming.exams },
            questionBank: { ...fallbackSummary.questionBank, ...incoming.questionBank },
            students: { ...fallbackSummary.students, ...incoming.students },
            payments: { ...fallbackSummary.payments, ...incoming.payments },
            financeCenter: { ...fallbackSummary.financeCenter, ...incoming.financeCenter },
            subscriptions: { ...fallbackSummary.subscriptions, ...incoming.subscriptions },
            resources: { ...fallbackSummary.resources, ...incoming.resources },
            campaigns: { ...fallbackSummary.campaigns, ...incoming.campaigns },
            supportCenter: { ...fallbackSummary.supportCenter, ...incoming.supportCenter },
            teamAccess: { ...fallbackSummary.teamAccess, ...incoming.teamAccess },
            security: { ...fallbackSummary.security, ...incoming.security },
            systemStatus: { ...fallbackSummary.systemStatus, ...incoming.systemStatus },
        };
    }, [fallbackSummary, summaryQuery.data]);
    const usingFallbackSummary = summaryQuery.isError && !summaryQuery.data;

    const cards = useMemo<SummaryCard[]>(() => {
        return [
            {
                key: 'universities',
                title: 'Universities',
                description: `${valueText(summary.universities.active)} active, ${valueText(summary.universities.featured)} featured`,
                value: valueText(summary.universities.total),
                icon: GraduationCap,
                actionLabel: 'Open Universities',
                actionTab: 'universities',
                module: 'universities',
            },
            {
                key: 'website-control',
                title: 'Website Control',
                description: `${valueText(summary.home.highlightedCategories)} highlighted categories, ${valueText(summary.home.enabledSections)} enabled sections`,
                value: valueText(summary.home.featuredUniversities),
                icon: Home,
                actionLabel: 'Open Website Control',
                actionTab: 'home-control',
                module: 'home_control',
            },
            {
                key: 'news',
                title: 'News Management',
                description: `${valueText(summary.news.pendingReview)} items waiting for review`,
                value: valueText(summary.news.publishedToday),
                icon: BookOpen,
                actionLabel: 'Open Review Queue',
                actionTab: 'news',
                module: 'news',
            },
            {
                key: 'exams',
                title: 'Exams',
                description: `${valueText(summary.exams.upcoming)} upcoming`,
                value: valueText(summary.exams.live),
                icon: Clock3,
                actionLabel: 'Open Exams',
                actionTab: 'exams',
                module: 'exams',
            },
            {
                key: 'question-bank',
                title: 'Question Bank',
                description: 'Total questions',
                value: valueText(summary.questionBank.totalQuestions),
                icon: UserSquare2,
                actionLabel: 'Open Question Bank',
                actionTab: 'question-bank',
                module: 'question_bank',
            },
            {
                key: 'students',
                title: 'Student Management',
                description: `${valueText(summary.students.pendingPayment)} pending payment, ${valueText(summary.students.suspended)} suspended`,
                value: valueText(summary.students.totalActive),
                icon: Users,
                actionLabel: 'Open Student Management',
                actionTab: 'student-management',
                module: 'students_groups',
            },
            {
                key: 'subscriptions',
                title: 'Subscription & Payments',
                description: `${valueText(summary.subscriptions.renewalDue)} renewal due, ${valueText(summary.subscriptions.activePlans)} active plans`,
                value: valueText(summary.subscriptions.activeSubscribers),
                icon: CreditCard,
                actionLabel: 'Open Subscriptions',
                actionTab: 'subscriptions',
                module: 'subscription_plans',
            },
            {
                key: 'resources',
                title: 'Resources',
                description: `${valueText(summary.resources.featuredResources)} featured resources`,
                value: valueText(summary.resources.publicResources),
                icon: FolderOpen,
                actionLabel: 'Open Resources',
                actionTab: 'resources',
                module: 'resources',
            },
            {
                key: 'support',
                title: 'Support & Communication',
                description: `${valueText(summary.supportCenter.unreadTickets)} ticket unread, ${valueText(summary.supportCenter.unreadContactMessages)} contact unread`,
                value: valueText(summary.supportCenter.unreadMessages),
                icon: HelpCircle,
                actionLabel: 'Open Support',
                actionTab: 'support-tickets',
                module: 'support_center',
            },
            {
                key: 'campaigns',
                title: 'Campaigns Hub',
                description: `${valueText(summary.campaigns.queuedOrProcessing)} queued/processing, ${valueText(summary.campaigns.failedToday)} failed today`,
                value: valueText(summary.campaigns.totalCampaigns),
                icon: Megaphone,
                actionLabel: 'Open Campaigns Hub',
                actionTab: 'campaigns',
                module: 'notifications',
            },
            {
                key: 'finance',
                title: 'Finance Center',
                description: `${valueText(summary.financeCenter.pendingApprovals)} pending approvals`,
                value: valueText(summary.financeCenter.paidToday),
                icon: Sparkles,
                actionLabel: 'Open Finance Center',
                actionTab: 'finance',
                module: 'finance_center',
            },
            {
                key: 'team-access',
                title: 'Team & Access Control',
                description: `${valueText(summary.teamAccess.pendingInvites)} pending invites, ${valueText(summary.teamAccess.activeRoles)} active roles`,
                value: valueText(summary.teamAccess.activeStaff),
                icon: KeyRound,
                actionLabel: 'Open Team Access',
                actionTab: 'team-access',
                module: 'team_access_control',
            },
            {
                key: 'security',
                title: 'Security & Logs',
                description: `${valueText(summary.security.unreadAlerts)} unread alerts, DB ${summary.security.db.toUpperCase()}`,
                value: valueText(summary.security.criticalAlerts),
                icon: ShieldCheck,
                actionLabel: 'Open Security Center',
                actionTab: 'security',
                module: 'security_logs',
            },
        ];
    }, [summary]);
    const visibleCards = useMemo(() => cards.filter((card) => hasAnyAccess(card.module)), [cards, hasAnyAccess]);

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Summary</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Live snapshot of core modules with quick navigation links.</p>
                </div>
                <button
                    type="button"
                    onClick={() => summaryQuery.refetch()}
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 px-3 py-2 text-xs text-indigo-600 hover:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
                    Refresh Summary
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {visibleCards.map((card) => (
                    <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-indigo-500/15 dark:bg-slate-900/60">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.title}</p>
                                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                            </div>
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-200">
                                <card.icon className="h-5 w-5" />
                            </span>
                        </div>
                        <p className="mt-2 min-h-[2.2rem] text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => onTabChange(card.actionTab)}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-200 dark:hover:text-indigo-200"
                            >
                                {card.actionLabel}
                            </button>
                            <AdminGuideButton
                                title={card.title}
                                content={`${card.description}. Use "${card.actionLabel}" from this summary card to move directly into the live admin module.`}
                                affected="Admins reviewing module status and opening the next workflow from the dashboard."
                                tone="indigo"
                            />
                        </div>
                    </article>
                ))}
            </div>

            {usingFallbackSummary ? (
                <div className="rounded-2xl border border-amber-300/60 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="inline-flex items-center gap-2 font-semibold"><TriangleAlert className="h-4 w-4" /> Live summary unavailable</p>
                    <p className="mt-1">
                        The dashboard summary API failed, so these cards are showing local fallback values from the current page payload instead of trusted live counts.
                    </p>
                </div>
            ) : null}

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50 p-4 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100">
                <p className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> System check</p>
                <p className="mt-1">
                    DB: <span className="font-semibold">{summary.systemStatus.db}</span> - Last check: {new Date(summary.systemStatus.timeUTC).toLocaleString()}
                </p>
                <p className="mt-1">
                    Security alerts: <span className="font-semibold">{valueText(summary.security.unreadAlerts)}</span> unread, <span className="font-semibold">{valueText(summary.security.criticalAlerts)}</span> critical
                </p>
                <p className="mt-1">
                    Source: <span className="font-semibold">{usingFallbackSummary ? 'fallback snapshot' : 'live summary'}</span>
                </p>
            </div>
        </div>
    );
}

