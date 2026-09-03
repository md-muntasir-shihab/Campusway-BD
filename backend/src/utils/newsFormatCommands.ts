/**
 * News article format commands
 * =============================
 *
 * A tiny, deterministic command language that lets admins "arrange" a
 * RSS-extracted article automatically at ingestion time — no AI keys required.
 * Commands are applied with jsdom against the sanitized article HTML, in order,
 * top to bottom.
 *
 * Syntax — one command per line (also accepts ";" separators). Lines starting
 * with "#" are comments. Selectors use standard CSS syntax.
 *
 *   remove: <selector>          Delete every element matching the selector.
 *                               e.g.  remove: .subscription-promo, #related
 *   keep: <selector>            Keep ONLY the matching subtrees (drop the rest).
 *                               e.g.  keep: article, .story-content
 *   unwrap: <selector>          Replace each matching element with its children.
 *                               e.g.  unwrap: .paid-wrapper
 *   strip-attrs                 Remove presentation attributes (class/style/id,
 *                               event handlers) from every element.
 *   absolutize-links            Resolve relative href/src against the article URL.
 *   prepend: <inline html>      Insert content before the article body.
 *   append: <inline html>       Insert content after the article body.
 *   replace: <find> => <with>   Literal text replacement across the article.
 *                               e.g.  replace: বিজ্ঞাপন =>
 *   limit-paragraphs: <n>       Keep only the first n top-level blocks.
 *
 * Design rules:
 *   - Never throws: a bad command is reported in `ignored` and skipped.
 *   - No command / empty input is a no-op returning the original HTML.
 */
import { JSDOM } from 'jsdom';

export interface FormatCommandsResult {
    html: string;
    applied: string[];
    ignored: Array<{ command: string; reason: string }>;
}

/** Attributes preserved by `strip-attrs` (everything else is dropped). */
const SAFE_ATTRS = new Set([
    'href', 'src', 'srcset', 'alt', 'title', 'width', 'height',
    'colspan', 'rowspan', 'target', 'rel', 'datetime', 'dir', 'lang',
]);

const MAX_COMMAND_LENGTH = 2000;

function splitCommands(raw: string): string[] {
    return String(raw || '')
        .replace(/\r\n/g, '\n')
        .split(/\n|;/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'));
}

function absolutize(dom: JSDOM): void {
    const doc = dom.window.document;
    doc.querySelectorAll('a[href]').forEach((el) => {
        try {
            const abs = (el as HTMLAnchorElement).href;
            if (abs) el.setAttribute('href', abs);
        } catch { /* keep original */ }
    });
    doc.querySelectorAll('img[src]').forEach((el) => {
        try {
            const abs = (el as HTMLImageElement).src;
            if (abs) el.setAttribute('src', abs);
        } catch { /* keep original */ }
    });
}

function stripAttributes(dom: JSDOM): void {
    const doc = dom.window.document;
    doc.querySelectorAll('*').forEach((el) => {
        const toDrop: string[] = [];
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            if (name.startsWith('on') || !SAFE_ATTRS.has(name)) toDrop.push(attr.name);
        }
        toDrop.forEach((name) => el.removeAttribute(name));
    });
}

function removeMatching(dom: JSDOM, selector: string): number {
    let removed = 0;
    dom.window.document.querySelectorAll(selector).forEach((el) => {
        el.remove();
        removed += 1;
    });
    return removed;
}

function unwrapMatching(dom: JSDOM, selector: string): number {
    const doc = dom.window.document;
    const targets = Array.from(doc.querySelectorAll(selector));
    targets.forEach((el) => {
        const parent = el.parentElement;
        if (!parent) return;
        while (el.firstChild) parent.insertBefore(el.firstChild, el);
        el.remove();
    });
    return targets.length;
}

function keepMatching(dom: JSDOM, selector: string): boolean {
    const doc = dom.window.document;
    const body = doc.body;
    if (!body) return false;
    const matches = Array.from(doc.querySelectorAll(selector));
    if (matches.length === 0) return false;

    // Keep the outer-most matched elements only (skip nodes nested in another match).
    const tops = matches.filter((el) => !matches.some((other) => other !== el && other.contains(el)));
    const frag = doc.createDocumentFragment();
    tops.forEach((el) => frag.appendChild(el.cloneNode(true)));
    while (body.firstChild) body.removeChild(body.firstChild);
    body.appendChild(frag);
    return true;
}

