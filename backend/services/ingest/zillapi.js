import { logIngestApiCall } from './apiUsage.js';
import { detectSourceSite } from './zillow.js';

const ZILLAPI_BASE = 'https://api.zillapi.com/v1';
const PROVIDER = 'zillapi';
const MAX_PHOTOS = 24;

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
  ACTIVE: 'active',
  INACTIVE: 'off_market',
};

function getApiKey() {
  return process.env.ZILLAPI_KEY?.trim() || null;
}

export function isZillapiConfigured() {
  return Boolean(getApiKey());
}

function normalizeZillowUrl(urlString) {
  const url = new URL(urlString);
  if (!detectSourceSite(urlString)) {
    throw new Error('URL must be a Zillow listing (zillow.com)');
  }
  return url.toString();
}

function mapHomeStatus(homeStatus) {
  if (!homeStatus) return 'active';
  return STATUS_MAP[String(homeStatus).toUpperCase()] || 'active';
}

function sqftToAcres(sqft) {
  if (!sqft || sqft <= 0) return null;
  return Math.round((sqft / 43560) * 100) / 100;
}

function parseLotSize(property) {
  const lotSize = property.lotSize ?? property.lotAreaValue;
  const lotUnit = (property.lotAreaUnit || '').toLowerCase();

  if (lotSize == null) {
    return { sqftLot: null, acres: null };
  }

  if (typeof lotSize === 'number') {
    if (lotUnit.includes('acre') || lotSize < 1000) {
      const acres = lotUnit.includes('acre') || lotSize < 100 ? lotSize : sqftToAcres(lotSize);
      const sqftLot = lotUnit.includes('acre') || lotSize < 100
        ? Math.round(lotSize * 43560)
        : Math.round(lotSize);
      return {
        sqftLot: lotUnit.includes('acre') || lotSize < 100 ? sqftLot : Math.round(lotSize),
        acres: lotUnit.includes('acre') || lotSize < 100 ? lotSize : sqftToAcres(lotSize),
      };
    }
    return { sqftLot: Math.round(lotSize), acres: sqftToAcres(lotSize) };
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

  return { sqftLot: null, acres: null };
}

function detectVacantLot(property) {
  const homeType = String(property.homeType || property.propertyType || '').toUpperCase();
  if (VACANT_HOME_TYPES.has(homeType)) return true;
  if (homeType.includes('LOT') || homeType.includes('LAND')) return true;

  const haystack = JSON.stringify(property).toLowerCase();
  if (haystack.includes('vacant land') || haystack.includes('lot/land')) {
    return true;
  }

  const homeStatus = String(property.homeStatus || '').toUpperCase();
  if (homeStatus === 'FOR_SALE' && !property.livingArea && property.bedrooms == null) {
    return haystack.includes('vacant') || haystack.includes('land');
  }

  return false;
}

function detectWaterfront(property) {
  const haystack = JSON.stringify(property).toLowerCase();
  const waterfront = haystack.includes('waterfront')
    || haystack.includes('lake front')
    || haystack.includes('lakefront')
    || haystack.includes('on lake');

  if (!waterfront) {
    return { waterfront: false, waterfrontType: null };
  }

  let waterfrontType = 'waterfront';
  if (haystack.includes('lake')) waterfrontType = 'lake';
  else if (haystack.includes('river')) waterfrontType = 'river';
  else if (haystack.includes('creek')) waterfrontType = 'creek';

  return { waterfront: true, waterfrontType };
}

function parseAddress(property) {
  const address = property.address;

  if (!address) {
    return {
      address: property.streetAddress || null,
      city: property.city || null,
      state: property.state || 'WI',
      zip: property.zipcode || property.zip || null,
    };
  }

  if (typeof address === 'string') {
    return { address, city: property.city || null, state: property.state || 'WI', zip: property.zip || null };
  }

  return {
    address: address.streetAddress || address.street || null,
    city: address.city || address.addressLocality || null,
    state: address.state || address.addressRegion || 'WI',
    zip: address.zipcode || address.postalCode || address.zip || null,
  };
}

function photoUrlFromEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string' && entry.startsWith('http')) return entry;

  if (typeof entry === 'object') {
    if (typeof entry.url === 'string' && entry.url.startsWith('http')) return entry.url;
    if (typeof entry.href === 'string' && entry.href.startsWith('http')) return entry.href;

    const jpegs = entry.mixedSources?.jpeg;
    if (Array.isArray(jpegs) && jpegs.length) {
      const best = jpegs.reduce((current, candidate) => (
        (candidate.width ?? 0) > (current?.width ?? 0) ? candidate : current
      ), null);
      if (best?.url) return best.url;
    }
  }

  return null;
}

function extractPhotoUrls(photosPayload) {
  const candidates = [];

  if (Array.isArray(photosPayload)) {
    candidates.push(...photosPayload);
  } else if (photosPayload && typeof photosPayload === 'object') {
    for (const key of ['photos', 'images', 'items', 'data']) {
      if (Array.isArray(photosPayload[key])) {
        candidates.push(...photosPayload[key]);
      }
    }
  }

  const urls = candidates
    .map(photoUrlFromEntry)
    .filter((url) => typeof url === 'string' && url.startsWith('http'));

  return [...new Set(urls)].slice(0, MAX_PHOTOS);
}

