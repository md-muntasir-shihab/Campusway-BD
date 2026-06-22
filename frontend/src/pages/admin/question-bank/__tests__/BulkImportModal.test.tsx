import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import * as questionBankApi from '../../../../api/questionBankApi';
import BulkImportModal from '../BulkImportModal';

// Mock API module
vi.mock('../../../../api/questionBankApi', () => ({
    importQuestions: vi.fn(),
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
    toast: { success: vi.fn(), error: vi.fn() },
}));

const mockOnClose = vi.fn();
const mockOnSuccess = vi.fn();

function renderModal() {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={qc}>
            <BulkImportModal onClose={mockOnClose} onSuccess={mockOnSuccess} />
        </QueryClientProvider>
    );
}

describe('BulkImportModal Component Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render Step 1: Upload File view initially', () => {
        renderModal();
        expect(screen.getByText('Bulk Import Questions Wizard')).toBeInTheDocument();
        expect(screen.getByText('Drag and drop your spreadsheet here')).toBeInTheDocument();
        expect(screen.getByText('Browse Files')).toBeInTheDocument();
    });

    it('should invoke onClose callback when close button is clicked', () => {
        renderModal();
        const closeBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeBtn);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should render field mappings and preview once a JSON file is uploaded and processed', async () => {
        renderModal();

        // Simulate file upload
        const file = new File([JSON.stringify([{ questionText: 'What is 2+2?', option1: '3', option2: '4', correctOption: '2' }])], 'questions.json', { type: 'application/json' });
        const input = document.querySelector('input[type="file"]')!;
        
        await act(async () => {
            fireEvent.change(input, { target: { files: [file] } });
        });

        // Should proceed to Step 2: Map Columns
        expect(screen.getByText('Map incoming columns to database fields')).toBeInTheDocument();

        // Verify next button is visible
        const nextBtn = screen.getByRole('button', { name: /next/i });
        expect(nextBtn).toBeInTheDocument();

        // Click next to go to Step 3: Preview Data
        fireEvent.click(nextBtn);
        expect(screen.getByText('Pre-import mapping preview (First 5 rows)')).toBeInTheDocument();

        // Start import action triggers importQuestions API
        const mockImportResult = {
            totalRows: 1,
            successful: 1,
            failed: 0,
            errors: []
        };
        vi.mocked(questionBankApi.importQuestions).mockResolvedValue(mockImportResult as any);

        const startBtn = screen.getByRole('button', { name: /start import/i });
        await act(async () => {
            fireEvent.click(startBtn);
        });

        expect(questionBankApi.importQuestions).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Succeeded Rows')).toBeInTheDocument();
        expect(screen.getByText('Perfect execution!')).toBeInTheDocument();
    });
});
