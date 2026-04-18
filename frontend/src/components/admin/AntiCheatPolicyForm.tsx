import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Shield, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    adminGetAntiCheatPolicy,
    adminUpdateAntiCheatPolicy,
    adminFetchCsrfToken,
    type AdminAntiCheatPolicy,
} from '../../services/api';
import { queryKeys } from '../../lib/queryKeys';

// ─── Defaults ────────────────────────────────────────────────────────────────

const POLICY_DEFAULTS: AdminAntiCheatPolicy = {
    tabSwitchLimit: 5,
    copyPasteViolationLimit: 3,
    requireFullscreen: false,
    violationAction: 'warn',
    warningCooldownSeconds: 30,
    maxFullscreenExitLimit: 3,
    enableClipboardBlock: false,
    enableContextMenuBlock: false,
    enableBlurTracking: false,
    allowMobileRelaxedMode: false,
    proctoringSignalsEnabled: false,
    strictExamTabLock: false,
};

const VIOLATION_ACTION_OPTIONS: Array<{ value: AdminAntiCheatPolicy['violationAction']; label: string; description: string }> = [
    { value: 'warn', label: 'সতর্কতা (Warn)', description: 'শুধুমাত্র সতর্কতা বার্তা দেখাবে' },
    { value: 'lock', label: 'সেশন লক (Lock)', description: 'পরীক্ষা সেশন লক করবে' },
    { value: 'submit', label: 'জোরপূর্বক সাবমিট (Submit)', description: 'পরীক্ষা স্বয়ংক্রিয়ভাবে সাবমিট করবে' },
];

// ─── Reusable field components (matching SecuritySettingsPanel style) ─────────

type SectionCardProps = { title: string; description: string; icon?: ReactNode; children: ReactNode };

function SectionCard({ title, description, icon, children }: SectionCardProps) {
    return (
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/50 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-500 hover:shadow-[0_8px_32px_rgba(6,182,212,0.1)]">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 border-b border-white/5 bg-slate-950/40 px-8 py-6">
                <div>
                    <div className="flex items-center gap-3">
                        {icon}
                        <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm font-medium text-slate-400">{description}</p>
                </div>
            </div>
            <div className="relative z-10 space-y-6 px-8 py-7">{children}</div>
        </section>
    );
}

type ToggleFieldProps = { label: string; description: string; checked: boolean; onChange: (v: boolean) => void; overridden?: boolean };

