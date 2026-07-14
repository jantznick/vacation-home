import {
  importDnrLakeFromHtml,
  importDnrLakeFromUrl,
  importDnrLakeFromWbic,
  parseWbicFromUrl,
} from './wiDnrLake.js';
import { detectSourceSite as detectZillowSite, parseZillowFromPaste } from './zillow.js';
import { fetchListingFromZillapi, isZillapiConfigured } from './zillapi.js';
import {
  fetchListingFromYachtWorld,
  isYachtWorldUrl,
  parseYachtWorldFromPaste,
} from './yachtworld.js';

export function detectSourceSite(urlString) {
  if (isYachtWorldUrl(urlString)) {
    return 'yachtworld';
  }
  return detectZillowSite(urlString);
}

export async function previewListingFromUrl(urlString, context = {}) {
  if (!urlString?.trim()) {
    throw new Error('URL is required');
  }

  const sourceSite = detectSourceSite(urlString);
  if (!sourceSite) {
    throw new Error('Unsupported listing link. Use a Zillow or YachtWorld URL.');
  }

  if (sourceSite === 'yachtworld') {
    return fetchListingFromYachtWorld(urlString);
  }

  if (!isZillapiConfigured()) {
    throw new Error('Listing import is not configured. Set ZILLAPI_KEY on the server.');
  }

  if (sourceSite === 'zillow') {
    return fetchListingFromZillapi(urlString, context);
  }

  throw new Error('Unsupported listing link');
}

export function previewListingFromPaste({ sourceUrl, pastedData }) {
  if (!pastedData?.trim()) {
    throw new Error('Pasted page data is required');
  }

  // YachtWorld page-source import is HTML-only — never fetch, never require the URL field.
  if (looksLikeYachtWorldPageSource(pastedData)) {
    return parseYachtWorldFromPaste({ pastedData });
  }

  if (!sourceUrl?.trim()) {
    throw new Error('Listing URL is required for this paste import');
  }

  const sourceSite = detectSourceSite(sourceUrl);
  if (!sourceSite) {
    throw new Error('Unsupported listing link. Use a Zillow or YachtWorld URL.');
  }

  if (sourceSite === 'yachtworld') {
    return parseYachtWorldFromPaste({ pastedData });
  }

  return parseZillowFromPaste({ sourceUrl, pastedData });
}

function looksLikeYachtWorldPageSource(html) {
  return /yachtworld\.com|__REDUX_STATE__|boatsgroup\.com/i.test(html);
}

export async function previewDnrLakeFromUrl(urlOrWbic) {
  if (!urlOrWbic?.trim()) {
    throw new Error('DNR lake URL or WBIC is required');
  }

  const trimmed = urlOrWbic.trim();
  if (/^\d+$/.test(trimmed)) {
    return importDnrLakeFromWbic(trimmed);
  }

  return importDnrLakeFromUrl(trimmed);
}

export function previewDnrLakeFromHtml({ wbic, overviewHtml, factsHtml }) {
  return importDnrLakeFromHtml({ wbic, overviewHtml, factsHtml });
}

export { parseWbicFromUrl, isZillapiConfigured };