function replaceLiteralText(dom: JSDOM, find: string, withText: string): number {
    const doc = dom.window.document;
    let count = 0;
    const walker = doc.createTreeWalker(doc.body || doc.documentElement, dom.window.NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    nodes.forEach((node) => {
        if (node.nodeValue && node.nodeValue.includes(find)) {
            count += node.nodeValue.split(find).length - 1;
            node.nodeValue = node.nodeValue.split(find).join(withText);
        }
    });
    return count;
}

function limitParagraphs(dom: JSDOM, limit: number): void {
    const body = dom.window.document.body;
    if (!body || !Number.isFinite(limit) || limit <= 0) return;
    const children = Array.from(body.children);
    children.slice(limit).forEach((el) => el.remove());
}

/**
 * Apply a format-command script to an article HTML string.
 * Returns the transformed HTML plus a report of applied/ignored commands.
 */
export function applyNewsFormatCommandsDetailed(
    html: string,
    command: string,
    baseUrl?: string,
): FormatCommandsResult {
    const raw = String(command || '').trim();
    const input = String(html || '');
    if (!raw || !input) return { html: input, applied: [], ignored: [] };
    if (raw.length > MAX_COMMAND_LENGTH) {
        return { html: input, applied: [], ignored: [{ command: '(script)', reason: `exceeds ${MAX_COMMAND_LENGTH} chars` }] };
    }

    const commands = splitCommands(raw);
    if (commands.length === 0) return { html: input, applied: [], ignored: [] };

    const applied: string[] = [];
    const ignored: FormatCommandsResult['ignored'] = [];

    let dom: JSDOM;
    try {
        dom = new JSDOM(input, { url: baseUrl || 'https://campusway.local/news' });
    } catch {
        return { html: input, applied: [], ignored: [{ command: '(script)', reason: 'failed to parse html' }] };
    }

    try {
        for (const cmd of commands) {
            try {
                const lower = cmd.toLowerCase();

                if (lower.startsWith('remove:')) {
                    const sel = cmd.slice(7).trim();
                    if (!sel) throw new Error('missing selector');
                    const n = removeMatching(dom, sel);
                    applied.push(`remove:${sel} (${n})`);
                    continue;
                }

                if (lower.startsWith('keep:')) {
                    const sel = cmd.slice(5).trim();
                    if (!sel) throw new Error('missing selector');
                    if (keepMatching(dom, sel)) applied.push(`keep:${sel}`);
                    else ignored.push({ command: cmd, reason: 'selector matched nothing' });
                    continue;
                }

                if (lower.startsWith('unwrap:')) {
                    const sel = cmd.slice(7).trim();
                    if (!sel) throw new Error('missing selector');
                    const n = unwrapMatching(dom, sel);
                    if (n > 0) applied.push(`unwrap:${sel} (${n})`);
                    else ignored.push({ command: cmd, reason: 'selector matched nothing' });
                    continue;
                }

                if (lower === 'strip-attrs') {
                    stripAttributes(dom);
                    applied.push('strip-attrs');
                    continue;
                }

                if (lower === 'absolutize-links' || lower === 'absolutize-links:') {
                    absolutize(dom);
                    applied.push('absolutize-links');
                    continue;
                }

                if (lower.startsWith('prepend:')) {
                    const payload = cmd.slice(8).trim();
                    if (!payload) throw new Error('missing content');
                    dom.window.document.body?.insertAdjacentHTML('afterbegin', payload);
                    applied.push('prepend');
                    continue;
                }

                if (lower.startsWith('append:')) {
                    const payload = cmd.slice(7).trim();
                    if (!payload) throw new Error('missing content');
                    dom.window.document.body?.insertAdjacentHTML('beforeend', payload);
                    applied.push('append');
                    continue;
                }

                if (lower.startsWith('replace:')) {
                    const body = cmd.slice(8).trim();
                    const sep = body.indexOf('=>');
                    if (sep < 0) throw new Error('expected "find => with"');
                    const find = body.slice(0, sep).trim();
                    const withText = body.slice(sep + 2).trim();
                    if (!find) throw new Error('missing search text');
                    const n = replaceLiteralText(dom, find, withText);
                    applied.push(`replace:${find} (${n})`);
                    continue;
                }

                if (lower.startsWith('limit-paragraphs:')) {
                    const n = parseInt(cmd.slice(17).trim(), 10);
                    if (!Number.isFinite(n)) throw new Error('expected a number');
                    limitParagraphs(dom, n);
                    applied.push(`limit-paragraphs:${n}`);
                    continue;
                }

                ignored.push({ command: cmd, reason: 'unknown command' });
            } catch (err) {
                ignored.push({ command: cmd, reason: err instanceof Error ? err.message : 'failed' });
            }
        }

        const doc = dom.window.document;
        const outHtml = (doc.body?.innerHTML ?? doc.documentElement?.innerHTML ?? input).trim();
        return { html: outHtml || input, applied, ignored };
    } catch {
        // Absolute safety net: formatting must never break ingestion.
        return { html: input, applied, ignored };
    } finally {
        try { dom.window.close(); } catch { /* noop */ }
    }
}

/**
 * Convenience wrapper for the ingestion pipeline: returns just the HTML.
 */
export function applyNewsFormatCommands(html: string, command: string, baseUrl?: string): string {
    return applyNewsFormatCommandsDetailed(html, command, baseUrl).html;
}
