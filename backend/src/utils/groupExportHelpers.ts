/**
 * Helpers for group member export: filename generation and category column mapping.
 * Extracted for testability — also used inline in adminStudentMgmtRoutes.ts.
 */

export type ExportCategory = 'phone_list' | 'email_list' | 'guardians' | 'audience_segment';

export const VALID_EXPORT_CATEGORIES: ExportCategory[] = ['phone_list', 'email_list', 'guardians', 'audience_segment'];

/**
 * Generate a standardised export filename.
 * Pattern: {groupSlug}_members_{YYYYMMDD}.{format}
 */
export function generateExportFilename(groupSlug: string, category: string | undefined, format: 'csv' | 'xlsx'): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const slug = groupSlug || 'group';
    const suffix = category ? `_${category}` : '';
    return `${slug}_members${suffix}_${datePart}.${format}`;
}

/** Column definitions per Data Hub export category */
export interface CategoryColumnDef {
    columns: string[];
    extract: (prof: Record<string, unknown>, user: Record<string, unknown>, mem: Record<string, unknown> | undefined) => string[];
}

export function buildCategoryColumnDef(category: ExportCategory | undefined): CategoryColumnDef {
    const str = (v: unknown) => String(v ?? '');

    if (category === 'phone_list') {
        return {
            columns: ['Name', 'Phone'],
            extract: (prof, user) => [
                str(prof.full_name ?? user.full_name),
                str(prof.phone_number ?? user.phone_number),
            ],
        };
    }
    if (category === 'email_list') {
        return {
            columns: ['Name', 'Email'],
            extract: (prof, user) => [
                str(prof.full_name ?? user.full_name),
                str(prof.email ?? user.email),
            ],
        };
    }
    if (category === 'guardians') {
        return {
            columns: ['Name', 'Guardian Name', 'Guardian Phone'],
            extract: (prof, user) => [
                str(prof.full_name ?? user.full_name),
                str(prof.guardian_name),
                str(prof.guardian_phone),
            ],
        };
    }
    // 'audience_segment' or no category — full columns
    return {
        columns: ['Name', 'Phone', 'Email', 'Department', 'Batch', 'Join Date', 'Membership Status'],
        extract: (prof, user, mem) => [
            str(prof.full_name ?? user.full_name),
            str(prof.phone_number ?? user.phone_number),
            str(prof.email ?? user.email),
            str(prof.department),
            str(prof.hsc_batch),
            mem?.joinedAtUTC ? new Date(mem.joinedAtUTC as string | Date).toISOString() : '',
            str(mem?.membershipStatus ?? user.status),
        ],
    };
}
