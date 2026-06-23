import { useState, useEffect } from 'react';
import { CalculatorService, CalculatorSettings } from '../../../services/calculatorApi';
import { toast } from 'react-hot-toast';
import { Loader2, Calculator, Settings, BarChart } from 'lucide-react';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full" title="Toggle switch">
            <input 
                type="checkbox" 
                className="sr-only" 
                checked={checked} 
                onChange={onChange}
                aria-label="Toggle switch" 
            />
            <div className={`absolute inset-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
            <span className={`relative inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </label>
    );
}

export default function CalculatorSettingsPage() {
    const [settings, setSettings] = useState<CalculatorSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [analytics, setAnalytics] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [settingsData, analyticsData] = await Promise.all([
                    CalculatorService.getSettings(),
                    CalculatorService.getAnalytics(7)
                ]);
                setSettings(settingsData);
                setAnalytics(analyticsData);
            } catch (error) {
                toast.error('Failed to load calculator settings');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleToggle = (key: keyof CalculatorSettings) => {
        if (!settings) return;
        setSettings({ ...settings, [key]: !settings[key] });
    };

    const handleSave = async () => {
        if (!settings) return;
        try {
            setSaving(true);
            await CalculatorService.updateSettings(settings);
            toast.success('Calculator settings saved');
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!settings) return null;

    const dates = Array.from(new Set(analytics.map((a: any) => a.date))).sort();
    const types = ['ssc', 'hsc', 'olevel', 'cgpa', 'nu'];

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                        <Calculator className="h-6 w-6 text-primary" />
                        Calculator Hub Settings
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage which calculators are available to students and view usage statistics.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                    Save Changes
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Calculators Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Active Calculators</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enable or disable specific calculators across the platform.</p>
                    </div>
                    <div className="p-5 space-y-4">
                        {([
                            { key: 'isSSCEnabled' as const, label: 'SSC GPA Calculator', desc: 'Standard SSC grading system' },
                            { key: 'isHSCEnabled' as const, label: 'HSC GPA Calculator', desc: 'Standard HSC grading system' },
                            { key: 'isOLevelEnabled' as const, label: 'O/A Level Calculator', desc: 'British curriculum grading' },
                            { key: 'isCGPAEnabled' as const, label: 'University CGPA Calculator', desc: 'Public & Private university scales' },
                            { key: 'isNUEnabled' as const, label: 'National University (NU)', desc: 'NU specific grading system' },
                        ]).map(item => (
                            <div key={item.key} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4 last:border-0 last:pb-0">
                                <div>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{item.label}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                                </div>
                                <ToggleSwitch checked={settings[item.key] as boolean} onChange={() => handleToggle(item.key)} />
                            </div>
                        ))}
                        <div className="flex items-center justify-between pt-2">
                            <div>
                                <p className="font-medium text-rose-600 dark:text-rose-400">Maintenance Mode</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Temporarily disable the entire calculator hub</p>
                            </div>
                            <ToggleSwitch checked={settings.maintenanceMode} onChange={() => handleToggle('maintenanceMode')} />
                        </div>
                    </div>
                </div>

                {/* Analytics Card */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-white">
                            <BarChart className="h-5 w-5" />
                            Usage Analytics (Last 7 Days)
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Anonymous usage count by calculator type.</p>
                    </div>
                    <div className="p-5">
                        {analytics.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                                No usage data recorded yet
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-md">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">Date</th>
                                            {types.map(t => <th key={t} className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-center">{t.toUpperCase()}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {dates.map(date => {
                                            const dayStats = analytics.filter((a: any) => a.date === date);
                                            return (
                                                <tr key={date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{date}</td>
                                                    {types.map(t => {
                                                        const stat = dayStats.find((s: any) => s.calculatorType === t);
                                                        return (
                                                            <td key={t} className="px-4 py-2 text-center">
                                                                {stat ? <span className="font-bold text-primary">{stat.usageCount}</span> : <span className="text-slate-400">-</span>}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