function mapPropertyToFields(property, sourceUrl, photoUrls, rawScrapedData, warnings) {
  const { address, city, state, zip } = parseAddress(property);
  const { sqftLot, acres } = parseLotSize(property);
  const isVacantLot = detectVacantLot(property);
  const { waterfront, waterfrontType } = detectWaterfront(property);

  const listPrice = property.price
    ?? property.unformattedPrice
    ?? (typeof property.listPrice === 'number' ? property.listPrice : null);

  const sqftLiving = property.livingArea ?? property.squareFootage ?? null;
  const latitude = property.latitude ?? property.lat ?? null;
  const longitude = property.longitude ?? property.lng ?? property.lon ?? null;

  if (!listPrice) {
    warnings.push('Could not extract list price — enter manually.');
  }
  if (!address) {
    warnings.push('Could not extract address — enter manually.');
  }
  if (!photoUrls.length) {
    warnings.push('No photos returned — add manually or retry import.');
  }

  return {
    sourceUrl,
    sourceSite: 'zillow',
    mlsNumber: property.mlsid || property.mlsId || property.mlsNumber || null,
    status: mapHomeStatus(property.homeStatus || property.status),
    address,
    city,
    state,
    zip,
    latitude: latitude != null ? Number(latitude) : null,
    longitude: longitude != null ? Number(longitude) : null,
    listPrice: listPrice ? Math.round(Number(listPrice)) : null,
    soldPrice: property.lastSoldPrice ? Math.round(Number(property.lastSoldPrice)) : null,
    isVacantLot,
    bedrooms: property.bedrooms != null ? Number(property.bedrooms) : null,
    bathrooms: property.bathrooms != null ? Number(property.bathrooms) : null,
    sqftLiving: sqftLiving ? Math.round(Number(sqftLiving)) : null,
    sqftLot,
    acres,
    yearBuilt: property.yearBuilt ?? null,
    waterfront,
    waterfrontType,
    daysOnMarket: property.daysOnMarket ?? property.daysOnZillow ?? property.timeOnZillow ?? null,
    photoUrls,
    listingDate: property.datePosted || property.listedDate || null,
    rawScrapedData,
  };
}

async function callZillapi(path, { query = {}, context = {}, logMeta = {} }) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('ZillAPI is not configured. Set ZILLAPI_KEY on the server.');
  }

  const url = new URL(`${ZILLAPI_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  let response;
  let body = null;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });
    body = await response.json().catch(() => null);
  } catch (error) {
    await logIngestApiCall({
      ...context,
      provider: PROVIDER,
      endpoint: logMeta.endpoint || path,
      success: false,
      httpStatus: null,
      creditsCharged: false,
      errorCode: 'network_error',
      errorMessage: error.message,
      sourceUrl: logMeta.sourceUrl ?? null,
      zpid: logMeta.zpid ?? null,
    });
    throw new Error(`ZillAPI request failed: ${error.message}`);
  }

  const success = response.ok;
  const creditsCharged = success;
  const requestId = body?.request_id ?? body?.requestId ?? null;
  const errorCode = body?.error?.code || body?.code || (success ? null : `http_${response.status}`);
  const errorMessage = body?.error?.message || body?.message || (success ? null : response.statusText);

  await logIngestApiCall({
    ...context,
    provider: PROVIDER,
    endpoint: logMeta.endpoint || path,
    success,
    httpStatus: response.status,
    creditsCharged,
    errorCode,
    errorMessage,
    sourceUrl: logMeta.sourceUrl ?? null,
    zpid: logMeta.zpid ?? null,
    requestId,
  });

  if (!success) {
    if (response.status === 402) {
      throw new Error('ZillAPI credits exhausted. Top up your account or try again later.');
    }
    throw new Error(errorMessage || `ZillAPI returned HTTP ${response.status}`);
  }

  return { body, requestId };
}

export async function fetchListingFromZillapi(urlString, context = {}) {
  const sourceUrl = normalizeZillowUrl(urlString);
  const warnings = [];

  const { body: propertyResponse } = await callZillapi('/properties/by-url', {
    query: { url: sourceUrl },
    context,
    logMeta: { endpoint: 'properties/by-url', sourceUrl },
  });

  const property = propertyResponse?.data;
  if (!property || typeof property !== 'object') {
    throw new Error('ZillAPI returned no property data for this URL.');
  }

  const zpid = property.zpid != null ? String(property.zpid) : null;
  let photoUrls = extractPhotoUrls(property.photos || property.media?.images);
  let photoLookupBilled = 0;

  // Photos are a separate billed call — only fetch after property lookup succeeds.
  if (zpid) {
    try {
      const { body: photosResponse } = await callZillapi(`/properties/${zpid}/photos`, {
        context,
        logMeta: { endpoint: 'properties/photos', sourceUrl, zpid },
      });
      photoLookupBilled = 1;
      const fetchedPhotos = extractPhotoUrls(photosResponse?.data ?? photosResponse);
      if (fetchedPhotos.length) {
        photoUrls = fetchedPhotos;
      }
    } catch (error) {
      warnings.push(`Photos could not be loaded (${error.message}). Property details were imported.`);
    }
  } else {
    warnings.push('No ZPID in property response — photos were not fetched.');
  }

  const fields = mapPropertyToFields(
    property,
    sourceUrl,
    photoUrls,
    {
      provider: PROVIDER,
      fetchMethod: 'zillapi',
      zpid,
      propertyRequestId: propertyResponse?.request_id ?? null,
    },
    warnings,
  );

  return {
    fields,
    warnings,
    sourceSite: 'zillow',
    fetchMethod: 'zillapi',
    apiUsage: {
      propertyLookup: 1,
      photoLookup: photoLookupBilled,
    },
  };
}
