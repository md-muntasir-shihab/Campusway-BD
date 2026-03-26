import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import EventLog from '../models/EventLog';
import SiteSettings from '../models/Settings';
import { AuthRequest } from '../middlewares/auth';

const EVENT_TO_TOGGLE: Record<string, keyof ReturnType<typeof defaultAnalyticsSettings>['eventToggles']> = {
    university_apply_click: 'universityApplyClick',
    university_official_click: 'universityOfficialClick',
    news_view: 'newsView',
    news_share: 'newsShare',
    resource_download: 'resourceDownload',
    exam_viewed: 'examViewed',
    exam_started: 'examStarted',
    exam_submitted: 'examSubmitted',
    subscription_plan_view: 'subscriptionPlanView',
    subscription_plan_click: 'subscriptionPlanClick',
    support_ticket_created: 'supportTicketCreated',
};

function defaultAnalyticsSettings() {
    return {
        enabled: true,
        trackAnonymous: true,
        retentionDays: 90,
        eventToggles: {
            universityApplyClick: true,
            universityOfficialClick: true,
            newsView: true,
            newsShare: true,
            resourceDownload: true,
            examViewed: true,
            examStarted: true,
            examSubmitted: true,
            subscriptionPlanView: true,
            subscriptionPlanClick: true,
            supportTicketCreated: true,
        },
    };
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function toNumber(value: unknown, fallback: number, min = 0, max = 10000): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function parseDateRange(query: Record<string, unknown>, defaultDays = 30): { from: Date; to: Date } {
    const now = new Date();
    const to = query.to ? new Date(String(query.to)) : now;
    const from = query.from ? new Date(String(query.from)) : new Date(to.getTime() - defaultDays * 86400000);
    if (Number.isNaN(to.getTime()) || Number.isNaN(from.getTime()) || from > to) {
        return { from: new Date(now.getTime() - defaultDays * 86400000), to: now };
    }
    return { from, to };
}

function inferModule(eventName: string): string {
    if (eventName.startsWith('university_')) return 'universities';
    if (eventName.startsWith('news_')) return 'news';
    if (eventName.startsWith('resource_')) return 'resources';
    if (eventName.startsWith('exam_')) return 'exams';
    if (eventName.startsWith('subscription_')) return 'subscription';
    if (eventName.startsWith('support_')) return 'support';
    return 'general';
}

function getClientIp(req: Request): string {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return forwarded || req.ip || req.socket.remoteAddress || '';
}

function normalizeMeta(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const payload = raw as Record<string, unknown>;
    const entries = Object.entries(payload).slice(0, 30);
    const out: Record<string, unknown> = {};
    entries.forEach(([key, value]) => {
        if (!key || value === undefined || value === null) return;
        if (typeof value === 'string') {
            out[key] = value.slice(0, 500);
            return;
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            out[key] = value;
            return;
        }
        out[key] = JSON.parse(JSON.stringify(value));
    });
    return out;
}

function toCsvValue(value: unknown): string {
    if (value === undefined || value === null) return '';
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    if (!/[",\r\n]/.test(text)) return text;
    return `"${text.replace(/"/g, '""')}"`;
}

async function readAnalyticsSettings() {
    const defaults = defaultAnalyticsSettings();
    const settings = await SiteSettings.findOne().select('analyticsSettings').lean();
    const raw = (settings as any)?.analyticsSettings || {};
    const toggles = raw.eventToggles || {};
    return {
        enabled: toBoolean(raw.enabled, defaults.enabled),
        trackAnonymous: toBoolean(raw.trackAnonymous, defaults.trackAnonymous),
        retentionDays: toNumber(raw.retentionDays, defaults.retentionDays, 7, 3650),
        eventToggles: {
            universityApplyClick: toBoolean(toggles.universityApplyClick, defaults.eventToggles.universityApplyClick),
            universityOfficialClick: toBoolean(toggles.universityOfficialClick, defaults.eventToggles.universityOfficialClick),
            newsView: toBoolean(toggles.newsView, defaults.eventToggles.newsView),
            newsShare: toBoolean(toggles.newsShare, defaults.eventToggles.newsShare),
            resourceDownload: toBoolean(toggles.resourceDownload, defaults.eventToggles.resourceDownload),
            examViewed: toBoolean(toggles.examViewed, defaults.eventToggles.examViewed),
            examStarted: toBoolean(toggles.examStarted, defaults.eventToggles.examStarted),
            examSubmitted: toBoolean(toggles.examSubmitted, defaults.eventToggles.examSubmitted),
            subscriptionPlanView: toBoolean(toggles.subscriptionPlanView, defaults.eventToggles.subscriptionPlanView),
            subscriptionPlanClick: toBoolean(toggles.subscriptionPlanClick, defaults.eventToggles.subscriptionPlanClick),
            supportTicketCreated: toBoolean(toggles.supportTicketCreated, defaults.eventToggles.supportTicketCreated),
        },
    };
}

export async function trackEvent(req: AuthRequest, res: Response): Promise<void> {
    try {
        const body = (req.body || {}) as Record<string, unknown>;
        const eventName = String(body.eventName || '').trim().toLowerCase();
        if (!eventName) {
            res.status(400).json({ message: 'eventName is required' });
            return;
        }

        const settings = await readAnalyticsSettings();
        if (!settings.enabled) {
            res.status(202).json({ accepted: false, reason: 'analytics_disabled' });
            return;
        }

        const toggleKey = EVENT_TO_TOGGLE[eventName];
        if (toggleKey && !settings.eventToggles[toggleKey]) {
            res.status(202).json({ accepted: false, reason: 'event_disabled' });
            return;
        }

        const userId = req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id)
            ? new mongoose.Types.ObjectId(req.user._id)
            : null;
        if (!userId && !settings.trackAnonymous) {
            res.status(202).json({ accepted: false, reason: 'anonymous_tracking_disabled' });
            return;
        }

        const sessionId = String(body.sessionId || req.headers['x-session-id'] || '').trim() || `anon-${Date.now()}`;
        const moduleName = String(body.module || inferModule(eventName)).trim().toLowerCase();
        const source = String(body.source || (req.user ? 'student' : 'public')).trim().toLowerCase();

        const entry = await EventLog.create({
            userId,
            sessionId: sessionId.slice(0, 100),
            eventName: eventName.slice(0, 80),
            module: moduleName.slice(0, 40) || 'general',
            meta: normalizeMeta(body.meta),
            source: source === 'admin' || source === 'student' ? source : 'public',
            ipAddress: getClientIp(req),
            userAgent: String(req.headers['user-agent'] || '').slice(0, 255),
        });

        res.status(201).json({ accepted: true, id: String(entry._id) });
    } catch (error) {
        console.error('trackEvent error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function getPublicAnalyticsSettings(_req: Request, res: Response): Promise<void> {
    try {
        const settings = await readAnalyticsSettings();
        res.json({ enabled: settings.enabled, trackAnonymous: settings.trackAnonymous, eventToggles: settings.eventToggles });
    } catch (error) {
        console.error('getPublicAnalyticsSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetAnalyticsSettings(_req: AuthRequest, res: Response): Promise<void> {
    try {
        const settings = await readAnalyticsSettings();
        res.json({ settings });
    } catch (error) {
        console.error('adminGetAnalyticsSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminUpdateAnalyticsSettings(req: AuthRequest, res: Response): Promise<void> {
    try {
        const current = await readAnalyticsSettings();
        const body = (req.body || {}) as Record<string, any>;
        const next = {
            enabled: body.enabled === undefined ? current.enabled : toBoolean(body.enabled, current.enabled),
            trackAnonymous: body.trackAnonymous === undefined ? current.trackAnonymous : toBoolean(body.trackAnonymous, current.trackAnonymous),
            retentionDays: body.retentionDays === undefined ? current.retentionDays : toNumber(body.retentionDays, current.retentionDays, 7, 3650),
            eventToggles: {
                universityApplyClick: body?.eventToggles?.universityApplyClick === undefined ? current.eventToggles.universityApplyClick : toBoolean(body.eventToggles.universityApplyClick, current.eventToggles.universityApplyClick),
                universityOfficialClick: body?.eventToggles?.universityOfficialClick === undefined ? current.eventToggles.universityOfficialClick : toBoolean(body.eventToggles.universityOfficialClick, current.eventToggles.universityOfficialClick),
                newsView: body?.eventToggles?.newsView === undefined ? current.eventToggles.newsView : toBoolean(body.eventToggles.newsView, current.eventToggles.newsView),
                newsShare: body?.eventToggles?.newsShare === undefined ? current.eventToggles.newsShare : toBoolean(body.eventToggles.newsShare, current.eventToggles.newsShare),
                resourceDownload: body?.eventToggles?.resourceDownload === undefined ? current.eventToggles.resourceDownload : toBoolean(body.eventToggles.resourceDownload, current.eventToggles.resourceDownload),
                examViewed: body?.eventToggles?.examViewed === undefined ? current.eventToggles.examViewed : toBoolean(body.eventToggles.examViewed, current.eventToggles.examViewed),
                examStarted: body?.eventToggles?.examStarted === undefined ? current.eventToggles.examStarted : toBoolean(body.eventToggles.examStarted, current.eventToggles.examStarted),
                examSubmitted: body?.eventToggles?.examSubmitted === undefined ? current.eventToggles.examSubmitted : toBoolean(body.eventToggles.examSubmitted, current.eventToggles.examSubmitted),
                subscriptionPlanView: body?.eventToggles?.subscriptionPlanView === undefined ? current.eventToggles.subscriptionPlanView : toBoolean(body.eventToggles.subscriptionPlanView, current.eventToggles.subscriptionPlanView),
                subscriptionPlanClick: body?.eventToggles?.subscriptionPlanClick === undefined ? current.eventToggles.subscriptionPlanClick : toBoolean(body.eventToggles.subscriptionPlanClick, current.eventToggles.subscriptionPlanClick),
                supportTicketCreated: body?.eventToggles?.supportTicketCreated === undefined ? current.eventToggles.supportTicketCreated : toBoolean(body.eventToggles.supportTicketCreated, current.eventToggles.supportTicketCreated),
            },
        };

        await SiteSettings.findOneAndUpdate(
            {},
            { $set: { analyticsSettings: next, updatedBy: req.user?._id } },
            { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        res.json({ settings: next, message: 'Analytics settings updated' });
    } catch (error) {
        console.error('adminUpdateAnalyticsSettings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminGetAnalyticsOverview(req: AuthRequest, res: Response): Promise<void> {
    try {
        const query = req.query as Record<string, unknown>;
        const { from, to } = parseDateRange(query);
        const moduleFilter = String(query.module || '').trim().toLowerCase();
        const match: Record<string, unknown> = { createdAt: { $gte: from, $lte: to } };
        if (moduleFilter && moduleFilter !== 'all') match.module = moduleFilter;

        const [topEvents, dailySeries, totals, funnel] = await Promise.all([
            EventLog.aggregate([{ $match: match }, { $group: { _id: '$eventName', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 20 }]),
            EventLog.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
            EventLog.aggregate([
                { $match: match },
                { $group: { _id: null, totalEvents: { $sum: 1 }, sessions: { $addToSet: '$sessionId' }, users: { $addToSet: '$userId' } } },
                { $project: { _id: 0, totalEvents: 1, uniqueSessions: { $size: '$sessions' }, uniqueUsers: { $size: { $filter: { input: '$users', as: 'u', cond: { $ne: ['$$u', null] } } } } } },
            ]),
            EventLog.aggregate([{ $match: { ...match, eventName: { $in: ['exam_viewed', 'exam_started', 'exam_submitted'] } } }, { $group: { _id: '$eventName', count: { $sum: 1 } } }]),
        ]);

        const totalItem = totals[0] || { totalEvents: 0, uniqueSessions: 0, uniqueUsers: 0 };
        const funnelMap = new Map<string, number>();
        funnel.forEach((row) => funnelMap.set(String(row._id), Number(row.count || 0)));

        res.json({
            range: { from: from.toISOString(), to: to.toISOString() },
            totals: totalItem,
            topEvents: topEvents.map((row) => ({ eventName: row._id, count: Number(row.count || 0) })),
            dailySeries: dailySeries.map((row) => ({ date: row._id, count: Number(row.count || 0) })),
            funnel: {
                viewed: funnelMap.get('exam_viewed') || 0,
                started: funnelMap.get('exam_started') || 0,
                submitted: funnelMap.get('exam_submitted') || 0,
            },
        });
    } catch (error) {
        console.error('adminGetAnalyticsOverview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}

export async function adminExportEventLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
        const query = req.query as Record<string, unknown>;
        const format = String(query.format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
        const { from, to } = parseDateRange(query);
        const moduleFilter = String(query.module || '').trim().toLowerCase();
        const match: Record<string, unknown> = { createdAt: { $gte: from, $lte: to } };
        if (moduleFilter && moduleFilter !== 'all') match.module = moduleFilter;

        const rows = await EventLog.find(match).sort({ createdAt: -1 }).limit(10000).lean();

        if (format === 'xlsx') {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Event Logs');
            sheet.columns = [
                { header: 'Created At', key: 'createdAt', width: 24 },
                { header: 'Event Name', key: 'eventName', width: 30 },
                { header: 'Module', key: 'module', width: 18 },
                { header: 'Source', key: 'source', width: 14 },
                { header: 'User ID', key: 'userId', width: 28 },
                { header: 'Session ID', key: 'sessionId', width: 26 },
                { header: 'Meta', key: 'meta', width: 60 },
            ];
            rows.forEach((row) => sheet.addRow({
                createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
                eventName: row.eventName,
                module: row.module,
                source: row.source,
                userId: row.userId ? String(row.userId) : '',
                sessionId: row.sessionId,
                meta: JSON.stringify(row.meta || {}),
            }));
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="event-logs-${Date.now()}.xlsx"`);
            await workbook.xlsx.write(res);
            res.end();
            return;
        }

        const csv = [
            'Created At,Event Name,Module,Source,User ID,Session ID,Meta',
            ...rows.map((row) => [
                toCsvValue(row.createdAt ? new Date(row.createdAt).toISOString() : ''),
                toCsvValue(row.eventName),
                toCsvValue(row.module),
                toCsvValue(row.source),
                toCsvValue(row.userId ? String(row.userId) : ''),
                toCsvValue(row.sessionId),
                toCsvValue(row.meta || {}),
            ].join(',')),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="event-logs-${Date.now()}.csv"`);
        res.status(200).send(csv);
    } catch (error) {
        console.error('adminExportEventLogs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
}
