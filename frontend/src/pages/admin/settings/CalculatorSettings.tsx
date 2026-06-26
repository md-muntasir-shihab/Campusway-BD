import { useState, useEffect, useCallback } from 'react';
import { CalculatorService, CalculatorSettings, CalculatorAnalyticsItem, GradingConfig, GradeRow } from '../../../services/calculatorApi';
import { toast } from 'react-hot-toast';
import { Loader2, Calculator, Settings, BarChart, RefreshCw, AlertTriangle, Plus, Trash2, Save, SlidersHorizontal, Table2 } from 'lucide-react';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

type TabKey = 'calculators' | 'grading' | 'analytics';

const CALC_TYPES = ['ssc', 'hsc', 'olevel', 'cgpa', 'nu'] as const;
const CHART_COLORS: Record<string, string> = {
    ssc: '#6366f1',
    hsc: '#0ea5e9',
    olevel: '#10b981',
    cgpa: '#f59e0b',
    nu: '#ec4899',
};

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

const TABS: { key: TabKey; label: string; icon: typeof Calculator }[] = [
    { key: 'calculators', label: 'Calculators', icon: Calculator },
    { key: 'grading', label: 'Grading Tables', icon: Table2 },
    { key: 'analytics', label: 'Analytics', icon: BarChart },
];

