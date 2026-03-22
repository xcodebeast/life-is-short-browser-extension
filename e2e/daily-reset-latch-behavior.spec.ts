import { expect, test } from './extension-fixture';
import {
  getYoutubeStatus,
  incrementYoutubeUsage,
  resetExtensionStorage,
  setYoutubeUsageWindowState,
  updateYoutubeThreshold,
  updateYoutubeResetWindowHours,
} from './helpers';

test('keeps block latched on threshold raise, then resets after the configured window', async ({
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);

  await updateYoutubeThreshold(dashboardPage, 5);
  await updateYoutubeResetWindowHours(dashboardPage, 8);
  await incrementYoutubeUsage(dashboardPage, 4);

  let status = await getYoutubeStatus(dashboardPage);
  expect(status.blocked).toBe(false);
  expect(status.count).toBe(4);
  expect(status.resetWindowHours).toBe(8);

  await updateYoutubeThreshold(dashboardPage, 3);
  status = await getYoutubeStatus(dashboardPage);
  expect(status.blocked).toBe(true);

  await updateYoutubeThreshold(dashboardPage, 10);
  status = await getYoutubeStatus(dashboardPage);
  expect(status.blocked).toBe(true);

  await setYoutubeUsageWindowState(dashboardPage, {
    hoursAgo: 7,
    count: 7,
    blockedLatched: true,
  });
  status = await getYoutubeStatus(dashboardPage);

  expect(status.count).toBe(7);
  expect(status.blocked).toBe(true);

  await setYoutubeUsageWindowState(dashboardPage, {
    hoursAgo: 9,
    count: 7,
    blockedLatched: true,
  });
  status = await getYoutubeStatus(dashboardPage);

  expect(status.count).toBe(0);
  expect(status.blocked).toBe(false);
});
