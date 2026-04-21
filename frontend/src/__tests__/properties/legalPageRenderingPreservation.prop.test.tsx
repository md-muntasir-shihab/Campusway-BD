/**
 * Feature: legal-pages-footer-founder, Property 4: Legal page rendering preserves content and metadata
 *
 * **Validates: Requirements 3.2, 3.3**
 *
 * For any legal page with non-empty title, htmlContent, and metaTitle, rendering the
 * page component with that data SHALL produce a DOM where the H1 element contains the
 * title text, the rendered HTML container includes the htmlContent, and the document
 * title equals the metaTitle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock the api service to control what data is returned
vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

// Mock DOMPurify to pass through content (we control the input)
vi.mock('dompurify', () => ({
    default: {
        sanitize: (html: string) => html,
    },
}));

import api from '../../services/api';
import LegalPageView from '../../pages/LegalPageView';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Non-empty title (printable, trimmed) */
const titleArb = fc
    .string({ minLength: 1, maxLength: 80 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    // Filter out strings that contain HTML-like characters which could be stripped
    .filter((s) => !/<|>|&/.test(s));

/** Non-empty HTML content — simple safe HTML snippets using alphanumeric text */
const htmlContentArb = fc
    .stringMatching(/^[a-zA-Z0-9 ]+$/)
    .filter((s) => s.trim().length > 0)
    .map((s) => `<p>${s.trim()}</p>`);

/** Non-empty metaTitle */
const metaTitleArb = fc
    .string({ minLength: 1, maxLength: 60 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim());

/** Valid slug for routing */
const slugArb = fc
    .array(
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1 && s.length <= 10),
        { minLength: 1, maxLength: 3 },
    )
    .map((parts) => parts.join('-'));

/** Meta description (can be empty) */
const metaDescriptionArb = fc.string({ minLength: 0, maxLength: 100 });

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                gcTime: 0,
            },
        },
    });
}

function renderLegalPage(slug: string) {
    const queryClient = createQueryClient();
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[`/${slug}`]}>
                <Routes>
                    <Route path="/:slug" element={<LegalPageView />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 4: Legal page rendering preserves content and metadata', () => {
    let originalTitle: string;

    beforeEach(() => {
        originalTitle = document.title;
        vi.clearAllMocks();
    });

    afterEach(() => {
        document.title = originalTitle;
    });

    it('rendering a legal page preserves title in H1, htmlContent in container, and metaTitle in document.title', async () => {
        await fc.assert(
            fc.asyncProperty(
                slugArb,
                titleArb,
                htmlContentArb,
                metaTitleArb,
                metaDescriptionArb,
                async (slug, title, htmlContent, metaTitle, metaDescription) => {
                    // Mock the API response for this iteration
                    vi.mocked(api.get).mockResolvedValue({
                        data: {
                            slug,
                            title,
                            htmlContent,
                            metaTitle,
                            metaDescription,
                        },
                    });

                    const { container, unmount } = renderLegalPage(slug);

                    // Wait for the component to finish loading and render the title
                    await waitFor(() => {
                        const h1 = container.querySelector('h1');
                        expect(h1).not.toBeNull();
                    });

                    // Verify H1 contains the title text
                    const h1 = container.querySelector('h1');
                    expect(h1!.textContent).toBe(title);

                    // Verify the HTML content container includes the htmlContent
                    const proseContainer = container.querySelector('.prose');
                    expect(proseContainer).not.toBeNull();
                    expect(proseContainer!.innerHTML).toContain(htmlContent);

                    // Verify document.title equals metaTitle
                    expect(document.title).toBe(metaTitle);

                    // Cleanup for next iteration
                    unmount();
                },
            ),
            { numRuns: 100 },
        );
    });
});
