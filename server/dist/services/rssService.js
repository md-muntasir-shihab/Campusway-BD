import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { sanitizeNewsHtml } from './newsUtils.js';
export const rssParser = new Parser();
export const parseFeedItems = async (rssUrl) => {
    const feed = await rssParser.parseURL(rssUrl);
    const items = Array.isArray(feed.items) ? feed.items : [];
    return items.map((item) => {
        const title = String(item.title || '').trim();
        const link = String(item.link || '').trim();
        const guid = String(item.guid || item.id || '').trim();
        const rawDescription = String(item.contentSnippet || item.summary || '').trim();
        const rawContent = String(item['content:encoded'] || item.content || rawDescription || '').trim();
        const imageUrl = extractFromFeedItem(item);
        const publishedAt = item.pubDate ? new Date(item.pubDate) : null;
        return { title, link, guid, publishedAt, rawDescription, rawContent, imageUrl };
    });
};
const extractFromFeedItem = (item) => {
    const mediaContent = item['media:content'] || item.mediaContent;
    const enclosure = item.enclosure;
    const encoded = String(item['content:encoded'] || item.content || '');
    const fromMedia = Array.isArray(mediaContent)
        ? String(mediaContent[0]?.$?.url || mediaContent[0]?.url || '')
        : String(mediaContent?.$?.url || mediaContent?.url || '');
    if (fromMedia)
        return fromMedia;
    const fromEnclosure = String(enclosure?.url || enclosure?.href || '');
    if (fromEnclosure)
        return fromEnclosure;
    const img = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
    return img?.[1] ? String(img[1]).trim() : '';
};
export const fetchReadableContent = async (url) => {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'CampusWayNewsBot/1.0 (+https://campusway.local)'
        }
    });
    if (!response.ok) {
        throw new Error(`Unable to fetch article: ${response.status}`);
    }
    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    return sanitizeNewsHtml(article?.content || '');
};
export const getFullArticleContent = async (mode, link, rawRssContent) => {
    const rssClean = sanitizeNewsHtml(rawRssContent || '');
    if (mode === 'rss_content') {
        return { content: rssClean, fetchedFullText: Boolean(rssClean) };
    }
    if (mode === 'readability_scrape') {
        try {
            const readable = await fetchReadableContent(link);
            return { content: readable || rssClean, fetchedFullText: Boolean(readable) };
        }
        catch {
            return { content: rssClean, fetchedFullText: false };
        }
    }
    if (rssClean) {
        return { content: rssClean, fetchedFullText: true };
    }
    try {
        const readable = await fetchReadableContent(link);
        return { content: readable || rssClean, fetchedFullText: Boolean(readable) };
    }
    catch {
        return { content: rssClean, fetchedFullText: false };
    }
};
