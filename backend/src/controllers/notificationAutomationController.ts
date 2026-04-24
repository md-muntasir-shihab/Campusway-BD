import { Response } from 'express';
import SiteSettings from '../models/Settings';
import { AuthRequest } from '../middlewares/auth';
import { ResponseBuilder } from '../utils/responseBuilder';

function defaultSettings() {
    return {
        examStartsSoon: { enabled: true, hoursBefore: [24, 3] },
        applicationClosingSoon: { enabled: true, hoursBefore: [72, 24] },
        paymentPendingReminder: { enabled: true, hoursBefore: [24] },
        resultPublished: { enabled: true, hoursBefore: [0] },
        profileScoreGate: { enabled: true, hoursBefore: [48, 12], minScore: 70 },
        templates: {
            languageMode: 'mixed' as 'bn' | 'en' | 'mixed',
            examStartsSoon: 'Exam starts soon. Stay prepared.',
            applicationClosingSoon: 'Application window is closing soon.',
            paymentPendingReminder: 'Your payment is pending. Submit proof to unlock access.',
            resultPublished: 'Your result is now published.',
            profileScoreGate: 'Complete your profile to reach the minimum score before exam.',
        },
    };
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function toNumber(value: unknown, fallback: number, min = 0, max = 1000): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item))
        .map((item) => Math.round(item));
}

export async function readNotificationAutomationSettings() {
    const defaults = defaultSettings();
    const settings = await SiteSettings.findOne().select('notificationAutomation').lean();
    const raw = (settings as any)?.notificationAutomation || {};
    return {
        examStartsSoon: {
            enabled: toBoolean(raw?.examStartsSoon?.enabled, defaults.examStartsSoon.enabled),
            hoursBefore: toNumberArray(raw?.examStartsSoon?.hoursBefore).length
                ? toNumberArray(raw?.examStartsSoon?.hoursBefore)
                : defaults.examStartsSoon.hoursBefore,
        },
        applicationClosingSoon: {
            enabled: toBoolean(raw?.applicationClosingSoon?.enabled, defaults.applicationClosingSoon.enabled),
            hoursBefore: toNumberArray(raw?.applicationClosingSoon?.hoursBefore).length
                ? toNumberArray(raw?.applicationClosingSoon?.hoursBefore)
                : defaults.applicationClosingSoon.hoursBefore,
        },
        paymentPendingReminder: {
            enabled: toBoolean(raw?.paymentPendingReminder?.enabled, defaults.paymentPendingReminder.enabled),
            hoursBefore: toNumberArray(raw?.paymentPendingReminder?.hoursBefore).length
                ? toNumberArray(raw?.paymentPendingReminder?.hoursBefore)
                : defaults.paymentPendingReminder.hoursBefore,
        },
        resultPublished: {
            enabled: toBoolean(raw?.resultPublished?.enabled, defaults.resultPublished.enabled),
            hoursBefore: toNumberArray(raw?.resultPublished?.hoursBefore).length
                ? toNumberArray(raw?.resultPublished?.hoursBefore)
                : defaults.resultPublished.hoursBefore,
        },
        profileScoreGate: {
            enabled: toBoolean(raw?.profileScoreGate?.enabled, defaults.profileScoreGate.enabled),
            hoursBefore: toNumberArray(raw?.profileScoreGate?.hoursBefore).length
                ? toNumberArray(raw?.profileScoreGate?.hoursBefore)
                : defaults.profileScoreGate.hoursBefore,
            minScore: toNumber(raw?.profileScoreGate?.minScore, defaults.profileScoreGate.minScore, 1, 100),
        },
        templates: {
            languageMode: ['bn', 'en', 'mixed'].includes(String(raw?.templates?.languageMode || '').trim())
                ? String(raw.templates.languageMode).trim() as 'bn' | 'en' | 'mixed'
                : defaults.templates.languageMode,
            examStartsSoon: String(raw?.templates?.examStartsSoon || defaults.templates.examStartsSoon).slice(0, 300),
            applicationClosingSoon: String(raw?.templates?.applicationClosingSoon || defaults.templates.applicationClosingSoon).slice(0, 300),
            paymentPendingReminder: String(raw?.templates?.paymentPendingReminder || defaults.templates.paymentPendingReminder).slice(0, 300),
            resultPublished: String(raw?.templates?.resultPublished || defaults.templates.resultPublished).slice(0, 300),
            profileScoreGate: String(raw?.templates?.profileScoreGate || defaults.templates.profileScoreGate).slice(0, 300),
        },
    };
}

export async function adminGetNotificationAutomationSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await readNotificationAutomationSettings();
        ResponseBuilder.send(res, 200, ResponseBuilder.success({ settings }));
    } catch (error) {
        console.error('adminGetNotificationAutomationSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}

export async function adminUpdateNotificationAutomationSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const current = await readNotificationAutomationSettings();
        const body = (req.body || {}) as Record<string, any>;

        const next = {
            examStartsSoon: {
                enabled: body?.examStartsSoon?.enabled === undefined ? current.examStartsSoon.enabled : toBoolean(body.examStartsSoon.enabled, current.examStartsSoon.enabled),
                hoursBefore: toNumberArray(body?.examStartsSoon?.hoursBefore).length ? toNumberArray(body.examStartsSoon.hoursBefore) : current.examStartsSoon.hoursBefore,
            },
            applicationClosingSoon: {
                enabled: body?.applicationClosingSoon?.enabled === undefined ? current.applicationClosingSoon.enabled : toBoolean(body.applicationClosingSoon.enabled, current.applicationClosingSoon.enabled),
                hoursBefore: toNumberArray(body?.applicationClosingSoon?.hoursBefore).length ? toNumberArray(body.applicationClosingSoon.hoursBefore) : current.applicationClosingSoon.hoursBefore,
            },
            paymentPendingReminder: {
                enabled: body?.paymentPendingReminder?.enabled === undefined ? current.paymentPendingReminder.enabled : toBoolean(body.paymentPendingReminder.enabled, current.paymentPendingReminder.enabled),
                hoursBefore: toNumberArray(body?.paymentPendingReminder?.hoursBefore).length ? toNumberArray(body.paymentPendingReminder.hoursBefore) : current.paymentPendingReminder.hoursBefore,
            },
            resultPublished: {
                enabled: body?.resultPublished?.enabled === undefined ? current.resultPublished.enabled : toBoolean(body.resultPublished.enabled, current.resultPublished.enabled),
                hoursBefore: toNumberArray(body?.resultPublished?.hoursBefore).length ? toNumberArray(body.resultPublished.hoursBefore) : current.resultPublished.hoursBefore,
            },
            profileScoreGate: {
                enabled: body?.profileScoreGate?.enabled === undefined ? current.profileScoreGate.enabled : toBoolean(body.profileScoreGate.enabled, current.profileScoreGate.enabled),
                hoursBefore: toNumberArray(body?.profileScoreGate?.hoursBefore).length ? toNumberArray(body.profileScoreGate.hoursBefore) : current.profileScoreGate.hoursBefore,
                minScore: body?.profileScoreGate?.minScore === undefined ? current.profileScoreGate.minScore : toNumber(body.profileScoreGate.minScore, current.profileScoreGate.minScore, 1, 100),
            },
            templates: {
                languageMode: ['bn', 'en', 'mixed'].includes(String(body?.templates?.languageMode || '').trim())
                    ? String(body.templates.languageMode).trim() as 'bn' | 'en' | 'mixed'
                    : current.templates.languageMode,
                examStartsSoon: String(body?.templates?.examStartsSoon || current.templates.examStartsSoon).slice(0, 300),
                applicationClosingSoon: String(body?.templates?.applicationClosingSoon || current.templates.applicationClosingSoon).slice(0, 300),
                paymentPendingReminder: String(body?.templates?.paymentPendingReminder || current.templates.paymentPendingReminder).slice(0, 300),
                resultPublished: String(body?.templates?.resultPublished || current.templates.resultPublished).slice(0, 300),
                profileScoreGate: String(body?.templates?.profileScoreGate || current.templates.profileScoreGate).slice(0, 300),
            },
        };

        await SiteSettings.findOneAndUpdate(
            {},
            { $set: { notificationAutomation: next, updatedBy: req.user?._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        ResponseBuilder.send(res, 200, ResponseBuilder.success({settings: next}, 'Notification automation settings updated'));
    } catch (error) {
        console.error('adminUpdateNotificationAutomationSettings error:', error);
        ResponseBuilder.send(res, 500, ResponseBuilder.error('SERVER_ERROR', 'Server error'));
    }
}
