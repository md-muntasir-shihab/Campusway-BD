const URL_PATTERN = /https?:\/\/[^\s]+/gi;

function stripHtml(input: string): string {
    return input.replace(/<[^>]*>/g, ' ');
}

export function toSafePreviewText(
    input: unknown,
    fallback = '',
    maxLength = 180
): string {
    if (typeof input !== 'string') return fallback;

    let text = stripHtml(input)
        .replace(/\s+/g, ' ')
        .trim();

    if (!text) return fallback;

    const urls = text.match(URL_PATTERN) || [];
    if (urls.length > 0) {
        text = text
            .replace(URL_PATTERN, '[link]')
            .replace(/(?:\[link\]\s*){3,}/gi, '[links] ');
    }

    if (text.length > maxLength) {
        text = `${text.slice(0, maxLength).trimEnd()}...`;
    }

    const letterCount = (text.match(/[A-Za-z\u0980-\u09FF]/g) || []).length;
    if (urls.length > 0 && letterCount < 8) {
        return fallback || 'Open details to view full content.';
    }

    return text;
}

