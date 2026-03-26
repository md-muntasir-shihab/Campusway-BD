import crypto from 'crypto';
import sanitizeHtml from 'sanitize-html';
export const sanitizeNewsHtml = (input) => sanitizeHtml(input || '', {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'figure', 'figcaption']),
    allowedAttributes: {
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        '*': ['class']
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
        a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' })
    }
}).trim();
export const textFromHtml = (html) => String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
export const normalizedHash = (value) => crypto.createHash('sha256').update(String(value || '').trim().toLowerCase()).digest('hex');
export const canonicalizeUrl = (value) => {
    try {
        const url = new URL(value);
        const dropParams = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'igshid']);
        [...url.searchParams.keys()].forEach((key) => {
            if (dropParams.has(key.toLowerCase())) {
                url.searchParams.delete(key);
            }
        });
        url.hash = '';
        const path = url.pathname.replace(/\/$/, '') || '/';
        return `${url.protocol}//${url.hostname.toLowerCase()}${path}${url.search ? `?${url.searchParams.toString()}` : ''}`;
    }
    catch {
        return String(value || '').trim().toLowerCase();
    }
};
const tokenize = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
export const titleSimilarity = (left, right) => {
    const a = new Set(tokenize(left));
    const b = new Set(tokenize(right));
    if (a.size === 0 || b.size === 0)
        return 0;
    let inter = 0;
    a.forEach((token) => {
        if (b.has(token))
            inter += 1;
    });
    const union = new Set([...a, ...b]).size;
    return union === 0 ? 0 : inter / union;
};
export const buildSharePayload = (template, title, summary, url) => {
    const values = {
        title: title || '',
        summary: summary || '',
        url: url || ''
    };
    const interpolate = (src) => String(src || '')
        .replace(/\{title\}/g, values.title)
        .replace(/\{summary\}/g, values.summary)
        .replace(/\{url\}/g, values.url)
        .trim();
    const text = {
        whatsapp: interpolate(template.whatsapp || '{title}\n{url}'),
        facebook: interpolate(template.facebook || '{title} {url}'),
        messenger: interpolate(template.messenger || '{title} {url}'),
        telegram: interpolate(template.telegram || '{title}\n{url}')
    };
    const links = {
        whatsapp: `https://wa.me/?text=${encodeURIComponent(text.whatsapp)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
        messenger: `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text.telegram)}`
    };
    return { text, links };
};
export const extractImageFromRssItem = (item) => {
    const mediaContent = item['media:content'] || item.mediaContent;
    const enclosure = item.enclosure;
    const mediaThumb = item['media:thumbnail'] || item.mediaThumbnail;
    const encoded = String(item['content:encoded'] || item.content || '');
    const fromMedia = Array.isArray(mediaContent)
        ? String(mediaContent[0]?.$?.url || mediaContent[0]?.url || '')
        : String(mediaContent?.$?.url || mediaContent?.url || '');
    if (fromMedia)
        return fromMedia;
    const fromEnclosure = String(enclosure?.url || enclosure?.href || '');
    if (fromEnclosure)
        return fromEnclosure;
    const fromThumb = Array.isArray(mediaThumb)
        ? String(mediaThumb[0]?.$?.url || mediaThumb[0]?.url || '')
        : String(mediaThumb?.$?.url || mediaThumb?.url || '');
    if (fromThumb)
        return fromThumb;
    const match = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1] ? String(match[1]).trim() : '';
};
