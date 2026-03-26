import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, Save, LayoutDashboard } from 'lucide-react';
import { StudentDashboardConfig, adminGetStudentDashboardConfig, adminUpdateStudentDashboardConfig } from '../../services/api';
import CyberToggle from '../ui/CyberToggle';

const defaultCelebrationRules: NonNullable<StudentDashboardConfig['celebrationRules']> = {
    enabled: true,
    windowDays: 7,
    minPercentage: 80,
    maxRank: 10,
    ruleMode: 'score_or_rank',
    messageTemplates: ['Excellent performance! Keep it up.'],
    showForSec: 10,
    dismissible: true,
    maxShowsPerDay: 2,
};

const SECTION_KEYS: Array<{ key: string; label: string }> = [
    { key: 'quickStatus', label: 'Quick Status Cards' },
    { key: 'profileCompletion', label: 'Profile Completion' },
    { key: 'subscription', label: 'Subscription Card' },
    { key: 'payment', label: 'Payment Summary' },
    { key: 'alerts', label: 'Alerts & Notifications' },
    { key: 'exams', label: 'My Exams' },
    { key: 'results', label: 'Results & Performance' },
    { key: 'weakTopics', label: 'Weak Topics' },
    { key: 'leaderboard', label: 'Leaderboard Snapshot' },
    { key: 'watchlist', label: 'Saved / Watchlist' },
    { key: 'resources', label: 'Resources For You' },
    { key: 'support', label: 'Support Shortcuts' },
    { key: 'accountSecurity', label: 'Account & Security' },
    { key: 'importantDates', label: 'Important Dates' },
];

const defaultSections = Object.fromEntries(
    SECTION_KEYS.map(({ key, label }, i) => [key, { visible: true, label, order: i + 1 }])
);

const defaultConfig: StudentDashboardConfig = {
    welcomeMessageTemplate: 'Welcome, {{name}}!',
    profileCompletionThreshold: 60,
    enableRealtime: true,
    enableDeviceLock: true,
    enableCheatFlags: true,
    enableBadges: true,
    enableProgressCharts: true,
    featuredOrderingMode: 'manual',
    profileGatingMessage: 'Complete your profile to unlock exams and full access.',
    renewalCtaText: 'Renew Now',
    renewalCtaUrl: '/subscription-plans',
    enableRecommendations: true,
    enableLeaderboard: true,
    enableWeakTopics: true,
    enableWatchlist: true,
    maxAlertsVisible: 5,
    maxExamsVisible: 6,
    sections: defaultSections,
    celebrationRules: defaultCelebrationRules,
};

