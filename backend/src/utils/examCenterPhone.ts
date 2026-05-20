export function normalizePhoneNumber(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '');
}

export function phoneLookupKeys(value: unknown): string[] {
    const raw = String(value ?? '').trim();
    const digits = normalizePhoneNumber(raw);
    if (!raw && !digits) return [];

    const keys = new Set<string>();
    if (raw) keys.add(raw);
    if (digits) keys.add(digits);

    if (digits.startsWith('880') && digits.length > 3) {
        keys.add(`0${digits.slice(3)}`);
    }

    if (digits.startsWith('0') && digits.length > 1) {
        keys.add(digits.slice(1));
    }

    if (digits.length > 10) {
        keys.add(digits.slice(-10));
    }

    return Array.from(keys);
}
