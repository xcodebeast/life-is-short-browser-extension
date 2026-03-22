import type { SiteModule } from '@/src/core/site-module';
import type { YoutubeSettings } from '@/src/core/types';

const YOUTUBE_HOST_SUFFIXES = ['youtube.com', 'm.youtube.com', 'youtu.be'];
const YOUTUBE_EXCLUDED_HOSTS = ['music.youtube.com'];

export function isYoutubeHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  if (
    YOUTUBE_EXCLUDED_HOSTS.some(
      (excludedHost) =>
        normalizedHost === excludedHost ||
        normalizedHost.endsWith(`.${excludedHost}`),
    )
  ) {
    return false;
  }

  return YOUTUBE_HOST_SUFFIXES.some(
    (suffix) => normalizedHost === suffix || normalizedHost.endsWith(`.${suffix}`),
  );
}

export function isYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return isYoutubeHost(parsed.hostname);
  } catch {
    return false;
  }
}

export const youtubeSiteModule: SiteModule<'youtube'> = {
  id: 'youtube',
  displayName: 'YouTube',
  matches: isYoutubeUrl,
  getDefaultSettings: (): YoutubeSettings => ({
    enabled: true,
    threshold: 3,
    resetWindowHours: 8,
  }),
};
