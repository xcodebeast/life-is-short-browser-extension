import { expect, test } from './extension-fixture';
import {
  getDashboardState,
  getPersistentUsageStateFromSync,
  getYoutubeStatus,
  incrementYoutubeUsage,
  resetExtensionStorage,
  setYoutubeUsageWindowState,
  updateYoutubeResetWindowHours,
  updateYoutubeThreshold,
} from './helpers';

test('auto-saves threshold changes and clamps out-of-range values', async ({
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await dashboardPage.reload();

  const thresholdInput = dashboardPage.getByLabel('Threshold (1-10)');
  const resetWindowInput = dashboardPage.getByLabel('Reset window (hours)');

  await expect(resetWindowInput).toHaveValue('8');
  await expect(dashboardPage.getByText(/^Current threshold:/)).toHaveCount(0);

  await thresholdInput.fill('99');
  await thresholdInput.dispatchEvent('change');
  await expect(thresholdInput).toHaveValue('10');

  let status = await getYoutubeStatus(dashboardPage);
  expect(status.threshold).toBe(10);

  await thresholdInput.fill('0');
  await thresholdInput.dispatchEvent('change');
  await expect(thresholdInput).toHaveValue('1');

  status = await getYoutubeStatus(dashboardPage);
  expect(status.threshold).toBe(1);

  await updateYoutubeThreshold(dashboardPage, 4);
  status = await getYoutubeStatus(dashboardPage);
  expect(status.threshold).toBe(4);

  await resetWindowInput.fill('99');
  await resetWindowInput.dispatchEvent('change');
  await expect(resetWindowInput).toHaveValue('24');

  status = await getYoutubeStatus(dashboardPage);
  expect(status.resetWindowHours).toBe(24);

  await resetWindowInput.fill('0');
  await resetWindowInput.dispatchEvent('change');
  await expect(resetWindowInput).toHaveValue('1');

  status = await getYoutubeStatus(dashboardPage);
  expect(status.resetWindowHours).toBe(1);

  await updateYoutubeResetWindowHours(dashboardPage, 6);
  status = await getYoutubeStatus(dashboardPage);
  expect(status.resetWindowHours).toBe(6);
});

test('shows how long is left before the YouTube block resets', async ({
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await updateYoutubeThreshold(dashboardPage, 3);
  await updateYoutubeResetWindowHours(dashboardPage, 8);
  await setYoutubeUsageWindowState(dashboardPage, {
    hoursAgo: 3,
    count: 3,
    blockedLatched: true,
  });

  await dashboardPage.reload();

  await expect(dashboardPage.getByText('Block resets in')).toBeVisible();
  await expect(dashboardPage.getByText('5h 0m')).toBeVisible();
});

test('shows permanent YouTube counts for today and total from sync storage', async ({
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await incrementYoutubeUsage(dashboardPage, 2);
  await dashboardPage.reload();

  const dashboard = await getDashboardState(dashboardPage);
  expect(dashboard.persistentUsage.sites.youtube.todayCount).toBe(2);
  expect(dashboard.persistentUsage.sites.youtube.totalCount).toBe(2);

  const syncUsage = await getPersistentUsageStateFromSync(dashboardPage);
  expect(syncUsage).not.toBeNull();
  if (syncUsage === null) {
    throw new Error('Expected persistent YouTube usage in sync storage');
  }
  expect(syncUsage.sites.youtube.todayCount).toBe(2);
  expect(syncUsage.sites.youtube.totalCount).toBe(2);

  const todayMetric = dashboardPage.locator('.metric-item', {
    hasText: 'Videos watched today',
  });
  const totalMetric = dashboardPage.locator('.metric-item', {
    hasText: 'Videos watched total',
  });

  await expect(todayMetric.locator('.metric-value')).toHaveText('2');
  await expect(totalMetric.locator('.metric-value')).toHaveText('2');
});

test('publishes branded icon paths in the extension manifest', async ({
  dashboardPage,
}) => {
  const manifest = await dashboardPage.evaluate(() => browser.runtime.getManifest());

  expect(manifest.icons).toEqual({
    16: 'icon/16.png',
    32: 'icon/32.png',
    48: 'icon/48.png',
    96: 'icon/96.png',
    128: 'icon/128.png',
  });
  expect(manifest.action?.default_icon).toEqual({
    16: 'icon/16.png',
    32: 'icon/32.png',
    48: 'icon/48.png',
    96: 'icon/96.png',
    128: 'icon/128.png',
  });
});
