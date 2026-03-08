import { expect, test } from './extension-fixture';
import {
  getYoutubeStatus,
  resetExtensionStorage,
  updateYoutubeThreshold,
} from './helpers';

test('auto-saves threshold changes and clamps out-of-range values', async ({
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await dashboardPage.reload();

  const thresholdInput = dashboardPage.getByLabel('Threshold (1-10)');

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
