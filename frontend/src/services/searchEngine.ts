import Fuse, { type IFuseOptions } from 'fuse.js';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Supported collection names for search */
export type SearchCollection = 'universities' | 'exams' | 'news' | 'resources';

/** A single faceted filter definition */
export interface FacetFilter {
    /** Filter by category string (exact match) */
    category?: string;
    /** Filter by status string (exact match) */
    status?: string;
    /** Filter items with date >= dateFrom */
    dateFrom?: string;
    /** Filter items with date <= dateTo */
    dateTo?: string;
}

/** Result returned from a search operation */
export interface SearchResult<T> {
    items: T[];
    query: string;
    filters: FacetFilter;
    total: number;
}

/** Configuration for a SearchEngine instance */
export interface SearchConfig {
    /** fuse.js keys to search on */
    keys: string[];
    /** fuse.js threshold (0 = exact, 1 = match anything). Default 0.3 */
    threshold?: number;
    /** Debounce delay in ms. Default 300 */
    debounceMs?: number;
    /** The field name used for date-range filtering */
    dateField?: string;
    /** The field name used for category filtering */
    categoryField?: string;
    /** The field name used for status filtering */
    statusField?: string;
}

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const PREFS_KEY_PREFIX = 'cw:search-prefs:';

export interface SearchPreferences {
    query: string;
    filters: FacetFilter;
}

function loadPreferences(collection: string): SearchPreferences | null {
    try {
        const raw = localStorage.getItem(`${PREFS_KEY_PREFIX}${collection}`);
        if (!raw) return null;
        return JSON.parse(raw) as SearchPreferences;
    } catch {
        return null;
    }
}

function savePreferences(collection: string, prefs: SearchPreferences): void {
    try {
        localStorage.setItem(`${PREFS_KEY_PREFIX}${collection}`, JSON.stringify(prefs));
    } catch {
        // localStorage full or unavailable — silently ignore
    }
}

function clearPreferences(collection: string): void {
    try {
        localStorage.removeItem(`${PREFS_KEY_PREFIX}${collection}`);
    } catch {
        // silently ignore
    }
}

/* ------------------------------------------------------------------ */
/*  SearchEngine class                                                 */
/* ------------------------------------------------------------------ */

export class SearchEngine<T extends Record<string, unknown>> {
    private fuse: Fuse<T>;
    private data: T[];
    private config: Required<SearchConfig>;
    private collection: string;

    constructor(data: T[], config: SearchConfig, collection: string = 'default') {
        this.data = data;
        this.collection = collection;
        this.config = {
            keys: config.keys,
            threshold: config.threshold ?? 0.3,
            debounceMs: config.debounceMs ?? 300,
            dateField: config.dateField ?? 'date',
            categoryField: config.categoryField ?? 'category',
            statusField: config.statusField ?? 'status',
        };

        const fuseOptions: IFuseOptions<T> = {
            keys: this.config.keys,
            threshold: this.config.threshold,
            includeScore: true,
            ignoreLocation: true,
        };

        this.fuse = new Fuse(data, fuseOptions);
    }

    /** Replace the dataset and rebuild the fuse index */
    updateData(data: T[]): void {
        this.data = data;
        this.fuse.setCollection(data);
    }

    /** Get the configured debounce delay */
    get debounceMs(): number {
        return this.config.debounceMs;
    }

    /** Load persisted search preferences for this collection */
    loadPreferences(): SearchPreferences | null {
        return loadPreferences(this.collection);
    }

    /** Persist current search preferences for this collection */
    savePreferences(prefs: SearchPreferences): void {
        savePreferences(this.collection, prefs);
    }

    /** Clear persisted preferences for this collection */
    clearPreferences(): void {
        clearPreferences(this.collection);
    }

    /**
     * Run a search with optional faceted filters.
     * - Empty query + no filters → returns all data
     * - Empty query + filters → returns filtered data
     * - Query + filters → fuzzy search then filter
     */
    search(query: string, filters: FacetFilter = {}): SearchResult<T> {
        const trimmedQuery = query.trim();
        const hasFilters = hasActiveFilters(filters);

        // When query is cleared, reset filters and return all data
        if (!trimmedQuery && !hasFilters) {
            this.clearPreferences();
            return { items: [...this.data], query: '', filters: {}, total: this.data.length };
        }

        // Get base results: fuzzy search or full dataset
        let results: T[];
        if (trimmedQuery) {
            results = this.fuse.search(trimmedQuery).map((r) => r.item);
        } else {
            results = [...this.data];
        }

        // Apply faceted filters
        if (hasFilters) {
            results = applyFilters(results, filters, this.config);
        }

        const prefs: SearchPreferences = { query: trimmedQuery, filters };
        this.savePreferences(prefs);

        return { items: results, query: trimmedQuery, filters, total: results.length };
    }
}

/* ------------------------------------------------------------------ */
/*  Filter helpers                                                     */
/* ------------------------------------------------------------------ */

/** Check if any filter is actively set */
export function hasActiveFilters(filters: FacetFilter): boolean {
    return Boolean(filters.category || filters.status || filters.dateFrom || filters.dateTo);
}

/** Apply faceted filters to a dataset */
function applyFilters<T extends Record<string, unknown>>(
    items: T[],
    filters: FacetFilter,
    config: Required<SearchConfig>,
): T[] {
    let result = items;

    if (filters.category) {
        const cat = filters.category.toLowerCase();
        result = result.filter((item) => {
            const val = item[config.categoryField];
            return typeof val === 'string' && val.toLowerCase() === cat;
        });
    }

    if (filters.status) {
        const status = filters.status.toLowerCase();
        result = result.filter((item) => {
            const val = item[config.statusField];
            return typeof val === 'string' && val.toLowerCase() === status;
        });
    }

    if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime();
        result = result.filter((item) => {
            const val = item[config.dateField];
            if (!val) return false;
            const d = new Date(val as string).getTime();
            return !isNaN(d) && d >= from;
        });
    }

    if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime();
        result = result.filter((item) => {
            const val = item[config.dateField];
            if (!val) return false;
            const d = new Date(val as string).getTime();
            return !isNaN(d) && d <= to;
        });
    }

    return result;
}

/* ------------------------------------------------------------------ */
/*  Pre-configured engines for each collection                         */
/* ------------------------------------------------------------------ */

export function createUniversitySearchEngine<T extends Record<string, unknown>>(data: T[]) {
    return new SearchEngine<T>(data, {
        keys: ['name', 'shortForm', 'category', 'slug'],
        threshold: 0.3,
        categoryField: 'category',
        dateField: 'createdAt',
    }, 'universities');
}

export function createExamSearchEngine<T extends Record<string, unknown>>(data: T[]) {
    return new SearchEngine<T>(data, {
        keys: ['title', 'subject', 'groupCategory', 'slug'],
        threshold: 0.3,
        categoryField: 'groupCategory',
        statusField: 'status',
        dateField: 'startDate',
    }, 'exams');
}

export function createNewsSearchEngine<T extends Record<string, unknown>>(data: T[]) {
    return new SearchEngine<T>(data, {
        keys: ['title', 'category', 'shortSummary', 'slug'],
        threshold: 0.3,
        categoryField: 'category',
        dateField: 'publishDate',
    }, 'news');
}

export function createResourceSearchEngine<T extends Record<string, unknown>>(data: T[]) {
    return new SearchEngine<T>(data, {
        keys: ['title', 'category', 'description'],
        threshold: 0.3,
        categoryField: 'category',
        dateField: 'createdAt',
    }, 'resources');
}
