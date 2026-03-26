/**
 * Escape special regex characters in a string to safely use it
 * inside a MongoDB $regex query without risk of ReDoS or injection.
 */
export function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
