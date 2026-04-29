import { useState } from 'react';
import {
    Award,
    Calendar,
    Coins,
    Crown,
    Flame,
    Gift,
    Loader2,
    Medal,
    Shield,
    Star,
    Trophy,
    Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useGamificationProfile } from '../../../hooks/useExamSystemQueries';
import api from '../../../services/api';
import type { BadgeCategory, LeagueTier, StreakCalendarDay } from '../../../types/exam-system';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const LEAGUE_CONFIG: Record<LeagueTier, { label: string; color: string; icon: React.ReactNode }> = {
    iron: { label: 'Iron', color: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300', icon: <Shield className="h-5 w-5" /> },
    bronze: { label: 'Bronze', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: <Medal className="h-5 w-5" /> },
    silver: { label: 'Silver', color: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200', icon: <Medal className="h-5 w-5" /> },
    gold: { label: 'Gold', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: <Crown className="h-5 w-5" /> },
    diamond: { label: 'Diamond', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300', icon: <Trophy className="h-5 w-5" /> },
    platinum: { label: 'Platinum', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', icon: <Crown className="h-5 w-5" /> },
};

const BADGE_CATEGORY_ICONS: Record<BadgeCategory, React.ReactNode> = {
    exam: <Award className="h-4 w-4" />,
    streak: <Flame className="h-4 w-4" />,
    league: <Crown className="h-4 w-4" />,
    battle: <Zap className="h-4 w-4" />,
    practice: <Star className="h-4 w-4" />,
    milestone: <Trophy className="h-4 w-4" />,
};

// ═══════════════════════════════════════════════════════════════════════════
// Sub-Components
// ═══════════════════════════════════════════════════════════════════════════

function LeagueBadge({ tier }: { tier: LeagueTier }) {
    const config = LEAGUE_CONFIG[tier];
    return (
        <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-semibold text-sm ${config.color}`}>
            {config.icon}
            {config.label} League
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-center">
            <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                {icon}
            </div>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
        </div>
    );
}

function StreakCalendarView({ calendar }: { calendar: StreakCalendarDay[] }) {
    const last28 = calendar.slice(-28);

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Activity Calendar (Last 28 Days)
            </h3>
            <div className="grid grid-cols-7 gap-1.5">
                {last28.map((day) => (
                    <div
                        key={day.date}
                        className={`h-8 w-full rounded-md transition-colors ${day.active
                                ? 'bg-emerald-400 dark:bg-emerald-600'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                        title={`${new Date(day.date).toLocaleDateString()} — ${day.active ? 'Active' : 'Inactive'}`}
                    />
                ))}
            </div>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-emerald-400 dark:bg-emerald-600" /> Active
                </span>
                <span className="flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-slate-100 dark:bg-slate-800" /> Inactive
                </span>
            </div>
        </div>
    );
}

function BadgeCollection({ badges }: { badges: Array<{ _id: string; title: string; title_bn?: string; category: BadgeCategory; iconUrl?: string; awardedAt: string }> }) {
    if (badges.length === 0) {
        return (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
                <Award className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No badges earned yet</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Complete exams and challenges to earn badges</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Badge Collection ({badges.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {badges.map((badge) => (
                    <div
                        key={badge._id}
                        className="flex flex-col items-center rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-center"
                    >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30 mb-2">
                            {badge.iconUrl ? (
                                <img src={badge.iconUrl} alt={badge.title} className="h-6 w-6 rounded-full" />
                            ) : (
                                BADGE_CATEGORY_ICONS[badge.category] ?? <Star className="h-4 w-4 text-amber-600" />
                            )}
                        </div>
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate w-full">
                            {badge.title}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {new Date(badge.awardedAt).toLocaleDateString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DailyLoginBonus({ onClaim, isClaiming }: { onClaim: () => void; isClaiming: boolean }) {
    return (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                        <Gift className="h-5 w-5 text-amber-700 dark:text-amber-300" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Daily Login Bonus</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">Claim your daily reward!</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClaim}
                    disabled={isClaiming}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[40px]"
                >
                    {isClaiming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
                    Claim
                </button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function GamificationProfile() {
    const { data, isLoading, isError, refetch } = useGamificationProfile();
    const [isClaiming, setIsClaiming] = useState(false);

    const profile = data?.data;

    const handleClaimBonus = async () => {
        setIsClaiming(true);
        try {
            await api.post('/v1/gamification/daily-bonus');
            toast.success('Daily bonus claimed!');
            void refetch();
        } catch {
            toast.error('Failed to claim bonus. You may have already claimed today.');
        } finally {
            setIsClaiming(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (isError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="h-12 w-12 text-red-300 dark:text-red-700 mb-3" />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Failed to load gamification profile
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* League Badge */}
            <div className="flex items-center justify-center">
                <LeagueBadge tier={profile.leagueTier} />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                    icon={<Zap className="h-5 w-5 text-white" />}
                    label="Total XP"
                    value={profile.xpTotal.toLocaleString()}
                    color="bg-indigo-500"
                />
                <StatCard
                    icon={<Coins className="h-5 w-5 text-white" />}
                    label="Coins"
                    value={profile.coinsBalance.toLocaleString()}
                    color="bg-amber-500"
                />
                <StatCard
                    icon={<Flame className="h-5 w-5 text-white" />}
                    label="Current Streak"
                    value={`${profile.currentStreak} days`}
                    color="bg-orange-500"
                />
                <StatCard
                    icon={<Trophy className="h-5 w-5 text-white" />}
                    label="Longest Streak"
                    value={`${profile.longestStreak} days`}
                    color="bg-emerald-500"
                />
            </div>

            {/* XP Multiplier */}
            {profile.xpMultiplier > 1 && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-3 text-center">
                    <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                        🚀 {profile.xpMultiplier}x XP Multiplier Active
                    </p>
                </div>
            )}

            {/* Daily Login Bonus */}
            <DailyLoginBonus onClaim={() => void handleClaimBonus()} isClaiming={isClaiming} />

            {/* Streak Calendar */}
            <StreakCalendarView calendar={profile.streakCalendar} />

            {/* Badge Collection */}
            <BadgeCollection badges={profile.badges} />
        </div>
    );
}
