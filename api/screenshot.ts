import { chromium, type Browser } from 'playwright';

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.isConnected()) {
    sharedBrowser = await chromium.launch({ headless: true });
  }
  return sharedBrowser;
}

export async function captureTweetScreenshot(
  url: string,
  theme: 'dark' | 'light',
  hideActions: boolean,
): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: 550, height: 900 },
    colorScheme: theme,
  });

  try {
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 10000 });

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
    await context.close();
  }
}
