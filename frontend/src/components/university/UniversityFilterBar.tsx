import { Search, SlidersHorizontal } from 'lucide-react';
import type { UniversityCardSort } from '../../services/api';
import type { UniversityCategoryDetail } from '../../lib/apiClient';
import CategoryChipRow from './CategoryChipRow';

interface UniversityFilterBarProps {
    categories: UniversityCategoryDetail[];
    activeCategory: string;
    onCategoryChange: (cat: string) => void;
    search: string;
    setSearch: (v: string) => void;
    sort: UniversityCardSort;
    setSort: (v: UniversityCardSort) => void;
    clusters: string[];
    showClusterFilter?: boolean;
    selectedCluster: string;
    setSelectedCluster: (v: string) => void;
    hasActiveFilters: boolean;
    onOpenMobileFilters: () => void;
    onClearFilters: () => void;
    /** Hide category tabs (e.g. on a category-specific page) */
    hideCategoryTabs?: boolean;
}

export default function UniversityFilterBar({
    categories,
    activeCategory,
    onCategoryChange,
    search,
    setSearch,
    sort,
    setSort,
    clusters,
    showClusterFilter = true,
    selectedCluster,
    setSelectedCluster,
    hasActiveFilters,
    onOpenMobileFilters,
    onClearFilters,
    hideCategoryTabs = false,
}: UniversityFilterBarProps) {
    return (
        <div className="sticky top-14 sm:top-16 z-20 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl border-y sm:border border-card-border/70 bg-white/95 p-3 shadow-sm backdrop-blur dark:border-dark-border/70 dark:bg-slate-900/95">
            {/* Category tabs */}
            {!hideCategoryTabs && (
                <CategoryChipRow
                    categories={categories}
                    activeCategory={activeCategory}
                    onCategoryChange={onCategoryChange}
                />
            )}

            {/* Desktop inline filters */}
            <div className={`hidden md:flex gap-3 items-end ${!hideCategoryTabs ? 'mt-3' : ''}`}>
                <div className="flex-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1 block">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name or short form..."
                            className="input-field h-10 pl-10"
                        />
                    </div>
                </div>
                {showClusterFilter && clusters.length > 0 && (
                    <div className="w-52">
                        <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1 block">
                            Cluster Group
                        </label>
                        <select
                            value={selectedCluster}
                            onChange={(e) => setSelectedCluster(e.target.value)}
                            className="input-field h-10"
                        >
                            <option value="">All Clusters</option>
                            {clusters.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
                <div className="w-48">
                    <label className="text-xs font-bold uppercase tracking-wider text-text-muted dark:text-dark-text/50 mb-1 block">
                        Sort By
                    </label>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as UniversityCardSort)}
                        className="input-field h-10"
                    >
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="closing_soon">Closing Soon</option>
                        <option value="exam_soon">Exam Soon</option>
                    </select>
                </div>
            </div>

            {/* Mobile filters */}
            <div className={`${!hideCategoryTabs ? 'mt-2.5' : ''} md:hidden space-y-2`}>
                <div className="relative min-w-0">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search by name..."
                        className="input-field h-9 w-full pl-9 pr-3 text-sm"
                        aria-label="Search universities"
                    />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                    <div className="min-w-0">
                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted dark:text-dark-text/50">
                            Sort By
                        </label>
                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value as UniversityCardSort)}
                            className="input-field h-9 w-full text-sm"
                            aria-label="Sort universities"
                        >
                            <option value="name_asc">Name (A-Z)</option>
                            <option value="name_desc">Name (Z-A)</option>
                            <option value="closing_soon">Closing Soon</option>
                            <option value="exam_soon">Exam Soon</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={onOpenMobileFilters}
                        className="btn-outline h-9 gap-1.5 px-3 text-xs font-semibold flex-shrink-0"
                        aria-label="Open more filters"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
                                !
                            </span>
                        )}
                    </button>
                </div>
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="mt-2 text-xs text-text-muted hover:text-danger"
                    >
                        Clear filters
                    </button>
                )}
            </div>
        </div>
    );
}

