import SecurityHelpButton, { type SecurityHelpAction, type SecurityHelpButtonProps } from './SecurityHelpButton';

export type AdminGuideAction = SecurityHelpAction;

export interface AdminGuideButtonProps extends Omit<SecurityHelpButtonProps, 'accent' | 'headingLabel'> {
    tone?: 'cyan' | 'indigo';
}

export default function AdminGuideButton({ tone = 'cyan', ...props }: AdminGuideButtonProps) {
    return (
        <SecurityHelpButton
            {...props}
            accent={tone}
            headingLabel="Admin control details"
        />
    );
}
