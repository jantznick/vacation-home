import { fetchHtmlWithPuppeteer, isPuppeteerDebugMode } from './browser.js';

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const VACANT_HOME_TYPES = new Set([
  'LOT',
  'LAND',
  'VACANT_LAND',
  'MANUFACTURED',
]);

const STATUS_MAP = {
  FOR_SALE: 'active',
  FOR_RENT: 'active',
  PENDING: 'pending',
  SOLD: 'sold',
  OFF_MARKET: 'off_market',
  OTHER: 'off_market',
};

function isZillowUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.hostname === 'www.zillow.com' || url.hostname === 'zillow.com';
  } catch {
    return false;
  }
}

function normalizeZillowUrl(urlString) {
  const url = new URL(urlString);
  if (!isZillowUrl(urlString)) {
    throw new Error('URL must be a Zillow listing (zillow.com)');
  }
  return url.toString();
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractJsonLd(html) {
  const matches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      if (data['@type'] === 'SingleFamilyResidence' || data['@type'] === 'House' || data['@type'] === 'Product') {
        return data;
      }
      if (Array.isArray(data)) {
        const residence = data.find((item) =>
          ['SingleFamilyResidence', 'House', 'Product', 'RealEstateListing'].includes(item['@type']),
        );
        if (residence) return residence;
      }
    } catch {
      // continue
    }
  }
  return null;
}

