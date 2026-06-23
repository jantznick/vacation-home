import {
  importDnrLakeFromHtml,
  importDnrLakeFromUrl,
  importDnrLakeFromWbic,
  parseWbicFromUrl,
} from './wiDnrLake.js';
import { detectSourceSite, fetchZillowListing, parseZillowFromPaste } from './zillow.js';

export async function previewListingFromUrl(urlString) {
  if (!urlString?.trim()) {
    throw new Error('URL is required');
  }

  const sourceSite = detectSourceSite(urlString);
  if (!sourceSite) {
    throw new Error('Unsupported listing site. Only Zillow URLs are supported for now.');
  }

  if (sourceSite === 'zillow') {
    return fetchZillowListing(urlString);
  }

  throw new Error('Unsupported listing site');
}

export function previewListingFromPaste({ sourceUrl, pastedData }) {
  if (!sourceUrl?.trim()) {
    throw new Error('Zillow listing URL is required');
  }

  const sourceSite = detectSourceSite(sourceUrl);
  if (!sourceSite) {
    throw new Error('Unsupported listing site. Only Zillow URLs are supported for now.');
  }

  return parseZillowFromPaste({ sourceUrl, pastedData });
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

export { parseWbicFromUrl };
