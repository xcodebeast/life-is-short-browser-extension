import {
  SITE_IDS,
  type SiteId,
  type SiteSettings,
  type SiteUsage,
  type UsageState,
} from './types';

const USAGE_STORAGE_KEY = 'lifeIsShort.usage.v2';
const HOUR_IN_MS = 60 * 60 * 1000;

function createInitialSiteUsage(windowStartedAt = Date.now()): SiteUsage {
  return {
    count: 0,
    blockedLatched: false,
    windowStartedAt,
  };
}

export function createEmptyUsageState(windowStartedAt = Date.now()): UsageState {
  return {
    sites: {
      youtube: createInitialSiteUsage(windowStartedAt),
      linkedin: createInitialSiteUsage(windowStartedAt),
    },
  };
}

function normalizeSiteUsage(
  partial: Partial<SiteUsage> | undefined,
  fallbackWindowStartedAt: number,
): SiteUsage {
  const windowStartedAt =
    typeof partial?.windowStartedAt === 'number' &&
    Number.isFinite(partial.windowStartedAt)
      ? partial.windowStartedAt
      : fallbackWindowStartedAt;

  return {
    count: partial?.count ?? 0,
    blockedLatched: partial?.blockedLatched ?? false,
    windowStartedAt,
  };
}

function normalizeUsageState(
  partial: Partial<UsageState> | undefined,
  now = Date.now(),
): UsageState {
  return {
    sites: {
      youtube: normalizeSiteUsage(partial?.sites?.youtube, now),
      linkedin: normalizeSiteUsage(partial?.sites?.linkedin, now),
    },
  };
}

export async function getUsageState(): Promise<UsageState> {
  const result = await browser.storage.local.get(USAGE_STORAGE_KEY);
  const normalized = normalizeUsageState(
    result[USAGE_STORAGE_KEY] as Partial<UsageState> | undefined,
  );

  await browser.storage.local.set({ [USAGE_STORAGE_KEY]: normalized });
  return normalized;
}

function getSiteResetWindowHours(
  siteId: SiteId,
  settings: SiteSettings,
): number | null {
  switch (siteId) {
    case 'youtube':
      return settings.youtube.resetWindowHours;
    case 'linkedin':
      return null;
  }
}

function hasUsageWindowExpired(
  windowStartedAt: number,
  resetWindowHours: number,
  now = Date.now(),
): boolean {
  return now - windowStartedAt >= resetWindowHours * HOUR_IN_MS;
}

export function applyUsageResetWindows(
  state: UsageState,
  settings: SiteSettings,
  now = Date.now(),
): UsageState {
  let changed = false;
  const nextSites = { ...state.sites };

  for (const siteId of SITE_IDS) {
    const resetWindowHours = getSiteResetWindowHours(siteId, settings);
    if (resetWindowHours === null) {
      continue;
    }

    if (
      !hasUsageWindowExpired(
        state.sites[siteId].windowStartedAt,
        resetWindowHours,
        now,
      )
    ) {
      continue;
    }

    nextSites[siteId] = createInitialSiteUsage(now);
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    sites: nextSites,
  };
}

export async function getUsageStateForCurrentWindow(
  settings: SiteSettings,
): Promise<UsageState> {
  const usage = await getUsageState();
  const nextUsage = applyUsageResetWindows(usage, settings);

  if (nextUsage === usage) {
    return usage;
  }

  await saveUsageState(nextUsage);
  return nextUsage;
}

export async function saveUsageState(state: UsageState): Promise<void> {
  await browser.storage.local.set({ [USAGE_STORAGE_KEY]: state });
}

export async function incrementSiteUsage(
  siteId: SiteId,
  settings: SiteSettings,
): Promise<UsageState> {
  const usage = await getUsageStateForCurrentWindow(settings);
  const nextUsage: UsageState = {
    ...usage,
    sites: {
      ...usage.sites,
      [siteId]: {
        ...usage.sites[siteId],
        count: usage.sites[siteId].count + 1,
      },
    },
  };

  await saveUsageState(nextUsage);
  return nextUsage;
}

export async function latchSiteBlock(
  siteId: SiteId,
  settings: SiteSettings,
): Promise<UsageState> {
  const usage = await getUsageStateForCurrentWindow(settings);
  if (usage.sites[siteId].blockedLatched) {
    return usage;
  }

  const nextUsage: UsageState = {
    ...usage,
    sites: {
      ...usage.sites,
      [siteId]: {
        ...usage.sites[siteId],
        blockedLatched: true,
      },
    },
  };

  await saveUsageState(nextUsage);
  return nextUsage;
}