function deepFindPropertyObject(node, depth = 0, maxDepth = 20) {
  if (!node || typeof node !== 'object' || depth > maxDepth) {
    return null;
  }

  if (node.price != null && (node.address || node.streetAddress || node.bedrooms != null || node.livingArea != null)) {
    return node;
  }

  if (node.property && typeof node.property === 'object') {
    const nested = deepFindPropertyObject(node.property, depth + 1, maxDepth);
    if (nested) return nested;
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      const found = deepFindPropertyObject(value, depth + 1, maxDepth);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Zillow homedetails pages stash listing data in gdpClientCache as a JSON string.
 */
function extractPropertyFromGdpCache(componentProps) {
  const raw = componentProps?.gdpClientCache;
  if (!raw) return null;

  try {
    const cache = typeof raw === 'string' ? JSON.parse(raw) : raw;
    for (const entry of Object.values(cache)) {
      if (entry?.property) return entry.property;
    }
  } catch {
    return null;
  }

  return null;
}

function extractPropertyFromNextData(nextData) {
  if (!nextData || typeof nextData !== 'object') return null;

  if (nextData.__zillowProperty) {
    return nextData.__zillowProperty;
  }

  const fromCache = extractPropertyFromGdpCache(nextData?.props?.pageProps?.componentProps);
  if (fromCache) return fromCache;

  return deepFindPropertyObject(nextData);
}

function sqftToAcres(sqft) {
  if (!sqft || sqft <= 0) return null;
  return Math.round((sqft / 43560) * 100) / 100;
}

function parseLotSize(property, resoFacts = {}) {
  const lotSize = property.lotSize ?? resoFacts.lotSize;
  if (!lotSize) return { sqftLot: null, acres: null };

  if (typeof lotSize === 'number') {
    if (lotSize > 1000) {
      return { sqftLot: Math.round(lotSize), acres: sqftToAcres(lotSize) };
    }
    return { sqftLot: Math.round(lotSize * 43560), acres: lotSize };
  }

  if (typeof lotSize === 'string') {
    const acresMatch = lotSize.match(/([\d,.]+)\s*acres?/i);
    if (acresMatch) {
      const acres = parseFloat(acresMatch[1].replace(/,/g, ''));
      return { sqftLot: acres ? Math.round(acres * 43560) : null, acres: acres || null };
    }
    const sqftMatch = lotSize.match(/([\d,.]+)\s*sq\s*ft/i);
    if (sqftMatch) {
      const sqft = parseFloat(sqftMatch[1].replace(/,/g, ''));
      return { sqftLot: sqft || null, acres: sqftToAcres(sqft) };
    }
  }

  if (typeof lotSize === 'object') {
    if (lotSize.acres) {
      return { sqftLot: Math.round(lotSize.acres * 43560), acres: lotSize.acres };
    }
    if (lotSize.sqft) {
      return { sqftLot: lotSize.sqft, acres: sqftToAcres(lotSize.sqft) };
    }
  }

  return { sqftLot: null, acres: null };
}

function detectVacantLot(property, resoFacts = {}) {
  const homeType = (property.homeType || property.propertyType || resoFacts.homeType || '').toUpperCase();
  const homeStatus = (property.homeStatus || '').toUpperCase();
  const typeDimension = (resoFacts.propertySubType?.[0] || resoFacts.structureType || '').toLowerCase();

  if (VACANT_HOME_TYPES.has(homeType)) return true;
  if (typeDimension.includes('lot') || typeDimension.includes('land') || typeDimension.includes('vacant')) {
    return true;
  }
  if (homeStatus === 'FOR_SALE' && !property.livingArea && !resoFacts.livingArea && property.bedrooms == null) {
    const desc = JSON.stringify(resoFacts).toLowerCase();
    if (desc.includes('vacant land') || desc.includes('lot/land')) return true;
  }

  return false;
}

function detectWaterfront(property, resoFacts = {}) {
  const haystack = JSON.stringify({ property, resoFacts }).toLowerCase();
  const waterfront = haystack.includes('waterfront')
    || haystack.includes('lake front')
    || haystack.includes('lakefront')
    || haystack.includes('on lake');

  let waterfrontType = null;
  if (waterfront) {
    if (haystack.includes('lake')) waterfrontType = 'lake';
    else if (haystack.includes('river')) waterfrontType = 'river';
    else if (haystack.includes('creek')) waterfrontType = 'creek';
    else waterfrontType = 'waterfront';
  }

  return { waterfront, waterfrontType };
}

function mapZillowStatus(homeStatus) {
  if (!homeStatus) return 'active';
  return STATUS_MAP[homeStatus.toUpperCase()] || 'active';
}

function bestUrlFromPhoto(photo) {
  if (!photo || typeof photo !== 'object') {
    return null;
  }

  const jpegs = photo.mixedSources?.jpeg;
  if (Array.isArray(jpegs) && jpegs.length) {
    const best = jpegs.reduce((current, candidate) => (
      (candidate.width ?? 0) > (current?.width ?? 0) ? candidate : current
    ), null);
    if (best?.url) {
      return best.url;
    }
  }

  if (typeof photo.url === 'string') {
    return photo.url;
  }

  if (typeof photo.href === 'string') {
    return photo.href;
  }

  return null;
}

function extractPhotos(property) {
  const sources = [
    property.originalPhotos,
    property.responsivePhotosOriginalRatio,
    property.responsivePhotos,
    property.photos,
    property.media?.images,
  ];

  for (const photos of sources) {
    if (!Array.isArray(photos) || photos.length === 0) {
      continue;
    }

    const urls = photos
      .map(bestUrlFromPhoto)
      .filter((url) => typeof url === 'string' && url.startsWith('http'));

    if (urls.length) {
      return urls.slice(0, 24);
    }
  }

  const fallback = property.hiResImageLink || property.imgSrc;
  return fallback ? [fallback] : [];
}

function parseAddress(property, jsonLd = null) {
  const address = property.address || property.streetAddress || jsonLd?.address;

  if (!address) {
    return { address: null, city: null, state: 'WI', zip: null };
  }

  if (typeof address === 'string') {
    return { address, city: null, state: 'WI', zip: null };
  }

  const street = address.streetAddress || address.street || null;
  const city = address.city || address.addressLocality || null;
  const state = address.state || address.addressRegion || 'WI';
  const zip = address.zipcode || address.postalCode || address.zip || null;

  const line = street || [city, state, zip].filter(Boolean).join(', ');

  return { address: line, city, state, zip };
}

function mapPropertyToFields(property, sourceUrl, rawScrapedData, warnings) {
  const resoFacts = property.resoFacts || {};
  const { address, city, state, zip } = parseAddress(property);
  const { sqftLot, acres } = parseLotSize(property, resoFacts);
  const isVacantLot = detectVacantLot(property, resoFacts);
  const { waterfront, waterfrontType } = detectWaterfront(property, resoFacts);

  const listPrice = property.price
    ?? property.unformattedPrice
    ?? (typeof property.listPrice === 'number' ? property.listPrice : null);

  const sqftLiving = property.livingArea
    ?? resoFacts.livingArea
    ?? resoFacts.aboveGradeFinishedArea
    ?? null;

  const bedrooms = property.bedrooms ?? resoFacts.bedrooms ?? null;
  const bathrooms = property.bathrooms ?? resoFacts.bathrooms ?? null;
  const latitude = property.latitude ?? property.lat ?? null;
  const longitude = property.longitude ?? property.lng ?? property.lon ?? null;

  if (!listPrice) {
    warnings.push('Could not extract list price — enter manually.');
  }
  if (!address) {
    warnings.push('Could not extract address — enter manually.');
  }

  return {
    sourceUrl,
    sourceSite: 'zillow',
    mlsNumber: property.mlsid || property.mlsId || resoFacts.mlsId || null,
    status: mapZillowStatus(property.homeStatus),
    address,
    city,
    state,
    zip,
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    listPrice: listPrice ? Math.round(Number(listPrice)) : null,
    soldPrice: property.lastSoldPrice ? Math.round(Number(property.lastSoldPrice)) : null,
    isVacantLot,
    bedrooms: bedrooms != null ? Number(bedrooms) : null,
    bathrooms: bathrooms != null ? Number(bathrooms) : null,
    sqftLiving: sqftLiving ? Math.round(Number(sqftLiving)) : null,
    sqftLot,
    acres,
    yearBuilt: property.yearBuilt ?? resoFacts.yearBuilt ?? null,
    waterfront,
    waterfrontType,
    daysOnMarket: property.daysOnZillow ?? property.timeOnZillow ?? resoFacts.daysOnMarket ?? null,
    photoUrls: extractPhotos(property),
    listingDate: property.datePosted || property.dateSold || null,
    rawScrapedData,
  };
}

function mapJsonLdToFields(jsonLd, sourceUrl, rawScrapedData, warnings) {
  const offer = jsonLd.offers || {};
  const listPrice = offer.price || offer.lowPrice || null;
  const { address, city, state, zip } = parseAddress({}, jsonLd);

  if (!listPrice) {
    warnings.push('Limited data from JSON-LD only — verify all fields.');
  }

  return {
    sourceUrl,
    sourceSite: 'zillow',
    status: 'active',
    address,
    city,
    state,
    zip,
    listPrice: listPrice ? Math.round(Number(listPrice)) : null,
    isVacantLot: false,
    photoUrls: jsonLd.image ? (Array.isArray(jsonLd.image) ? jsonLd.image : [jsonLd.image]) : [],
    rawScrapedData,
  };
}

function isBlockedHtml(html) {
  const lower = html.toLowerCase();
  return lower.includes('captcha')
    || lower.includes('px-captcha')
    || lower.includes('access denied')
    || lower.includes('please verify you are a human');
}

async function fetchHtmlWithFetch(sourceUrl) {
  const response = await fetch(sourceUrl, { headers: FETCH_HEADERS });

  if (!response.ok) {
    throw new Error(`Zillow returned HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchZillowHtml(sourceUrl) {
  const method = (process.env.ZILLOW_FETCH_METHOD || 'puppeteer').toLowerCase();

  if (method === 'fetch') {
    return { html: await fetchHtmlWithFetch(sourceUrl), fetchMethod: 'fetch' };
  }

  try {
    const html = await fetchHtmlWithPuppeteer(sourceUrl);
    return { html, fetchMethod: 'puppeteer' };
  } catch (puppeteerError) {
    if (isPuppeteerDebugMode()) {
      throw new Error(`Puppeteer failed in debug mode: ${puppeteerError.message}`);
    }

    console.warn('Puppeteer fetch failed, trying plain fetch:', puppeteerError.message);

    try {
      const html = await fetchHtmlWithFetch(sourceUrl);
      return { html, fetchMethod: 'fetch-fallback' };
    } catch (fetchError) {
      throw new Error(
        `Could not load Zillow page (puppeteer: ${puppeteerError.message}; fetch: ${fetchError.message})`,
      );
    }
  }
}

function parseZillowHtml(html, sourceUrl, warnings) {
  if (isBlockedHtml(html)) {
    throw new Error('Zillow blocked the request (captcha). Enter listing details manually for now.');
  }

  const nextData = extractNextData(html);
  if (nextData) {
    const property = extractPropertyFromNextData(nextData);
    if (property) {
      return mapPropertyToFields(property, sourceUrl, { nextDataSnippet: true }, warnings);
    }
    warnings.push('Found Zillow page data but could not locate property details.');
  }

  const jsonLd = extractJsonLd(html);
  if (jsonLd) {
    return mapJsonLdToFields(jsonLd, sourceUrl, { jsonLd }, warnings);
  }

  return null;
}

export function parseZillowFromPaste({ sourceUrl, pastedData }) {
  if (!pastedData?.trim()) {
    throw new Error('Pasted data is required');
  }

  const warnings = [];
  const normalizedUrl = sourceUrl?.trim() ? normalizeZillowUrl(sourceUrl.trim()) : '';
  const trimmed = pastedData.trim();
  let fields = null;
  let fetchMethod = 'browser-paste-json';

  if (trimmed.startsWith('<')) {
    fetchMethod = 'browser-paste-html';
    fields = parseZillowHtml(trimmed, normalizedUrl, warnings);
  } else {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      throw new Error('Pasted data is not valid JSON or HTML. Use the console snippet on the Zillow listing page.');
    }

    const property = extractPropertyFromNextData(parsed);
    if (property) {
      fields = mapPropertyToFields(property, normalizedUrl, { compactPaste: true }, warnings);
    }
  }

  if (!fields) {
    throw new Error('Could not parse pasted Zillow data. Make sure you copied from a fully loaded listing page.');
  }

  if (normalizedUrl) {
    fields.sourceUrl = normalizedUrl;
  }

  fields.rawScrapedData = {
    ...fields.rawScrapedData,
    fetchMethod,
  };

  return {
    fields,
    warnings,
    sourceSite: 'zillow',
    fetchMethod,
  };
}

export async function fetchZillowListing(urlString) {
  const sourceUrl = normalizeZillowUrl(urlString);
  const warnings = [];

  const { html, fetchMethod } = await fetchZillowHtml(sourceUrl);
  const fields = parseZillowHtml(html, sourceUrl, warnings);

  if (!fields) {
    throw new Error('Could not parse Zillow listing. The page format may have changed — enter details manually.');
  }

  fields.rawScrapedData = {
    ...fields.rawScrapedData,
    fetchMethod,
  };

  if (fetchMethod === 'fetch-fallback') {
    warnings.push('Loaded via plain HTTP fallback — some fields may be missing.');
  }

  return {
    fields,
    warnings,
    sourceSite: 'zillow',
    fetchMethod,
  };
}

export function detectSourceSite(urlString) {
  try {
    const url = new URL(urlString);
    if (url.hostname.includes('zillow.com')) {
      return 'zillow';
    }
  } catch {
    return null;
  }
  return null;
}
