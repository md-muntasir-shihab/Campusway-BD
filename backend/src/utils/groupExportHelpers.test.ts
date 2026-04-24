import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    generateExportFilename,
    buildCategoryColumnDef,
    VALID_EXPORT_CATEGORIES,
} from './groupExportHelpers';

describe('generateExportFilename', () => {
    afterEach(() => { vi.restoreAllMocks(); });

    it('produces {slug}_members_{YYYYMMDD}.csv for csv format without category', () => {
        vi.useFakeTimers({ now: new Date('2025-03-15T10:00:00Z') });
        const result = generateExportFilename('cse-2025', undefined, 'csv');
        expect(result).toBe('cse-2025_members_20250315.csv');
        vi.useRealTimers();
    });

    it('produces {slug}_members_{YYYYMMDD}.xlsx for xlsx format without category', () => {
        vi.useFakeTimers({ now: new Date('2025-12-01T00:00:00Z') });
        const result = generateExportFilename('batch-a', undefined, 'xlsx');
        expect(result).toBe('batch-a_members_20251201.xlsx');
        vi.useRealTimers();
    });

    it('includes category suffix when category is provided', () => {
        vi.useFakeTimers({ now: new Date('2025-01-09T12:00:00Z') });
        const result = generateExportFilename('my-group', 'phone_list', 'csv');
        expect(result).toBe('my-group_members_phone_list_20250109.csv');
        vi.useRealTimers();
    });

    it('falls back to "group" when slug is empty', () => {
        vi.useFakeTimers({ now: new Date('2025-06-20T00:00:00Z') });
        const result = generateExportFilename('', undefined, 'xlsx');
        expect(result).toBe('group_members_20250620.xlsx');
        vi.useRealTimers();
    });

    it('zero-pads single-digit months and days', () => {
        vi.useFakeTimers({ now: new Date('2025-02-05T00:00:00Z') });
        const result = generateExportFilename('test', undefined, 'csv');
        expect(result).toBe('test_members_20250205.csv');
        vi.useRealTimers();
    });
});

describe('VALID_EXPORT_CATEGORIES', () => {
    it('contains exactly the four Data Hub categories', () => {
        expect(VALID_EXPORT_CATEGORIES).toEqual(['phone_list', 'email_list', 'guardians', 'audience_segment']);
    });
});

describe('buildCategoryColumnDef', () => {
    const prof: Record<string, unknown> = {
        full_name: 'Alice',
        phone_number: '01700000000',
        email: 'alice@example.com',
        department: 'CSE',
        hsc_batch: '2025',
        guardian_name: 'Bob',
        guardian_phone: '01800000000',
    };
    const user: Record<string, unknown> = {
        full_name: 'Alice User',
        phone_number: '01700000001',
        email: 'alice-user@example.com',
        status: 'active',
    };
    const mem: Record<string, unknown> = {
        joinedAtUTC: '2025-01-15T00:00:00.000Z',
        membershipStatus: 'active',
    };

    it('phone_list returns Name and Phone columns', () => {
        const def = buildCategoryColumnDef('phone_list');
        expect(def.columns).toEqual(['Name', 'Phone']);
        const row = def.extract(prof, user, mem);
        expect(row).toEqual(['Alice', '01700000000']);
    });

    it('email_list returns Name and Email columns', () => {
        const def = buildCategoryColumnDef('email_list');
        expect(def.columns).toEqual(['Name', 'Email']);
        const row = def.extract(prof, user, mem);
        expect(row).toEqual(['Alice', 'alice@example.com']);
    });

    it('guardians returns Name, Guardian Name, Guardian Phone columns', () => {
        const def = buildCategoryColumnDef('guardians');
        expect(def.columns).toEqual(['Name', 'Guardian Name', 'Guardian Phone']);
        const row = def.extract(prof, user, mem);
        expect(row).toEqual(['Alice', 'Bob', '01800000000']);
    });

    it('audience_segment returns all 7 required columns', () => {
        const def = buildCategoryColumnDef('audience_segment');
        expect(def.columns).toEqual(['Name', 'Phone', 'Email', 'Department', 'Batch', 'Join Date', 'Membership Status']);
        const row = def.extract(prof, user, mem);
        expect(row).toEqual([
            'Alice',
            '01700000000',
            'alice@example.com',
            'CSE',
            '2025',
            '2025-01-15T00:00:00.000Z',
            'active',
        ]);
    });

    it('undefined category returns full columns (same as audience_segment)', () => {
        const def = buildCategoryColumnDef(undefined);
        expect(def.columns).toEqual(['Name', 'Phone', 'Email', 'Department', 'Batch', 'Join Date', 'Membership Status']);
    });

    it('falls back to user fields when profile fields are missing', () => {
        const emptyProf: Record<string, unknown> = {};
        const def = buildCategoryColumnDef('phone_list');
        const row = def.extract(emptyProf, user, mem);
        expect(row).toEqual(['Alice User', '01700000001']);
    });

    it('handles missing membership gracefully for audience_segment', () => {
        const def = buildCategoryColumnDef('audience_segment');
        const row = def.extract(prof, user, undefined);
        expect(row[5]).toBe(''); // joinDate
        expect(row[6]).toBe('active'); // falls back to user.status
    });
});
