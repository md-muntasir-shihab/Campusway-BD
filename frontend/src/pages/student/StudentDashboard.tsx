import { RefreshCw } from 'lucide-react';
import { useStudentDashboardFull, useDashboardRealtime } from '../../hooks/useStudentDashboard';
import type { DashboardSectionConfig } from '../../services/api';

import WelcomeHeader from '../../components/student/dashboard/WelcomeHeader';
import StudentEntryProfileCard from '../../components/student/dashboard/StudentEntryProfileCard';
import QuickStatusCards from '../../components/student/dashboard/QuickStatusCards';
import SmartProgressTracker from '../../components/student/dashboard/SmartProgressTracker';
import ProfileCompletion from '../../components/student/dashboard/ProfileCompletion';
import SubscriptionCard from '../../components/student/dashboard/SubscriptionCard';
import PaymentSummaryCard from '../../components/student/dashboard/PaymentSummaryCard';
import LiveAlertsSection from '../../components/student/dashboard/LiveAlertsSection';
import MyExamsSection from '../../components/student/dashboard/MyExamsSection';
import ResultsPerformance from '../../components/student/dashboard/ResultsPerformance';
import GamificationWidget from '../../components/student/dashboard/GamificationWidget';
import WeakTopicsSection from '../../components/student/dashboard/WeakTopicsSection';
import LeaderboardSnapshot from '../../components/student/dashboard/LeaderboardSnapshot';
import WatchlistSection from '../../components/student/dashboard/WatchlistSection';
import ResourcesForYou from '../../components/student/dashboard/ResourcesForYou';
import SupportShortcuts from '../../components/student/dashboard/SupportShortcuts';
import AccountSecurity from '../../components/student/dashboard/AccountSecurity';
import ImportantDates from '../../components/student/dashboard/ImportantDates';

function isSectionVisible(sections: Record<string, DashboardSectionConfig> | undefined, key: string): boolean {
    if (!sections || !sections[key]) return true;
    return sections[key].visible !== false;
}

function LoadingSkeleton() {
    return (
        <div className="space-y-4 max-w-7xl mx-auto animate-pulse">
            <div className="h-32 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
                <div className="h-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
            </div>
            <div className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900" />
        </div>
    );
}

export default function StudentDashboard() {
    const { data, isLoading, isError, isFetching } = useStudentDashboardFull();

    useDashboardRealtime(Boolean(data?.config?.enableRealtime));

    if (isLoading) return <LoadingSkeleton />;

    if (isError || !data) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="rounded-2xl border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 text-red-700 dark:text-red-200 text-sm">
                    Failed to load dashboard data. Please try again later.
                </div>
            </div>
        );
    }

    const { sections, config } = data;

    return (
        <div className="space-y-5 max-w-7xl mx-auto px-1 sm:px-0 relative">
            {isFetching && (
                <div className="absolute top-2 right-2 z-10">
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                </div>
            )}

            {/* 1 — Welcome Header (always visible) */}
            <WelcomeHeader
                header={data.header}
                dailyFocus={data.dailyFocus}
                personalizedCtas={data.personalizedCtas}
            />
            <StudentEntryProfileCard header={data.header} support={data.support} />
            {/* 2 — Quick Status Cards */}
            {isSectionVisible(sections, 'quickStatus') && (
                <QuickStatusCards status={data.quickStatus} />
            )}

            {/* 2b — Smart Progress Tracker */}
            {config.enableProgressCharts && (
                <SmartProgressTracker
                    header={data.header}
                    results={data.results}
                    exams={data.exams}
                />
            )}

            {/* 3 — Profile Completion */}
            {isSectionVisible(sections, 'profileCompletion') && (
                <ProfileCompletion
                    header={data.header}
                    gatingMessage={config.profileGatingMessage}
                />
            )}

            {/* 4 — Subscription */}
            {isSectionVisible(sections, 'subscription') && (
                <SubscriptionCard
                    subscription={data.subscription}
                    renewalCtaText={config.renewalCtaText}
                    renewalCtaUrl={config.renewalCtaUrl}
                />
            )}

            {/* 5 — Payment Summary */}
            {isSectionVisible(sections, 'payment') && (
                <PaymentSummaryCard payments={data.payments} />
            )}

            {/* 6 — Live Alerts & Notifications */}
            {isSectionVisible(sections, 'alerts') && (
                <LiveAlertsSection
                    alerts={data.alerts}
                    notifications={data.notifications}
                />
            )}

            {/* 7 — My Exams */}
            {isSectionVisible(sections, 'exams') && (
                <MyExamsSection
                    live={data.exams.live}
                    upcoming={data.exams.upcoming}
                    missed={data.exams.missed ?? []}
                    totalUpcoming={data.exams.totalUpcoming}
                    results={data.results}
                />
            )}

            {/* 8 — Results & Performance */}
            {isSectionVisible(sections, 'results') && (
                <ResultsPerformance
                    recent={data.results.recent}
                    progress={data.results.progress}
                    badges={data.results.badges}
                />
            )}

            {/* 8b — Gamification Widget */}
            {config.enableBadges && (
                <GamificationWidget results={data.results} />
            )}

            {/* 9 — Weak Topics */}
            {isSectionVisible(sections, 'weakTopics') && config.enableWeakTopics && (
                <WeakTopicsSection
                    topics={data.weakTopics.topics}
                    weakCount={data.weakTopics.weakCount ?? 0}
                    hasData={data.weakTopics.hasData}
                    resources={data.resources.items}
                />
            )}

            {/* 10 — Leaderboard */}
            {isSectionVisible(sections, 'leaderboard') && config.enableLeaderboard && (
                <LeaderboardSnapshot
                    topPerformers={data.leaderboard.topPerformers}
                    myRank={data.leaderboard.myRank}
                    myAvgPercentage={data.leaderboard.myAvgPercentage}
                />
            )}

            {/* 11 — Watchlist */}
            {isSectionVisible(sections, 'watchlist') && config.enableWatchlist && (
                <WatchlistSection watchlist={data.watchlist} />
            )}

            {/* 12 — Resources */}
            {isSectionVisible(sections, 'resources') && config.enableRecommendations && (
                <ResourcesForYou items={data.resources.items} />
            )}

            {/* 13 — Support Shortcuts */}
            {isSectionVisible(sections, 'support') && (
                <SupportShortcuts support={data.support} />
            )}

            {/* 14 — Account & Security */}
            {isSectionVisible(sections, 'accountSecurity') && (
                <AccountSecurity security={data.security} />
            )}

            {/* 15 — Important Dates */}
            {isSectionVisible(sections, 'importantDates') && (
                <ImportantDates dates={data.importantDates} />
            )}
        </div>
    );
}