export default function DashboardConfigPanel() {
    const [config, setConfig] = useState<StudentDashboardConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        void loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await adminGetStudentDashboardConfig();
            const remote = res.data.config || {};
            setConfig({
                ...defaultConfig,
                ...remote,
                sections: {
                    ...defaultSections,
                    ...(remote.sections || {}),
                },
                celebrationRules: {
                    ...defaultCelebrationRules,
                    ...((remote).celebrationRules || {}),
                },
            });
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to load dashboard config');
        } finally {
            setLoading(false);
        }
    };

    const update = (key: keyof StudentDashboardConfig, value: unknown) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const updateSection = (sectionKey: string, visible: boolean) => {
        setConfig((prev) => ({
            ...prev,
            sections: {
                ...(prev.sections || defaultSections),
                [sectionKey]: {
                    ...(prev.sections?.[sectionKey] || defaultSections[sectionKey]),
                    visible,
                },
            },
        }));
    };

    const updateCelebration = (key: keyof NonNullable<StudentDashboardConfig['celebrationRules']>, value: unknown) => {
        setConfig((prev) => ({
            ...prev,
            celebrationRules: {
                ...(prev.celebrationRules || defaultCelebrationRules),
                [key]: value,
            },
        }));
    };

    const save = async () => {
        setSaving(true);
        try {
            await adminUpdateStudentDashboardConfig({
                welcomeMessageTemplate: config.welcomeMessageTemplate,
                enableRealtime: config.enableRealtime,
                enableDeviceLock: config.enableDeviceLock,
                enableCheatFlags: config.enableCheatFlags,
                enableBadges: config.enableBadges,
                enableProgressCharts: config.enableProgressCharts,
                featuredOrderingMode: config.featuredOrderingMode,
                profileGatingMessage: config.profileGatingMessage,
                renewalCtaText: config.renewalCtaText,
                renewalCtaUrl: config.renewalCtaUrl,
                enableRecommendations: config.enableRecommendations,
                enableLeaderboard: config.enableLeaderboard,
                enableWeakTopics: config.enableWeakTopics,
                enableWatchlist: config.enableWatchlist,
                maxAlertsVisible: config.maxAlertsVisible,
                maxExamsVisible: config.maxExamsVisible,
                sections: config.sections,
                celebrationRules: config.celebrationRules,
            });
            toast.success('Dashboard config updated');
            await loadConfig();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-12"><RefreshCw className="h-5 w-5 animate-spin text-indigo-400" /></div>;
    }

    const rules = config.celebrationRules || defaultCelebrationRules;

    return (
        <div className="rounded-2xl border border-indigo-500/10 bg-slate-900/65 p-5 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-white font-bold">Dashboard Config</h3>
                    <p className="text-xs text-slate-500">Control every aspect of the student dashboard.</p>
                </div>
                <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                    {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save
                </button>
            </div>

            {/* Welcome Message & Ordering */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Welcome Message Template</label>
                    <input
                        value={config.welcomeMessageTemplate}
                        onChange={(e) => update('welcomeMessageTemplate', e.target.value)}
                        placeholder="Welcome, {{name}}!"
                        className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Featured Ordering Mode</label>
                    <select
                        value={config.featuredOrderingMode}
                        onChange={(e) => update('featuredOrderingMode', e.target.value as 'manual' | 'adaptive')}
                        className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                    >
                        <option value="manual">Manual</option>
                        <option value="adaptive">Adaptive</option>
                    </select>
                </div>
            </div>

            {/* Profile Gate & CTA Texts */}
            <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile Gate & Renewal CTA</h4>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Profile Gate Message</label>
                    <input
                        value={config.profileGatingMessage || ''}
                        onChange={(e) => update('profileGatingMessage', e.target.value)}
                        placeholder="Complete your profile to unlock exams."
                        className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                    />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Renewal CTA Text</label>
                        <input
                            value={config.renewalCtaText || ''}
                            onChange={(e) => update('renewalCtaText', e.target.value)}
                            placeholder="Renew Now"
                            className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 block mb-1">Renewal CTA URL</label>
                        <input
                            value={config.renewalCtaUrl || ''}
                            onChange={(e) => update('renewalCtaUrl', e.target.value)}
                            placeholder="/subscription-plans"
                            className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                        />
                    </div>
                </div>
            </div>

            {/* Counts */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Max Alerts Visible</label>
                    <input
                        type="number" min={1} max={20}
                        value={config.maxAlertsVisible ?? 5}
                        onChange={(e) => update('maxAlertsVisible', Number(e.target.value))}
                        className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 block mb-1">Max Exams Visible</label>
                    <input
                        type="number" min={1} max={20}
                        value={config.maxExamsVisible ?? 6}
                        onChange={(e) => update('maxExamsVisible', Number(e.target.value))}
                        className="w-full rounded-xl bg-slate-950/65 border border-indigo-500/15 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40"
                    />
                </div>
            </div>

            {/* Core Feature Toggles */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Core Features</h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {[
                        ['enableRealtime', 'Enable Realtime (SSE)'],
                        ['enableDeviceLock', 'Enable Device Lock'],
                        ['enableCheatFlags', 'Enable Cheat Flags'],
                        ['enableBadges', 'Enable Badges & Gamification'],
                        ['enableProgressCharts', 'Enable Progress Charts'],
                        ['enableLeaderboard', 'Enable Leaderboard'],
                        ['enableWeakTopics', 'Enable Weak Topics'],
                        ['enableWatchlist', 'Enable Watchlist / Saved'],
                        ['enableRecommendations', 'Enable Resource Recommendations'],
                    ].map(([key, label]) => (
                        <div key={key} className="rounded-xl border border-indigo-500/10 bg-slate-950/65 px-3 py-2.5">
                            <CyberToggle
                                checked={Boolean(config[key as keyof StudentDashboardConfig])}
                                onChange={(value) => update(key as keyof StudentDashboardConfig, value)}
                                label={label}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Section Visibility Toggles */}
            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5" /> Section Visibility
                </h4>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {SECTION_KEYS.map(({ key, label }) => (
                        <div key={key} className="rounded-xl border border-slate-700/50 bg-slate-950/65 px-3 py-2.5">
                            <CyberToggle
                                checked={Boolean((config.sections ?? defaultSections)[key]?.visible !== false)}
                                onChange={(value) => updateSection(key, value)}
                                label={label}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Celebration Rules */}
            <div className="rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 p-4 space-y-4">
                <h4 className="text-sm font-semibold text-fuchsia-200">Celebration Popup Rules</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">
                        <CyberToggle
                            checked={Boolean(rules.enabled)}
                            onChange={(value) => updateCelebration('enabled', value)}
                            label="Enable Celebration Popup"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Minimum Score (%)</label>
                        <input
                            type="number" min={0} max={100}
                            value={rules.minPercentage}
                            onChange={(e) => updateCelebration('minPercentage', Number(e.target.value || 0))}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Maximum Rank</label>
                        <input
                            type="number" min={1}
                            value={rules.maxRank}
                            onChange={(e) => updateCelebration('maxRank', Number(e.target.value || 1))}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Window (days)</label>
                        <input
                            type="number" min={1}
                            value={rules.windowDays}
                            onChange={(e) => updateCelebration('windowDays', Number(e.target.value || 1))}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Show Duration (sec)</label>
                        <input
                            type="number" min={3}
                            value={rules.showForSec}
                            onChange={(e) => updateCelebration('showForSec', Number(e.target.value || 10))}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Rule Mode</label>
                        <select
                            value={rules.ruleMode}
                            onChange={(e) => updateCelebration('ruleMode', e.target.value)}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        >
                            <option value="score_or_rank">Score OR Rank</option>
                            <option value="score_and_rank">Score AND Rank</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-300">Max Shows / Day</label>
                        <input
                            type="number" min={1}
                            value={rules.maxShowsPerDay}
                            onChange={(e) => updateCelebration('maxShowsPerDay', Number(e.target.value || 1))}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div className="sm:col-span-2 rounded-lg border border-white/10 bg-slate-950/50 px-3 py-2">
                        <CyberToggle
                            checked={Boolean(rules.dismissible)}
                            onChange={(value) => updateCelebration('dismissible', value)}
                            label="Allow Manual Dismiss"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="text-xs text-slate-300">Primary Message</label>
                        <input
                            value={rules.messageTemplates?.[0] || ''}
                            onChange={(e) => updateCelebration('messageTemplates', [e.target.value])}
                            className="mt-1 w-full rounded-lg bg-slate-950/65 border border-white/10 px-3 py-2 text-sm text-white"
                            placeholder="Excellent performance!"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
