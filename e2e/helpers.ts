import type { Page } from '@playwright/test';
import {
  MESSAGE_TYPES,
  type GetDashboardStateResponse,
  type GetSiteStatusResponse,
  type RuntimeMessage,
  type RuntimeResponse,
} from '../src/core/messages';
import type { PersistentUsageState } from '../src/core/types';

const USAGE_STORAGE_KEY = 'lifeIsShort.usage.v2';
const PERSISTENT_USAGE_STORAGE_KEY = 'lifeIsShort.persistentUsage.v1';

export async function resetExtensionStorage(page: Page): Promise<void> {
  await page.evaluate(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    await browser.storage.local.clear();
    await browser.storage.sync.clear();
  });
}

export async function sendRuntimeMessage<TResponse extends RuntimeResponse>(
  page: Page,
  message: RuntimeMessage,
): Promise<TResponse> {
  return page.evaluate((payload) => browser.runtime.sendMessage(payload), message);
}

export async function incrementYoutubeUsage(page: Page, times = 1): Promise<void> {
  for (let index = 0; index < times; index += 1) {
    await sendRuntimeMessage(page, {
      type: MESSAGE_TYPES.usageIncrement,
      siteId: 'youtube',
    });
  }
}

export async function getYoutubeStatus(page: Page) {
  const response = await sendRuntimeMessage<GetSiteStatusResponse>(page, {
    type: MESSAGE_TYPES.getSiteStatus,
    siteId: 'youtube',
  });

  return response.status;
}

export async function getDashboardState(page: Page) {
  const response = await sendRuntimeMessage<GetDashboardStateResponse>(page, {
    type: MESSAGE_TYPES.getDashboardState,
  });

  return response.dashboard;
}

export async function updateYoutubeThreshold(
  page: Page,
  threshold: number,
): Promise<void> {
  await sendRuntimeMessage(page, {
    type: MESSAGE_TYPES.updateYoutubeSettings,
    siteId: 'youtube',
    threshold,
  });
}

export async function updateYoutubeResetWindowHours(
  page: Page,
  resetWindowHours: number,
): Promise<void> {
  await sendRuntimeMessage(page, {
    type: MESSAGE_TYPES.updateYoutubeSettings,
    siteId: 'youtube',
    resetWindowHours,
  });
}

export async function setYoutubeUsageWindowState(
  page: Page,
  args: {
    hoursAgo: number;
    count: number;
    blockedLatched: boolean;
  },
): Promise<void> {
  await page.evaluate(async ({ usageKey, nextState }) => {
    await browser.storage.local.set({
      [usageKey]: nextState,
    });
  }, {
    usageKey: USAGE_STORAGE_KEY,
    nextState: {
      sites: {
        youtube: {
          count: args.count,
          blockedLatched: args.blockedLatched,
          windowStartedAt: Date.now() - args.hoursAgo * 60 * 60 * 1000,
        },
        linkedin: {
          count: 0,
          blockedLatched: false,
          windowStartedAt: Date.now(),
        },
      },
    },
  });
}

export async function getPersistentUsageStateFromSync(
  page: Page,
): Promise<PersistentUsageState | null> {
  return page.evaluate(async (persistentUsageKey) => {
    const result = await browser.storage.sync.get(persistentUsageKey);
    return (result[persistentUsageKey] as PersistentUsageState | undefined) ?? null;
  }, PERSISTENT_USAGE_STORAGE_KEY);
}
