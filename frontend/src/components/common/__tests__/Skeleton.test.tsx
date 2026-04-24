import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton, LoadingState, ProgressBar } from '../Skeleton';

/* ── Skeleton ── */

describe('Skeleton', () => {
    it('renders a single card skeleton by default', () => {
        const { container } = render(<Skeleton variant="card" />);
        const els = container.querySelectorAll('[aria-hidden="true"]');
        expect(els).toHaveLength(1);
        expect(els[0].className).toContain('rounded-2xl');
    });

    it('renders multiple skeletons when count is provided', () => {
        const { container } = render(<Skeleton variant="text-line" count={4} />);
        expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
    });

    it('applies table-row variant styles', () => {
        const { container } = render(<Skeleton variant="table-row" />);
        const el = container.querySelector('[aria-hidden="true"]');
        expect(el?.className).toContain('rounded-lg');
        expect(el?.className).toContain('h-12');
    });

    it('applies text-line variant styles', () => {
        const { container } = render(<Skeleton variant="text-line" />);
        const el = container.querySelector('[aria-hidden="true"]');
        expect(el?.className).toContain('h-4');
    });

    it('merges custom className', () => {
        const { container } = render(<Skeleton variant="card" className="w-full" />);
        const el = container.querySelector('[aria-hidden="true"]');
        expect(el?.className).toContain('w-full');
    });

    it('staggers animation delay across items', () => {
        const { container } = render(<Skeleton variant="text-line" count={3} />);
        const els = container.querySelectorAll('[aria-hidden="true"]');
        expect(els[0]).toHaveStyle({ animationDelay: '0ms' });
        expect(els[1]).toHaveStyle({ animationDelay: '120ms' });
        expect(els[2]).toHaveStyle({ animationDelay: '240ms' });
    });
});

/* ── LoadingState ── */

describe('LoadingState', () => {
    it('shows skeletons when isLoading is true', () => {
        render(
            <LoadingState isLoading={true} skeleton="card" count={2}>
                <p>Content</p>
            </LoadingState>,
        );

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('renders children when isLoading is false', () => {
        render(
            <LoadingState isLoading={false} skeleton="card">
                <p>Content</p>
            </LoadingState>,
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('includes a screen-reader-only loading label', () => {
        render(
            <LoadingState isLoading={true} skeleton="text-line">
                <p>Content</p>
            </LoadingState>,
        );

        expect(screen.getByText('Loading…')).toBeInTheDocument();
    });
});

/* ── ProgressBar ── */

describe('ProgressBar', () => {
    it('renders when isActive is true (default)', () => {
        render(<ProgressBar />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not render when isActive is false', () => {
        render(<ProgressBar isActive={false} />);
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('uses the primary CSS custom property for color', () => {
        render(<ProgressBar />);
        const bar = screen.getByRole('progressbar').firstElementChild;
        expect(bar).toHaveStyle({ backgroundColor: 'var(--primary)' });
    });
});
