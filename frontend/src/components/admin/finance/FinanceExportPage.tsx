import { useState } from 'react';
import { fcApi } from '../../../api/adminFinanceApi';
import { Download, Upload, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadFile } from '../../../utils/download';

export default function FinanceExportPage() {
    const [format, setFormat] = useState<'csv' | 'xlsx'>('xlsx');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [downloading, setDownloading] = useState(false);

    const handleExport = async () => {
        setDownloading(true);
        try {
            const response = await fcApi.exportTransactions({ format, from: from || undefined, to: to || undefined });
            downloadFile(response, { filename: `finance-transactions.${format}` });
            toast.success(`Exported ${format.toUpperCase()}`);
        } catch {
            toast.error('Failed to export transactions');
        } finally {
            setDownloading(false);
        }
    };

    const handlePLReport = async () => {
        try {
            await fcApi.downloadPLReport(from || undefined);
        } catch {
            toast.error('Failed to download P&L report');
        }
    };

    const handleTemplate = async () => {
        try {
            const response = await fcApi.downloadImportTemplate();
            downloadFile(response, { filename: 'finance-import-template.xlsx' });
            toast.success('Template downloaded');
        } catch {
            toast.error('Failed to download template');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Export</h2>

            {/* Export transactions */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                    <Download size={16} className="text-indigo-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Export Transactions</h3>
                </div>
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-slate-500">Format</label>
                        <select value={format} onChange={e => setFormat(e.target.value as 'csv' | 'xlsx')} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                            <option value="xlsx">Excel (.xlsx)</option>
                            <option value="csv">CSV</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-slate-500">From</label>
                        <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-medium text-slate-500">To</label>
                        <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
                    </div>
                    <button onClick={handleExport} disabled={downloading} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                        <Download size={14} /> {downloading ? 'Downloading...' : 'Export'}
                    </button>
                </div>
            </div>

            {/* P&L Report */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">P&L Report (PDF)</h3>
                </div>
                <p className="mb-3 text-xs text-slate-500">Download a Profit & Loss statement as PDF.</p>
                <button onClick={handlePLReport} className="flex items-center gap-1 rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700">
                    <Download size={14} /> Download P&L
                </button>
            </div>

            {/* Import template */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2">
                    <Upload size={16} className="text-amber-500" />
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Import Template</h3>
                </div>
                <p className="mb-3 text-xs text-slate-500">Download the template file, fill in your data, then use the Import page to upload.</p>
                <button onClick={handleTemplate} className="flex items-center gap-1 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-700">
                    <Download size={14} /> Download Template
                </button>
            </div>
        </div>
    );
}
