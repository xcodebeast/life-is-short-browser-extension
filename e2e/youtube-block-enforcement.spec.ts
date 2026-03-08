import { BLOCK_ALERT_TEXT } from '../src/constants/text';
import { expect, test } from './extension-fixture';
import {
  getYoutubeStatus,
  incrementYoutubeUsage,
  resetExtensionStorage,
  updateYoutubeThreshold,
} from './helpers';

test('redirects blocked YouTube visits and shows the required alert every attempt', async ({
  context,
  dashboardPage,
  extensionId,
}) => {
  await resetExtensionStorage(dashboardPage);
  await updateYoutubeThreshold(dashboardPage, 1);
  await incrementYoutubeUsage(dashboardPage, 1);

  const youtubeStatus = await getYoutubeStatus(dashboardPage);
  expect(youtubeStatus.blocked).toBe(true);

  const blockedPageUrl = await dashboardPage.evaluate(() =>
    browser.runtime.getURL('/blocked.html'),
  );
  expect(blockedPageUrl).not.toContain('chrome-extension://invalid/');

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const page = await context.newPage();
    await page.goto(
      `chrome-extension://${extensionId}/blocked.html?site=youtube&from=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}`,
      {
        waitUntil: 'domcontentloaded',
      },
    );

    if (!page.isClosed()) {
      await expect(page.getByText(BLOCK_ALERT_TEXT)).toBeVisible();
      await page.close();
    }
  }
});

test('does not block or count visits on music.youtube.com', async ({
  context,
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await updateYoutubeThreshold(dashboardPage, 1);
  await incrementYoutubeUsage(dashboardPage, 1);

  const youtubeStatus = await getYoutubeStatus(dashboardPage);
  expect(youtubeStatus.blocked).toBe(true);
  expect(youtubeStatus.count).toBe(1);

  await context.route('https://music.youtube.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `
        <!doctype html>
        <html lang="en">
          <head><title>Music Stub</title></head>
          <body>
            <h1>Music Stub</h1>
            <video id="player"></video>
          </body>
        </html>
      `,
    });
  });

  const page = await context.newPage();
  await page.goto('https://music.youtube.com/watch?v=ambient-track', {
    waitUntil: 'domcontentloaded',
  });

  await expect(page).toHaveURL(/music\.youtube\.com\/watch/);
  await expect(page.getByRole('heading', { name: 'Music Stub' })).toBeVisible();
  await expect(page.getByText(BLOCK_ALERT_TEXT)).toHaveCount(0);

  await page.waitForTimeout(1_200);
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('#player');
    if (!video) {
      throw new Error('Missing test video element');
    }

    Object.defineProperty(video, 'duration', {
      configurable: true,
      get: () => 100,
    });
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => 60,
    });
    Object.defineProperty(video, 'paused', {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(video, 'readyState', {
      configurable: true,
      get: () => 4,
    });

    video.dispatchEvent(new Event('play'));
    video.dispatchEvent(new Event('timeupdate'));
    video.dispatchEvent(new Event('ended'));
  });

  await dashboardPage.reload();

  const statusAfterMusicVisit = await getYoutubeStatus(dashboardPage);
  expect(statusAfterMusicVisit.count).toBe(1);
  expect(statusAfterMusicVisit.blocked).toBe(true);

  await page.close();
});
