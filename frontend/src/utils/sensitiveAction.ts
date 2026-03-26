import type { SensitiveActionProof } from '../services/api';

type PromptOptions = {
    actionLabel: string;
    defaultReason?: string;
    requireOtpHint?: boolean;
};

export async function promptForSensitiveActionProof(options: PromptOptions): Promise<SensitiveActionProof | null> {
    if (typeof window === 'undefined') return null;

    const reason = window.prompt(
        `Why are you performing "${options.actionLabel}"?`,
        options.defaultReason || options.actionLabel,
    );
    if (!reason) return null;

    const currentPassword = window.prompt(`Enter your current password to continue "${options.actionLabel}".`);
    if (!currentPassword) return null;

    const otpCode = window.prompt(
        options.requireOtpHint
            ? 'Enter your authenticator code or backup code if 2FA is enabled on your account. Leave blank otherwise.'
            : 'Enter your authenticator code or backup code if required. Leave blank otherwise.',
    ) || '';

    return {
        currentPassword: currentPassword.trim(),
        reason: reason.trim(),
        ...(otpCode.trim() ? { otpCode: otpCode.trim() } : {}),
    };
}
