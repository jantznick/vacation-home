import puppeteer from 'puppeteer';

let browserPromise = null;
let idleCloseTimer = null;

/** Close Chromium after this much idle time so prod RAM doesn't stay inflated. */
function idleCloseMs() {
  const raw = process.env.PUPPETEER_IDLE_MS;
  if (raw !== undefined && raw !== '') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30_000;
  }
  return 30_000;
}

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
  const headless = isProduction() || process.env.PUPPETEER_HEADLESS !== 'false'
    ? true
    : false;

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

function cancelIdleClose() {
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer);
    idleCloseTimer = null;
  }
}

function scheduleIdleClose() {
  // Keep the browser open while debugging locally so the visible window stays usable.
  if (isDebugMode()) return;

  cancelIdleClose();
  const ms = idleCloseMs();
  if (ms === 0) {
    closeBrowser().catch((error) => {
      console.warn('[puppeteer] Immediate close failed:', error.message);
    });
    return;
  }

  idleCloseTimer = setTimeout(() => {
    idleCloseTimer = null;
    console.info(`[puppeteer] Closing browser after ${ms}ms idle`);
    closeBrowser().catch((error) => {
      console.warn('[puppeteer] Idle close failed:', error.message);
    });
  }, ms);

  // Don't keep the Node process alive solely for this timer.
  if (typeof idleCloseTimer.unref === 'function') {
    idleCloseTimer.unref();
  }
}

async function getBrowser() {
  cancelIdleClose();
  if (!browserPromise) {
    browserPromise = puppeteer.launch(launchOptions()).catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasReduxMarker(html) {
  return typeof html === 'string' && /var\s+__REDUX_STATE__\s*=/.test(html);
}

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Load a URL in Chrome/Chromium and return HTML that includes YachtWorld's
 * Redux payload when the server actually serves the listing page.
 *
 * On hosted platforms (Railway, etc.) Cloudflare often blocks the datacenter IP.
 * Callers should treat missing Redux as a hard failure and ask for page-source paste.
 *
 * The browser process is reused across quick successive imports, then closed after
 * PUPPETEER_IDLE_MS (default 30s) so production memory returns to a normal Node baseline.
 */
export async function fetchHtmlWithPuppeteer(url) {
  const debug = isDebugMode();
  const pauseMs = debugPauseMs();
  const browser = await getBrowser();
  const page = await browser.newPage();

  // Prefer the raw main-document body — it still has __REDUX_STATE__ before hydration.
  let documentHtml = null;
  const onResponse = async (response) => {
    try {
      if (response.request().resourceType() !== 'document') return;
      if (!response.ok() && response.status() !== 304) return;
      const text = await response.text();
      if (!text) return;
      if (hasReduxMarker(text) || !documentHtml || text.length > documentHtml.length) {
        documentHtml = text;
      }
    } catch {
      // Response body unavailable for some navigations; fall back to DOM capture.
    }
  };
  page.on('response', onResponse);

  try {
    await page.setViewport({ width: 1366, height: 900 });
    await page.setUserAgent(USER_AGENT);
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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

    console.info('[puppeteer] Navigation:', {
      status,
      finalUrl,
      title: title.slice(0, 120),
      documentHtmlBytes: documentHtml?.length ?? 0,
      documentHasRedux: hasReduxMarker(documentHtml),
    });

    const httpError = response && !response.ok() && status !== 304;

    if (httpError && !debug) {
      throw new Error(`Page returned HTTP ${status}`);
    }

    // Fast path: raw document response already has the listing payload.
    if (hasReduxMarker(documentHtml)) {
      return documentHtml;
    }

    await page.waitForFunction(
      () => {
        if (typeof window.__REDUX_STATE__ !== 'undefined') return true;
        return [...document.scripts].some((script) => (
          (script.textContent || '').includes('var __REDUX_STATE__=')
        ));
      },
      { timeout: 15000 },
    ).catch(() => {});

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
        title: document.title || '',
      };
    });

    let html = capture.html || await page.content();
    if (capture.reduxJson) {
      html = `<script>var __REDUX_STATE__=${capture.reduxJson};</script>\n${html}`;
    } else if (hasReduxMarker(documentHtml)) {
      html = documentHtml;
    }

    console.info('[puppeteer] Capture result:', {
      htmlBytes: html.length,
      hasRedux: hasReduxMarker(html),
      title: (capture.title || title || '').slice(0, 120),
    });

    return html;
  } finally {
    page.off('response', onResponse);
    await page.close().catch(() => {});
    scheduleIdleClose();
  }
}

export async function closeBrowser() {
  cancelIdleClose();
  if (browserPromise) {
    const pending = browserPromise;
    browserPromise = null;
    try {
      const browser = await pending;
      await browser.close();
    } catch (error) {
      console.warn('[puppeteer] closeBrowser:', error.message);
    }
  }
}

export function isPuppeteerDebugMode() {
  return isDebugMode();
}
