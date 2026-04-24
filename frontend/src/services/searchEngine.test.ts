import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    SearchEngine,
    hasActiveFilters,
    type FacetFilter,
    type SearchPreferences,
} from './searchEngine';

/* ------------------------------------------------------------------ */
/*  Test data                                                          */
/* ------------------------------------------------------------------ */
interface TestItem {
    _id: string;
    name: string;
    category: string;
    status: string;
    date: string;
    [key: string]: unknown;
}

const ITEMS: TestItem[] = [
    { _id: '1', name: 'Dhaka University', category: 'Public', status: 'active', date: '2024-01-15' },
    { _id: '2', name: 'BUET', category: 'Engineering', status: 'active', date: '2024-03-20' },
    { _id: '3', name: 'Chittagong University', category: 'Public', status: 'inactive', date: '2024-06-10' },
    { _id: '4', name: 'BRAC University', category: 'Private', status: 'active', date: '2023-11-05' },
    { _id: '5', name: 'North South University', category: 'Private', status: 'inactive', date: '2024-02-28' },
];

const CONFIG = {
    keys: ['name', 'category'],
    threshold: 0.3,
    categoryField: 'category',
    statusField: 'status',
    dateField: 'date',
};

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('SearchEngine', () => {
    let engine: SearchEngine<TestItem>;

    beforeEach(() => {
        localStorage.clear();
        engine = new SearchEngine(ITEMS, CONFIG, 'test-collection');
    });

    describe('fuzzy search', () => {
        it('returns all items when query is empty and no filters', () => {
            const result = engine.search('');
            expect(result.items).toHaveLength(ITEMS.length);
            expect(result.query).toBe('');
        });

        it('finds items by fuzzy name match', () => {
            const result = engine.search('Dhaka');
            expect(result.items.length).toBeGreaterThanOrEqual(1);
            expect(result.items.some((i) => i.name.includes('Dhaka'))).toBe(true);
        });

        it('finds items by category', () => {
            const result = engine.search('Engineering');
            expect(result.items.some((i) => i.category === 'Engineering')).toBe(true);
        });

        it('returns empty for non-matching query', () => {
            const result = engine.search('xyznonexistent12345');
            expect(result.items).toHaveLength(0);
        });
    });

    describe('faceted filters', () => {
        it('filters by category', () => {
            const result = engine.search('', { category: 'Public' });
            expect(result.items.every((i) => i.category.toLowerCase() === 'public')).toBe(true);
            expect(result.items.length).toBe(2);
        });

        it('filters by status', () => {
            const result = engine.search('', { status: 'inactive' });
            expect(result.items.every((i) => i.status.toLowerCase() === 'inactive')).toBe(true);
            expect(result.items.length).toBe(2);
        });

        it('filters by date range (dateFrom)', () => {
            const result = engine.search('', { dateFrom: '2024-03-01' });
            result.items.forEach((item) => {
                expect(new Date(item.date).getTime()).toBeGreaterThanOrEqual(new Date('2024-03-01').getTime());
            });
        });

        it('filters by date range (dateTo)', () => {
            const result = engine.search('', { dateTo: '2024-01-31' });
            result.items.forEach((item) => {
                expect(new Date(item.date).getTime()).toBeLessThanOrEqual(new Date('2024-01-31').getTime());
            });
        });

        it('combines category and status filters', () => {
            const result = engine.search('', { category: 'Private', status: 'active' });
            expect(result.items.length).toBe(1);
            expect(result.items[0].name).toBe('BRAC University');
        });

        it('combines text search with filters', () => {
            const result = engine.search('University', { category: 'Public' });
            expect(result.items.every((i) => i.category.toLowerCase() === 'public')).toBe(true);
        });
    });

    describe('debounce configuration', () => {
        it('defaults to 300ms debounce', () => {
            const eng = new SearchEngine(ITEMS, { keys: ['name'] }, 'test');
            expect(eng.debounceMs).toBe(300);
        });

        it('respects custom debounce value', () => {
            const eng = new SearchEngine(ITEMS, { keys: ['name'], debounceMs: 500 }, 'test');
            expect(eng.debounceMs).toBe(500);
        });
    });

    describe('clear search resets filters', () => {
        it('returns all items and empty filters when query is cleared', () => {
            // First do a filtered search
            engine.search('Dhaka', { category: 'Public' });
            // Then clear
            const result = engine.search('');
            expect(result.items).toHaveLength(ITEMS.length);
            expect(result.filters).toEqual({});
            expect(result.query).toBe('');
        });
    });

    describe('localStorage persistence', () => {
        it('saves preferences on search', () => {
            engine.search('Dhaka', { category: 'Public' });
            const prefs = engine.loadPreferences();
            expect(prefs).not.toBeNull();
            expect(prefs!.query).toBe('Dhaka');
            expect(prefs!.filters.category).toBe('Public');
        });

        it('clears preferences when search is cleared', () => {
            engine.search('Dhaka', { category: 'Public' });
            engine.search('');
            const prefs = engine.loadPreferences();
            expect(prefs).toBeNull();
        });

        it('persists per collection', () => {
            const engine2 = new SearchEngine(ITEMS, CONFIG, 'other-collection');
            engine.search('Dhaka');
            engine2.search('BUET');
            expect(engine.loadPreferences()!.query).toBe('Dhaka');
            expect(engine2.loadPreferences()!.query).toBe('BUET');
        });
    });

    describe('updateData', () => {
        it('rebuilds index with new data', () => {
            const newItems: TestItem[] = [
                { _id: '10', name: 'New University', category: 'Public', status: 'active', date: '2024-07-01' },
            ];
            engine.updateData(newItems);
            const result = engine.search('');
            expect(result.items).toHaveLength(1);
            expect(result.items[0].name).toBe('New University');
        });
    });
});

describe('hasActiveFilters', () => {
    it('returns false for empty filters', () => {
        expect(hasActiveFilters({})).toBe(false);
    });

    it('returns true when category is set', () => {
        expect(hasActiveFilters({ category: 'Public' })).toBe(true);
    });

    it('returns true when dateFrom is set', () => {
        expect(hasActiveFilters({ dateFrom: '2024-01-01' })).toBe(true);
    });

    it('returns false for undefined values', () => {
        expect(hasActiveFilters({ category: undefined, status: undefined })).toBe(false);
    });
});
