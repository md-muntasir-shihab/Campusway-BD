import { Request, Response } from 'express';
import { BannerModel } from '../models/Banner.js';
import { HomeSettingsModel } from '../models/HomeSettings.js';
import { SiteSettingsModel } from '../models/SiteSettings.js';
import { sendError, sendSuccess } from '../utils/response.js';
import { homeSettingsSchema, siteSettingsSchema, socialLinksSchema } from '../utils/validation.js';

export const getAdminSiteSettings = async (_req: Request, res: Response) => sendSuccess(res, await SiteSettingsModel.findOne().lean());
export const getAdminHomeSettings = async (_req: Request, res: Response) => sendSuccess(res, await HomeSettingsModel.findOne().lean());

export const putAdminSiteSettings = async (req: Request, res: Response) => {
  const parsed = siteSettingsSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid payload');
  const saved = await SiteSettingsModel.findOneAndUpdate({}, parsed.data, { upsert: true, new: true });
  return sendSuccess(res, saved);
};

export const putAdminHomeSettings = async (req: Request, res: Response) => {
  const parsed = homeSettingsSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid payload');
  const saved = await HomeSettingsModel.findOneAndUpdate({}, parsed.data, { upsert: true, new: true });
  return sendSuccess(res, saved);
};

export const getSocialLinks = async (_req: Request, res: Response) => {
  const settings = await SiteSettingsModel.findOne().lean();
  return sendSuccess(res, { socialLinks: settings?.socialLinks ?? [] });
};

export const putSocialLinks = async (req: Request, res: Response) => {
  const parsed = socialLinksSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid payload');
  const saved = await SiteSettingsModel.findOneAndUpdate({}, { socialLinks: parsed.data.socialLinks }, { upsert: true, new: true });
  return sendSuccess(res, saved?.socialLinks ?? []);
};

export const createBanner = async (req: Request, res: Response) => sendSuccess(res, await BannerModel.create(req.body), 201);
export const listBanners = async (_req: Request, res: Response) => sendSuccess(res, await BannerModel.find().lean());
export const updateBanner = async (req: Request, res: Response) => sendSuccess(res, await BannerModel.findByIdAndUpdate(req.params.id, req.body, { new: true }));
export const deleteBanner = async (req: Request, res: Response) => {
  await BannerModel.findByIdAndDelete(req.params.id);
  return sendSuccess(res, { deleted: true });
};
