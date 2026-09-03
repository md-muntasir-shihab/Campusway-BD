import { Request, Response } from 'express';
import CalculatorSettings from '../models/CalculatorSettings';
import CalculatorAnalytics from '../models/CalculatorAnalytics';
import { ResponseBuilder } from '../utils/responseBuilder';

/**
 * Ensures a single settings document exists
 */
const getSettingsDoc = async () => {
    let settings = await CalculatorSettings.findOne();
    if (!settings) {
        settings = await CalculatorSettings.create({});
    }
    return settings;
};

/**
 * @desc    Get calculator settings (Public)
 * @route   GET /api/v1/calculators/settings
 * @access  Public
 */
export const getSettings = async (req: Request, res: Response) => {
    try {
        const settings = await getSettingsDoc();
        ResponseBuilder.send(res, 200, ResponseBuilder.success(settings, 'Calculator settings retrieved'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};

/**
 * @desc    Update calculator settings
 * @route   PUT /api/v1/calculators/settings
 * @access  Private/Admin
 */
export const updateSettings = async (req: Request, res: Response) => {
    try {
        const settings = await getSettingsDoc();
        
        const { isSSCEnabled, isHSCEnabled, isOLevelEnabled, isCGPAEnabled, isNUEnabled, maintenanceMode } = req.body;
        
        if (isSSCEnabled !== undefined) settings.isSSCEnabled = isSSCEnabled;
        if (isHSCEnabled !== undefined) settings.isHSCEnabled = isHSCEnabled;
        if (isOLevelEnabled !== undefined) settings.isOLevelEnabled = isOLevelEnabled;
        if (isCGPAEnabled !== undefined) settings.isCGPAEnabled = isCGPAEnabled;
        if (isNUEnabled !== undefined) settings.isNUEnabled = isNUEnabled;
        if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;

        // Branding + SEO strings (trimmed, length capped — model also enforces)
        const stringFields: [string, number][] = [
            ['hubTitle', 120],
            ['hubSubtitle', 400],
            ['metaTitle', 200],
            ['metaDescription', 500],
            ['metaKeywords', 500],
            ['ogImageUrl', 1000],
        ];
        for (const [field, maxLen] of stringFields) {
            const value = req.body?.[field];
            if (value !== undefined) {
                (settings as unknown as Record<string, unknown>)[field] = String(value ?? '').trim().slice(0, maxLen);
            }
        }
        
        await settings.save();
        
        ResponseBuilder.send(res, 200, ResponseBuilder.success(settings, 'Calculator settings updated successfully'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};

/**
 * @desc    Track calculator usage
 * @route   POST /api/v1/calculators/track
 * @access  Public
 */
export const trackUsage = async (req: Request, res: Response) => {
    try {
        const { type } = req.body;
        
        if (!['ssc', 'hsc', 'olevel', 'cgpa', 'nu'].includes(type)) {
            ResponseBuilder.send(res, 400, ResponseBuilder.error('INVALID_TYPE', 'Invalid calculator type'));
            return;
        }
        
        // Today's date in YYYY-MM-DD using Bangladesh time (Asia/Dhaka), so
        // daily usage buckets match the audience's calendar day.
        const today = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Dhaka',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
        
        // Upsert to increment the usage count for today
        await CalculatorAnalytics.findOneAndUpdate(
            { calculatorType: type, date: today },
            { $inc: { usageCount: 1 } },
            { upsert: true, new: true }
        );
        
        ResponseBuilder.send(res, 200, ResponseBuilder.success(null, 'Usage tracked'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};

/**
 * @desc    Get calculator analytics
 * @route   GET /api/v1/calculators/analytics
 * @access  Private/Admin
 */
export const getAnalytics = async (req: Request, res: Response) => {
    try {
        const { days = 7 } = req.query;
        const daysNum = Math.min(365, Math.max(1, Number(days) || 7));
        
        // Calculate the start date
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysNum);
        const startDateString = startDate.toISOString().split('T')[0];
        
        const analytics = await CalculatorAnalytics.find({
            date: { $gte: startDateString }
        }).sort({ date: 1 });
        
        ResponseBuilder.send(res, 200, ResponseBuilder.success(analytics, 'Analytics retrieved'));
    } catch (error: any) {
        ResponseBuilder.send(res, 500, ResponseBuilder.error('INTERNAL_ERROR', error.message));
    }
};
