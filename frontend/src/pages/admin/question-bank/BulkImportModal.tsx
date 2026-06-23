import { useState, useCallback, useMemo, useRef } from 'react';
import {
    X,
    Upload,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Download,
    FileSpreadsheet,
    HelpCircle,
    Settings,
    Table,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import * as questionBankApi from '../../../api/questionBankApi';
import type { ImportResult } from '../../../types/exam-system';

interface BulkImportModalProps {
    onClose: () => void;
    onSuccess: (result?: ImportResult) => void;
}

const EXPECTED_FIELDS = [
    { key: 'questionText', label: 'Question Text (English)', required: true },
    { key: 'questionTextBn', label: 'Question Text (Bangla)' },
    { key: 'questionType', label: 'Question Type (mcq/written/true_false)' },
    { key: 'option1', label: 'Option 1 (English)' },
    { key: 'option1Bn', label: 'Option 1 (Bangla)' },
    { key: 'option2', label: 'Option 2 (English)' },
    { key: 'option2Bn', label: 'Option 2 (Bangla)' },
    { key: 'option3', label: 'Option 3 (English)' },
    { key: 'option3Bn', label: 'Option 3 (Bangla)' },
    { key: 'option4', label: 'Option 4 (English)' },
    { key: 'option4Bn', label: 'Option 4 (Bangla)' },
    { key: 'correctOption', label: 'Correct Answer (1-4 / A-D)' },
    { key: 'difficulty', label: 'Difficulty (easy/medium/hard)' },
    { key: 'marks', label: 'Marks' },
    { key: 'negativeMarks', label: 'Negative Marks' },
    { key: 'group', label: 'Group (e.g. Admission)' },
    { key: 'subGroup', label: 'Sub Group (e.g. Engineering)' },
    { key: 'subject', label: 'Subject' },
    { key: 'chapter', label: 'Chapter' },
    { key: 'topic', label: 'Topic' },
    { key: 'tags', label: 'Tags (comma separated)' },
    { key: 'explanation', label: 'Explanation (English)' },
    { key: 'explanationBn', label: 'Explanation (Bangla)' },
    { key: 'imageUrl', label: 'Image URL' },
    { key: 'year', label: 'Year' },
    { key: 'source', label: 'Source' },
];

function normalize(str: string): string {
    return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function BulkImportModal({ onClose, onSuccess }: BulkImportModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, unknown>[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [dragActive, setDragActive] = useState(false);
    
    // Import state
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Read and parse file
    const processFile = useCallback(async (selectedFile: File) => {
        const name = selectedFile.name.toLowerCase();
        if (!name.endsWith('.csv') && !name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.json')) {
            toast.error('Unsupported file format. Please upload .csv, .xlsx, .xls, or .json');
            return;
        }

        setFile(selectedFile);
        
        try {
            if (name.endsWith('.json')) {
                const text = await selectedFile.text();
                const data = JSON.parse(text);
                const parsedRows = Array.isArray(data) ? data : [data];
                if (parsedRows.length === 0) {
                    toast.error('JSON file is empty');
                    return;
                }
                const detectedHeaders = Object.keys(parsedRows[0]);
                setHeaders(detectedHeaders);
                setRows(parsedRows);
                autoMap(detectedHeaders);
                setStep(2);
            } else {
                // Excel/CSV using xlsx reader
                const buffer = await selectedFile.arrayBuffer();
                const wb = XLSX.read(buffer, { type: 'array' });
                const sheetName = wb.SheetNames[0];
                if (!sheetName) {
                    toast.error('No sheets found in the uploaded workbook');
                    return;
                }
                const ws = wb.Sheets[sheetName];
                const parsedRows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];
                if (parsedRows.length === 0) {
                    toast.error('No data rows found in the sheet');
                    return;
                }
                const detectedHeaders = Object.keys(parsedRows[0]);
                setHeaders(detectedHeaders);
                setRows(parsedRows);
                autoMap(detectedHeaders);
                setStep(2);
            }
        } catch (err) {
            console.error('File parsing error:', err);
            toast.error('Failed to parse file. Ensure it is valid.');
        }
    }, []);

    // Automatic Column Mapping based on header names/aliases
    const autoMap = (detectedHeaders: string[]) => {
        const newMapping: Record<string, string> = {};
        EXPECTED_FIELDS.forEach((field) => {
            const fieldNorm = normalize(field.key);
            // Search direct match or containing keywords
            const match = detectedHeaders.find((h) => {
                const hNorm = normalize(h);
                return hNorm === fieldNorm || hNorm.includes(fieldNorm) || fieldNorm.includes(hNorm);
            });
            if (match) {
                newMapping[field.key] = match;
            }
        });
        setMapping(newMapping);
    };

    // Mapping validations
    const missingRequiredFields = useMemo(() => {
        return EXPECTED_FIELDS.filter((f) => f.required && !mapping[f.key]);
    }, [mapping]);

    // Handle drag & drop events
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    // Reset flow
    const handleReset = () => {
        setFile(null);
        setHeaders([]);
        setRows([]);
        setMapping({});
        setImportResult(null);
        setStep(1);
    };

    // Perform Import Mutation via direct API for upload progress tracking
    const executeImport = async () => {
        if (!file) return;
        setIsImporting(true);
        setUploadProgress(0);
        setStep(4);

        try {
            const result = await questionBankApi.importQuestions(
                file,
                mapping,
                (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percent);
                    }
                }
            );

            // Access response data safely
            const data = (result as unknown as { data?: ImportResult })?.data ?? (result as unknown as ImportResult);
            setImportResult(data);

            const successCount = data.successful ?? 0;
            const failedCount = data.failed ?? 0;
            
            if (failedCount === 0) {
                toast.success(`Successfully imported ${successCount} questions.`);
                onSuccess(data);
            } else {
                toast.error(`Import completed with ${failedCount} errors.`);
            }
        } catch (err: unknown) {
            console.error('Import failed:', err);
            // Handle error response detail
            const resp = (err as { response?: { data?: { data?: ImportResult; message?: string } } })?.response;
            const data = resp?.data?.data;
            if (data && typeof data === 'object') {
                setImportResult(data);
                toast.error(`Import failed. ${data.failed} rows had validation errors.`);
            } else {
                const message = resp?.data?.message || (err instanceof Error ? err.message : 'Import failed');
                toast.error(message);
            }
        } finally {
            setIsImporting(false);
        }
    };

    // Download Failed Rows CSV template for rapid fixing
    const downloadFailedRows = () => {
        if (!importResult || !importResult.errors || importResult.errors.length === 0) return;

        // Map errors to columns
        const failedPayloads = importResult.errors.map((err) => {
            const rowIdx = err.row - 2; // Assuming row 1 is header
            const originalRow = rows[rowIdx] || {};
            return {
                'Row Number': err.row,
                'Error Message': err.message || 'Validation error',
                ...originalRow
            };
        });

        // Convert failed payloads to CSV
        const worksheet = XLSX.utils.json_to_sheet(failedPayloads);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `failed_rows_${file?.name || 'import'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
                
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                            Bulk Import Questions Wizard
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Upload spreadsheets, configure custom mappings, validate rules, and commit questions.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Wizard Steps Indicator */}
                <div className="flex border-b border-slate-100 bg-slate-50 px-6 py-3 dark:border-slate-850 dark:bg-slate-950/40">
                    {[
                        { number: 1, label: 'Upload File', active: step === 1, done: step > 1 },
                        { number: 2, label: 'Map Columns', active: step === 2, done: step > 2 },
                        { number: 3, label: 'Preview Data', active: step === 3, done: step > 3 },
                        { number: 4, label: 'Import & Validation', active: step === 4, done: false },
                    ].map((s) => (
                        <div key={s.number} className="mr-6 flex items-center gap-2">
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                                    s.active
                                        ? 'bg-indigo-600 text-white'
                                        : s.done
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}
                            >
                                {s.done ? '✓' : s.number}
                            </span>
                            <span
                                className={`text-xs font-medium ${
                                    s.active
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                {s.label}
                            </span>
                            {s.number < 4 && (
                                <span className="ml-4 text-slate-300 dark:text-slate-700">/</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Modal Content */}
                <div className="p-6">
                    {/* STEP 1: Upload File */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all ${
                                    dragActive
                                        ? 'border-indigo-500 bg-indigo-50/20 dark:border-indigo-400 dark:bg-indigo-950/20'
                                        : 'border-slate-300 hover:border-indigo-400 dark:border-slate-700 dark:hover:border-indigo-500'
                                }`}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".xlsx,.xls,.csv,.json"
                                    aria-label="Upload spreadsheet file"
                                    className="hidden"
                                />
                                <Upload className="mb-4 h-12 w-12 text-slate-400 dark:text-slate-650" />
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    Drag and drop your spreadsheet here
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                    Supports .xlsx, .xls, .csv, and .json files up to 10MB
                                </p>
                                <button
                                    type="button"
                                    className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                                >
                                    Browse Files
                                </button>
                            </div>

                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/20">
                                <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    <HelpCircle className="h-4 w-4 text-indigo-500" />
                                    Tips for a successful import
                                </h4>
                                <ul className="mt-2 list-disc pl-5 text-xs text-slate-500 dark:text-slate-400 space-y-1">
                                    <li>Ensure Question Text is supplied for every row.</li>
                                    <li>For MCQ questions, options 1 and 2 are required, along with a valid correctOption reference (e.g. 1, 2, A, B).</li>
                                    <li>Hierarchy paths will resolve existing nodes automatically or build new ones if missing.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Map Columns */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Map incoming columns to database fields
                                </h3>
                                <button
                                    onClick={() => autoMap(headers)}
                                    className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850"
                                >
                                    <Settings className="h-3.5 w-3.5" />
                                    Auto-match columns
                                </button>
                            </div>

                            {missingRequiredFields.length > 0 && (
                                <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-rose-700 dark:bg-rose-950/15 dark:text-rose-400">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div className="text-xs">
                                        <span className="font-semibold">Missing required mappings: </span>
                                        {missingRequiredFields.map((f) => f.label).join(', ')}
                                    </div>
                                </div>
                            )}

                            <div className="grid max-h-[300px] grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                                {EXPECTED_FIELDS.map((field) => {
                                    const isMapped = !!mapping[field.key];
                                    return (
                                        <div
                                            key={field.key}
                                            className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/60"
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                    {field.label}
                                                    {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                                                </span>
                                                {field.required && (
                                                    <span
                                                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                                            isMapped
                                                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                                                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                        }`}
                                                    >
                                                        {isMapped ? 'Mapped' : 'Required'}
                                                    </span>
                                                )}
                                            </div>
                                            <select
                                                value={mapping[field.key] || ''}
                                                onChange={(e) =>
                                                    setMapping((prev) => ({
                                                        ...prev,
                                                        [field.key]: e.target.value,
                                                    }))
                                                }
                                                aria-label={`Map column for ${field.label}`}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                                            >
                                                <option value="">-- Ignore / Skip --</option>
                                                {headers.map((h) => (
                                                    <option key={h} value={h}>
                                                        {h}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Preview Data */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                    Pre-import mapping preview (First 5 rows)
                                </h3>
                                <span className="text-xs text-slate-500">
                                    Total rows in file: {rows.length}
                                </span>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-850">
                                <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-950">
                                        <tr>
                                            {EXPECTED_FIELDS.filter((f) => mapping[f.key]).map((f) => (
                                                <th
                                                    key={f.key}
                                                    className="px-4 py-2.5 text-left font-bold text-slate-600 dark:text-slate-400"
                                                >
                                                    {f.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-850 dark:bg-slate-900">
                                        {rows.slice(0, 5).map((row, idx) => (
                                            <tr key={idx}>
                                                {EXPECTED_FIELDS.filter((f) => mapping[f.key]).map((f) => {
                                                    const sourceCol = mapping[f.key];
                                                    const val = row[sourceCol];
                                                    return (
                                                        <td
                                                            key={f.key}
                                                            className="max-w-[200px] truncate px-4 py-2 text-slate-700 dark:text-slate-300"
                                                            title={String(val || '')}
                                                        >
                                                            {String(val ?? '-')}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Import & Validation */}
                    {step === 4 && (
                        <div className="space-y-6">
                            {isImporting ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                    <div className="relative flex items-center justify-center">
                                        <div className="h-20 w-20 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-400"></div>
                                        <span className="absolute text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                            {uploadProgress}%
                                        </span>
                                    </div>
                                    <div className="text-center">
                                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            Uploading and parsing questions...
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Please don't close the wizard. Large databases may take up to a minute.
                                        </p>
                                    </div>
                                </div>
                            ) : importResult ? (
                                <div className="space-y-4">
                                    {/* Overall stats */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 dark:border-emerald-950/20 dark:bg-emerald-950/10">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                <span className="text-xs font-semibold text-slate-500">
                                                    Succeeded Rows
                                                </span>
                                            </div>
                                            <h2 className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {importResult.successful}
                                            </h2>
                                        </div>

                                        <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-4 dark:border-rose-950/20 dark:bg-rose-950/10">
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                                                <span className="text-xs font-semibold text-slate-500">
                                                    Failed Rows
                                                    </span>
                                            </div>
                                            <h2 className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                                                {importResult.failed}
                                            </h2>
                                        </div>

                                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                                            <div className="flex items-center gap-2">
                                                <Table className="h-5 w-5 text-slate-500" />
                                                <span className="text-xs font-semibold text-slate-500">
                                                    Total Processed
                                                </span>
                                            </div>
                                            <h2 className="mt-2 text-2xl font-bold text-slate-700 dark:text-slate-200">
                                                {importResult.totalRows}
                                            </h2>
                                        </div>
                                    </div>

                                    {/* Action row */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            Validation Errors Report
                                        </h3>
                                        {importResult.failed > 0 && (
                                            <button
                                                onClick={downloadFailedRows}
                                                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                Download failed rows CSV
                                            </button>
                                        )}
                                    </div>

                                    {/* Errors list */}
                                    {importResult.failed > 0 && importResult.errors && (
                                        <div className="max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                                                <thead className="bg-slate-50 dark:bg-slate-950">
                                                    <tr>
                                                        <th className="px-4 py-2 text-left font-bold text-slate-600 dark:text-slate-400">
                                                            Row #
                                                        </th>
                                                        <th className="px-4 py-2 text-left font-bold text-slate-600 dark:text-slate-400">
                                                            Field / Reason
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-850 dark:bg-slate-900">
                                                    {importResult.errors.map((err, index) => (
                                                        <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                                                            <td className="px-4 py-2 font-semibold text-slate-800 dark:text-slate-200">
                                                                {err.row}
                                                            </td>
                                                            <td className="px-4 py-2 text-rose-600 dark:text-rose-455">
                                                                {err.message || 'Validation error'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {importResult.failed === 0 && (
                                        <div className="flex flex-col items-center justify-center p-8 text-center bg-emerald-50/10 rounded-2xl border border-emerald-500/10">
                                            <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
                                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-250">
                                                Perfect execution!
                                            </p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                All questions were validated and saved without any errors.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div>
                        {step === 2 && file && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                                {file.name} ({(file.size / 1024).toFixed(1)} KB)
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {step > 1 && step < 4 && (
                            <button
                                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                                className="flex items-center gap-1 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back
                            </button>
                        )}

                        {step === 1 && (
                            <button
                                onClick={onClose}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-750 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800"
                            >
                                Close
                            </button>
                        )}

                        {step === 2 && (
                            <button
                                onClick={() => setStep(3)}
                                disabled={missingRequiredFields.length > 0}
                                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Next
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        )}

                        {step === 3 && (
                            <button
                                onClick={executeImport}
                                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                            >
                                Start Import
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        )}

                        {step === 4 && !isImporting && (
                            <button
                                onClick={handleReset}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                            >
                                Import another file
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