export default function CalculatorSettingsPage() {
    const [tab, setTab] = useState<TabKey>('calculators');

    const [settings, setSettings] = useState<CalculatorSettings | null>(null);
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsDirty, setSettingsDirty] = useState(false);

    const [grading, setGrading] = useState<GradingConfig | null>(null);
    const [gradingDraft, setGradingDraft] = useState<GradingConfig | null>(null);
    const [savingGrading, setSavingGrading] = useState(false);
    const [gradingDirty, setGradingDirty] = useState(false);

    const [analytics, setAnalytics] = useState<CalculatorAnalyticsItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(false);
            // Settings + grading load together; analytics is non-fatal.
            const [settingsData, gradingData] = await Promise.all([
                CalculatorService.getSettings(),
                CalculatorService.getGrading().catch((err) => {
                    console.warn('Grading tables unavailable:', err);
                    return null;
                }),
            ]);
            setSettings(settingsData);
            if (gradingData) {
                setGrading(gradingData);
                setGradingDraft(cloneGrading(gradingData));
            }
            try {
                const analyticsData = await CalculatorService.getAnalytics(7);
                setAnalytics(analyticsData);
            } catch (err) {
                console.warn('Analytics unavailable:', err);
                setAnalytics([]);
            }
            setSettingsDirty(false);
            setGradingDirty(false);
        } catch (error) {
            toast.error('Failed to load calculator settings');
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ─── Settings (toggles) ──────────────────────────────────────────────
    const handleToggle = (key: keyof CalculatorSettings) => {
        if (!settings) return;
        setSettings({ ...settings, [key]: !settings[key] });
        setSettingsDirty(true);
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        try {
            setSavingSettings(true);
            await CalculatorService.updateSettings(settings);
            toast.success('Calculator settings saved');
            setSettingsDirty(false);
        } catch {
            toast.error('Failed to save settings');
        } finally {
            setSavingSettings(false);
        }
    };

    // ─── Grading (tables) ────────────────────────────────────────────────
    const handleGradingChange = (tableKey: keyof GradingConfig, rowIndex: number, field: keyof GradeRow, value: string) => {
        if (!gradingDraft) return;
        const table = [...gradingDraft[tableKey]];
        const row = { ...table[rowIndex] };
        if (field === 'grade') {
            row.grade = value;
        } else {
            // Numeric fields — clamp to sane bounds.
            const num = Number(value);
            if (Number.isNaN(num)) return;
            row[field] = field === 'point' ? Math.max(0, num) : Math.max(0, Math.min(100, num));
        }
        table[rowIndex] = row;
        setGradingDraft({ ...gradingDraft, [tableKey]: table });
        setGradingDirty(true);
    };

    const addGradingRow = (tableKey: keyof GradingConfig) => {
        if (!gradingDraft) return;
        const table = [...gradingDraft[tableKey]];
        table.push({ minMark: 0, maxMark: 0, grade: '', point: 0 });
        setGradingDraft({ ...gradingDraft, [tableKey]: table });
        setGradingDirty(true);
    };

    const removeGradingRow = (tableKey: keyof GradingConfig, rowIndex: number) => {
        if (!gradingDraft) return;
        const table = gradingDraft[tableKey].filter((_, i) => i !== rowIndex);
        setGradingDraft({ ...gradingDraft, [tableKey]: table });
        setGradingDirty(true);
    };

    const handleSaveGrading = async () => {
        if (!gradingDraft) return;
        try {
            setSavingGrading(true);
            const saved = await CalculatorService.updateGrading(gradingDraft);
            setGrading(saved);
            setGradingDraft(cloneGrading(saved));
            setGradingDirty(false);
            toast.success('Grading tables saved');
        } catch {
            toast.error('Failed to save grading tables');
        } finally {
            setSavingGrading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (loadError || !settings) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <AlertTriangle className="h-12 w-12 text-amber-400 mb-3" />
                <p className="text-slate-600 dark:text-slate-300 mb-4">Couldn't load calculator settings.</p>
                <button
                    onClick={fetchData}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                    <RefreshCw className="h-4 w-4" />
                    Try Again
                </button>
            </div>
        );
    }

    const dates = Array.from(new Set(analytics.map((a) => a.date))).sort();
    const chartData = dates.map(date => {
        const entry: Record<string, number | string> = { date: date.slice(5) };
        for (const t of CALC_TYPES) {
            const stat = analytics.find(a => a.date === date && a.calculatorType === t);
            entry[t] = stat ? stat.usageCount : 0;
        }
        return entry;
    });

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                    <Calculator className="h-6 w-6 text-primary" />
                    Calculator Hub Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Manage calculators, grading tables, and view usage statistics.
                </p>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1.5 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-700/50 w-fit">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                            tab === t.key
                                ? 'bg-white dark:bg-slate-700 text-primary shadow-md ring-1 ring-primary/20'
                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                        }`}
                    >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── TAB: Calculators ─── */}
            {tab === 'calculators' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <SlidersHorizontal className="h-5 w-5" />
                                Active Calculators
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enable or disable specific calculators across the platform.</p>
                        </div>
                        <button
                            onClick={handleSaveSettings}
                            disabled={savingSettings || !settingsDirty}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {settingsDirty ? 'Save Changes' : 'Saved'}
                        </button>
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
            )}

            {/* ─── TAB: Grading Tables ─── */}
            {tab === 'grading' && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm">
                    <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <Table2 className="h-5 w-5" />
                                Grading Tables
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                Edit the marks-to-grade-to-point mappings. Changes apply instantly across all calculators.
                            </p>
                        </div>
                        <button
                            onClick={handleSaveGrading}
                            disabled={savingGrading || !gradingDirty}
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {savingGrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {gradingDirty ? 'Save Tables' : 'Saved'}
                        </button>
                    </div>
                    <div className="p-5">
                        {gradingDraft && grading ? (
                            <div className="space-y-8">
                                <GradingEditor
                                    title="SSC / HSC (Bangladesh Board)"
                                    scale="Scale 0–5.00"
                                    rows={gradingDraft.bdBoardTable}
                                    onChange={(i, f, v) => handleGradingChange('bdBoardTable', i, f, v)}
                                    onAdd={() => addGradingRow('bdBoardTable')}
                                    onRemove={(i) => removeGradingRow('bdBoardTable', i)}
                                />
                                <GradingEditor
                                    title="Public University CGPA"
                                    scale="Scale 0–4.00"
                                    rows={gradingDraft.publicUniTable}
                                    onChange={(i, f, v) => handleGradingChange('publicUniTable', i, f, v)}
                                    onAdd={() => addGradingRow('publicUniTable')}
                                    onRemove={(i) => removeGradingRow('publicUniTable', i)}
                                />
                                <GradingEditor
                                    title="Private University CGPA"
                                    scale="Scale 0–4.00"
                                    rows={gradingDraft.privateUniTable}
                                    onChange={(i, f, v) => handleGradingChange('privateUniTable', i, f, v)}
                                    onAdd={() => addGradingRow('privateUniTable')}
                                    onRemove={(i) => removeGradingRow('privateUniTable', i)}
                                />
                                <GradingEditor
                                    title="O-Level / A-Level"
                                    scale="Scale 0–5.00 (grade → point only)"
                                    rows={gradingDraft.oaTable}
                                    hideMarks
                                    onChange={(i, f, v) => handleGradingChange('oaTable', i, f, v)}
                                    onAdd={() => addGradingRow('oaTable')}
                                    onRemove={(i) => removeGradingRow('oaTable', i)}
                                />
                            </div>
                        ) : (
                            <div className="text-center py-8 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 rounded-md">
                                Grading tables are unavailable. Calculators will use built-in defaults.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── TAB: Analytics ─── */}
            {tab === 'analytics' && (
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
                            <div className="space-y-6">
                                {/* Chart */}
                                <div className="w-full h-72">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RBarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" />
                                            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(15,23,42,0.95)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                                            {CALC_TYPES.map(t => (
                                                <Bar key={t} dataKey={t} stackId="a" fill={CHART_COLORS[t]} />
                                            ))}
                                        </RBarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left border border-slate-200 dark:border-slate-700 rounded-md">
                                        <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">Date</th>
                                                {CALC_TYPES.map(t => (
                                                    <th key={t} className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-center">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS[t] }} />
                                                            {t.toUpperCase()}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                            {dates.map(date => {
                                                const dayStats = analytics.filter((a) => a.date === date);
                                                return (
                                                    <tr key={date} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                        <td className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300">{date}</td>
                                                        {CALC_TYPES.map(t => {
                                                            const stat = dayStats.find((s) => s.calculatorType === t);
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
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Grading editor sub-component ────────────────────────────────────────
function GradingEditor({
    title,
    scale,
    rows,
    hideMarks,
    onChange,
    onAdd,
    onRemove,
}: {
    title: string;
    scale: string;
    rows: GradeRow[];
    hideMarks?: boolean;
    onChange: (rowIndex: number, field: keyof GradeRow, value: string) => void;
    onAdd: () => void;
    onRemove: (rowIndex: number) => void;
}) {
    return (
        <div>
            <div className="flex items-baseline justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wide">{title}</h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">{scale}</span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase">
                        <tr>
                            {!hideMarks && (
                                <>
                                    <th className="px-3 py-2 text-left font-medium">Min Mark</th>
                                    <th className="px-3 py-2 text-left font-medium">Max Mark</th>
                                </>
                            )}
                            <th className="px-3 py-2 text-left font-medium">Grade</th>
                            <th className="px-3 py-2 text-left font-medium">Point</th>
                            <th className="px-3 py-2 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                {!hideMarks && (
                                    <>
                                        <td className="px-3 py-1.5">
                                            <input
                                                type="number"
                                                min={0} max={100}
                                                value={row.minMark}
                                                onChange={(e) => onChange(i, 'minMark', e.target.value)}
                                                className="w-20 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none"
                                            />
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <input
                                                type="number"
                                                min={0} max={100}
                                                value={row.maxMark}
                                                onChange={(e) => onChange(i, 'maxMark', e.target.value)}
                                                className="w-20 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-2 text-sm text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none"
                                            />
                                        </td>
                                    </>
                                )}
                                <td className="px-3 py-1.5">
                                    <input
                                        type="text"
                                        value={row.grade}
                                        onChange={(e) => onChange(i, 'grade', e.target.value)}
                                        className="w-24 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-2 text-sm font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </td>
                                <td className="px-3 py-1.5">
                                    <input
                                        type="number"
                                        min={0} step={0.25}
                                        value={row.point}
                                        onChange={(e) => onChange(i, 'point', e.target.value)}
                                        className="w-20 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 px-2 text-sm font-bold text-primary dark:text-blue-400 focus:ring-2 focus:ring-primary/50 outline-none"
                                    />
                                </td>
                                <td className="px-3 py-1.5 text-center">
                                    <button
                                        onClick={() => onRemove(i)}
                                        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-rose-500 transition-all"
                                        aria-label="Remove row"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button
                onClick={onAdd}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
                <Plus className="h-4 w-4" /> Add Row
            </button>
        </div>
    );
}

function cloneGrading(g: GradingConfig): GradingConfig {
    return {
        bdBoardTable: g.bdBoardTable.map(r => ({ ...r })),
        publicUniTable: g.publicUniTable.map(r => ({ ...r })),
        privateUniTable: g.privateUniTable.map(r => ({ ...r })),
        oaTable: g.oaTable.map(r => ({ ...r })),
    };
}
