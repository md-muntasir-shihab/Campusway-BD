/**
 * Feature: legal-pages-footer-founder, Property 8: Founder Panel displays all stored fields
 *
 * **Validates: Requirements 5.2**
 *
 * For any founder profile with non-empty name, skills (length > 0), education (length > 0),
 * and experience (length > 0), rendering the FounderPanel with that data SHALL produce a DOM
 * containing the name, each skill, each education institution, and each experience company.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';
import { render, waitFor } from '@testing-library/react';
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

import api from '../../services/api';
import FounderPanel from '../../components/layout/FounderPanel';

// ─── Arbitrary Generators ────────────────────────────────────────────────────

/** Non-empty name (printable, trimmed, no HTML) */
const nameArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !/<|>|&/.test(s));

/** Non-empty skill string */
const skillArb = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => s.trim().length > 0)
    .map((s) => s.trim())
    .filter((s) => !/<|>|&/.test(s));

/** Education entry with non-empty institution */
const educationArb = fc.record({
    institution: fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim())
        .filter((s) => !/<|>|&/.test(s)),
    degree: fc.string({ minLength: 0, maxLength: 20 }).map((s) => s.trim()),
    field: fc.string({ minLength: 0, maxLength: 20 }).map((s) => s.trim()),
    startYear: fc.integer({ min: 1990, max: 2024 }),
});

/** Experience entry with non-empty company */
const experienceArb = fc.record({
    company: fc
        .string({ minLength: 1, maxLength: 40 })
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim())
        .filter((s) => !/<|>|&/.test(s)),
    role: fc.string({ minLength: 0, maxLength: 20 }).map((s) => s.trim()),
    startYear: fc.integer({ min: 1990, max: 2024 }),
    current: fc.boolean(),
});

/** Full founder profile arbitrary */
const founderProfileArb = fc.record({
    name: nameArb,
    tagline: fc.string({ minLength: 0, maxLength: 40 }).map((s) => s.trim()),
    photoUrl: fc.constant(''),
    role: fc.string({ minLength: 0, maxLength: 30 }).map((s) => s.trim()),
    aboutText: fc.string({ minLength: 0, maxLength: 60 }).map((s) => s.trim()),
    location: fc.string({ minLength: 0, maxLength: 40 }).map((s) => s.trim()),
    contactDetails: fc.record({
        phones: fc.array(fc.string({ minLength: 0, maxLength: 15 }), { minLength: 0, maxLength: 2 }),
        email: fc.constant('test@example.com'),
        website: fc.constant(''),
    }),
    skills: fc.array(skillArb, { minLength: 1, maxLength: 5 }).filter(
        (arr) => new Set(arr).size === arr.length,
    ),
    education: fc.array(educationArb, { minLength: 1, maxLength: 4 }).filter(
        (arr) => new Set(arr.map((e) => e.institution)).size === arr.length,
    ),
    experience: fc.array(experienceArb, { minLength: 1, maxLength: 4 }).filter(
        (arr) => new Set(arr.map((e) => e.company)).size === arr.length,
    ),
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

    // Pre-populate the query cache so FounderPanel renders synchronously
    queryClient.setQueryData(['founder'], founderData);

    return render(
        <QueryClientProvider client={queryClient}>
            <FounderPanel open={true} onClose={() => { }} />
        </QueryClientProvider>,
    );
}

// ─── Property Test ───────────────────────────────────────────────────────────

describe('Feature: legal-pages-footer-founder, Property 8: Founder Panel displays all stored fields', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('for any founder profile with non-empty name, skills, education, and experience, the rendered panel contains all fields', async () => {
        await fc.assert(
            fc.asyncProperty(founderProfileArb, async (founder) => {
                const { container, unmount } = renderFounderPanel(founder);

                // Wait for the content to render (the name heading should appear)
                await waitFor(() => {
                    const nameEl = container.querySelector('#founder-panel-title');
                    expect(nameEl).not.toBeNull();
                });

                const textContent = container.textContent || '';

                // Verify name is displayed
                expect(textContent).toContain(founder.name);

                // Verify each skill is displayed
                for (const skill of founder.skills) {
                    expect(textContent).toContain(skill);
                }

                // Verify each education institution is displayed
                for (const edu of founder.education) {
                    expect(textContent).toContain(edu.institution);
                }

                // Verify each experience company is displayed
                for (const exp of founder.experience) {
                    expect(textContent).toContain(exp.company);
                }

                unmount();
            }),
            { numRuns: 100 },
        );
    });
});
