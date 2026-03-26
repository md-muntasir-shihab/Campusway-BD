import React, { useMemo, useState } from 'react';
import { Upload, FileText, RefreshCw, CheckCircle2, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import {
    adminBulkImportGlobalQuestions,
    adminGetGlobalQuestionImportJob,
    type AdminQBankImportJobResponse,
} from '../../services/api';

type ImporterProps = {
    onClose: () => void;
    onImported?: () => void;
    onImport?: (rows: Array<Record<string, unknown>>) => Promise<void>;
};

const EXPECTED_FIELDS: Array<{ key: string; label: string; required?: boolean }> = [
    { key: 'question_text', label: 'প্রশ্ন', required: true },
    { key: 'subject', label: 'বিষয়', required: true },
    { key: 'chapter', label: 'অধ্যায়' },
    { key: 'class_level', label: 'শ্রেণি' },
    { key: 'department', label: 'বিভাগ' },
    { key: 'option_a', label: 'অপশন A', required: true },
    { key: 'option_b', label: 'অপশন B', required: true },
    { key: 'option_c', label: 'অপশন C' },
    { key: 'option_d', label: 'অপশন D' },
    { key: 'correct_answer', label: 'সঠিক উত্তর', required: true },
    { key: 'explanation', label: 'ব্যাখ্যা' },
    { key: 'difficulty', label: 'কঠিনতা' },
    { key: 'tags', label: 'ট্যাগ' },
    { key: 'estimated_time', label: 'সময় (সেকেন্ড)' },
    { key: 'image_url', label: 'ইমেজ লিংক' },
    { key: 'alt_text_bn', label: 'ইমেজ Alt টেক্সট (বাংলা)' },
];

function normalizeHeader(value: string): string {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}

function toCsv(rows: Array<Record<string, unknown>>): string {
    if (!rows.length) return '';
    const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    const escapeCsv = (value: unknown): string => {
        const str = String(value ?? '');
        if (str.includes('"') || str.includes(',') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));
    return [headers.join(','), ...body].join('\n');
}

async function waitForImportJob(jobId: string): Promise<AdminQBankImportJobResponse> {
    for (let attempt = 0; attempt < 25; attempt += 1) {
        const response = await adminGetGlobalQuestionImportJob(jobId);
        const data = response.data;
        if (data.status === 'completed' || data.status === 'failed') {
            return data;
        }
        await new Promise((resolve) => setTimeout(resolve, 1200));
    }
    const finalResponse = await adminGetGlobalQuestionImportJob(jobId);
    return finalResponse.data;
}

export default function QuestionImporter({ onClose, onImported, onImport }: ImporterProps) {
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [report, setReport] = useState<AdminQBankImportJobResponse | null>(null);
    const [defaultStatus, setDefaultStatus] = useState<'pending_review' | 'approved'>('pending_review');

    const previewRows = useMemo(() => rows.slice(0, 50), [rows]);
    const mappedPreview = useMemo(() => {
        return previewRows.map((row) => {
            const mapped: Record<string, unknown> = {};
            EXPECTED_FIELDS.forEach((field) => {
                const source = mapping[field.key];
                mapped[field.key] = source ? row[source] : '';
            });
            return mapped;
        });
    }, [mapping, previewRows]);

    const requiredMapped = EXPECTED_FIELDS.filter((field) => field.required).every((field) => Boolean(mapping[field.key]));

    const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setReport(null);
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                toast.error('ফাইলে কোন শিট পাওয়া যায়নি');
                return;
            }
            const sheet = workbook.Sheets[sheetName];
            const parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Array<Record<string, unknown>>;
            if (!parsedRows.length) {
                toast.error('ফাইল খালি আছে');
                return;
            }

            const detectedHeaders = Object.keys(parsedRows[0]);
            setHeaders(detectedHeaders);
            setRows(parsedRows);

            const nextMapping: Record<string, string> = {};
            EXPECTED_FIELDS.forEach((field) => {
                const normalizedKey = normalizeHeader(field.key);
                const match = detectedHeaders.find((header) => normalizeHeader(header) === normalizedKey)
                    || detectedHeaders.find((header) => normalizeHeader(header).includes(normalizedKey))
                    || detectedHeaders.find((header) => normalizeHeader(header).includes(normalizeHeader(field.label)));
                if (match) nextMapping[field.key] = match;
            });
            setMapping(nextMapping);
        } catch (error) {
            console.error(error);
            toast.error('ফাইল পড়তে সমস্যা হয়েছে');
        }
    };

    const handleImport = async () => {
        if (!requiredMapped) {
            toast.error('প্রয়োজনীয় কলাম ম্যাপ করুন');
            return;
        }

        setImporting(true);
        try {
            const payloadRows = rows.map((row) => {
                const mapped: Record<string, unknown> = {};
                EXPECTED_FIELDS.forEach((field) => {
                    const source = mapping[field.key];
                    mapped[field.key] = source ? row[source] : '';
                });

                return {
                    ...mapped,
                    question: mapped.question_text,
                    optionA: mapped.option_a,
                    optionB: mapped.option_b,
                    optionC: mapped.option_c,
                    optionD: mapped.option_d,
                    correctAnswer: String(mapped.correct_answer || '').trim().toUpperCase(),
                    class_level: mapped.class_level,
                    difficulty: String(mapped.difficulty || 'medium').toLowerCase(),
                    tags: String(mapped.tags || '')
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                };
            });

            if (onImport) {
                await onImport(payloadRows);
                toast.success(`ইমপোর্ট সম্পন্ন: ${payloadRows.length} টি`);
                onImported?.();
            } else {
                const startResponse = await adminBulkImportGlobalQuestions({
                    rows: payloadRows,
                    defaultStatus,
                    sourceFileName: fileName || 'bulk-import.xlsx',
                });
                const importJobId = startResponse.data.import_job_id;
                const finalReport = await waitForImportJob(importJobId);
                setReport(finalReport);
                onImported?.();

                if (finalReport.status === 'completed') {
                    toast.success(`ইমপোর্ট সম্পন্ন: ${finalReport.summary.importedRows} টি`);
                } else {
                    toast.error('ইমপোর্ট ব্যর্থ হয়েছে');
                }
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error?.response?.data?.message || 'ইমপোর্ট করা যায়নি');
        } finally {
            setImporting(false);
        }
    };

    const downloadFailedRows = () => {
        if (!report?.rowErrors?.length) return;
        const csv = toCsv(report.rowErrors.map((entry) => ({
            rowNumber: entry.rowNumber,
            reason: entry.reason,
            ...(entry.payload || {}),
        })));
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'failed_rows.csv';
        anchor.click();
        URL.revokeObjectURL(url);
    };

    if (!headers.length) {
        return (
            <div className="space-y-6">
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-300" />
                        প্রশ্ন বাল্ক ইমপোর্ট
                    </h3>
                    <p className="text-xs text-slate-400 mt-2">CSV/Excel আপলোড করুন, তারপর কলাম ম্যাপিং ও ভ্যালিডেশন করুন।</p>
                </div>
                <label className="block rounded-2xl border-2 border-dashed border-cyan-500/25 bg-slate-950/40 p-8 text-center cursor-pointer hover:border-cyan-400/40 transition-colors">
                    <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} />
                    <Upload className="w-10 h-10 text-cyan-300 mx-auto mb-3" />
                    <p className="text-sm text-white font-medium">ফাইল সিলেক্ট করুন</p>
                    <p className="text-xs text-slate-400 mt-1">সমর্থিত: .xlsx / .xls / .csv</p>
                </label>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm text-slate-300 hover:text-white">
                        বন্ধ করুন
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-4">
                <p className="text-xs text-slate-300">ফাইল: <span className="text-white font-medium">{fileName}</span></p>
                <p className="text-xs text-slate-400 mt-1">মোট রো: {rows.length} (প্রিভিউ: {previewRows.length})</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {EXPECTED_FIELDS.map((field) => {
                    const mapped = Boolean(mapping[field.key]);
                    return (
                        <div key={field.key} className="rounded-xl border border-slate-700/50 bg-slate-950/40 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-slate-200">{field.label}</p>
                                {field.required ? (
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${mapped ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                        Required
                                    </span>
                                ) : null}
                            </div>
                            <select
                                value={mapping[field.key] || ''}
                                onChange={(e) => setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                className="w-full rounded-lg bg-slate-900/80 border border-slate-700 px-3 py-2 text-xs text-white"
                            >
                                <option value="">-- কলাম বেছে নিন --</option>
                                {headers.map((header) => (
                                    <option key={header} value={header}>{header}</option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-2xl border border-slate-700/50 bg-slate-950/40 p-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-300">ডিফল্ট স্ট্যাটাস</p>
                    <select
                        value={defaultStatus}
                        onChange={(e) => setDefaultStatus(e.target.value as 'pending_review' | 'approved')}
                        className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white"
                    >
                        <option value="pending_review">pending_review</option>
                        <option value="approved">approved</option>
                    </select>
                </div>
                <p className="text-[11px] text-slate-400">শুধু প্রথম ৫০টি রো এখানে প্রিভিউ হিসেবে দেখানো হয়।</p>
            </div>

            <div className="max-h-48 overflow-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs">
                    <thead className="bg-slate-900/80 text-slate-400">
                        <tr>
                            <th className="p-2 text-left">প্রশ্ন</th>
                            <th className="p-2 text-left">বিষয়</th>
                            <th className="p-2 text-left">সঠিক উত্তর</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mappedPreview.slice(0, 8).map((row, index) => (
                            <tr key={index} className="border-t border-slate-800">
                                <td className="p-2 text-slate-200 line-clamp-2">{String(row.question_text || '')}</td>
                                <td className="p-2 text-slate-300">{String(row.subject || '-')}</td>
                                <td className="p-2 text-slate-300">{String(row.correct_answer || '-')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {report ? (
                <div className="rounded-2xl border border-slate-700/50 bg-slate-950/50 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white">
                        {report.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        <span>ইমপোর্ট রিপোর্ট</span>
                    </div>
                    <p className="text-xs text-slate-300">
                        Imported: {report.summary.importedRows} | Failed: {report.summary.failedRows} | Duplicate: {report.summary.duplicateRows}
                    </p>
                    {report.rowErrors.length > 0 ? (
                        <button onClick={downloadFailedRows} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-200 hover:bg-amber-500/25">
                            <Download className="w-3.5 h-3.5" />
                            failed_rows.csv ডাউনলোড
                        </button>
                    ) : null}
                </div>
            ) : null}

            <div className="flex justify-between items-center pt-1">
                <button
                    onClick={() => {
                        setHeaders([]);
                        setRows([]);
                        setMapping({});
                        setReport(null);
                    }}
                    className="text-sm text-slate-400 hover:text-white"
                >
                    নতুন ফাইল দিন
                </button>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300">
                        বন্ধ
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !requiredMapped}
                        className="px-5 py-2 rounded-xl text-sm bg-gradient-to-r from-cyan-600 to-indigo-600 text-white disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {importing ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                        ইমপোর্ট করুন
                    </button>
                </div>
            </div>
        </div>
    );
}
