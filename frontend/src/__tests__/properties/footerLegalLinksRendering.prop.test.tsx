/**
 * Feature: legal-pages-footer-founder, Property 5: Footer renders legal links from configuration
 *
 * **Validates: Requirements 4.2, 4.5**
 *
 * For any set of legal links in the footer configuration (each with a non-empty label
 * and URL), the rendered Footer component SHALL display a link element for each entry
 * with the correct label text and href attribute.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock the api service
vi.mock('../../services/api', () => ({
    default: { get: vi.fn(), post: vi.fn(), defaults: { headers: { common: {} } } },
    getHome: vi.fn(),
}));

// Mock useWebsiteSettings hook
vi.mock('../../hooks/useWebsiteSettings', () => ({
    useWebsiteSettings: vi.fn(() => ({ data: null })),
}));

// Mock buildMediaUrl
vi.mock('../../utils/mediaUrl', () => ({
    buildMediaUrl: (url: string) => url || '/logo.svg',
}));

import { getHome } from '../../services/api';
import Footer from '../../components/layout/Footer';

// --- Arbitrary Generators ---

/** Generate a non-empty label (printable, trimmed, no HTML) */
const labelArb = fc
    .string({ minLength: 1, maxLength: 40 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !/<|>|&/.test(s));

/** Generate a valid internal URL path */
const internalUrlArb = fc
    .array(
        fc.stringMatching(/^[a-z0-9]+$/).filter((s) => s.length >= 1 && s.length <= 10),
        { minLength: 1, maxLength: 3 },
    )
    .map((parts) => '/' + parts.join('/'));

/** Generate a legal link with non-empty label and URL */
const legalLinkArb = fc.record({
    label: labelArb,
    url: internalUrlArb,
});

/**
 * Generate an array of legal links that will pass normalizeLegalLinks:
 * - Must have at least 1 link
 * - Must include an "about" link (or 3+ links) to avoid fallback injection
 */
const legalLinksArb = fc
    .array(legalLinkArb, { minLength: 3, maxLength: 8 })
    .filter((links) => {
        // Ensure unique labels to avoid ambiguity in assertions
        const labels = links.map((l) => l.label.toLowerCase());
        return new Set(labels).size === labels.length;
    });

// --- Test Helpers ---

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

function buildHomeResponse(legalLinks: Array<{ label: string; url: string }>) {
    return {
        data: {
            homeSettings: {
                footer: {
                    enabled: true,
                    aboutText: 'Test about text',
                    quickLinks: [
                        { label: 'Home', url: '/' },
                    ],
                    contactInfo: { email: 'test@test.com', phone: '123', address: '123 St' },
                    legalLinks,
                    showFounderButton: false,
                },
            },
            globalSettings: {
                websiteName: 'TestSite',
                logoUrl: '/logo.svg',
                motto: 'Test motto',
                contactEmail: 'test@test.com',
                contactPhone: '123',
                theme: {},
                socialLinks: {},
            },
            socialLinks: {},
        },
    };
}

function renderFooter(legalLinks: Array<{ label: string; url: string }>) {
    const queryClient = createQueryClient();
    const homeResponse = buildHomeResponse(legalLinks);

    // Mock getHome to return our controlled response
    vi.mocked(getHome).mockResolvedValue(homeResponse);

    // Pre-populate the query cache so Footer renders synchronously
    queryClient.setQueryData(['home'], homeResponse.data);

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <Footer />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

// --- Property Test ---

describe('Feature: legal-pages-footer-founder, Property 5: Footer renders legal links from configuration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('for any set of legal links, the desktop footer renders a link for each entry with correct label and href', () => {
        fc.assert(
            fc.property(legalLinksArb, (legalLinks) => {
                const { container, unmount } = renderFooter(legalLinks);

                // Target the desktop layout (hidden md:block)
                const desktopSection = container.querySelector('.hidden.md\\:block');
                expect(desktopSection).not.toBeNull();

                // Find the "Legal" heading in the desktop section
                const headings = desktopSection!.querySelectorAll('h4');
                let legalHeading: Element | null = null;
                headings.forEach((h) => {
                    if (h.textContent?.trim() === 'Legal') {
                        legalHeading = h;
                    }
                });
                expect(legalHeading).not.toBeNull();

                // Get the parent container of the Legal section and find all links
                const legalContainer = legalHeading!.parentElement;
                expect(legalContainer).not.toBeNull();

                const linkElements = legalContainer!.querySelectorAll('a');

                // Each legal link should be rendered
                for (const link of legalLinks) {
                    const matchingLink = Array.from(linkElements).find(
                        (el) => el.textContent?.trim() === link.label,
                    );
                    expect(matchingLink).toBeDefined();
                    // For internal links, react-router Link renders with href attribute
                    expect(matchingLink!.getAttribute('href')).toBe(link.url);
                }

                unmount();
            }),
            { numRuns: 100 },
        );
    });
});
