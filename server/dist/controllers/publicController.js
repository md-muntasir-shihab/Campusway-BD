import { SiteSettingsModel } from '../models/SiteSettings.js';
import { defaultSiteSettings } from '../services/defaults.js';
import { getHomeAggregate } from '../services/homeAggregation.js';
import { sendSuccess } from '../utils/response.js';
export const getPublicSettings = async (_req, res) => {
    const settings = await SiteSettingsModel.findOne().lean();
    const payload = settings
        ? {
            siteName: settings.siteName,
            logoUrl: settings.logoUrl,
            siteDescription: settings.siteDescription,
            themeDefault: settings.themeDefault,
            socialLinks: settings.socialLinks ?? [],
            footer: settings.footer
        }
        : defaultSiteSettings;
    return sendSuccess(res, payload);
};
export const getHome = async (_req, res) => {
    const data = await getHomeAggregate();
    return sendSuccess(res, data);
};
