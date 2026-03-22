import { getLocalDateKey } from './date-key';
import {
  SITE_IDS,
  type PersistentUsageState,
  type SiteId,
  type SitePersistentUsage,
} from './types';

const PERSISTENT_USAGE_STORAGE_KEY = 'lifeIsShort.persistentUsage.v1';

function createInitialSitePersistentUsage(todayKey = getLocalDateKey()): SitePersistentUsage {
  return {
    totalCount: 0,
    todayCount: 0,
    todayKey,
  };
}

function normalizeSitePersistentUsage(
  partial: Partial<SitePersistentUsage> | undefined,
  todayKey: string,
): SitePersistentUsage {
  const storedTodayKey =
    typeof partial?.todayKey === 'string' && partial.todayKey.length > 0
      ? partial.todayKey
      : todayKey;

  const nextTodayCount = storedTodayKey === todayKey
    ? partial?.todayCount ?? 0
    : 0;

  return {
    totalCount: partial?.totalCount ?? 0,
    todayCount: nextTodayCount,
    todayKey: todayKey,
  };
}

function normalizePersistentUsageState(
  partial: Partial<PersistentUsageState> | undefined,
  todayKey = getLocalDateKey(),
): PersistentUsageState {
  const nextSites = Object.fromEntries(
    SITE_IDS.map((siteId) => [
      siteId,
      normalizeSitePersistentUsage(partial?.sites?.[siteId], todayKey),
    ]),
  ) as PersistentUsageState['sites'];

  return {
    sites: nextSites,
  };
}

export async function getPersistentUsageState(): Promise<PersistentUsageState> {
  const result = await browser.storage.sync.get(PERSISTENT_USAGE_STORAGE_KEY);
  const normalized = normalizePersistentUsageState(
    result[PERSISTENT_USAGE_STORAGE_KEY] as Partial<PersistentUsageState> | undefined,
  );

  await savePersistentUsageState(normalized);
  return normalized;
}

export async function savePersistentUsageState(
  state: PersistentUsageState,
): Promise<void> {
  await browser.storage.sync.set({ [PERSISTENT_USAGE_STORAGE_KEY]: state });
}

export async function incrementPersistentSiteUsage(
  siteId: SiteId,
): Promise<PersistentUsageState> {
  const usage = await getPersistentUsageState();
  const nextUsage: PersistentUsageState = {
    ...usage,
    sites: {
      ...usage.sites,
      [siteId]: {
        ...usage.sites[siteId],
        totalCount: usage.sites[siteId].totalCount + 1,
        todayCount: usage.sites[siteId].todayCount + 1,
      },
    },
  };

  await savePersistentUsageState(nextUsage);
  return nextUsage;
}
