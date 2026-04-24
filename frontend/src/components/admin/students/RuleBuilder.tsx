import { useState } from 'react';
import { Eye, Loader2, Users } from 'lucide-react';
import { previewDynamicRules } from '../../../api/adminStudentApi';
import ModernToggle from '../../ui/ModernToggle';

export interface DynamicRuleSet {
    batches?: string[];
    sscBatches?: string[];
    departments?: string[];
    statuses?: string[];
    planCodes?: string[];
    planIds?: string[];
    hasPhone?: boolean;
    hasEmail?: boolean;
    hasGuardian?: boolean;
    paymentDue?: boolean;
    renewalThresholdDays?: number;
    profileScoreRange?: { min?: number; max?: number };
}

interface PreviewResult {
    matchedCount: number;
    sampleProfiles: Array<{ _id: string; full_name: string; phone?: string; department?: string }>;
}

interface RuleBuilderProps {
    rules: DynamicRuleSet;
    onChange: (rules: DynamicRuleSet) => void;
    groupId?: string;
}

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400';
const labelCls = 'block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1';

const DEPARTMENTS = ['science', 'arts', 'commerce'];
const STATUSES = ['active', 'suspended', 'inactive', 'pending'];

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
    const [input, setInput] = useState('');

    const addTag = () => {
        const trimmed = input.trim();
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed]);
        }
        setInput('');
    };

    return (
        <div>
            <div className="flex flex-wrap gap-1 mb-1.5">
                {value.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                        {tag}
                        <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-indigo-400 hover:text-indigo-600">&times;</button>
                    </span>
                ))}
            </div>
            <input
                className={inputCls}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                onBlur={addTag}
                placeholder={placeholder}
            />
        </div>
    );
}

