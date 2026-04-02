import type { SensitiveActionProof } from '../services/api';
import { showSensitiveActionDialog } from '../lib/appDialog';

type PromptOptions = {
    actionLabel: string;
    defaultReason?: string;
    requireOtpHint?: boolean;
};

export async function promptForSensitiveActionProof(options: PromptOptions): Promise<SensitiveActionProof | null> {
    return showSensitiveActionDialog(options);
}
