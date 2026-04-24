import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import {
    registerDialogHost,
    type AppDialogAlertOptions,
    type AppDialogConfirmOptions,
    type AppDialogPromptOptions,
    type DialogRequest,
    type DialogTone,
    type SensitiveActionDialogOptions,
    type SensitiveActionDialogResult,
} from '../../lib/appDialog';
import FocusTrap from '../common/FocusTrap';

function toneToClasses(tone: DialogTone = 'default') {
    if (tone === 'danger') {
        return {
            accent: 'text-rose-300',
            button: 'bg-rose-600 hover:bg-rose-500',
            badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        };
    }
    if (tone === 'success') {
        return {
            accent: 'text-emerald-300',
            button: 'bg-emerald-600 hover:bg-emerald-500',
            badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        };
    }
    return {
        accent: 'text-cyan-300',
        button: 'bg-indigo-600 hover:bg-indigo-500',
        badge: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    };
}

function DialogShell({
    title,
    subtitle,
    tone,
    children,
    footer,
    onClose,
}: {
    title: string;
    subtitle?: string;
    tone?: DialogTone;
    children: React.ReactNode;
    footer: React.ReactNode;
    onClose: () => void;
}) {
    const styles = toneToClasses(tone);

    // Lock body scroll when dialog is open
    useEffect(() => {
        const original = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = original; };
    }, []);

    const dialogTitleId = `dialog-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        >
            <FocusTrap active>
                <div className="w-full max-w-lg max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-[28px] border border-card-border dark:border-white/10 bg-surface dark:bg-slate-900/95 shadow-[0_28px_90px_rgba(2,8,23,0.55)]">
                    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-card-border dark:border-white/10 px-3 py-4 sm:px-6 sm:py-5 bg-surface dark:bg-slate-900/95">
                        <div className="min-w-0">
                            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${styles.badge}`}>
                                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                                Secure action
                            </div>
                            <h2 id={dialogTitleId} className="mt-3 text-xl font-semibold text-text dark:text-white">{title}</h2>
                            {subtitle ? <p className="mt-1 text-sm leading-6 text-text-muted dark:text-slate-400">{subtitle}</p> : null}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-card-border dark:border-white/10 p-2 text-text-muted dark:text-slate-400 transition hover:bg-black/5 dark:hover:bg-white/5 hover:text-text dark:hover:text-white"
                            aria-label="Close dialog"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="px-3 py-4 sm:px-6 sm:py-5">{children}</div>
                    <div className="border-t border-card-border dark:border-white/10 px-3 py-3 sm:px-6 sm:py-4">{footer}</div>
                </div>
            </FocusTrap>
        </div>
    );
}

