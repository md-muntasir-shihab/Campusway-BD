/**
 * ResponsiveTable
 * ---------------
 * Wraps data tables with horizontal scroll on mobile viewports (<768px).
 * Ensures tables remain usable on small screens by allowing horizontal
 * swipe/scroll rather than breaking the layout.
 *
 * Requirements: 5.4 — Render data tables in a responsive format
 * (horizontal scroll or card layout) at viewport widths below 768px.
 */

import type { ReactNode } from 'react';

interface ResponsiveTableProps {
    children: ReactNode;
    /** Minimum width for the table content (default: 640px) */
    minWidth?: string;
    className?: string;
}

export default function ResponsiveTable({
    children,
    minWidth = '640px',
    className = '',
}: ResponsiveTableProps) {
    return (
        <div
            className={`-mx-4 md:mx-0 overflow-x-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 ${className}`}
        >
            <div style={{ minWidth }} className="px-4 md:px-0">
                {children}
            </div>
        </div>
    );
}
