import { sanitizeNewsHtml, textFromHtml } from './newsUtils.js';
const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'are', 'was', 'have', 'has', 'will']);
export const generateStrictExtractiveDraft = (input) => {
    const baseTitle = String(input.rawTitle || '').trim();
    const text = [input.rawDescription, input.rawContent]
        .map((chunk) => textFromHtml(chunk || ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!baseTitle && !text) {
        return {
            title: 'Untitled update',
            shortSummary: 'Insufficient source content to generate a summary.',
            fullContent: sanitizeNewsHtml(`<p>Insufficient source content to generate details.</p><p>Source: ${input.sourceName} - <a href="${input.originalArticleUrl}">${input.originalArticleUrl}</a></p>`),
            tags: [],
            category: 'general',
            aiNotes: 'insufficient content',
            aiModel: 'extractive-v1'
        };
    }
    const sentences = text
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter(Boolean);
    const summaryParts = [];
    let summaryLength = 0;
    for (const sentence of sentences) {
        if (summaryLength > 220)
            break;
        summaryParts.push(sentence);
        summaryLength += sentence.length;
    }
    const summary = summaryParts.join(' ').trim() || text.slice(0, 240);
    const contentBody = [
        `<p>${summary}</p>`,
        ...sentences.slice(summaryParts.length, summaryParts.length + 8).map((sentence) => `<p>${sentence}</p>`),
        `<p><strong>Source:</strong> ${input.sourceName} - <a href="${input.originalArticleUrl}">${input.originalArticleUrl}</a></p>`
    ].join('');
    const tokens = `${baseTitle} ${summary}`
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 3 && !STOP_WORDS.has(word));
    const uniqueTags = Array.from(new Set(tokens)).slice(0, 6);
    const category = uniqueTags.find((tag) => ['admission', 'scholarship', 'education', 'university', 'exam'].includes(tag)) ||
        'education';
    const limitedSummary = summary.slice(0, Math.max(80, input.maxLength));
    return {
        title: baseTitle || sentences[0] || 'News update',
        shortSummary: limitedSummary,
        fullContent: sanitizeNewsHtml(contentBody),
        tags: uniqueTags,
        category,
        aiNotes: limitedSummary.length < 20 ? 'insufficient content' : '',
        aiModel: 'extractive-v1'
    };
};
