import { expect, test } from './extension-fixture';
import { resetExtensionStorage, updateExtensionEnabled } from './helpers';

const BLOCKED_ELEMENT_TEST_IDS = [
  'comments-sections',
  'secondary',
  'related',
  'thumbnail',
  'aria-menu-link',
  'shelf-header',
  'guide-primary-link',
  'thumbnail-image',
] as const;

function getYoutubeElementBlockerStubHtml(): string {
  return `
    <!doctype html>
    <html lang="en">
      <head><title>Element Blocker Stub</title></head>
      <body>
        <h1>Element Blocker Stub</h1>

        <div id="comments">
          <div id="sections" data-testid="comments-sections">Comments</div>
        </div>

        <div id="secondary" data-testid="secondary">Secondary</div>

        <div id="secondary-inner">
          <div id="related" data-testid="related">Related</div>
        </div>

        <div id="thumbnail" data-testid="thumbnail">Thumbnail</div>

        <a
          href="/menu"
          aria-haspopup="true"
          tabindex="0"
          aria-hidden="true"
          style="display: block"
          data-testid="aria-menu-link"
        >
          Menu link
        </a>

        <yt-shelf-header-layout data-testid="shelf-header">
          Shelf header
        </yt-shelf-header-layout>

        <ytd-guide-section-renderer guide-persistent-and-visible>
          <div>
            <ytd-guide-entry-renderer is-primary line-end-style>
              <a
                tabindex="0"
                role="link"
                title="Home"
                data-testid="guide-primary-link"
              >
                Home
              </a>
            </ytd-guide-entry-renderer>
          </div>
        </ytd-guide-section-renderer>

        <ytd-thumbnail use-hovered-property size loaded>
          <a aria-hidden="true" tabindex="-1" rel="nofollow" href="/watch">
            <yt-image>
              <img
                alt="thumbnail"
                style="display: block"
                src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
                data-testid="thumbnail-image"
              >
            </yt-image>
          </a>
        </ytd-thumbnail>
      </body>
    </html>
  `;
}

test('hides configured YouTube elements and future matching elements', async ({
  context,
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);

  await context.route('https://www.youtube.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: getYoutubeElementBlockerStubHtml(),
    });
  });

  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=element-blocker', {
    waitUntil: 'domcontentloaded',
  });

  await expect(
    page.locator('#life-is-short-youtube-element-blocker'),
  ).toHaveCount(1);

  for (const testId of BLOCKED_ELEMENT_TEST_IDS) {
    await expect(page.getByTestId(testId)).toBeHidden();
  }

  await page.evaluate(() => {
    const dynamicSecondary = document.createElement('div');
    dynamicSecondary.id = 'secondary';
    dynamicSecondary.dataset.testid = 'dynamic-secondary';
    dynamicSecondary.textContent = 'Dynamic secondary';
    document.body.append(dynamicSecondary);
  });

  await expect(page.getByTestId('dynamic-secondary')).toBeHidden();

  await page.close();
});

test('removes configured element blocking when the extension is disabled', async ({
  context,
  dashboardPage,
}) => {
  await resetExtensionStorage(dashboardPage);
  await updateExtensionEnabled(dashboardPage, false);

  await context.route('https://www.youtube.com/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: getYoutubeElementBlockerStubHtml(),
    });
  });

  const page = await context.newPage();
  await page.goto('https://www.youtube.com/watch?v=element-blocker-disabled', {
    waitUntil: 'domcontentloaded',
  });

  await expect(
    page.locator('#life-is-short-youtube-element-blocker'),
  ).toHaveCount(0);

  for (const testId of BLOCKED_ELEMENT_TEST_IDS) {
    await expect(page.getByTestId(testId)).toBeVisible();
  }

  await page.close();
});
