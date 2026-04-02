import { useState, useRef } from 'react';
import { useFcImportPreview, useFcImportCommit } from '../../../hooks/useFinanceCenterQueries';
import { Upload, FileUp, CheckCircle, AlertTriangle, Trash2 } from 'lucide-react';

export default function FinanceImportPage() {
    const [file, setFile] = useState<File | null>(null);
    const [previewed, setPreviewed] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const preview = useFcImportPreview();
    const commit = useFcImportCommit();

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFile(f);
        setPreviewed(false);
        preview.reset();
        commit.reset();
    };

    const handlePreview = () => {
        if (!file) return;
        preview.mutate(file, { onSuccess: () => setPreviewed(true) });
    };

    const handleCommit = () => {
        if (!preview.data?.rows?.length) return;
        commit.mutate({ rows: preview.data.rows });
    };

    const handleClear = () => {
        setFile(null);
        setPreviewed(false);
        preview.reset();
        commit.reset();
        if (fileRef.current) fileRef.current.value = '';
    };

    const rows = preview.data?.rows ?? [];
    const errors = preview.data?.errors ?? [];

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Import Transactions</h2>

            {/* Upload area */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                    <Upload size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Upload File</h3>
                </div>
                <p className="mb-3 text-xs text-slate-500">Upload a CSV or Excel file using the import template format.</p>
                <div className="flex flex-wrap items-center gap-3">
                    <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-indigo-600 dark:text-slate-300 dark:file:bg-indigo-900/30 dark:file:text-indigo-400" />
                    {file && !previewed && (
                        <button onClick={handlePreview} disabled={preview.isPending} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                            <FileUp size={14} /> {preview.isPending ? 'Parsing...' : 'Preview'}
                        </button>
                    )}
                    {file && (
                        <button onClick={handleClear} className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
                            <Trash2 size={14} /> Clear
                        </button>
                    )}
                </div>
                {preview.isError && <p className="mt-2 text-xs text-red-600">{(preview.error as Error).message}</p>}
            </div>

            {/* Parse errors */}
            {errors.length > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-900/20">
                    <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">{errors.length} row(s) had errors</span>
                    </div>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-amber-700 dark:text-amber-300">
                        {errors.map((err: { row: number; message: string }, i: number) => (
                            <li key={i}>Row {err.row}: {err.message}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Preview table */}
            {previewed && rows.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{rows.length} rows ready</span>
                        <button onClick={handleCommit} disabled={commit.isPending || commit.isSuccess} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                            <CheckCircle size={14} /> {commit.isPending ? 'Importing...' : commit.isSuccess ? 'Imported!' : 'Commit Import'}
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                                <tr>
                                    <th className="px-3 py-2 font-medium text-slate-500">#</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Direction</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Amount</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Account</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Category</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Description</th>
                                    <th className="px-3 py-2 font-medium text-slate-500">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rows.slice(0, 100).map((r: Record<string, unknown>, i: number) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{String(r.direction ?? '')}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">BDT {Number(r.amount ?? 0).toLocaleString('en-BD')}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{String(r.accountCode ?? '')}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{String(r.categoryLabel ?? '')}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[200px] truncate">{String(r.description ?? '')}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{String(r.date ?? '')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length > 100 && <p className="px-4 py-2 text-xs text-slate-400">Showing first 100 of {rows.length} rows</p>}
                    </div>
                </div>
            )}

            {/* Success */}
            {commit.isSuccess && (
                <div className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-3 dark:border-green-700 dark:bg-green-900/20">
                    <CheckCircle size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                        {(commit.data as { created?: number })?.created ?? rows.length} transactions imported successfully.
                    </span>
                </div>
            )}
        </div>
    );
}

