import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import UniversityGrid from './UniversityGrid';
import UniversityFilterBar from './UniversityFilterBar';
import FilterBottomSheet from './FilterBottomSheet';
import {
    useUniversityCategories,
    useUniversities,
    usePublicHomeSettings,
    usePublicUniversityBrowseSettings,
} from '../../hooks/useUniversityQueries';
import type { UniversityCardSort } from '../../services/api';
import { toSlug, type UniversityCategoryDetail } from '../../lib/apiClient';
import type { UniversityCardVisualVariant } from './UniversityCard';

function sortCategories(items: UniversityCategoryDetail[]): UniversityCategoryDetail[] {
    return [...items].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

const UNIVERSITY_SORT_OPTIONS: UniversityCardSort[] = [
    'nearest_deadline',
    'alphabetical',
    'name_asc',
    'name_desc',
    'closing_soon',
    'exam_soon',
];

function normalizeUniversitySort(value: string, fallback: UniversityCardSort = 'name_asc'): UniversityCardSort {
    return UNIVERSITY_SORT_OPTIONS.includes(value as UniversityCardSort)
        ? (value as UniversityCardSort)
        : fallback;
}

function resolvePublicDefaultSort(value: string | undefined): UniversityCardSort {
    const normalized = normalizeUniversitySort(value || '', 'name_asc');
    if (normalized === 'alphabetical') {
        return 'name_asc';
    }
    if (normalized === 'nearest_deadline') {
        return 'closing_soon';
    }
    return normalized;
}

function resolveCategorySlug(value: string, categories: UniversityCategoryDetail[]): string {
    const normalized = String(value || '').trim();
    if (!normalized) return 'all';
    if (normalized.toLowerCase() === 'all') return 'all';
    const directSlugMatch = categories.find((item) => item.categorySlug === normalized);
    if (directSlugMatch) return directSlugMatch.categorySlug || normalized;
    const directNameMatch = categories.find((item) => item.categoryName.toLowerCase() === normalized.toLowerCase());
    if (directNameMatch) return directNameMatch.categorySlug || toSlug(directNameMatch.categoryName);
    const slugified = toSlug(normalized);
    const slugMatch = categories.find((item) => item.categorySlug === slugified);
    return slugMatch?.categorySlug || slugified;
}

interface UniversityBrowseShellProps {
    /** Lock category (category browse page) */
    fixedCategory?: string;
    /** Lock cluster group (cluster browse page) */
    fixedCluster?: string;
    /** Page header */
    title?: string;
    subtitle?: string;
    /** Hide category chip tabs (e.g. on a category-specific page) */
    hideCategoryTabs?: boolean;
    cardVariant?: UniversityCardVisualVariant;
}

export default function UniversityBrowseShell({
    fixedCategory,
    fixedCluster,
    title = 'Universities',
    subtitle = 'Browse universities grouped by category. Tap a category to filter.',
    hideCategoryTabs = false,
    cardVariant = 'modern',
}: UniversityBrowseShellProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const categoryFromUrl = searchParams.get('category') || '';
    const clusterFromUrl = searchParams.get('cluster') || '';
    const searchFromUrl = searchParams.get('q') || '';

    const homeSettingsQuery = usePublicHomeSettings();
    const browseSettingsQuery = usePublicUniversityBrowseSettings();
    const categoriesQuery = useUniversityCategories();

    const categories = useMemo(() => sortCategories(categoriesQuery.data || []), [categoriesQuery.data]);
    const defaultCategoryFromAdmin = String(browseSettingsQuery.data?.defaultCategory || '').trim();
    const showClusterFilter = browseSettingsQuery.data?.enableClusterFilterOnUniversities !== false;
    const adminDefaultSort: UniversityCardSort = resolvePublicDefaultSort(
        homeSettingsQuery.data?.universityCardConfig?.defaultSort,
    );
    const sortFromUrl = normalizeUniversitySort(searchParams.get('sort') || '', adminDefaultSort);

    const [search, setSearch] = useState(searchFromUrl);
    const [debouncedSearch, setDebouncedSearch] = useState(searchFromUrl);
    const [selectedCluster, setSelectedCluster] = useState(fixedCluster || clusterFromUrl || '');
    const [sort, setSort] = useState<UniversityCardSort>(sortFromUrl);
    const [filterOpen, setFilterOpen] = useState(false);

    const resolvedCategorySlug = useMemo(() => {
        if (fixedCategory) return resolveCategorySlug(fixedCategory, categories);
        if (categoryFromUrl) return resolveCategorySlug(categoryFromUrl, categories);
        if (defaultCategoryFromAdmin) return resolveCategorySlug(defaultCategoryFromAdmin, categories);
        return 'all';
    }, [categories, categoryFromUrl, defaultCategoryFromAdmin, fixedCategory]);

    const syncUrlState = useCallback((next: {
        category?: string;
        cluster?: string;
        q?: string;
        sort?: string;
    }) => {
        const params = new URLSearchParams(searchParams);
        const categoryValue = fixedCategory ? resolvedCategorySlug : (next.category ?? resolvedCategorySlug);
        const clusterValue = fixedCluster ? fixedCluster : (next.cluster ?? selectedCluster);
        const searchValue = next.q ?? search;
        const sortValue = next.sort ?? sort;

        if (!fixedCategory && categoryValue && categoryValue.toLowerCase() !== 'all') params.set('category', categoryValue);
        else params.delete('category');

        if (!fixedCluster && clusterValue) params.set('cluster', clusterValue);
        else params.delete('cluster');

        if (searchValue.trim()) params.set('q', searchValue.trim());
        else params.delete('q');

        if (sortValue && sortValue !== adminDefaultSort) params.set('sort', sortValue);
        else params.delete('sort');

        const nextParams = params.toString();
        const currentParams = searchParams.toString();
        if (nextParams === currentParams) return;

        setSearchParams(params, { replace: true });
    }, [adminDefaultSort, fixedCategory, fixedCluster, resolvedCategorySlug, searchParams, selectedCluster, search, sort, setSearchParams]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedSearch(search);
        }, 350);
        return () => window.clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        setSearch((current) => current === searchFromUrl ? current : searchFromUrl);
    }, [searchFromUrl]);

    useEffect(() => {
        setSort((current) => current === sortFromUrl ? current : sortFromUrl);
    }, [sortFromUrl]);

    useEffect(() => {
        if (fixedCluster) {
            setSelectedCluster((current) => current === fixedCluster ? current : fixedCluster);
            return;
        }
        setSelectedCluster((current) => current === clusterFromUrl ? current : clusterFromUrl);
    }, [clusterFromUrl, fixedCluster]);

    const handleCategoryChange = useCallback((categorySlug: string) => {
        if (fixedCategory) return;
        setSelectedCluster('');
        syncUrlState({ category: categorySlug, cluster: '' });
    }, [syncUrlState, fixedCategory]);

    const activeCategory = resolvedCategorySlug;
    const activeCategoryMeta = useMemo(
        () => activeCategory === 'all' ? null : categories.find((item) => item.categorySlug === activeCategory || item.categoryName === activeCategory) || null,
        [categories, activeCategory],
    );
    const activeCategoryQueryValue = activeCategory === 'all'
        ? 'all'
        : activeCategoryMeta?.categoryName || activeCategory;
    const clusters = useMemo(() => {
        if (activeCategory === 'all') {
            return Array.from(
                new Set(
                    categories.flatMap((item) => item.clusterGroups || []).filter(Boolean),
                ),
            ).sort((left, right) => left.localeCompare(right));
        }
        return (activeCategoryMeta?.clusterGroups || []).filter(Boolean);
    }, [activeCategory, activeCategoryMeta, categories]);

    const effectiveCluster = useMemo(() => {
        if (fixedCluster) return fixedCluster;
        if (!selectedCluster) return '';
        return clusters.includes(selectedCluster) ? selectedCluster : '';
    }, [clusters, fixedCluster, selectedCluster]);

    useEffect(() => {
        if (!selectedCluster || fixedCluster) return;
        if (!effectiveCluster) {
            setSelectedCluster('');
        }
    }, [effectiveCluster, fixedCluster, selectedCluster]);

    useEffect(() => {
        if (showClusterFilter) return;
        setSelectedCluster('');
    }, [showClusterFilter]);

    useEffect(() => {
        syncUrlState({});
    }, [search, selectedCluster, sort, activeCategory, syncUrlState]);

    const universitiesQuery = useUniversities({
        category: activeCategoryQueryValue,
        clusterGroup: effectiveCluster || undefined,
        q: debouncedSearch.trim() || undefined,
        sort,
    });

    const mappedItems = useMemo(
        () => {
            const seen = new Set<string>();
            return (universitiesQuery.data || []).filter((item) => {
                const candidate = item as unknown as { id?: string; _id?: string; slug?: string; title?: string };
                const key = String(candidate.id || candidate._id || candidate.slug || candidate.title || '').trim();
                if (!key) return true;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        },
        [universitiesQuery.data],
    );
    const animationLevel = homeSettingsQuery.data?.ui?.animationLevel || 'minimal';
    const cardConfig = homeSettingsQuery.data?.universityCardConfig;
    const hasActiveFilters = Boolean(search.trim() || effectiveCluster);

    return (
        <div className="section-container py-6 sm:py-8 overflow-x-hidden">
            {/* Page title */}
            <div className="mb-4">
                <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-text dark:text-dark-text">{title}</h1>
                <p className="mt-1 text-xs sm:text-sm text-text-muted dark:text-dark-text/70">{subtitle}</p>
            </div>

            {/* Filter bar */}
            <UniversityFilterBar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                search={search}
                setSearch={setSearch}
                sort={sort}
                setSort={setSort}
                clusters={clusters}
                showClusterFilter={showClusterFilter}
                selectedCluster={effectiveCluster}
                setSelectedCluster={setSelectedCluster}
                hasActiveFilters={hasActiveFilters}
                onOpenMobileFilters={() => setFilterOpen(true)}
                onClearFilters={() => {
                    setSearch('');
                    setSelectedCluster('');
                    setSort(adminDefaultSort);
                    syncUrlState({ cluster: '', q: '', sort: adminDefaultSort });
                }}
                hideCategoryTabs={hideCategoryTabs}
            />

            {/* University grid */}
            <div className="mt-5 sm:mt-6">
                {universitiesQuery.isError ? (
                    <div className="mb-4 card-flat p-4 text-sm">
                        <p className="inline-flex items-center gap-2 font-semibold text-danger">
                            <TriangleAlert className="h-4 w-4" />
                            Failed to load universities
                        </p>
                        <button
                            type="button"
                            onClick={() => universitiesQuery.refetch()}
                            className="btn-secondary mt-3"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </button>
                    </div>
                ) : null}
                <UniversityGrid
                    items={mappedItems as unknown as Record<string, unknown>[]}
                    config={cardConfig}
                    animationLevel={animationLevel}
                    loading={universitiesQuery.isLoading || (universitiesQuery.isFetching && universitiesQuery.isPlaceholderData)}
                    emptyText="No universities in this category."
                    sort={sort}
                    cardVariant={cardVariant}
                />
            </div>

            {/* Mobile bottom sheet */}
            <FilterBottomSheet
                open={filterOpen}
                onClose={() => setFilterOpen(false)}
                search={search}
                setSearch={setSearch}
                sort={sort}
                setSort={setSort}
                clusters={clusters}
                showClusterFilter={showClusterFilter}
                selectedCluster={effectiveCluster}
                setSelectedCluster={setSelectedCluster}
            />
        </div>
    );
}
