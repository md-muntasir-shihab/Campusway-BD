import { useId, useState } from 'react';
import toast from 'react-hot-toast';
import { ExternalLink, FileUp, Loader2, Trash2 } from 'lucide-react';
import { adminUploadMedia } from '../../services/api';

type UploadCategory = 'admin_upload';

type AdminFileUploadFieldProps = {
    label: string;
    value?: string | null;
    onChange: (nextValue: string) => void;
    helper?: string;
    category?: UploadCategory;
    required?: boolean;
    disabled?: boolean;
    accept?: string;
    onUpload?: (file: File) => Promise<string>;
    uploadSuccessMessage?: string;
    uploadErrorMessage?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    className?: string;
};

async function uploadWithDefaultMediaEndpoint(file: File, category: UploadCategory): Promise<string> {
    const response = await adminUploadMedia(file, {
        visibility: 'public',
        category,
    });
    const payload = response.data as { url?: string; absoluteUrl?: string };
    const nextUrl = String(payload?.url || payload?.absoluteUrl || '').trim();
    if (!nextUrl) {
        throw new Error('No file URL returned');
    }
    return nextUrl;
}

function getFileLabel(value: string): string {
    try {
        const url = new URL(value, window.location.origin);
        const parts = url.pathname.split('/').filter(Boolean);
        return decodeURIComponent(parts[parts.length - 1] || value);
    } catch {
        return value.split('/').filter(Boolean).pop() || value;
    }
}

export default function AdminFileUploadField({
    label,
    value,
    onChange,
    helper,
    category = 'admin_upload',
    required = false,
    disabled = false,
    accept = '.pdf,.csv,.xls,.xlsx,.mp4,.webm,image/*',
    onUpload,
    uploadSuccessMessage,
    uploadErrorMessage,
    emptyTitle = 'No file uploaded yet',
    emptyDescription = 'Upload a file and the saved URL will be filled automatically.',
    className = '',
}: AdminFileUploadFieldProps) {
    const inputId = useId();
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const currentValue = String(value || '').trim();
    const hasValue = currentValue.length > 0;

    const handleUpload = async (file?: File | null) => {
        if (!file || disabled) return;
        setUploading(true);
        setError('');
        try {
            const nextUrl = onUpload
                ? await onUpload(file)
                : await uploadWithDefaultMediaEndpoint(file, category);
            onChange(String(nextUrl || '').trim());
            toast.success(uploadSuccessMessage || 'File uploaded');
        } catch (rawError: unknown) {
            const resolvedMessage = String(
                (rawError as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
                || (rawError as { message?: string })?.message
                || uploadErrorMessage
                || 'Failed to upload file',
            ).trim();
            setError(resolvedMessage);
            toast.error(uploadErrorMessage || resolvedMessage);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`space-y-2 ${className}`.trim()}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor={inputId} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {label}
                    {required ? <span className="ml-1 text-rose-400">*</span> : null}
                </label>
                {hasValue ? (
                    <a
                        href={currentValue}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-400 dark:text-indigo-300"
                    >
                        Open file
                        <ExternalLink className="h-3 w-3" />
                    </a>
                ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-indigo-500/10 dark:bg-slate-950/45">
                <div className="space-y-4">
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 dark:border-indigo-500/15 dark:bg-slate-950/75">
                        {hasValue ? (
                            <div className="space-y-2">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 dark:text-indigo-300">
                                    <FileUp className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                    {getFileLabel(currentValue)}
                                </p>
                                <p className="break-all text-[11px] text-slate-500 dark:text-slate-400">{currentValue}</p>
                            </div>
                        ) : (
                            <div className="max-w-sm">
                                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{emptyTitle}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{emptyDescription}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <label
                            htmlFor={inputId}
                            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                                disabled || uploading
                                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'
                                    : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/15 dark:border-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-100'
                            }`}
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                            {hasValue ? 'Replace file' : 'Upload file'}
                            <input
                                id={inputId}
                                type="file"
                                accept={accept}
                                disabled={disabled || uploading}
                                className="hidden"
                                onChange={(event) => {
                                    void handleUpload(event.target.files?.[0] || null);
                                    event.currentTarget.value = '';
                                }}
                            />
                        </label>

                        {hasValue ? (
                            <button
                                type="button"
                                disabled={disabled || uploading}
                                onClick={() => {
                                    setError('');
                                    onChange('');
                                }}
                                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-500 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-300"
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove
                            </button>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {helper || 'PDF, Excel, CSV, MP4, WebM, or image files can be uploaded here.'}
                        </p>
                        {error ? <p className="text-xs text-rose-500 dark:text-rose-300">{error}</p> : null}
                    </div>
                </div>
            </div>
        </div>
    );
}
