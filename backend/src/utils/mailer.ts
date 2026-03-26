import nodemailer from 'nodemailer';

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

function buildTransporter() {
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

export async function sendCampusMail(options: MailOptions): Promise<boolean> {
    const transporter = buildTransporter();
    const from = process.env.MAIL_FROM || 'no-reply@campusway.local';

    if (!transporter) {
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
