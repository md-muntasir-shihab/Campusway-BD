export function extractYouTubeVideoId(rawUrl?: string | null): string | null {
    const value = String(rawUrl || '').trim();
    if (!value) return null;

    try {
        const url = new URL(value);
        const host = url.hostname.replace(/^www\./, '').toLowerCase();

        if (host === 'youtu.be') {
            const id = url.pathname.split('/').filter(Boolean)[0] || '';
            return id || null;
        }

        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            if (url.pathname === '/watch') {
                const id = url.searchParams.get('v') || '';
                return id || null;
            }

            const segments = url.pathname.split('/').filter(Boolean);
            if (segments[0] === 'shorts' || segments[0] === 'embed' || segments[0] === 'live') {
                return segments[1] || null;
            }
        }
    } catch {
        return null;
    }

    return null;
}

export function isYouTubeUrl(rawUrl?: string | null): boolean {
    return Boolean(extractYouTubeVideoId(rawUrl));
}

export function buildYouTubeEmbedUrl(rawUrl?: string | null): string | null {
    const videoId = extractYouTubeVideoId(rawUrl);
    if (!videoId) return null;
    return `https://www.youtube.com/embed/${videoId}`;
}
