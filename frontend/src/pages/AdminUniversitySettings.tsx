import { useState, useEffect, useRef, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    ArrowDown,
    ArrowUp,
    Check,
    GraduationCap,
    Loader2,
    RefreshCw,
    Save,
    Star,
    Trash2,
    X,
} from 'lucide-react';
import AdminGuardShell from '../components/admin/AdminGuardShell';
import AdminImageUploadField from '../components/admin/AdminImageUploadField';
import {
    adminGetUniversities,
    adminGetUniversitySettings,
    adminUpdateUniversitySettings,
    type ApiUniversity,
    type AdminUniversitySettingsData,
} from '../services/api';
import { invalidateQueryGroup, invalidationGroups, queryKeys } from '../lib/queryKeys';

const ALLOWED_CATEGORIES = [
    'Individual Admission',
    'Science & Technology',
    'GST (General/Public)',
    'GST (Science & Technology)',
    'Medical College',
    'AGRI Cluster',
    'Under Army',
    'DCU',
    'Specialized University',
    'Affiliate College',
    'Dental College',
    'Nursing Colleges',
];

const DEFAULTS: AdminUniversitySettingsData = {
    categoryOrder: [...ALLOWED_CATEGORIES],
    highlightedCategories: [],
    defaultCategory: 'Individual Admission',
    featuredUniversitySlugs: [],
    maxFeaturedItems: 12,
    enableClusterFilterOnHome: true,
    enableClusterFilterOnUniversities: true,
    defaultUniversityLogoUrl: null,
    allowCustomCategories: false,
};

function deepEqual(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}

