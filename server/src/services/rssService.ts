import Parser from 'rss-parser';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { sanitizeNewsHtml } from './newsUtils.js';

export interface ParsedFeedItem {
  title: string;
  link: string;
  guid: string;
  publishedAt?: Date | null;
  rawDescription: string;
  rawContent: string;
  imageUrl: string;
}

export const rssParser = new Parser();

export const parseFeedItems = async (rssUrl: string): Promise<ParsedFeedItem[]> => {
  const feed = await rssParser.parseURL(rssUrl);
  const items = Array.isArray(feed.items) ? feed.items : [];

  return items.map((item) => {
    const title = String(item.title || '').trim();
    const link = String(item.link || '').trim();
    const guid = String((item as any).guid || (item as any).id || '').trim();
    const rawDescription = String(item.contentSnippet || item.summary || '').trim();
    const rawContent = String((item as any)['content:encoded'] || item.content || rawDescription || '').trim();
    const imageUrl = extractFromFeedItem(item as Record<string, unknown>);
    const publishedAt = item.pubDate ? new Date(item.pubDate) : null;
    return { title, link, guid, publishedAt, rawDescription, rawContent, imageUrl };
  });
};

const extractFromFeedItem = (item: Record<string, unknown>) => {
  const mediaContent = (item['media:content' as keyof typeof item] as any) || (item.mediaContent as any);
  const enclosure = item.enclosure as { url?: string; href?: string } | undefined;
  const encoded = String((item['content:encoded' as keyof typeof item] as any) || item.content || '');

  const fromMedia = Array.isArray(mediaContent)
    ? String(mediaContent[0]?.$?.url || mediaContent[0]?.url || '')
    : String(mediaContent?.$?.url || mediaContent?.url || '');
  if (fromMedia) return fromMedia;

  const fromEnclosure = String(enclosure?.url || enclosure?.href || '');
  if (fromEnclosure) return fromEnclosure;

  const img = encoded.match(/<img[^>]+src=["']([^"']+)["']/i);
  return img?.[1] ? String(img[1]).trim() : '';
};

export const fetchReadableContent = async (url: string): Promise<string> => {
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

export const getFullArticleContent = async (
  mode: 'rss_content' | 'readability_scrape' | 'both',
  link: string,
  rawRssContent: string
): Promise<{ content: string; fetchedFullText: boolean }> => {
  const rssClean = sanitizeNewsHtml(rawRssContent || '');

  if (mode === 'rss_content') {
    return { content: rssClean, fetchedFullText: Boolean(rssClean) };
  }

  if (mode === 'readability_scrape') {
    try {
      const readable = await fetchReadableContent(link);
      return { content: readable || rssClean, fetchedFullText: Boolean(readable) };
    } catch {
      return { content: rssClean, fetchedFullText: false };
    }
  }

  if (rssClean) {
    return { content: rssClean, fetchedFullText: true };
  }

  try {
    const readable = await fetchReadableContent(link);
    return { content: readable || rssClean, fetchedFullText: Boolean(readable) };
  } catch {
    return { content: rssClean, fetchedFullText: false };
  }
};

