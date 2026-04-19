import type { ElementBlockerConfiguration } from './element-blocker';
import type { SiteId, SiteSettings } from './types';

export type SiteModule<TId extends SiteId = SiteId> = {
  id: TId;
  displayName: string;
  matches: (url: string) => boolean;
  getDefaultSettings: () => SiteSettings[TId];
  elementBlocker?: ElementBlockerConfiguration;
  initContentHooks?: () => void;
};
