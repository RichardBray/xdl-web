import { chromium } from 'playwright';

export async function captureTweetScreenshot(
  url: string,
  theme: 'dark' | 'light',
  hideActions: boolean,
): Promise<Buffer> {
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({
      viewport: { width: 550, height: 900 },
      colorScheme: theme,
    });
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    if (hideActions) {
      await page.addStyleTag({
        content: `[data-testid="tweet"] [role="group"] { display: none !important; }`,
      });
    }

    const tweet = await page.$('article[data-testid="tweet"]');
    if (!tweet) {
      throw new Error('Could not find tweet on page — it may be protected or deleted');
    }

    const screenshot = await tweet.screenshot({ type: 'png' });
    return Buffer.from(screenshot);
  } finally {
    await browser.close();
  }
}
