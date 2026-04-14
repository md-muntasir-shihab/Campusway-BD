const DEFAULT_LOGO_PATH = '/logo.svg';
const STATIC_PUBLIC_ASSETS = new Set(['logo.svg', 'logo.png', 'favicon.ico']);
const DEFAULT_LOGO_INLINE_SVG =
    '<svg width="256" height="256" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="rg" x1="90" y1="70" x2="430" y2="450" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#46c4d6"/><stop offset="0.52" stop-color="#3e79b8"/><stop offset="1" stop-color="#7d2fb3"/></linearGradient><linearGradient id="ag" x1="170" y1="330" x2="362" y2="176" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2ac8d2"/><stop offset="0.62" stop-color="#5a52bf"/><stop offset="1" stop-color="#38d8df"/></linearGradient><linearGradient id="cg" x1="184" y1="170" x2="331" y2="229" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1d2e4b"/><stop offset="1" stop-color="#102340"/></linearGradient></defs><circle cx="256" cy="256" r="224" fill="#ffffff"/><circle cx="256" cy="256" r="223" fill="none" stroke="url(#rg)" stroke-width="18"/><path d="M149 349C178 325 205 327 230 355L330 253L359 281L258 382C229 412 197 415 160 397L129 383L149 349Z" fill="url(#ag)"/><path d="M323 274L389 208L420 239L354 307L323 274Z" fill="url(#ag)"/><path d="M172 164L254 132L335 165L254 196L172 164Z" fill="url(#cg)"/><path d="M185 173V219" stroke="#0d1f3c" stroke-width="6" stroke-linecap="round"/><circle cx="185" cy="226" r="8" fill="#0d1f3c"/></svg>';

function getInlineDefaultLogo(): string {
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEFAULT_LOGO_INLINE_SVG)}`;
}

/**
 * Resolve media URL for uploaded files and logos.
 * On production, uses absolute backend URL to support cross-domain requests.
 * On development, uses relative path (/uploads).
 */
export function buildMediaUrl(relativePath: string | undefined | null): string {
    if (!relativePath) return getInlineDefaultLogo();
    if (typeof relativePath !== 'string') return getInlineDefaultLogo();
    
    const trimmed = relativePath.trim();
    if (!trimmed) return getInlineDefaultLogo();
    if (trimmed.startsWith('http')) return trimmed;
    
    const cleanPath = trimmed.replace(/^\/+/, '');
    if (!cleanPath) return getInlineDefaultLogo();

    if (cleanPath === 'logo.png') {
        return DEFAULT_LOGO_PATH;
    }

    if (STATIC_PUBLIC_ASSETS.has(cleanPath)) {
        return `/${cleanPath}`;
    }

    const isUploadAsset = cleanPath.startsWith('uploads/');
    
    // In production, construct absolute URL to backend for uploads.
    if (isUploadAsset && import.meta.env.PROD) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
        if (backendUrl.trim()) {
            const normalized = backendUrl.trim().replace(/\/+$/, '');
            return `${normalized}/${cleanPath}`;
        }
    }
    
    // In development or for non-upload assets, use relative path.
    return `/${cleanPath}`;
}
