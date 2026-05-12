import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WrittenGradingInterface from '../../pages/admin/exam-center/WrittenGradingInterface';
import React from 'react';
import * as api from '../../services/api';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';

// Mock the API response
vi.mock('../../services/api', () => ({
    default: {
        get: vi.fn()
    }
}));

// Mock useAuth to bypass AdminGuardShell
vi.mock('../../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { role: 'admin', _id: '123' },
        isLoading: false
    })
}));

// Mock useModuleAccess
vi.mock('../../hooks/useModuleAccess', () => ({
    useModuleAccess: () => ({
        hasAccess: () => true
    })
}));

// Mock AdminShell to avoid rendering the whole layout
vi.mock('../../components/admin/AdminShell', () => ({
    default: ({ children }: { children: React.ReactNode }) => <div data-testid="admin-shell">{children}</div>
}));

// Mock ResizeObserver for Recharts / UI components
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

const queryClient = new QueryClient();

describe('WrittenGradingInterface Security Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sanitizes student answers containing malicious scripts', async () => {
        // Setup mock response with XSS payload
        const mockPendingResults = [
            {
                _id: 'res_1',
                student: { _id: 'stu_1', full_name: 'John Doe', studentId: 'S-001' },
                examId: { _id: 'ex_1', title: 'Test Exam', totalMarks: 100 },
                status: 'pending_evaluation',
                score: 0,
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                answers: [
                    {
                        question: 'q_1',
                        questionType: 'written',
                        selectedAnswer: '<script>alert("XSS")</script><img src="x" onerror="alert(1)">Hello Safe Content',
                        marks: 10,
                        isCorrect: false
                    }
                ],
                writtenGrades: []
            }
        ];

        // Ensure we hit the API properly
        vi.mocked(api.default.get).mockResolvedValue({ data: { data: mockPendingResults } });

        render(
            <HelmetProvider>
                <QueryClientProvider client={queryClient}>
                    <MemoryRouter initialEntries={['/exam-center/grading/ex_1']}>
                        <Routes>
                            <Route path="/exam-center/grading/:examId" element={<WrittenGradingInterface />} />
                        </Routes>
                    </MemoryRouter>
                </QueryClientProvider>
            </HelmetProvider>
        );

        // Wait for the content to be loaded and rendered
        await waitFor(() => {
            expect(screen.getByText(/Hello Safe Content/i)).toBeInTheDocument();
        });

        const answerElement = screen.getByText(/Hello Safe Content/i);

        // Assert that scripts and malicious attributes are stripped
        expect(answerElement.innerHTML).not.toContain('<script>');
        expect(answerElement.innerHTML).not.toContain('onerror=');
        expect(answerElement.innerHTML).toContain('Hello Safe Content');
    });
});