function ToggleField({ label, description, checked, onChange, overridden }: ToggleFieldProps) {
    return (
        <label className="group relative flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.04]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            <div className="min-w-0 flex-1 relative z-10">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">{label}</p>
                    {overridden && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">ওভাররাইড</span>}
                </div>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed transition-colors group-hover:text-slate-300">{description}</p>
            </div>
            <div className="relative z-10 flex shrink-0 items-center justify-center mt-1">
                <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
                <div className={`h-[22px] w-10 rounded-full p-[3px] transition-colors duration-300 ease-in-out ${checked ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-700/80 shadow-inner'}`}>
                    <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-in-out ${checked ? 'translate-x-full' : 'translate-x-0'}`} />
                </div>
            </div>
        </label>
    );
}

type NumberFieldProps = { label: string; description: string; value: number; min: number; max: number; onChange: (v: number) => void; overridden?: boolean };

function NumberField({ label, description, value, min, max, onChange, overridden }: NumberFieldProps) {
    const clamp = (v: number) => Math.max(min, Math.min(max, v));
    return (
        <label className="group relative block rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.04]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">{label}</p>
                        {overridden && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">ওভাররাইড</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed transition-colors group-hover:text-slate-300">{description}</p>
                    <p className="mt-1 text-[10px] text-slate-500">রেঞ্জ: {min} – {max}</p>
                </div>
                <div className="relative shrink-0">
                    <input
                        type="number"
                        min={min}
                        max={max}
                        value={value}
                        onChange={(e) => onChange(clamp(Number(e.target.value)))}
                        className="w-24 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-center text-sm font-bold text-white shadow-inner outline-none transition-all duration-300 focus:border-cyan-400 focus:bg-slate-800 focus:ring-2 focus:ring-cyan-500/20"
                    />
                </div>
            </div>
        </label>
    );
}

type SelectFieldProps = { label: string; description: string; value: string; options: Array<{ value: string; label: string; description?: string }>; onChange: (v: string) => void; overridden?: boolean };

function SelectField({ label, description, value, options, onChange, overridden }: SelectFieldProps) {
    return (
        <label className="group relative block rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4 transition-all duration-300 hover:border-cyan-500/30 hover:bg-white/[0.04]">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-200 transition-colors group-hover:text-white">{label}</p>
                        {overridden && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">ওভাররাইড</span>}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400 leading-relaxed transition-colors group-hover:text-slate-300">{description}</p>
                </div>
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="shrink-0 rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2.5 text-sm font-bold text-white shadow-inner outline-none transition-all duration-300 focus:border-cyan-400 focus:bg-slate-800 focus:ring-2 focus:ring-cyan-500/20"
                >
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>
        </label>
    );
}

// ─── Per-Exam Override Editor ────────────────────────────────────────────────

type OverrideEditorProps = {
    globalPolicy: AdminAntiCheatPolicy;
    overrides: Partial<AdminAntiCheatPolicy>;
    onChange: (overrides: Partial<AdminAntiCheatPolicy>) => void;
};

const OVERRIDE_FIELDS: Array<{ key: keyof AdminAntiCheatPolicy; label: string; type: 'number' | 'boolean' | 'select'; min?: number; max?: number }> = [
    { key: 'tabSwitchLimit', label: 'ট্যাব সুইচ লিমিট', type: 'number', min: 1, max: 100 },
    { key: 'copyPasteViolationLimit', label: 'কপি/পেস্ট লঙ্ঘন লিমিট', type: 'number', min: 1, max: 50 },
    { key: 'warningCooldownSeconds', label: 'সতর্কতা কুলডাউন (সেকেন্ড)', type: 'number', min: 0, max: 300 },
    { key: 'maxFullscreenExitLimit', label: 'ফুলস্ক্রিন এক্সিট লিমিট', type: 'number', min: 1, max: 50 },
    { key: 'violationAction', label: 'লঙ্ঘন অ্যাকশন', type: 'select' },
    { key: 'requireFullscreen', label: 'ফুলস্ক্রিন বাধ্যতামূলক', type: 'boolean' },
    { key: 'enableClipboardBlock', label: 'ক্লিপবোর্ড ব্লক', type: 'boolean' },
    { key: 'enableContextMenuBlock', label: 'কনটেক্সট মেনু ব্লক', type: 'boolean' },
    { key: 'enableBlurTracking', label: 'ব্লার ট্র্যাকিং', type: 'boolean' },
    { key: 'allowMobileRelaxedMode', label: 'মোবাইল রিল্যাক্সড মোড', type: 'boolean' },
    { key: 'proctoringSignalsEnabled', label: 'প্রক্টরিং সিগন্যাল', type: 'boolean' },
    { key: 'strictExamTabLock', label: 'স্ট্রিক্ট ট্যাব লক', type: 'boolean' },
];

function PerExamOverrideEditor({ globalPolicy, overrides, onChange }: OverrideEditorProps) {
    const toggleOverride = (key: keyof AdminAntiCheatPolicy, enabled: boolean) => {
        const next = { ...overrides };
        if (enabled) {
            (next as Record<string, unknown>)[key] = globalPolicy[key];
        } else {
            delete (next as Record<string, unknown>)[key];
        }
        onChange(next);
    };

    const updateOverride = (key: keyof AdminAntiCheatPolicy, value: unknown) => {
        onChange({ ...overrides, [key]: value });
    };

    return (
        <div className="space-y-3">
            {OVERRIDE_FIELDS.map((field) => {
                const isOverridden = field.key in overrides;
                const currentValue = isOverridden ? overrides[field.key] : globalPolicy[field.key];

                return (
                    <div key={field.key} className={`rounded-2xl border px-5 py-4 transition-all duration-300 ${isOverridden ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-200">{field.label}</p>
                                    {isOverridden && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">ওভাররাইড</span>}
                                </div>
                                <p className="mt-1 text-[10px] text-slate-500">
                                    গ্লোবাল ডিফল্ট: {String(globalPolicy[field.key])}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Override toggle */}
                                <button
                                    type="button"
                                    onClick={() => toggleOverride(field.key, !isOverridden)}
                                    className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-all ${isOverridden ? 'border-amber-400/40 bg-amber-500/20 text-amber-300' : 'border-white/10 bg-slate-800/50 text-slate-500 hover:text-white'}`}
                                >
                                    {isOverridden ? 'রিসেট' : 'ওভাররাইড'}
                                </button>
                                {/* Value editor */}
                                {isOverridden && field.type === 'number' && (
                                    <input
                                        type="number"
                                        min={field.min}
                                        max={field.max}
                                        value={currentValue as number}
                                        onChange={(e) => updateOverride(field.key, Math.max(field.min ?? 0, Math.min(field.max ?? 999, Number(e.target.value))))}
                                        className="w-20 rounded-xl border border-white/10 bg-slate-900/80 px-2 py-1.5 text-center text-xs font-bold text-white shadow-inner outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                    />
                                )}
                                {isOverridden && field.type === 'boolean' && (
                                    <div
                                        onClick={() => updateOverride(field.key, !currentValue)}
                                        className={`h-[22px] w-10 cursor-pointer rounded-full p-[3px] transition-colors duration-300 ${currentValue ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-700/80 shadow-inner'}`}
                                    >
                                        <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${currentValue ? 'translate-x-full' : 'translate-x-0'}`} />
                                    </div>
                                )}
                                {isOverridden && field.type === 'select' && (
                                    <select
                                        value={currentValue as string}
                                        onChange={(e) => updateOverride(field.key, e.target.value)}
                                        className="rounded-xl border border-white/10 bg-slate-900/80 px-2 py-1.5 text-xs font-bold text-white shadow-inner outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                    >
                                        {VIOLATION_ACTION_OPTIONS.map((opt) => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export type AntiCheatPolicyFormProps = {
    /** When provided, renders as per-exam override editor instead of global policy editor */
    mode?: 'global' | 'per-exam';
    /** Per-exam overrides (only used when mode='per-exam') */
    examOverrides?: Partial<AdminAntiCheatPolicy>;
    /** Callback when per-exam overrides change (only used when mode='per-exam') */
    onExamOverridesChange?: (overrides: Partial<AdminAntiCheatPolicy>) => void;
};

export default function AntiCheatPolicyForm({ mode = 'global', examOverrides, onExamOverridesChange }: AntiCheatPolicyFormProps) {
    const queryClient = useQueryClient();
    const [draft, setDraft] = useState<AdminAntiCheatPolicy>(POLICY_DEFAULTS);
    const [isDirty, setIsDirty] = useState(false);

    // Fetch global policy
    const { data: policyData, isLoading, isError } = useQuery({
        queryKey: queryKeys.antiCheatPolicy,
        queryFn: async () => {
            const res = await adminGetAntiCheatPolicy();
            return res.data.policy;
        },
    });

    // Sync fetched policy into draft
    useEffect(() => {
        if (policyData) {
            setDraft({ ...POLICY_DEFAULTS, ...policyData });
            setIsDirty(false);
        }
    }, [policyData]);

    // Save mutation — fetches CSRF token first, then PUTs
    const saveMutation = useMutation({
        mutationFn: async (policy: AdminAntiCheatPolicy) => {
            await adminFetchCsrfToken();
            const res = await adminUpdateAntiCheatPolicy(policy);
            return res.data;
        },
        onSuccess: () => {
            toast.success('অ্যান্টি-চিট পলিসি সফলভাবে আপডেট হয়েছে');
            queryClient.invalidateQueries({ queryKey: queryKeys.antiCheatPolicy });
            setIsDirty(false);
        },
        onError: (err: unknown) => {
            const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'পলিসি আপডেট ব্যর্থ হয়েছে';
            toast.error(message);
        },
    });

    const update = <K extends keyof AdminAntiCheatPolicy>(key: K, value: AdminAntiCheatPolicy[K]) => {
        setDraft((prev) => ({ ...prev, [key]: value }));
        setIsDirty(true);
    };

    const handleSave = () => {
        if (saveMutation.isPending) return;
        saveMutation.mutate(draft);
    };

    // ── Per-exam override mode ───────────────────────────────────────────────
    if (mode === 'per-exam') {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <span className="ml-3 text-sm text-slate-400">গ্লোবাল পলিসি লোড হচ্ছে…</span>
                </div>
            );
        }

        return (
            <SectionCard
                title="পার-এক্সাম অ্যান্টি-চিট ওভাররাইড"
                description="গ্লোবাল ডিফল্ট থেকে এই পরীক্ষার জন্য কোন ফিল্ড ওভাররাইড করতে চান তা নির্বাচন করুন"
                icon={<ShieldAlert className="h-5 w-5 text-amber-400" />}
            >
                <PerExamOverrideEditor
                    globalPolicy={draft}
                    overrides={examOverrides ?? {}}
                    onChange={onExamOverridesChange ?? (() => { })}
                />
            </SectionCard>
        );
    }

    // ── Global policy editor mode ────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                <span className="ml-3 text-slate-400">অ্যান্টি-চিট পলিসি লোড হচ্ছে…</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-6 py-8 text-center">
                <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />
                <p className="mt-3 text-sm text-red-300">অ্যান্টি-চিট পলিসি লোড করতে ব্যর্থ হয়েছে</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with save button */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-cyan-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">অ্যান্টি-চিট পলিসি</h2>
                        <p className="text-sm text-slate-400">গ্লোবাল পরীক্ষা অ্যান্টি-চিট কনফিগারেশন</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || saveMutation.isPending}
                    className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-300 ${isDirty
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]'
                            : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    সংরক্ষণ করুন
                </button>
            </div>

            {/* Violation Limits */}
            <SectionCard
                title="লঙ্ঘন সীমা"
                description="পরীক্ষা চলাকালীন সর্বোচ্চ অনুমোদিত লঙ্ঘন সংখ্যা"
                icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
            >
                <NumberField label="ট্যাব সুইচ লিমিট" description="সর্বোচ্চ কতবার ট্যাব সুইচ করতে পারবে" value={draft.tabSwitchLimit} min={1} max={100} onChange={(v) => update('tabSwitchLimit', v)} />
                <NumberField label="কপি/পেস্ট লঙ্ঘন লিমিট" description="সর্বোচ্চ কতবার কপি/পেস্ট চেষ্টা করতে পারবে" value={draft.copyPasteViolationLimit} min={1} max={50} onChange={(v) => update('copyPasteViolationLimit', v)} />
                <NumberField label="ফুলস্ক্রিন এক্সিট লিমিট" description="সর্বোচ্চ কতবার ফুলস্ক্রিন থেকে বের হতে পারবে" value={draft.maxFullscreenExitLimit} min={1} max={50} onChange={(v) => update('maxFullscreenExitLimit', v)} />
                <NumberField label="সতর্কতা কুলডাউন (সেকেন্ড)" description="একই ধরনের সতর্কতা পুনরায় দেখানোর আগে অপেক্ষার সময়" value={draft.warningCooldownSeconds} min={0} max={300} onChange={(v) => update('warningCooldownSeconds', v)} />
            </SectionCard>

            {/* Violation Action */}
            <SectionCard
                title="লঙ্ঘন প্রতিক্রিয়া"
                description="লিমিট অতিক্রম করলে কী পদক্ষেপ নেওয়া হবে"
            >
                <SelectField
                    label="লঙ্ঘন অ্যাকশন"
                    description="লিমিট পৌঁছালে সিস্টেম কী করবে"
                    value={draft.violationAction}
                    options={VIOLATION_ACTION_OPTIONS}
                    onChange={(v) => update('violationAction', v as AdminAntiCheatPolicy['violationAction'])}
                />
            </SectionCard>

            {/* Boolean Toggles */}
            <SectionCard
                title="সিকিউরিটি ফিচার"
                description="পরীক্ষা চলাকালীন সক্রিয় সিকিউরিটি ফিচারসমূহ"
                icon={<Shield className="h-5 w-5 text-cyan-400" />}
            >
                <ToggleField label="ফুলস্ক্রিন বাধ্যতামূলক" description="পরীক্ষা শুরুর সময় ফুলস্ক্রিন মোড বাধ্যতামূলক করুন" checked={draft.requireFullscreen} onChange={(v) => update('requireFullscreen', v)} />
                <ToggleField label="ক্লিপবোর্ড ব্লক" description="কপি, কাট ও পেস্ট অপারেশন ব্লক করুন" checked={draft.enableClipboardBlock} onChange={(v) => update('enableClipboardBlock', v)} />
                <ToggleField label="কনটেক্সট মেনু ব্লক" description="রাইট-ক্লিক কনটেক্সট মেনু ব্লক করুন" checked={draft.enableContextMenuBlock} onChange={(v) => update('enableContextMenuBlock', v)} />
                <ToggleField label="ব্লার ট্র্যাকিং" description="ব্রাউজার উইন্ডো ব্লার (ফোকাস হারানো) ট্র্যাক করুন" checked={draft.enableBlurTracking} onChange={(v) => update('enableBlurTracking', v)} />
                <ToggleField label="মোবাইল রিল্যাক্সড মোড" description="মোবাইল ডিভাইসে শিথিল অ্যান্টি-চিট নিয়ম প্রয়োগ করুন" checked={draft.allowMobileRelaxedMode} onChange={(v) => update('allowMobileRelaxedMode', v)} />
                <ToggleField label="প্রক্টরিং সিগন্যাল" description="প্রক্টরিং সিগন্যাল সংগ্রহ সক্রিয় করুন" checked={draft.proctoringSignalsEnabled} onChange={(v) => update('proctoringSignalsEnabled', v)} />
                <ToggleField label="স্ট্রিক্ট ট্যাব লক" description="পরীক্ষা চলাকালীন কঠোর ট্যাব লক প্রয়োগ করুন" checked={draft.strictExamTabLock} onChange={(v) => update('strictExamTabLock', v)} />
            </SectionCard>
        </div>
    );
}
