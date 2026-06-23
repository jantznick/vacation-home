import puppeteer from 'puppeteer';

let browserPromise = null;

function isDebugMode() {
  return process.env.PUPPETEER_HEADLESS === 'false'
    || process.env.PUPPETEER_DEBUG === 'true';
}

function debugPauseMs() {
  if (process.env.PUPPETEER_DEBUG_PAUSE_MS !== undefined) {
    return Number(process.env.PUPPETEER_DEBUG_PAUSE_MS);
  }
  return isDebugMode() ? 60000 : 0;
}

function launchOptions() {
  const debug = isDebugMode();
  const headless = process.env.PUPPETEER_HEADLESS !== 'false';

  const options = {
    headless,
    slowMo: debug ? Number(process.env.PUPPETEER_SLOW_MO || 50) : 0,
    devtools: process.env.PUPPETEER_DEVTOOLS === 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,900',
    ],
  };

  if (process.env.PUPPETEER_USE_SYSTEM_CHROME === 'true') {
    options.channel = 'chrome';
  }

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    options.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  if (debug) {
    console.log('[puppeteer] Debug mode:', {
      headless,
      slowMo: options.slowMo,
      devtools: options.devtools,
      channel: options.channel || 'bundled Chromium',
      pauseMs: debugPauseMs(),
    });
  }

  return options;
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch(launchOptions());
  }
  return browserPromise;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Load a URL in Chrome/Chromium and return the rendered HTML.
 * Set PUPPETEER_HEADLESS=false locally to watch the browser window.
 */
export async function fetchHtmlWithPuppeteer(url) {
  const debug = isDebugMode();
  const pauseMs = debugPauseMs();
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
    });

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });

    const status = response?.status() ?? null;
    const finalUrl = page.url();
    const title = await page.title().catch(() => '');

    if (debug) {
      console.log('[puppeteer debug] Navigation result:', { status, finalUrl, title });
    }

    const httpError = response && !response.ok() && status !== 304;

    if (httpError && !debug) {
      throw new Error(`Page returned HTTP ${status}`);
    }

    if (httpError && debug) {
      console.warn(
        `[puppeteer debug] HTTP ${status} — browser window left open for ${pauseMs}ms. `
        + 'Inspect the page, then it will close automatically.',
      );
    }

    await page.waitForSelector('#__NEXT_DATA__', { timeout: 20000 }).catch(() => {});
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});

    if (debug && pauseMs > 0) {
      console.log(`[puppeteer debug] Pausing ${pauseMs}ms — inspect the browser window now`);
      await sleep(pauseMs);
    }

    const html = await page.content();

    if (httpError && debug) {
      console.warn('[puppeteer debug] Returning HTML despite HTTP error for inspection/parsing');
    }

    return html;
  } finally {
    await page.close();
  }
}

export async function closeBrowser() {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
    browserPromise = null;
  }
}

export function isPuppeteerDebugMode() {
  return isDebugMode();
}
