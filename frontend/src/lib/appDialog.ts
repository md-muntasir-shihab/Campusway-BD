type DialogTone = 'default' | 'danger' | 'success';

export type AppDialogConfirmOptions = {
    title?: string;
    message: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
};

export type AppDialogPromptOptions = {
    title?: string;
    message: string;
    description?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
    expectedValue?: string;
    inputLabel?: string;
    allowEmpty?: boolean;
    maxLength?: number;
};

export type AppDialogAlertOptions = {
    title?: string;
    message: string;
    description?: string;
    confirmLabel?: string;
    tone?: DialogTone;
};

export type SensitiveActionDialogOptions = {
    actionLabel: string;
    defaultReason?: string;
    requireOtpHint?: boolean;
};

export type SensitiveActionDialogResult = {
    currentPassword: string;
    reason: string;
    otpCode?: string;
};

type DialogRequest =
    | {
        kind: 'confirm';
        options: AppDialogConfirmOptions;
        resolve: (value: boolean) => void;
    }
    | {
        kind: 'prompt';
        options: AppDialogPromptOptions;
        resolve: (value: string | null) => void;
    }
    | {
        kind: 'alert';
        options: AppDialogAlertOptions;
        resolve: () => void;
    }
    | {
        kind: 'sensitive-action';
        options: SensitiveActionDialogOptions;
        resolve: (value: SensitiveActionDialogResult | null) => void;
    };

let dialogListener: ((request: DialogRequest) => void) | null = null;
const pendingRequests: DialogRequest[] = [];

function enqueueRequest(request: DialogRequest) {
    if (dialogListener) {
        dialogListener(request);
        return;
    }
    pendingRequests.push(request);
}

export function registerDialogHost(listener: (request: DialogRequest) => void): () => void {
    dialogListener = listener;
    while (pendingRequests.length > 0) {
        const next = pendingRequests.shift();
        if (!next) break;
        listener(next);
    }
    return () => {
        if (dialogListener === listener) {
            dialogListener = null;
        }
    };
}

export function showConfirmDialog(options: AppDialogConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        enqueueRequest({ kind: 'confirm', options, resolve });
    });
}

export function showPromptDialog(options: AppDialogPromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
        enqueueRequest({ kind: 'prompt', options, resolve });
    });
}

export function showAlertDialog(options: AppDialogAlertOptions): Promise<void> {
    return new Promise((resolve) => {
        enqueueRequest({ kind: 'alert', options, resolve });
    });
}

export function showSensitiveActionDialog(options: SensitiveActionDialogOptions): Promise<SensitiveActionDialogResult | null> {
    return new Promise((resolve) => {
        enqueueRequest({ kind: 'sensitive-action', options, resolve });
    });
}

export type { DialogRequest, DialogTone };
