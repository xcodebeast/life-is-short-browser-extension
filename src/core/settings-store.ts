import { getDefaultSiteSettings } from './site-registry';
import {
  clampYoutubeResetWindowHours,
  clampYoutubeThreshold,
} from './policy-engine';
import type { SiteSettings } from './types';

const SETTINGS_STORAGE_KEY = 'lifeIsShort.settings.v1';

function normalizeSettings(partial: Partial<SiteSettings> | undefined): SiteSettings {
  const defaults = getDefaultSiteSettings();

  return {
    youtube: {
      enabled: partial?.youtube?.enabled ?? defaults.youtube.enabled,
      threshold: clampYoutubeThreshold(
        partial?.youtube?.threshold ?? defaults.youtube.threshold,
      ),
      resetWindowHours: clampYoutubeResetWindowHours(
        partial?.youtube?.resetWindowHours ?? defaults.youtube.resetWindowHours,
      ),
    },
    linkedin: {
      enabled: partial?.linkedin?.enabled ?? defaults.linkedin.enabled,
    },
  };
}

export async function getSettings(): Promise<SiteSettings> {
  const result = await browser.storage.sync.get(SETTINGS_STORAGE_KEY);
  const normalized = normalizeSettings(
    result[SETTINGS_STORAGE_KEY] as Partial<SiteSettings> | undefined,
  );

  await browser.storage.sync.set({ [SETTINGS_STORAGE_KEY]: normalized });
  return normalized;
}

export async function updateYoutubeSettings(
  updates: Partial<
    Pick<SiteSettings['youtube'], 'threshold' | 'resetWindowHours'>
  >,
): Promise<SiteSettings> {
  const settings = await getSettings();
  const nextSettings: SiteSettings = {
    ...settings,
    youtube: {
      ...settings.youtube,
      threshold:
        typeof updates.threshold === 'number'
          ? clampYoutubeThreshold(updates.threshold)
          : settings.youtube.threshold,
      resetWindowHours:
        typeof updates.resetWindowHours === 'number'
          ? clampYoutubeResetWindowHours(updates.resetWindowHours)
          : settings.youtube.resetWindowHours,
    },
  };

  await browser.storage.sync.set({ [SETTINGS_STORAGE_KEY]: nextSettings });
  return nextSettings;
}

export async function setSettings(settings: SiteSettings): Promise<void> {
  await browser.storage.sync.set({
    [SETTINGS_STORAGE_KEY]: normalizeSettings(settings),
  });
}
