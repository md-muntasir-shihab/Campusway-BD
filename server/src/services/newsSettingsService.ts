import { NewsSettingsModel } from '../models/NewsSettings.js';
import { DEFAULT_NEWS_SETTINGS } from './newsDefaults.js';

export const getNewsSettings = async () => {
  let settings = await NewsSettingsModel.findOne({ key: 'default' }).lean();
  if (!settings) {
    await NewsSettingsModel.create(DEFAULT_NEWS_SETTINGS);
    settings = await NewsSettingsModel.findOne({ key: 'default' }).lean();
  }
  return settings!;
};

export const updateNewsSettings = async (patch: Record<string, unknown>) => {
  const existing = await getNewsSettings();
  const merged = deepMerge(existing, patch);
  const updated = await NewsSettingsModel.findOneAndUpdate({ key: 'default' }, merged, { upsert: true, new: true, runValidators: true }).lean();
  return updated!;
};

function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  Object.entries(override || {}).forEach(([key, value]) => {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      out[key] &&
      typeof out[key] === 'object' &&
      !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key] as Record<string, unknown>, value as Record<string, unknown>);
      return;
    }
    out[key] = value;
  });
  return out;
}

