import puppeteer from 'puppeteer';

let browserPromise = null;

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function isDebugMode() {
  // Never open a visible browser in production.
  if (isProduction()) return false;
  return process.env.PUPPETEER_HEADLESS === 'false'
    || process.env.PUPPETEER_DEBUG === 'true';
}

function debugPauseMs() {
  if (isProduction()) return 0;
  if (process.env.PUPPETEER_DEBUG_PAUSE_MS !== undefined) {
    return Number(process.env.PUPPETEER_DEBUG_PAUSE_MS);
  }
  return isDebugMode() ? 10000 : 0;
}

function launchOptions() {
  const debug = isDebugMode();
  // Production always runs headless; local debug can set PUPPETEER_HEADLESS=false.
  const headless = isProduction() || process.env.PUPPETEER_HEADLESS !== 'false';

  const options = {
    headless,
    slowMo: debug ? Number(process.env.PUPPETEER_SLOW_MO || 50) : 0,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1366,900',
    ],
  };

  if (debug) {
    options.devtools = process.env.PUPPETEER_DEVTOOLS === 'true';
  }

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
 * Load a URL in Chrome/Chromium and return HTML that still includes YachtWorld's
 * Redux payload. After hydration, script tags are often emptied — so we re-inject
 * window.__REDUX_STATE__ when present.
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

    await page.waitForFunction(
      () => {
        if (typeof window.__REDUX_STATE__ !== 'undefined') return true;
        if (document.getElementById('__NEXT_DATA__')) return true;
        return [...document.scripts].some((script) => (
          (script.textContent || '').includes('var __REDUX_STATE__=')
        ));
      },
      { timeout: 20000 },
    ).catch(() => {});
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});

    if (debug && pauseMs > 0) {
      console.log(`[puppeteer debug] Pausing ${pauseMs}ms — inspect the browser window now`);
      await sleep(pauseMs);
    }

    const capture = await page.evaluate(() => {
      const serializeRedux = (value) => {
        try {
          return JSON.stringify(value);
        } catch {
          return null;
        }
      };

      if (typeof window.__REDUX_STATE__ !== 'undefined') {
        return {
          reduxJson: serializeRedux(window.__REDUX_STATE__),
          html: document.documentElement?.outerHTML || '',
        };
      }

      for (const script of document.scripts) {
        const text = script.textContent || '';
        const marker = 'var __REDUX_STATE__=';
        const idx = text.indexOf(marker);
        if (idx === -1) continue;
        let i = idx + marker.length;
        while (i < text.length && /\s/.test(text[i])) i += 1;
        if (text[i] !== '{') continue;
        let depth = 0;
        let inString = false;
        let escape = false;
        for (let j = i; j < text.length; j += 1) {
          const ch = text[j];
          if (inString) {
            if (escape) {
              escape = false;
              continue;
            }
            if (ch === '\\') {
              escape = true;
              continue;
            }
            if (ch === '"') inString = false;
            continue;
          }
          if (ch === '"') {
            inString = true;
            continue;
          }
          if (ch === '{') depth += 1;
          else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
              return {
                reduxJson: text.slice(i, j + 1),
                html: document.documentElement?.outerHTML || '',
              };
            }
          }
        }
      }

      return {
        reduxJson: null,
        html: document.documentElement?.outerHTML || '',
      };
    });

    let html = capture.html || await page.content();
    if (capture.reduxJson) {
      // Re-inject so parsers that read page source still see Redux after hydration.
      html = `<script>var __REDUX_STATE__=${capture.reduxJson};</script>\n${html}`;
    }

    if (debug) {
      console.log('[puppeteer debug] HTML snapshot:', {
        length: html.length,
        hasRedux: html.includes('var __REDUX_STATE__='),
        capturedRedux: Boolean(capture.reduxJson),
        hasNextData: html.includes('__NEXT_DATA__'),
        hasLdJson: /type=["']application\/ld\+json["']/i.test(html),
      });
    }

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
