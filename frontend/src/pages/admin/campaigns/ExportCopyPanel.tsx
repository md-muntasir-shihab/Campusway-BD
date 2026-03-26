/**
 * ExportCopyPanel — export phones/emails with custom format presets and clipboard copy
 */
import { useState } from 'react';
import { exportDataHub } from '../../../api/adminNotificationCampaignApi';

interface Props {
    showToast: (m: string, t?: 'success' | 'error') => void;
}

const EXPORT_TYPES = [
    { key: 'phone_list', label: 'Phone Numbers', desc: 'All student phone numbers' },
    { key: 'email_list', label: 'Email Addresses', desc: 'All student email addresses' },
    { key: 'manual_send_list', label: 'Manual Send List', desc: 'Phone + Email combined for manual campaigns' },
    { key: 'guardians', label: 'Guardian Contacts', desc: 'Guardian phone/email contacts' },
    { key: 'audience_segment', label: 'Student Group Segment', desc: 'Export by student group' },
    { key: 'failed_deliveries', label: 'Failed Deliveries', desc: 'Contacts from failed deliveries for re-attempt' },
] as const;

const FORMAT_OPTIONS = [
    { key: 'xlsx', label: 'Excel (.xlsx)' },
    { key: 'csv', label: 'CSV (.csv)' },
    { key: 'txt', label: 'TXT (plain text)' },
    { key: 'clipboard', label: '📋 Copy to Clipboard' },
];

const PREFIX_PRESETS = [
    { label: 'None', value: '' },
    { label: '+88 prefix', value: '+88' },
    { label: 'sms:', value: 'sms:' },
    { label: 'WA:', value: 'WA:' },
    { label: 'mail:', value: 'mail:' },
    { label: '[VIP] ', value: '[VIP] ' },
];

const SEPARATOR_PRESETS = [
    { label: 'New line', value: '\n' },
    { label: 'Comma', value: ',' },
    { label: 'Semicolon', value: ';' },
    { label: 'Tab', value: '\t' },
    { label: 'Space', value: ' ' },
];

const fieldCls = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200';
const labelCls = 'block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1';

export default function ExportCopyPanel({ showToast }: Props) {
    const [exportType, setExportType] = useState<string>('phone_list');
    const [format, setFormat] = useState('xlsx');
    const [prefix, setPrefix] = useState('');
    const [separator, setSeparator] = useState('\n');
    const [customPrefix, setCustomPrefix] = useState('');
    const [channel, setChannel] = useState<'sms' | 'email'>('sms');
    const [includeGuardians, setIncludeGuardians] = useState(false);
    const [busy, setBusy] = useState(false);
    const [clipboardText, setClipboardText] = useState('');

    const effectivePrefix = customPrefix || prefix;

    async function handleExport() {
        setBusy(true);
        setClipboardText('');
        try {
            const payload = {
                category: exportType,
                format,
                channel,
                includeGuardians,
                selectedFields: exportType.includes('phone') ? ['phone'] : exportType.includes('email') ? ['email'] : undefined,
            };

            if (format === 'clipboard' || format === 'txt') {
                const res = await exportDataHub(payload) as { text?: string; data?: Record<string, unknown>[]; count?: number; rowCount?: number };
                let raw = '';
                if (res.text) {
                    raw = res.text;
                } else if (Array.isArray(res.data)) {
                    raw = res.data.map((row: Record<string, unknown>) => {
                        const value = String(Object.values(row)[0] ?? '').trim();
                        return value ? `${effectivePrefix}${value}` : '';
                    }).filter(Boolean).join(separator);
                }
                if (format === 'clipboard') {
                    await navigator.clipboard.writeText(raw);
                    setClipboardText(raw);
                    showToast(`Copied ${raw.split(separator.replace(/\n/, '\n') || '\n').length} entries`);
                } else {
                    const blob = new Blob([raw], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `export-${exportType}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showToast('Downloaded');
                }
            } else {
                const res = await exportDataHub(payload) as { data?: unknown };
                const blob = new Blob([res as any], { type: format === 'csv' ? 'text/csv' : 'application/octet-stream' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export-${exportType}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Download started');
            }
        } catch {
            showToast('Export failed', 'error');
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Export / Copy Center</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Export contact lists for manual campaigns. Use "Copy to Clipboard" for quick access on mobile / SMS apps.
                </p>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-slate-900 space-y-5">
                {/* Export type cards */}
                <div>
                    <label className={labelCls}>What to Export</label>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {EXPORT_TYPES.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setExportType(t.key)}
                                className={`rounded-xl border px-4 py-3 text-left transition-all ${exportType === t.key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                            >
                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{t.label}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{t.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Format & settings */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                        <label className={labelCls}>Export Format</label>
                        <select value={format} onChange={e => setFormat(e.target.value)} className={fieldCls} title="Export Format">
                            {FORMAT_OPTIONS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                        </select>
                    </div>

                    {exportType === 'manual_send_list' && (
                        <div>
                            <label className={labelCls}>Channel</label>
                            <select value={channel} onChange={e => setChannel(e.target.value as 'sms' | 'email')} className={fieldCls} title="Channel">
                                <option value="sms">SMS (phones)</option>
                                <option value="email">Email (emails)</option>
                            </select>
                        </div>
                    )}

                    {(format === 'clipboard' || format === 'txt') && (
                        <>
                            <div>
                                <label className={labelCls}>Number Prefix</label>
                                <select value={prefix} onChange={e => { setPrefix(e.target.value); setCustomPrefix(''); }} className={fieldCls} title="Number Prefix">
                                    {PREFIX_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Custom Prefix Override</label>
                                <input value={customPrefix} onChange={e => setCustomPrefix(e.target.value)} className={fieldCls} placeholder="e.g. +880 or myapp:" />
                            </div>
                            <div>
                                <label className={labelCls}>Separator</label>
                                <select value={separator} onChange={e => setSeparator(e.target.value)} className={fieldCls} title="Separator">
                                    {SEPARATOR_PRESETS.map(s => <option key={s.label} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={includeGuardians} onChange={e => setIncludeGuardians(e.target.checked)} className="rounded border-slate-300" title="Include guardian contacts" aria-label="Include guardian contacts" />
                    Include guardian contacts
                </label>

                <button
                    onClick={handleExport}
                    disabled={busy}
                    className="w-full rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                    {busy ? 'Exporting...' : format === 'clipboard' ? '📋 Copy to Clipboard' : '⬇ Download Export'}
                </button>
            </div>

            {/* Clipboard preview */}
            {clipboardText && (
                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-900">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Clipboard Preview</h4>
                        <button
                            onClick={async () => { await navigator.clipboard.writeText(clipboardText); showToast('Copied again!'); }}
                            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                            Copy again
                        </button>
                    </div>
                    <textarea
                        readOnly
                        value={clipboardText}
                        rows={8}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 resize-y"
                        title="Clipboard Preview"
                        aria-label="Clipboard Preview"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                        {clipboardText.split('\n').filter(Boolean).length} entries copied
                    </p>
                </div>
            )}
        </div>
    );
}
