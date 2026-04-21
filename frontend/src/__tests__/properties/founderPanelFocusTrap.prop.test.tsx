/**
 * Feature: legal-pages-footer-founder, Property 9: Focus trap cycles within panel
 *
 * **Validates: Requirements 8.1**
 *
 * For any set of focusable elements within the FounderPanel, pressing Tab on the last
 * focusable element SHALL move focus to the first focusable element, and pressing
 * Shift+Tab on the first focusable element SHALL move focus to the last focusable element.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the api service
vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

// Mock framer-motion to render children directly without animations
vi.mock('framer-motion', () => ({
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
        div: ({ children, ...props }: any) => {
            const { initial, animate, exit, transition, ...domProps } = props;
            return <div {...domProps}>{children}</div>;
        },
    },
}));

import FounderPanel from '../../components/layout/FounderPanel';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Non-empty safe string (no HTML chars) */
const safeStringArb = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !/<|>|&/.test(s));

/** Phone number string */
const phoneArb = fc
    .string({ minLength: 5, maxLength: 15 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !/<|>|&/.test(s));

/** Founder profile that produces focusable elements (links from contact, close button) */
const founderWithFocusablesArb = fc.record({
    name: safeStringArb,
    tagline: fc.constant('Test tagline'),
    photoUrl: fc.constant(''),
    role: fc.constant('CEO'),
    aboutText: fc.constant('About text'),
    location: fc.constant('Test City'),
    contactDetails: fc.record({
        phones: fc.array(phoneArb, { minLength: 1, maxLength: 3 }),
        email: fc.constant('test@example.com'),
        website: fc.constantFrom('https://example.com', 'example.com', ''),
    }),
    skills: fc.array(safeStringArb, { minLength: 1, maxLength: 3 }).filter(
        (arr) => new Set(arr).size === arr.length,
    ),
    education: fc.constant([{ institution: 'Test Uni', degree: 'BS', field: 'CS', startYear: 2020 }]),
    experience: fc.constant([{ company: 'Test Corp', role: 'Dev', startYear: 2022, current: true }]),
});

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

function renderFounderPanel(founderData: any) {
    const queryClient = createQueryClient();
    queryClient.setQueryData(['founder'], founderData);

    return render(
        <QueryClientProvider client={queryClient}>
            <FounderPanel open={true} onClose={() => { }} />
        </QueryClientProvider>,
    );
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const panel = container.querySelector('[role="dialog"]');
    if (!panel) return [];
    return Array.from(
        panel.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
    );
}

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 9: Focus trap cycles within panel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it('pressing Tab on the last focusable element moves focus to the first, and Shift+Tab on the first moves focus to the last', async () => {
        await fc.assert(
            fc.asyncProperty(founderWithFocusablesArb, async (founder) => {
                const { container, unmount } = renderFounderPanel(founder);

                const focusableElements = getFocusableElements(container);

                // The panel should have at least 2 focusable elements (close button + links)
                if (focusableElements.length < 2) {
                    unmount();
                    return; // Skip if not enough focusable elements
                }

                const first = focusableElements[0];
                const last = focusableElements[focusableElements.length - 1];

                // Test Tab on last element → focus moves to first
                last.focus();
                expect(document.activeElement).toBe(last);

                const tabEvent = new KeyboardEvent('keydown', {
                    key: 'Tab',
                    bubbles: true,
                    cancelable: true,
                });
                document.dispatchEvent(tabEvent);

                expect(document.activeElement).toBe(first);

                // Test Shift+Tab on first element → focus moves to last
                first.focus();
                expect(document.activeElement).toBe(first);

                const shiftTabEvent = new KeyboardEvent('keydown', {
                    key: 'Tab',
                    shiftKey: true,
                    bubbles: true,
                    cancelable: true,
                });
                document.dispatchEvent(shiftTabEvent);

                expect(document.activeElement).toBe(last);

                unmount();
            }),
            { numRuns: 100 },
        );
    });
});