function ConfirmDialog({
    options,
    onConfirm,
    onCancel,
}: {
    options: AppDialogConfirmOptions;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const styles = toneToClasses(options.tone);
    return (
        <DialogShell
            title={options.title || 'Please confirm'}
            subtitle={options.description}
            tone={options.tone}
            onClose={onCancel}
            footer={
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn-outline min-w-[110px]">
                        {options.cancelLabel || 'Cancel'}
                    </button>
                    <button type="button" onClick={onConfirm} className={`min-w-[120px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${styles.button}`}>
                        {options.confirmLabel || 'Confirm'}
                    </button>
                </div>
            }
        >
            <div className="flex gap-3">
                <div className={`mt-0.5 rounded-2xl border border-card-border dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 ${styles.accent}`}>
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <p className="text-sm leading-7 text-text dark:text-slate-200">{options.message}</p>
            </div>
        </DialogShell>
    );
}

function PromptDialog({
    options,
    onSubmit,
    onCancel,
}: {
    options: AppDialogPromptOptions;
    onSubmit: (value: string | null) => void;
    onCancel: () => void;
}) {
    const styles = toneToClasses(options.tone);
    const [value, setValue] = useState(options.defaultValue || '');
    const normalizedExpectedValue = String(options.expectedValue || '').trim();
    const trimmedValue = value.trim();
    const allowEmpty = options.allowEmpty === true;
    const disabled = normalizedExpectedValue
        ? trimmedValue !== normalizedExpectedValue
        : (!allowEmpty && !trimmedValue);

    return (
        <DialogShell
            title={options.title || 'Input required'}
            subtitle={options.description}
            tone={options.tone}
            onClose={onCancel}
            footer={
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn-outline min-w-[110px]">
                        {options.cancelLabel || 'Cancel'}
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onSubmit(trimmedValue || null)}
                        className={`min-w-[120px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${styles.button}`}
                    >
                        {options.confirmLabel || 'Continue'}
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm leading-7 text-text dark:text-slate-200">{options.message}</p>
                {normalizedExpectedValue ? (
                    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles.badge}`}>
                        Type exactly: <span className="font-mono font-semibold">{normalizedExpectedValue}</span>
                    </div>
                ) : null}
                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-slate-400">
                        {options.inputLabel || 'Input'}
                    </label>
                    <input
                        autoFocus
                        type="text"
                        value={value}
                        maxLength={options.maxLength}
                        onChange={(event) => setValue(event.target.value)}
                        placeholder={options.placeholder}
                        className="w-full rounded-2xl border border-card-border dark:border-white/10 bg-surface2 dark:bg-slate-950/70 px-4 py-3 text-sm text-text dark:text-white outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
                    />
                </div>
            </div>
        </DialogShell>
    );
}

function AlertDialog({
    options,
    onConfirm,
}: {
    options: AppDialogAlertOptions;
    onConfirm: () => void;
}) {
    const styles = toneToClasses(options.tone);
    return (
        <DialogShell
            title={options.title || 'Notice'}
            subtitle={options.description}
            tone={options.tone}
            onClose={onConfirm}
            footer={
                <div className="flex justify-end">
                    <button type="button" onClick={onConfirm} className={`min-w-[120px] rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${styles.button}`}>
                        {options.confirmLabel || 'OK'}
                    </button>
                </div>
            }
        >
            <p className="text-sm leading-7 text-text dark:text-slate-200">{options.message}</p>
        </DialogShell>
    );
}

function SensitiveActionDialog({
    options,
    onSubmit,
    onCancel,
}: {
    options: SensitiveActionDialogOptions;
    onSubmit: (value: SensitiveActionDialogResult | null) => void;
    onCancel: () => void;
}) {
    const [reason, setReason] = useState(options.defaultReason || options.actionLabel);
    const [currentPassword, setCurrentPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const canSubmit = Boolean(reason.trim() && currentPassword.trim());

    return (
        <DialogShell
            title="Verify sensitive action"
            subtitle={`Continue "${options.actionLabel}" inside the app instead of using a browser popup.`}
            tone="default"
            onClose={onCancel}
            footer={
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="btn-outline min-w-[110px]">
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canSubmit}
                        onClick={() => onSubmit({
                            currentPassword: currentPassword.trim(),
                            reason: reason.trim(),
                            ...(otpCode.trim() ? { otpCode: otpCode.trim() } : {}),
                        })}
                        className="min-w-[140px] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Confirm action
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-slate-400">
                        Reason
                    </label>
                    <input
                        autoFocus
                        type="text"
                        aria-label="Reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        className="w-full rounded-2xl border border-card-border dark:border-white/10 bg-surface2 dark:bg-slate-950/70 px-4 py-3 text-sm text-text dark:text-white outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-slate-400">
                        Current password
                    </label>
                    <input
                        type="password"
                        aria-label="Current password"
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        className="w-full rounded-2xl border border-card-border dark:border-white/10 bg-surface2 dark:bg-slate-950/70 px-4 py-3 text-sm text-text dark:text-white outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
                    />
                </div>
                <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted dark:text-slate-400">
                        Authenticator or backup code
                    </label>
                    <input
                        type="text"
                        aria-label="Authenticator or backup code"
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value)}
                        placeholder={options.requireOtpHint
                            ? 'Enter authenticator or backup code if 2FA is enabled'
                            : 'Enter code if required'
                        }
                        className="w-full rounded-2xl border border-card-border dark:border-white/10 bg-surface2 dark:bg-slate-950/70 px-4 py-3 text-sm text-text dark:text-white outline-none transition focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/40"
                    />
                    <p className="mt-2 text-xs leading-6 text-text-muted dark:text-slate-500">
                        Leave this blank only if your account does not require a second factor for this action.
                    </p>
                </div>
            </div>
        </DialogShell>
    );
}

export default function AppDialogHost() {
    const [queue, setQueue] = useState<DialogRequest[]>([]);

    useEffect(() => registerDialogHost((request) => {
        setQueue((current) => [...current, request]);
    }), []);

    const activeRequest = queue[0] || null;
    const mounted = typeof document !== 'undefined';

    const closeActive = () => {
        setQueue((current) => current.slice(1));
    };

    const activeDialog = useMemo(() => {
        if (!activeRequest) return null;

        if (activeRequest.kind === 'confirm') {
            return (
                <ConfirmDialog
                    options={activeRequest.options}
                    onCancel={() => {
                        activeRequest.resolve(false);
                        closeActive();
                    }}
                    onConfirm={() => {
                        activeRequest.resolve(true);
                        closeActive();
                    }}
                />
            );
        }

        if (activeRequest.kind === 'prompt') {
            return (
                <PromptDialog
                    options={activeRequest.options}
                    onCancel={() => {
                        activeRequest.resolve(null);
                        closeActive();
                    }}
                    onSubmit={(value) => {
                        activeRequest.resolve(value);
                        closeActive();
                    }}
                />
            );
        }

        if (activeRequest.kind === 'alert') {
            return (
                <AlertDialog
                    options={activeRequest.options}
                    onConfirm={() => {
                        activeRequest.resolve();
                        closeActive();
                    }}
                />
            );
        }

        return (
            <SensitiveActionDialog
                options={activeRequest.options}
                onCancel={() => {
                    activeRequest.resolve(null);
                    closeActive();
                }}
                onSubmit={(value) => {
                    activeRequest.resolve(value);
                    closeActive();
                }}
            />
        );
    }, [activeRequest]);

    if (!mounted || !activeDialog) return null;
    return createPortal(activeDialog, document.body);
}
