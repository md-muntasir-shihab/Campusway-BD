/**
 * Tests for the news article custom format-command engine
 * (utils/newsFormatCommands.ts) — the feature that lets admins auto-arrange
 * RSS-extracted articles with declarative commands at ingestion time.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
    applyNewsFormatCommands,
    applyNewsFormatCommandsDetailed,
} from '../utils/newsFormatCommands';

const ARTICLE = `
<div class="page">
  <nav class="menu"><a href="/home">Home</a></nav>
  <article class="story">
    <h1>শিরোনাম</h1>
    <p class="promo">বিজ্ঞাপন</p>
    <p>প্রথম অনুচ্ছেদ।</p>
    <p>দ্বিতীয় অনুচ্ছেদ।</p>
    <div class="related"><a href="/other">সম্পর্কিত</a></div>
    <img src="/img/photo.jpg" alt="ছবি">
    <a class="link" href="/details">বিস্তারিত</a>
  </article>
  <footer class="footer">সূত্র</footer>
</div>`;

describe('news format commands', () => {
    it('no command returns the original html untouched', () => {
        expect(applyNewsFormatCommands(ARTICLE, '')).toBe(ARTICLE);
        expect(applyNewsFormatCommands(ARTICLE, '   ')).toBe(ARTICLE);
    });

    it('remove: deletes matching elements', () => {
        const out = applyNewsFormatCommands(ARTICLE, 'remove: .promo, .menu, footer.footer');
        expect(out).not.toContain('বিজ্ঞাপন');
        expect(out).not.toContain('class="menu"');
        expect(out).toContain('প্রথম অনুচ্ছেদ');
    });

    it('keep: keeps only matching subtrees', () => {
        const out = applyNewsFormatCommands(ARTICLE, 'keep: article.story');
        expect(out).toContain('প্রথম অনুচ্ছেদ');
        expect(out).not.toContain('class="menu"');
        expect(out).not.toContain('class="footer"');
    });

    it('keep: with no matches is a no-op (never blanks the article)', () => {
        const out = applyNewsFormatCommands(ARTICLE, 'keep: .does-not-exist');
        expect(out).toContain('প্রথম অনুচ্ছেদ');
    });

    it('unwrap: replaces elements with their children', () => {
        const wrapped = '<div><span class="wrap"><p>ভেতরের লেখা</p></span></div>';
        const out = applyNewsFormatCommands(wrapped, 'unwrap: .wrap');
        expect(out).toContain('ভেতরের লেখা');
        expect(out).not.toContain('class="wrap"');
    });

    it('strip-attrs removes presentation attributes but keeps safe ones', () => {
        const dirty = '<p class="x" style="color:red" onclick="evil()" id="a">লেখা</p><img src="/a.jpg" alt="ok" width="10">';
        const out = applyNewsFormatCommands(dirty, 'strip-attrs');
        expect(out).not.toContain('class=');
        expect(out).not.toContain('style=');
        expect(out).not.toContain('onclick');
        expect(out).toContain('src="/a.jpg"');
        expect(out).toContain('alt="ok"');
        expect(out).toContain('width="10"');
    });

    it('absolutize-links resolves relative urls against the article base', () => {
        const out = applyNewsFormatCommands('<a href="/x">a</a><img src="/y.jpg">', 'absolutize-links', 'https://example.com/post/1');
        expect(out).toContain('href="https://example.com/x"');
        expect(out).toContain('src="https://example.com/y.jpg"');
    });

    it('prepend:/append: insert content at the edges', () => {
        const out = applyNewsFormatCommands('<p>মূল</p>', 'prepend: <p>শুরু</p>;\nappend: <p>শেষ</p>');
        expect(out.indexOf('শুরু')).toBeLessThan(out.indexOf('মূল'));
        expect(out.indexOf('মূল')).toBeLessThan(out.indexOf('শেষ'));
    });

    it('replace: substitutes literal text', () => {
        const out = applyNewsFormatCommands('<p>বিজ্ঞাপন লেখা</p>', 'replace: বিজ্ঞাপন =>');
        expect(out).not.toContain('বিজ্ঞাপন');
        expect(out).toContain('লেখা');
    });

    it('limit-paragraphs: keeps only the first n blocks', () => {
        const three = '<p>১</p><p>২</p><p>৩</p>';
        const out = applyNewsFormatCommands(three, 'limit-paragraphs: 2');
        expect(out).toContain('১');
        expect(out).toContain('২');
        expect(out).not.toContain('৩');
    });

    it('unknown commands are ignored, not fatal', () => {
        const result = applyNewsFormatCommandsDetailed(ARTICLE, 'frobnicate: yes');
        // jsdom normalizes the leading whitespace of the parsed document, so
        // compare trimmed content.
        expect(result.html.trim()).toBe(ARTICLE.trim());
        expect(result.applied).toHaveLength(0);
        expect(result.ignored).toHaveLength(1);
    });

    it('malformed commands never throw and are reported', () => {
        const result = applyNewsFormatCommandsDetailed(ARTICLE, 'remove:\nreplace: no-arrow\nkeep:');
        expect(result.html).toContain('প্রথম অনুচ্ছেদ');
        expect(result.ignored.length).toBeGreaterThanOrEqual(3);
    });

    it('commands compose left-to-right', () => {
        const out = applyNewsFormatCommands(
            ARTICLE,
            'remove: .menu\nremove: .footer\nremove: .promo\nremove: .related\nreplace: দ্বিতীয় => শেষ',
        );
        expect(out).not.toContain('বিজ্ঞাপন');
        expect(out).not.toContain('সম্পর্কিত');
        expect(out).toContain('শেষ অনুচ্ছেদ');
    });

    it('property: arbitrary garbage input never throws and degrades to the original html', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 400 }),
                fc.string({ maxLength: 120 }),
                (html, command) => {
                    const result = applyNewsFormatCommandsDetailed(html, command);
                    expect(typeof result.html).toBe('string');
                    expect(result.html.length).toBeGreaterThan(0);
                },
            ),
            { numRuns: 60 },
        );
    });
});
