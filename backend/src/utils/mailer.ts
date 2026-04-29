import nodemailer from 'nodemailer';
import { sendTransactionalEmail } from '../services/integrations/emailHelper';
import { isIntegrationReady } from '../services/integrations/featureGate';

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

function buildEnvTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
            ? {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS || '',
            }
            : undefined,
    });
}

/**
 * Sends a transactional email. Routing order:
 *   1. Integrations registry SMTP (admin-managed, secrets in vault)
 *   2. Process-env SMTP (legacy fallback)
 *   3. Console log fallback (dev / unconfigured)
 *
 * Always returns synchronously after the chosen path completes; never throws
 * — callers should treat `false` as "not delivered".
 */
export async function sendCampusMail(options: MailOptions): Promise<boolean> {
    // Path 1: integrations registry SMTP (preferred)
    if (await isIntegrationReady('smtp', ['password'])) {
        const sent = await sendTransactionalEmail({
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text,
        });
        if (sent) return true;
        // fall through to env-based fallback if registry path failed
    }

    // Path 2: env-based nodemailer (legacy)
    const transporter = buildEnvTransporter();
    const from = process.env.MAIL_FROM || 'no-reply@campusway.local';

    if (!transporter) {
        // Path 3: dev fallback
        console.log(`[MAIL FALLBACK] to=${options.to} subject="${options.subject}"`);
        console.log(options.text || options.html);
        return false;
    }

    await transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
    });
    return true;
}
