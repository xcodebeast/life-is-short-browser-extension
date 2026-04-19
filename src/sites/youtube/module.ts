import type { SiteModule } from '@/src/core/site-module';
import type { YoutubeSettings } from '@/src/core/types';

const YOUTUBE_HOST_SUFFIXES = ['youtube.com', 'm.youtube.com', 'youtu.be'];
const YOUTUBE_EXCLUDED_HOSTS = ['music.youtube.com'];
const YOUTUBE_BLOCKED_ELEMENT_RULES = [
  { selector: '#comments > #sections' },
  { selector: '#secondary' },
  { selector: '#secondary-inner > #related' },
  { selector: '#thumbnail' },
  { selector: 'a[href][aria-haspopup][tabindex][aria-hidden][style]' },
  { selector: 'yt-shelf-header-layout' },
  {
    selector:
      'ytd-guide-section-renderer[guide-persistent-and-visible] > div > ytd-guide-entry-renderer[is-primary][line-end-style] > a[tabindex][role][title]',
  },
  {
    selector:
      'ytd-thumbnail[use-hovered-property][size][loaded] > a[aria-hidden][tabindex][rel][href] > yt-image > img[alt][style][src]',
  },
] as const;

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

export function isYoutubeWebUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const normalizedHost = parsed.hostname.toLowerCase();
    return (
      normalizedHost === 'youtube.com' || normalizedHost === 'www.youtube.com'
    );
  } catch {
    return false;
  }
}

export const youtubeSiteModule: SiteModule<'youtube'> = {
  id: 'youtube',
  displayName: 'YouTube',
  matches: isYoutubeUrl,
  elementBlocker: {
    styleElementId: 'life-is-short-youtube-element-blocker',
    matchesUrl: isYoutubeWebUrl,
    rules: YOUTUBE_BLOCKED_ELEMENT_RULES,
  },
  getDefaultSettings: (): YoutubeSettings => ({
    enabled: true,
    threshold: 3,
    resetWindowHours: 8,
  }),
};