function MultiSelect({ value, onChange, options, placeholder }: { value: string[]; onChange: (v: string[]) => void; options: string[]; placeholder: string }) {
    const toggle = (opt: string) => {
        onChange(value.includes(opt) ? value.filter(v => v !== opt) : [...value, opt]);
    };

    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(opt => (
                <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${value.includes(opt)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                        }`}
                >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
            ))}
            {options.length === 0 && <span className="text-xs text-slate-400">{placeholder}</span>}
        </div>
    );
}

function AndConnector() {
    return (
        <div className="flex items-center gap-2 py-1">
            <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">AND</span>
            <div className="flex-1 border-t border-dashed border-slate-300 dark:border-slate-600" />
        </div>
    );
}

function hasActiveRules(rules: DynamicRuleSet): boolean {
    return !!(
        (rules.batches && rules.batches.length > 0) ||
        (rules.sscBatches && rules.sscBatches.length > 0) ||
        (rules.departments && rules.departments.length > 0) ||
        (rules.statuses && rules.statuses.length > 0) ||
        (rules.planCodes && rules.planCodes.length > 0) ||
        (rules.planIds && rules.planIds.length > 0) ||
        rules.hasPhone !== undefined ||
        rules.hasEmail !== undefined ||
        rules.hasGuardian !== undefined ||
        rules.paymentDue !== undefined ||
        (rules.renewalThresholdDays !== undefined && rules.renewalThresholdDays >= 0) ||
        (rules.profileScoreRange && (rules.profileScoreRange.min !== undefined || rules.profileScoreRange.max !== undefined))
    );
}

export default function RuleBuilder({ rules, onChange, groupId }: RuleBuilderProps) {
    const [preview, setPreview] = useState<PreviewResult | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');

    const update = (patch: Partial<DynamicRuleSet>) => onChange({ ...rules, ...patch });

    const handlePreview = async () => {
        if (!groupId) return;
        setPreviewLoading(true);
        setPreviewError('');
        setPreview(null);
        try {
            const result = await previewDynamicRules(groupId, rules as unknown as Record<string, unknown>);
            setPreview(result as PreviewResult);
        } catch {
            setPreviewError('Failed to load preview');
        } finally {
            setPreviewLoading(false);
        }
    };

    // Collect active rule sections for AND connectors
    const sections: React.ReactNode[] = [];

    // --- Array fields ---
    const arraySection = (
        <div key="arrays" className="space-y-3">
            <div>
                <label className={labelCls}>Batches</label>
                <TagInput value={rules.batches ?? []} onChange={v => update({ batches: v.length ? v : undefined })} placeholder="e.g. 2025 — Enter to add" />
            </div>
            <div>
                <label className={labelCls}>SSC Batches</label>
                <TagInput value={rules.sscBatches ?? []} onChange={v => update({ sscBatches: v.length ? v : undefined })} placeholder="e.g. 2023 — Enter to add" />
            </div>
            <div>
                <label className={labelCls}>Departments</label>
                <MultiSelect value={rules.departments ?? []} onChange={v => update({ departments: v.length ? v : undefined })} options={DEPARTMENTS} placeholder="Select departments" />
            </div>
            <div>
                <label className={labelCls}>Statuses</label>
                <MultiSelect value={rules.statuses ?? []} onChange={v => update({ statuses: v.length ? v : undefined })} options={STATUSES} placeholder="Select statuses" />
            </div>
            <div>
                <label className={labelCls}>Plan Codes</label>
                <TagInput value={rules.planCodes ?? []} onChange={v => update({ planCodes: v.length ? v : undefined })} placeholder="e.g. BASIC — Enter to add" />
            </div>
            <div>
                <label className={labelCls}>Plan IDs</label>
                <TagInput value={rules.planIds ?? []} onChange={v => update({ planIds: v.length ? v : undefined })} placeholder="Plan ID — Enter to add" />
            </div>
        </div>
    );

    const hasArrayRules = (rules.batches?.length ?? 0) > 0 || (rules.sscBatches?.length ?? 0) > 0 ||
        (rules.departments?.length ?? 0) > 0 || (rules.statuses?.length ?? 0) > 0 ||
        (rules.planCodes?.length ?? 0) > 0 || (rules.planIds?.length ?? 0) > 0;

    sections.push(arraySection);

    // --- Boolean fields ---
    const boolSection = (
        <div key="bools" className="space-y-2">
            <ModernToggle label="Has Phone" checked={rules.hasPhone ?? false} onChange={v => update({ hasPhone: v || undefined })} size="sm" />
            <ModernToggle label="Has Email" checked={rules.hasEmail ?? false} onChange={v => update({ hasEmail: v || undefined })} size="sm" />
            <ModernToggle label="Has Guardian" checked={rules.hasGuardian ?? false} onChange={v => update({ hasGuardian: v || undefined })} size="sm" />
            <ModernToggle label="Payment Due" checked={rules.paymentDue ?? false} onChange={v => update({ paymentDue: v || undefined })} size="sm" />
        </div>
    );

    const hasBoolRules = rules.hasPhone || rules.hasEmail || rules.hasGuardian || rules.paymentDue;

    // --- Threshold ---
    const thresholdSection = (
        <div key="threshold">
            <label className={labelCls}>Renewal Threshold Days</label>
            <input
                className={inputCls}
                type="number"
                min={0}
                value={rules.renewalThresholdDays ?? ''}
                onChange={e => {
                    const v = e.target.value;
                    update({ renewalThresholdDays: v === '' ? undefined : parseInt(v) });
                }}
                placeholder="e.g. 30"
            />
        </div>
    );

    const hasThreshold = rules.renewalThresholdDays !== undefined && rules.renewalThresholdDays >= 0;

    // --- Profile Score Range ---
    const scoreSection = (
        <div key="score">
            <label className={labelCls}>Profile Score Range</label>
            <div className="flex items-center gap-2">
                <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100}
                    value={rules.profileScoreRange?.min ?? ''}
                    onChange={e => {
                        const v = e.target.value;
                        const current = rules.profileScoreRange ?? {};
                        const next = { ...current, min: v === '' ? undefined : parseInt(v) };
                        update({ profileScoreRange: next.min === undefined && next.max === undefined ? undefined : next });
                    }}
                    placeholder="Min"
                />
                <span className="text-xs text-slate-400">—</span>
                <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100}
                    value={rules.profileScoreRange?.max ?? ''}
                    onChange={e => {
                        const v = e.target.value;
                        const current = rules.profileScoreRange ?? {};
                        const next = { ...current, max: v === '' ? undefined : parseInt(v) };
                        update({ profileScoreRange: next.min === undefined && next.max === undefined ? undefined : next });
                    }}
                    placeholder="Max"
                />
            </div>
        </div>
    );

    const hasScore = rules.profileScoreRange && (rules.profileScoreRange.min !== undefined || rules.profileScoreRange.max !== undefined);

    // Build rendered sections with AND connectors between active ones
    const activeSections: React.ReactNode[] = [];
    const allSections = [
        { node: arraySection, active: hasArrayRules },
        { node: boolSection, active: hasBoolRules },
        { node: thresholdSection, active: hasThreshold },
        { node: scoreSection, active: hasScore },
    ];

    allSections.forEach(({ node, active }, i) => {
        if (i > 0 && active && activeSections.length > 0) {
            activeSections.push(<AndConnector key={`and-${i}`} />);
        }
        activeSections.push(node);
    });

    return (
        <div className="space-y-4">
            {activeSections}

            {/* Preview button */}
            {groupId && (
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={handlePreview}
                        disabled={previewLoading || !hasActiveRules(rules)}
                        className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:bg-indigo-900/20 dark:text-indigo-300 dark:hover:bg-indigo-900/40"
                    >
                        {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                        Preview
                    </button>

                    {previewError && (
                        <p className="mt-2 text-xs text-red-500">{previewError}</p>
                    )}

                    {preview && (
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Users size={14} className="text-indigo-500" />
                                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    Estimated Members: {preview.matchedCount}
                                </span>
                            </div>
                            {preview.sampleProfiles.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-[10px] font-medium text-slate-500 uppercase">Sample Profiles (max 10)</p>
                                    {preview.sampleProfiles.map(p => (
                                        <div key={p._id} className="flex items-center gap-2 rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">{p.full_name}</span>
                                            {p.department && <span className="text-slate-400 capitalize">{p.department}</span>}
                                            {p.phone && <span className="text-slate-400">{p.phone}</span>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