export default function AdminUniversitySettingsPage() {
    const queryClient = useQueryClient();
    const [local, setLocal] = useState<AdminUniversitySettingsData>(DEFAULTS);
    const [slugInput, setSlugInput] = useState('');
    const [selectedFeaturedSlug, setSelectedFeaturedSlug] = useState('');
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const originalRef = useRef<AdminUniversitySettingsData | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['admin-university-settings'],
        queryFn: () => adminGetUniversitySettings(),
    });
    const universitiesQuery = useQuery({
        queryKey: ['admin-university-settings-universities'],
        queryFn: async () => {
            const response = await adminGetUniversities({
                page: 1,
                limit: 1000,
                status: 'all',
                sortBy: 'name',
                sortOrder: 'asc',
                fields: 'name,slug,shortForm',
            });
            return (response.data?.universities || []) as ApiUniversity[];
        },
    });

    useEffect(() => {
        if (data?.data?.data) {
            const s = data.data.data;
            setLocal({ ...DEFAULTS, ...s });
            originalRef.current = { ...DEFAULTS, ...s };
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: (payload: Partial<AdminUniversitySettingsData>) =>
            adminUpdateUniversitySettings(payload),
        onSuccess: async (res) => {
            const updated = res.data?.data;
            if (updated) {
                setLocal({ ...DEFAULTS, ...updated });
                originalRef.current = { ...DEFAULTS, ...updated };
            }
            await queryClient.invalidateQueries({ queryKey: ['admin-university-settings'] });
            await queryClient.invalidateQueries({ queryKey: ['admin-university-settings-universities'] });
            await queryClient.invalidateQueries({ queryKey: ['home-clusters-featured'] });
            await queryClient.invalidateQueries({ queryKey: queryKeys.home });
            await queryClient.invalidateQueries({ queryKey: queryKeys.universityCategories });
            await queryClient.invalidateQueries({ queryKey: queryKeys.universityCategoriesLegacy });
            await invalidateQueryGroup(queryClient, invalidationGroups.universitySave);
            showToast('Settings saved successfully.', 'success');
        },
        onError: () => {
            showToast('Failed to save. Please try again.', 'error');
        },
    });

    function showToast(msg: string, type: 'success' | 'error') {
        setToast({ msg, type });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 3500);
    }

    const isDirty = !deepEqual(local, originalRef.current);

    function moveCategory(index: number, dir: 'up' | 'down') {
        const next = [...local.categoryOrder];
        const swap = dir === 'up' ? index - 1 : index + 1;
        if (swap < 0 || swap >= next.length) return;
        [next[index], next[swap]] = [next[swap], next[index]];
        setLocal((prev) => ({ ...prev, categoryOrder: next }));
    }

    function toggleHighlighted(cat: string) {
        setLocal((prev) => {
            const has = prev.highlightedCategories.includes(cat);
            return {
                ...prev,
                highlightedCategories: has
                    ? prev.highlightedCategories.filter((c) => c !== cat)
                    : [...prev.highlightedCategories, cat],
            };
        });
    }

    const universityOptions = useMemo(
        () =>
            (universitiesQuery.data || [])
                .map((item) => ({
                    slug: String(item.slug || '').trim(),
                    label: `${String(item.name || 'University').trim()} (${String(item.shortForm || 'N/A').trim()})`,
                }))
                .filter((item) => Boolean(item.slug)),
        [universitiesQuery.data],
    );

    const universityLabelBySlug = useMemo(
        () => new Map(universityOptions.map((item) => [item.slug, item.label])),
        [universityOptions],
    );
    const summaryCards = [
        {
            title: 'Categories',
            value: String(local.categoryOrder.length),
            detail: local.defaultCategory === 'all' ? 'Default: All' : `Default: ${local.defaultCategory}`,
        },
        {
            title: 'Highlighted',
            value: String(local.highlightedCategories.length),
            detail: local.highlightedCategories.length > 0 ? 'Shown on home/university filters' : 'No highlighted categories',
        },
        {
            title: 'Featured',
            value: String(local.featuredUniversitySlugs.length),
            detail: `${local.maxFeaturedItems} max visible`,
        },
        {
            title: 'Cluster Filters',
            value: local.enableClusterFilterOnHome || local.enableClusterFilterOnUniversities ? 'Visible' : 'Hidden',
            detail: [
                local.enableClusterFilterOnHome ? 'Home on' : 'Home off',
                local.enableClusterFilterOnUniversities ? 'Universities on' : 'Universities off',
            ].join(' • '),
        },
    ];

    function addSlug(rawSlug?: string) {
        const s = String(rawSlug ?? slugInput).trim().toLowerCase().replace(/\s+/g, '-');
        if (!s || local.featuredUniversitySlugs.includes(s)) return;
        setLocal((prev) => ({
            ...prev,
            featuredUniversitySlugs: [...prev.featuredUniversitySlugs, s],
        }));
        setSlugInput('');
        setSelectedFeaturedSlug('');
    }

    function removeSlug(slug: string) {
        setLocal((prev) => ({
            ...prev,
            featuredUniversitySlugs: prev.featuredUniversitySlugs.filter((s) => s !== slug),
        }));
    }

    function moveSlug(index: number, dir: 'up' | 'down') {
        const next = [...local.featuredUniversitySlugs];
        const swap = dir === 'up' ? index - 1 : index + 1;
        if (swap < 0 || swap >= next.length) return;
        [next[index], next[swap]] = [next[swap], next[index]];
        setLocal((prev) => ({ ...prev, featuredUniversitySlugs: next }));
    }

    function handleSave() {
        mutation.mutate(local);
    }

    function handleReset() {
        if (originalRef.current) {
            setLocal({ ...originalRef.current });
        }
    }

    if (isLoading) {
        return (
            <AdminGuardShell title="University Settings" description="Loading…">
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="animate-spin w-8 h-8 text-primary" />
                </div>
            </AdminGuardShell>
        );
    }

    if (isError) {
        return (
            <AdminGuardShell title="University Settings" description="Error loading settings.">
                <div className="card-flat p-6 text-center space-y-3">
                    <p className="text-rose-400">Failed to load university settings.</p>
                    <button onClick={() => void refetch()} className="btn-outline text-sm gap-2 inline-flex items-center">
                        <RefreshCw className="w-4 h-4" /> Retry
                    </button>
                </div>
            </AdminGuardShell>
        );
    }

    return (
        <AdminGuardShell
            title="University Settings"
            description="Control how universities are categorized, featured, and displayed across the platform."
        >
            {/* Toast */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl shadow-xl border px-5 py-3 text-sm font-medium transition-all ${toast.type === 'success'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                            : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                        }`}
                >
                    {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="space-y-6">
                {/* Save / Reset Bar */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-card-border bg-surface px-5 py-3">
                    <p className={`text-sm ${isDirty ? 'text-amber-400' : 'cw-muted'}`}>
                        {isDirty ? 'You have unsaved changes.' : 'All settings are up to date.'}
                    </p>
                    <div className="flex gap-2">
                        {isDirty && (
                            <button onClick={handleReset} className="btn-outline text-sm gap-2 inline-flex items-center">
                                <RefreshCw className="w-4 h-4" /> Discard
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={!isDirty || mutation.isPending}
                            className="btn-primary text-sm gap-2 inline-flex items-center disabled:opacity-50"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Save Changes
                        </button>
                    </div>
                </div>

                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {summaryCards.map((card) => (
                        <div key={card.title} className="card-flat border border-primary/10 p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-text-muted">{card.title}</p>
                            <p className="mt-2 text-2xl font-semibold cw-text">{card.value}</p>
                            <p className="mt-1 text-xs cw-muted">{card.detail}</p>
                        </div>
                    ))}
                </section>

                <section className="card-flat border border-primary/10 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold cw-text">Display Rules</h2>
                            <p className="mt-1 text-sm cw-muted">
                                These settings only control ordering, defaults, filters, and fallbacks. They do not rename routes or remove universities.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full border border-card-border bg-surface/60 px-3 py-1 cw-muted">Home categories</span>
                            <span className="rounded-full border border-card-border bg-surface/60 px-3 py-1 cw-muted">Featured row</span>
                            <span className="rounded-full border border-card-border bg-surface/60 px-3 py-1 cw-muted">Fallback logo</span>
                        </div>
                    </div>
                </section>

                {/* Category Order */}
                <section className="card-flat p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <GraduationCap className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-semibold cw-text">Category Order &amp; Highlights</h2>
                    </div>
                    <p className="text-sm cw-muted">
                        Drag or use arrows to reorder categories. Click a name to toggle it as highlighted (shown prominently).
                    </p>
                    <div className="space-y-2">
                        {local.categoryOrder.map((cat, idx) => {
                            const isHighlighted = local.highlightedCategories.includes(cat);
                            return (
                                <div
                                    key={cat}
                                    className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 transition-colors ${isHighlighted
                                            ? 'border-primary/40 bg-primary/5'
                                            : 'border-card-border bg-surface/50'
                                        }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => moveCategory(idx, 'up')}
                                        disabled={idx === 0}
                                        className="rounded p-0.5 text-slate-400 hover:text-primary disabled:opacity-30"
                                        title="Move up"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveCategory(idx, 'down')}
                                        disabled={idx === local.categoryOrder.length - 1}
                                        className="rounded p-0.5 text-slate-400 hover:text-primary disabled:opacity-30"
                                        title="Move down"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs w-5 text-center cw-muted">{idx + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => toggleHighlighted(cat)}
                                        className={`flex-1 text-left text-sm font-medium transition-colors ${isHighlighted ? 'text-primary' : 'cw-text'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                    {isHighlighted && (
                                        <Star className="w-4 h-4 text-primary flex-shrink-0" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Default Category */}
                <section className="card-flat p-5 space-y-3">
                    <h2 className="text-base font-semibold cw-text">Default Active Category</h2>
                    <p className="text-sm cw-muted">
                        The category tab selected by default when a user opens the home or universities page.
                    </p>
                    <select
                        value={local.defaultCategory}
                        onChange={(e) => setLocal((prev) => ({ ...prev, defaultCategory: e.target.value }))}
                        className="input-field w-full max-w-sm"
                    >
                        <option value="all">All</option>
                        {local.categoryOrder.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </section>

                {/* Cluster Filter Toggles */}
                <section className="card-flat p-5 space-y-4">
                    <h2 className="text-base font-semibold cw-text">Cluster Filter Visibility</h2>
                    <div className="space-y-3">
                        {(
                            [
                                {
                                    key: 'enableClusterFilterOnHome' as const,
                                    label: 'Show cluster filter on Home page',
                                    hint: 'Enables cluster pills inside the Universities section on the home page.',
                                },
                                {
                                    key: 'enableClusterFilterOnUniversities' as const,
                                    label: 'Show cluster filter on Universities page',
                                    hint: 'Enables the cluster group filter tab on the /universities page.',
                                },
                            ] as const
                        ).map(({ key, label, hint }) => (
                            <label
                                key={key}
                                className="flex items-start gap-4 cursor-pointer rounded-xl border border-card-border bg-surface/50 px-4 py-3 hover:border-primary/30 transition-colors"
                            >
                                <div className="mt-0.5">
                                    <div
                                        onClick={() =>
                                            setLocal((prev) => ({ ...prev, [key]: !prev[key] }))
                                        }
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${local[key] ? 'bg-primary' : 'bg-slate-600'
                                            }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ${local[key] ? 'translate-x-4' : 'translate-x-0'
                                                }`}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium cw-text">{label}</p>
                                    <p className="text-xs cw-muted mt-0.5">{hint}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                </section>

                {/* Featured Universities */}
                <section className="card-flat p-5 space-y-4">
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-primary" />
                        <h2 className="text-base font-semibold cw-text">Featured Universities</h2>
                    </div>
                    <p className="text-sm cw-muted">
                        Enter university slugs in priority order. These will appear in the Featured Universities row on the home page.
                    </p>

                    {/* Max Items */}
                    <div className="flex items-center gap-4">
                        <label className="text-sm cw-muted whitespace-nowrap">Max featured items:</label>
                        <input
                            type="number"
                            min={1}
                            max={50}
                            value={local.maxFeaturedItems}
                            onChange={(e) =>
                                setLocal((prev) => ({
                                    ...prev,
                                    maxFeaturedItems: Math.min(50, Math.max(1, Number(e.target.value) || 1)),
                                }))
                            }
                            className="input-field w-24"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                        <select
                            value={selectedFeaturedSlug}
                            onChange={(e) => setSelectedFeaturedSlug(e.target.value)}
                            className="input-field w-full"
                        >
                            <option value="">Select university (auto slug)</option>
                            {universityOptions.map((item) => (
                                <option key={item.slug} value={item.slug}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => addSlug(selectedFeaturedSlug)}
                            disabled={!selectedFeaturedSlug}
                            className="btn-outline text-sm px-4 disabled:opacity-50"
                        >
                            Add Selected
                        </button>
                    </div>

                    {/* Add Slug */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="e.g. dhaka-university"
                            value={slugInput}
                            onChange={(e) => setSlugInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); addSlug(); }
                            }}
                            className="input-field flex-1"
                        />
                        <button onClick={() => addSlug()} className="btn-primary text-sm px-4">
                            Add
                        </button>
                    </div>

                    {/* Slug List */}
                    {local.featuredUniversitySlugs.length > 0 ? (
                        <div className="space-y-2">
                            {local.featuredUniversitySlugs.map((slug, idx) => (
                                <div
                                    key={slug}
                                    className="flex items-center gap-3 rounded-xl border border-card-border bg-surface/50 px-4 py-2.5"
                                >
                                    <button
                                        type="button"
                                        onClick={() => moveSlug(idx, 'up')}
                                        disabled={idx === 0}
                                        className="rounded p-0.5 text-slate-400 hover:text-primary disabled:opacity-30"
                                    >
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveSlug(idx, 'down')}
                                        disabled={idx === local.featuredUniversitySlugs.length - 1}
                                        className="rounded p-0.5 text-slate-400 hover:text-primary disabled:opacity-30"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <span className="text-xs w-5 text-center cw-muted">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-mono cw-text truncate">{slug}</span>
                                        <span className="block text-xs cw-muted truncate">{universityLabelBySlug.get(slug) || 'Unknown university slug'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSlug(slug)}
                                        className="rounded p-1 text-slate-400 hover:text-rose-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm cw-muted italic">No featured slugs yet. Add some above.</p>
                    )}
                </section>

                {/* Default Logo URL */}
                <section className="card-flat border border-cyan-500/10 p-5 space-y-4">
                    <h2 className="text-base font-semibold cw-text">Default University Logo</h2>
                    <p className="text-sm cw-muted">
                        Fallback logo shown when a university has no logo uploaded. Leave blank to use a placeholder icon.
                    </p>
                    <AdminImageUploadField
                        label="Fallback Logo"
                        value={local.defaultUniversityLogoUrl || ''}
                        onChange={(nextValue) =>
                            setLocal((prev) => ({
                                ...prev,
                                defaultUniversityLogoUrl: nextValue.trim() || null,
                            }))
                        }
                        helper="Used across home and university listings when a logo is missing."
                        category="admin_upload"
                        previewAlt="Default university logo"
                        fit="contain"
                        previewClassName="min-h-[170px]"
                    />
                </section>

                {/* Bottom Save */}
                <div className="flex justify-end gap-3 pb-4">
                    {isDirty && (
                        <button onClick={handleReset} className="btn-outline text-sm gap-2 inline-flex items-center">
                            <RefreshCw className="w-4 h-4" /> Discard Changes
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || mutation.isPending}
                        className="btn-primary text-sm gap-2 inline-flex items-center disabled:opacity-50"
                    >
                        {mutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save Settings
                    </button>
                </div>
            </div>
        </AdminGuardShell>
    );
}
