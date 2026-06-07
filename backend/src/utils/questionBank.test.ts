import { describe, it, expect } from 'vitest';
import { validateQuestionPayload, sanitizeRichHtml } from './questionBank';

function makeValidPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        question_en: 'What is the capital of Bangladesh?',
        question_bn: '',
        subject: 'Bangladesh Studies',
        difficulty: 'easy',
        correctKey: 'A',
        options: [
            { key: 'A', text_en: 'Dhaka', text_bn: 'ঢাকা' },
            { key: 'B', text_en: 'Chittagong', text_bn: 'চট্টগ্রাম' },
            { key: 'C', text_en: 'Rajshahi', text_bn: 'রাজশাহী' },
            { key: 'D', text_en: 'Sylhet', text_bn: 'সিলেট' },
        ],
        ...overrides,
    };
}

describe('validateQuestionPayload', () => {
    it('accepts a valid payload', () => {
        const result = validateQuestionPayload(makeValidPayload());
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('accepts when only question_bn >= 10 chars', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ question_en: '', question_bn: 'বাংলাদেশের রাজধানী কোনটি?' }),
        );
        expect(result.valid).toBe(true);
    });

    it('rejects when both question texts are < 10 chars', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ question_en: 'Short', question_bn: 'ছোট' }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors.length).toBeGreaterThan(0);


    });

    it('rejects when options has fewer than 4 entries', () => {
        const result = validateQuestionPayload(
            makeValidPayload({
                options: [
                    { key: 'A', text_en: 'Dhaka' },
                    { key: 'B', text_en: 'Chittagong' },
                ],
            }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('At least 4 options are required');
    });

    it('rejects when an option has empty text in both languages', () => {
        const result = validateQuestionPayload(
            makeValidPayload({
                options: [
                    { key: 'A', text_en: 'Dhaka', text_bn: 'ঢাকা' },
                    { key: 'B', text_en: '', text_bn: '' },
                    { key: 'C', text_en: 'Rajshahi', text_bn: '' },
                    { key: 'D', text_en: 'Sylhet', text_bn: '' },
                ],
            }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('Option 2: text_en or text_bn is required');
    });

    it('rejects duplicate option text in English', () => {
        const result = validateQuestionPayload(
            makeValidPayload({
                options: [
                    { key: 'A', text_en: 'Dhaka', text_bn: '' },
                    { key: 'B', text_en: 'Dhaka', text_bn: '' },
                    { key: 'C', text_en: 'Rajshahi', text_bn: '' },
                    { key: 'D', text_en: 'Sylhet', text_bn: '' },
                ],
            }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('Duplicate option text detected');
    });

    it('rejects duplicate option text in Bengali', () => {
        const result = validateQuestionPayload(
            makeValidPayload({
                options: [
                    { key: 'A', text_en: 'Dhaka', text_bn: 'ঢাকা' },
                    { key: 'B', text_en: 'Chittagong', text_bn: 'ঢাকা' },
                    { key: 'C', text_en: 'Rajshahi', text_bn: 'রাজশাহী' },
                    { key: 'D', text_en: 'Sylhet', text_bn: 'সিলেট' },
                ],
            }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('Duplicate option text detected');
    });

    it('rejects when correctKey is not in option keys', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ correctKey: 'Z' }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('correctKey must match one of the option keys');
    });

    it('rejects invalid difficulty', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ difficulty: 'extreme' }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('difficulty must be easy, medium, or hard');
    });

    it('rejects empty subject', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ subject: '' }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('subject is required');
    });

    it('rejects whitespace-only subject', () => {
        const result = validateQuestionPayload(
            makeValidPayload({ subject: '   ' }),
        );
        expect(result.valid).toBe(false); // patched
        expect(result.errors).toContain('subject is required');
    });

    it('collects multiple errors at once', () => {
        const result = validateQuestionPayload({
            question_en: '',
            question_bn: '',
            subject: '',
            difficulty: 'unknown',
            correctKey: 'Z',
            options: [],
        });
        expect(result.valid).toBe(false); // patched
        expect(result.errors.length).toBeGreaterThanOrEqual(4);
    });

    it('accepts exactly 4 options', () => {
        const result = validateQuestionPayload(makeValidPayload());
        expect(result.valid).toBe(true);
    });

    it('accepts more than 4 options', () => {
        const result = validateQuestionPayload(
            makeValidPayload({
                options: [
                    { key: 'A', text_en: 'Dhaka' },
                    { key: 'B', text_en: 'Chittagong' },
                    { key: 'C', text_en: 'Rajshahi' },
                    { key: 'D', text_en: 'Sylhet' },
                    { key: 'E', text_en: 'Khulna' },
                ],
            }),
        );
        expect(result.valid).toBe(true);
    });
});

describe('sanitizeRichHtml', () => {
    it('returns empty string for null, undefined, or empty input', () => {
        expect(sanitizeRichHtml(null)).toBe('');
        expect(sanitizeRichHtml(undefined)).toBe('');
        expect(sanitizeRichHtml('')).toBe('');
    });

    it('handles non-string inputs gracefully', () => {
        expect(sanitizeRichHtml(123)).toBe('123');
        expect(sanitizeRichHtml(true)).toBe('true');
        expect(sanitizeRichHtml({})).toBe('[object Object]');
    });

    it('returns clean HTML unchanged', () => {
        const cleanHtml = '<p>This is <strong>safe</strong> text.</p>';
        expect(sanitizeRichHtml(cleanHtml)).toBe(cleanHtml);
    });

    it('removes <script> tags and their contents', () => {
        expect(sanitizeRichHtml('<p>Safe</p><script>alert(1);</script>')).toBe('<p>Safe</p>');
        expect(sanitizeRichHtml('<ScRiPt src="evil.js">alert(1);</ScRiPt>')).toBe('');
        expect(sanitizeRichHtml('Before <script>let a = 1;</script> After')).toBe('Before  After');
    });

    it('removes <style> tags and their contents', () => {
        expect(sanitizeRichHtml('<p>Safe</p><style>body { color: red; }</style>')).toBe('<p>Safe</p>');
        expect(sanitizeRichHtml('<StYlE> p { display: none; } </StYlE>')).toBe('');
    });

    it('removes inline event handlers', () => {
        expect(sanitizeRichHtml('<a href="#" onclick="alert(1)">Click</a>')).toBe('<a href="#">Click</a>');
        expect(sanitizeRichHtml('<img src="img.png" onerror=\'alert(1)\'>')).toBe('<img src="img.png">');
        expect(sanitizeRichHtml('<div onMouseOver="doSomething()">Hover me</div>')).toBe('<div>Hover me</div>');
    });

    it('removes javascript: URIs from href and src attributes', () => {
        expect(sanitizeRichHtml('<a href="javascript:alert(1)">Click</a>')).toBe('<a href="#">Click</a>');
        expect(sanitizeRichHtml('<a href=\'javascript:alert(1)\'>Click</a>')).toBe('<a href="#">Click</a>');
        expect(sanitizeRichHtml('<iframe src="javascript:alert(1)"></iframe>')).toBe('<iframe src="#"></iframe>');
    });

    it('trims whitespace from the resulting string', () => {
         expect(sanitizeRichHtml('   <p>Whitespace</p>   ')).toBe('<p>Whitespace</p>');
    });
});
