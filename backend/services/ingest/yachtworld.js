import * as cheerio from 'cheerio';
import { fetchHtmlWithPuppeteer, isPuppeteerDebugMode } from './browser.js';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const STATUS_HINTS = [
  { match: /sale pending|pending/i, status: 'pending' },
  { match: /sold|under offer/i, status: 'sold' },
  { match: /off.?market|removed|inactive/i, status: 'off_market' },
];

export function isYachtWorldUrl(urlString) {
  try {
    const { hostname } = new URL(urlString);
    return hostname === 'yachtworld.com'
      || hostname === 'www.yachtworld.com'
      || hostname.endsWith('.yachtworld.com');
  } catch {
    return false;
  }
}

export function normalizeYachtWorldUrl(urlString) {
  const url = new URL(urlString);
  if (!isYachtWorldUrl(urlString)) {
    throw new Error('URL must be a YachtWorld listing (yachtworld.com)');
  }
  return url.toString();
}

export function extractYachtWorldListingId(urlString) {
  try {
    const { pathname } = new URL(urlString);
    const yachtMatch = pathname.match(/\/(?:yacht|boat)\/[^/]*?-(\d+)\/?$/i);
    if (yachtMatch) {
      return yachtMatch[1];
    }
    const bare = pathname.match(/\/(\d{5,})\/?$/);
    return bare?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Parse year/make/model from URLs like /yacht/1998-catalina-320-3843740/ */
export function parseYachtWorldSlug(urlString) {
  try {
    const { pathname } = new URL(urlString);
    const match = pathname.match(/\/(?:yacht|boat)\/(\d{4})-([a-z0-9-]+)-(\d+)\/?/i);
    if (!match) {
      return null;
    }

    const year = Number(match[1]);
    const listingId = match[3];
    const tokens = match[2].split('-').filter(Boolean);
    if (!tokens.length) {
      return { year, listingId, make: null, model: null };
    }

    // Common pattern: make(-make)? model tokens; treat first token(s) as make when short.
    const make = titleCase(tokens[0]);
    const model = tokens.slice(1).map(titleCase).join(' ') || null;
    return {
      year: Number.isFinite(year) ? year : null,
      make,
      model,
      listingId,
    };
  } catch {
    return null;
  }
}

function titleCase(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

/** Prefer a true model code over page titles like "1971 Pearson 33 | 33ft". */
function cleanBoatModel(rawModel, make, year) {
  if (rawModel == null) return null;
  let model = String(rawModel).replace(/\s+/g, ' ').trim();
  if (!model) return null;

  // Drop trailing " | 33ft" style suffixes from YachtWorld H1 titles.
  model = model.replace(/\s*\|\s*[0-9.]+\s*(ft|m)\b.*$/i, '').trim();

  if (year != null && /^\d{4}\b/.test(model)) {
    model = model.replace(/^\d{4}\s*/, '').trim();
  }

  if (make) {
    const makeRe = new RegExp(`^${make.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    if (makeRe.test(model)) {
      model = model.replace(makeRe, '').trim();
    } else if (model.toLowerCase().startsWith(make.toLowerCase())) {
      model = model.slice(make.length).trim();
    }
  }

  return model || null;
}

function hasRichYachtWorldPayload(html) {
  return typeof html === 'string'
    && /var\s+__REDUX_STATE__\s*=/.test(html);
}

export function guessYachtWorldUrlFromHtml(html) {
  if (!html || typeof html !== 'string') return null;

  const patterns = [
    /property=["']og:url["'][^>]*content=["']([^"']+)["']/i,
    /content=["']([^"']+)["'][^>]*property=["']og:url["']/i,
    /rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    /href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
    /"url"\s*:\s*"(https:\/\/(?:www\.)?yachtworld\.com\/yacht\/[^"]+)"/i,
    /https:\/\/(?:www\.)?yachtworld\.com\/yacht\/[a-z0-9-]+\/?/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1] || match?.[0];
    if (candidate && isYachtWorldUrl(candidate)) {
      try {
        return normalizeYachtWorldUrl(candidate);
      } catch {
        // continue
      }
    }
  }

  return null;
}

function numericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function intValue(value) {
  const parsed = numericValue(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return null;
}

function metersToFeet(meters) {
  const value = numericValue(meters);
  if (value == null) return null;
  return Math.round(value * 3.28084 * 10) / 10;
}

function currencyAmount(map) {
  if (map == null) return null;
  if (typeof map === 'number' || typeof map === 'string') {
    return intValue(map);
  }
  if (typeof map !== 'object') return null;
  return intValue(map.USD ?? map.usd ?? map.EUR ?? map.GBP ?? Object.values(map)[0]);
}

function extractPrice(node) {
  if (node == null) return null;
  if (typeof node === 'number') return intValue(node);
  if (typeof node === 'string') return intValue(node);
  if (typeof node !== 'object') return null;

  // YachtWorld Redux: { type: { amount: { USD: 19000 } } }
  const fromCurrencyMap = currencyAmount(node.type?.amount)
    ?? currencyAmount(node.type?.baseAmount)
    ?? currencyAmount(node.amount)
    ?? currencyAmount(node);
  if (fromCurrencyMap != null) {
    return fromCurrencyMap;
  }

  return intValue(
    node.value
      ?? node.price
      ?? node.formatted
      ?? node.label,
  );
}

function extractLengthFt(node) {
  if (!node || typeof node !== 'object') {
    return numericValue(node);
  }

  const lengths = node.specifications?.dimensions?.lengths
    ?? node.dimensions?.lengths
    ?? node.lengths;
  const feet = numericValue(
    node.lengthFt
      ?? node.boatLengthFt
      ?? node.loaFt
      ?? node.LOA
      ?? node.loa
      ?? lengths?.overall?.ft
      ?? lengths?.nominal?.ft
      ?? node.length
      ?? node.boatLength
      ?? lengths?.overall
      ?? lengths?.nominal,
  );
  if (feet != null && feet < 200) {
    return feet;
  }

  const meters = numericValue(
    node.lengthMeters
      ?? node.boatLengthMeters
      ?? node.loaMeters
      ?? node.lengthM
      ?? lengths?.overall?.m
      ?? lengths?.nominal?.m,
  );
  return metersToFeet(meters);
}

/** Prefer feet from `{ ft, m }` dimension objects. */
function dimensionFeet(value) {
  if (value == null) return null;
  if (typeof value === 'object') {
    const ft = numericValue(value.ft ?? value.feet);
    if (ft != null) return ft;
    return metersToFeet(value.m ?? value.meters);
  }
  return numericValue(value);
}

function weightPounds(value) {
  if (value == null) return null;
  if (typeof value === 'object') {
    const lb = numericValue(value.lb ?? value.lbs ?? value.pounds);
    if (lb != null) return lb;
    const kg = numericValue(value.kg);
    return kg == null ? null : Math.round(kg * 2.20462);
  }
  return numericValue(value);
}

function capacityGallons(tanks) {
  if (!Array.isArray(tanks) || tanks.length === 0) return null;
  let total = 0;
  let found = false;
  for (const tank of tanks) {
    const qty = numericValue(tank?.quantity) || 1;
    const gal = numericValue(
      tank?.capacity?.gal
        ?? tank?.capacity?.gallons
        ?? tank?.capacity
        ?? tank?.gal,
    );
    if (gal == null) continue;
    found = true;
    total += gal * qty;
  }
  return found ? Math.round(total * 10) / 10 : null;
}

function humanizeKeelType(raw) {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const map = {
    'kt-fin': 'Fin',
    'kt-full': 'Full',
    'kt-wing': 'Wing',
    'kt-bulb': 'Bulb',
    'kt-centerboard': 'Centerboard',
    'kt-daggerboard': 'Daggerboard',
    'kt-twin': 'Twin',
    'kt-lifting': 'Lifting',
  };
  const key = text.toLowerCase();
  if (map[key]) return map[key];
  return text.replace(/^kt-/i, '').replace(/[-_]/g, ' ');
}

function extractBoatSpecs(boat = {}) {
  const dims = boat.specifications?.dimensions ?? boat.dimensions ?? {};
  const lengths = dims.lengths ?? {};
  const weights = boat.specifications?.weights ?? boat.weights ?? {};
  const tanks = boat.tanks ?? {};
  const engines = boat.propulsion?.engines
    ?? boat.engines
    ?? (boat.engine ? [boat.engine] : []);
  const primaryEngine = Array.isArray(engines) ? engines[0] : null;

  return {
    lwlFt: dimensionFeet(lengths.waterline),
    beamFt: dimensionFeet(dims.beam),
    draftFt: dimensionFeet(dims.maxDraft ?? dims.draft),
    draftMinFt: dimensionFeet(dims.driveUpDraft ?? dims.minDraft),
    displacementLb: weightPounds(weights.displacement),
    ballastLb: weightPounds(weights.ballast),
    engineMake: firstString(primaryEngine?.make, primaryEngine?.manufacturer),
    engineModel: firstString(primaryEngine?.model),
    engineHp: numericValue(primaryEngine?.power?.hp ?? primaryEngine?.hp),
    engineHours: numericValue(primaryEngine?.hours),
    fuelGal: capacityGallons(tanks.fuel),
    waterGal: capacityGallons(tanks.freshWater ?? tanks.water),
    hullMaterial: firstString(boat.hull?.material, boat.hullMaterial),
    keelType: humanizeKeelType(firstString(boat.hull?.keelType, boat.keelType)),
  };
}

function extractPhotos(node) {
  const urls = [];
  const seen = new Set();

  const push = (url) => {
    if (!url || typeof url !== 'string') return;
    const trimmed = url.trim();
    if (!trimmed.startsWith('http') || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  const walk = (value, depth = 0) => {
    if (!value || depth > 6) return;
    if (typeof value === 'string') {
      push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, depth + 1));
      return;
    }
    if (typeof value === 'object') {
      push(value.url || value.src || value.uri || value.mediaUrl || value.large || value.medium);
      if (value.media) walk(value.media, depth + 1);
      if (value.images) walk(value.images, depth + 1);
      if (value.photos) walk(value.photos, depth + 1);
    }
  };

  walk(node?.media ?? node?.images ?? node?.photos ?? node?.image);
  return urls.slice(0, 40);
}

function inferPropulsion(boat) {
  const haystack = [
    boat?.boatCategoryCode,
    boat?.type,
    boat?.class,
    boat?.classes,
    boat?.boatClass,
    boat?.category,
    boat?.hullType,
    boat?.propulsion,
    boat?.fuelType,
    boat?.name,
  ]
    .flat()
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!haystack) {
    return 'sail';
  }
  if (/\bsail|\bsailing|\bsailboat|\bketch|\bsloop|\bcutter|\byawl|\bsail-/.test(haystack)) {
    return 'sail';
  }
  if (/\bpower|\bmotor|\bsportfish|\btrawler|\bcenter console|\boutboard|\bpowerboat/.test(haystack)) {
    return 'motor';
  }
  // Avoid bare "cruiser" — YachtWorld uses sail-cruiser for sailboats.
  if (/\bcruiser\b/.test(haystack) && !/\bsail/.test(haystack)) {
    return 'motor';
  }
  return 'other';
}

function inferStatus(boat) {
  const haystack = [boat?.status, boat?.saleStatus, boat?.listingStatus, boat?.availability]
    .filter(Boolean)
    .join(' ');
  for (const hint of STATUS_HINTS) {
    if (hint.match.test(haystack)) {
      return hint.status;
    }
  }
  return 'active';
}

function extractLocation(boat) {
  const loc = boat?.location || boat?.boatLocation || boat?.boatLocationPortal || {};
  const addr = loc.address && typeof loc.address === 'object' ? loc.address : {};
  const city = firstString(
    loc.city,
    loc.cityName,
    addr.city,
    boat?.city,
    typeof loc.address === 'string' ? loc.address.split(',')[0] : null,
    typeof loc === 'string' ? loc.split(',')[0] : null,
  );
  const state = firstString(
    loc.state,
    loc.countrySubDivisionCode,
    loc.subdivision,
    addr.subdivision,
    addr.state,
    boat?.state,
  );
  const country = firstString(loc.country, loc.countryCode, addr.country, boat?.country);
  const address = firstString(
    typeof loc.address === 'string' ? loc.address : null,
    loc.label,
    loc.name,
  );
  const coords = Array.isArray(loc.coordinates) ? loc.coordinates : null;

  return {
    address,
    city,
    state: state && state.length <= 3 ? state.toUpperCase() : state,
    country,
    // YachtWorld coordinates are [lng, lat]
    latitude: numericValue(coords?.[1] ?? loc.latitude),
    longitude: numericValue(coords?.[0] ?? loc.longitude),
    zip: firstString(addr.postalCode, loc.postalCode, boat?.zip),
  };
}

export function mapBoatRecord(boat, { sourceUrl, listingId = null } = {}) {
  const location = extractLocation(boat || {});
  const make = firstString(boat?.make, boat?.manufacturer, boat?.brand?.name, boat?.brand);
  const yearBuilt = intValue(boat?.year ?? boat?.yearBuilt ?? boat?.boatYear);
  const rawModel = firstString(boat?.model, boat?.modelRange, boat?.boatModel);
  // Only fall back to name/title after cleaning — raw titles include year/make/length.
  const model = cleanBoatModel(rawModel, make, yearBuilt)
    || cleanBoatModel(firstString(boat?.name, boat?.boatName), make, yearBuilt);
  const listPrice = extractPrice(boat?.price ?? boat?.normPrice ?? boat?.offers);
  const lengthFt = extractLengthFt(boat);
  const specs = extractBoatSpecs(boat || {});
  const photos = extractPhotos(boat);
  const id = firstString(
    boat?.id,
    boat?.boatId,
    boat?.listingId,
    listingId,
  );

  return {
    sourceUrl,
    sourceSite: 'yachtworld',
    mlsNumber: id,
    status: inferStatus(boat),
    address: location.address,
    city: location.city,
    state: location.state,
    zip: location.zip ?? null,
    latitude: numericValue(boat?.latitude ?? location.latitude),
    longitude: numericValue(boat?.longitude ?? location.longitude),
    listPrice,
    soldPrice: null,
    yearBuilt,
    make,
    model,
    lengthFt,
    ...specs,
    propulsion: inferPropulsion(boat),
    photoUrls: photos.length ? photos : null,
    rawScrapedData: {
      provider: 'yachtworld',
      listingId: id,
      boat,
    },
  };
}

/** Rehydrate listing fields from a saved YachtWorld raw payload (paste import). */
export function listingFieldsFromYachtWorldRaw(rawScrapedData, sourceUrl = null) {
  const boat = rawScrapedData?.boat;
  if (!boat || typeof boat !== 'object') return null;
  return mapBoatRecord(boat, {
    sourceUrl: sourceUrl || null,
    listingId: rawScrapedData?.listingId ?? null,
  });
}

function extractNextData(html) {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractJsonObjectAfterMarker(html, marker) {
  const start = html.indexOf(marker);
  if (start < 0) return null;

  let i = start + marker.length;
  while (i < html.length && /\s/.test(html[i])) i += 1;
  if (html[i] !== '{' && html[i] !== '[') return null;

  const open = html[i];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let j = i; j < html.length; j += 1) {
    const ch = html[j];
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
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(i, j + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

function extractReduxState(html) {
  return extractJsonObjectAfterMarker(html, 'var __REDUX_STATE__=')
    || extractJsonObjectAfterMarker(html, 'window.__REDUX_STATE__=');
}

function extractJsonLdBoats(html) {
  const matches = [...html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const boats = [];

  for (const match of matches) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const type = item?.['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (types.some((t) => ['Product', 'Vehicle', 'Boat', 'Offer', 'Car'].includes(t))) {
          boats.push(item);
        }
      }
    } catch {
      // continue
    }
  }

  return boats;
}

function looksLikeBoatRecord(node) {
  if (!node || typeof node !== 'object' || Array.isArray(node)) {
    return false;
  }

  // Engine/equipment nodes often have make/model/year — skip them.
  if ((node.propellerType != null || node.propellerMaterial != null || node.driveType != null)
    && !node.specifications
    && !node.portalLink
    && !(node.location && typeof node.location === 'object' && node.location.address)) {
    return false;
  }

  const hasIdentity = Boolean(node.make || node.manufacturer || node.model || node.boatName);
  const hasSpec = node.year != null
    || node.yearBuilt != null
    || node.lengthFt != null
    || node.boatLengthFt != null
    || node.length != null
    || node.price != null
    || node.normPrice != null
    || node.specifications != null;
  return hasIdentity && hasSpec;
}

function findBoatInPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.app?.data && looksLikeBoatRecord(payload.app.data)) {
    return payload.app.data;
  }
  if (looksLikeBoatRecord(payload)) {
    return payload;
  }
  return deepFindBoatRecord(payload);
}

function deepFindBoatRecord(node, depth = 0, maxDepth = 12) {
  if (!node || typeof node !== 'object' || depth > maxDepth) {
    return null;
  }

  if (looksLikeBoatRecord(node)) {
    return node;
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      const found = deepFindBoatRecord(value, depth + 1, maxDepth);
      if (found) return found;
    }
  }

  return null;
}

function extractEmbeddedJsonBlobs(html) {
  const blobs = [];
  const redux = extractReduxState(html);
  if (redux) blobs.push(redux);

  const patterns = [
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i,
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});/i,
    /"boatDetails"\s*:\s*(\{[\s\S]*?\})\s*[,}]/i,
    /"listing"\s*:\s*(\{[\s\S]*?\})\s*[,}]/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      blobs.push(JSON.parse(match[1]));
    } catch {
      // ignore malformed
    }
  }

  return blobs;
}

function parseSpecRows($) {
  const specs = {};
  $('tr, .datatable-row, .boat-details-row, li').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const match = text.match(/^([A-Za-z /-]{2,40})\s*[:|]?\s*(.+)$/);
    if (!match) return;
    const key = match[1].trim().toLowerCase();
    const value = match[2].trim();
    if (key.includes('length') || key === 'loa') specs.length = value;
    if (key.includes('year')) specs.year = value;
    if (key === 'make' || key.includes('manufacturer') || key.includes('builder')) specs.make = value;
    if (key === 'model') specs.model = value;
    if (key.includes('price') || key.includes('asking')) specs.price = value;
    if (key.includes('location') || key.includes('city')) specs.location = value;
    if (key.includes('class') || key.includes('type') || key.includes('category')) specs.class = value;
  });
  return specs;
}

function boatFromHtmlFallback(html, sourceUrl) {
  const $ = cheerio.load(html);
  const specs = parseSpecRows($);
  const title = $('h1').first().text().replace(/\s+/g, ' ').trim()
    || $('title').first().text().replace(/\s+/g, ' ').trim();

  const slug = parseYachtWorldSlug(sourceUrl);
  const locationText = specs.location
    || $('.next-previous-listing-location').first().text().replace(/\s+/g, ' ').trim()
    || $('[data-testid="boat-location"], .location, .boat-location').first().text().replace(/\s+/g, ' ').trim();

  let city = null;
  let state = null;
  if (locationText) {
    const parts = locationText.split(',').map((part) => part.trim()).filter(Boolean);
    city = parts[0] || null;
    state = parts[1] || null;
  }

  const priceText = specs.price
    || $('.next-previous-listing-price').first().text().replace(/\s+/g, ' ').trim()
    || $('[data-testid="price"], .price, .payment-total').first().text();

  let lengthText = specs.length || null;
  if (!lengthText) {
    $('.data-details-cell-content p, .data-details-cell p').each((_, el) => {
      const row = $(el).text().replace(/\s+/g, ' ').trim();
      const match = row.match(/Length Overall\s*:?\s*([0-9.]+)\s*(ft|m)?/i)
        || row.match(/^Length\s*:?\s*([0-9.]+)\s*(ft|m)?/i);
      if (match) {
        lengthText = match[2]?.toLowerCase() === 'm'
          ? metersToFeet(match[1])
          : match[1];
        return false;
      }
      return undefined;
    });
  }
  if (!lengthText && title) {
    const titleLen = title.match(/\|\s*([0-9.]+)\s*ft\b/i);
    if (titleLen) lengthText = titleLen[1];
  }

  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src?.includes('http') && !src.includes('logo') && !src.includes('icon')) {
      images.push(src.split('?')[0]);
    }
  });

  return {
    make: specs.make || slug?.make || null,
    model: specs.model || slug?.model || null,
    year: specs.year || slug?.year || null,
    price: priceText || null,
    lengthFt: lengthText || null,
    city,
    state,
    class: specs.class || null,
    name: title || null,
    images: [...new Set(images)].slice(0, 20),
    id: extractYachtWorldListingId(sourceUrl),
  };
}

/**
 * Parse YachtWorld listing HTML (or embedded JSON paste) into listing fields.
 */
export function parseYachtWorldHtml(html, sourceUrl) {
  const warnings = [];
  const normalizedUrl = normalizeYachtWorldUrl(sourceUrl);
  const listingId = extractYachtWorldListingId(normalizedUrl);
  const slug = parseYachtWorldSlug(normalizedUrl);

  let boat = null;

  // Live YachtWorld pages ship Redux state (not Next.js __NEXT_DATA__).
  const redux = extractReduxState(html);
  if (redux) {
    boat = findBoatInPayload(redux);
  }

  if (!boat) {
    const nextData = extractNextData(html);
    if (nextData) {
      boat = findBoatInPayload(nextData);
    }
  }

  if (!boat) {
    for (const blob of extractEmbeddedJsonBlobs(html)) {
      boat = findBoatInPayload(blob);
      if (boat) break;
    }
  }

  if (!boat) {
    const jsonLd = extractJsonLdBoats(html);
    if (jsonLd[0]) {
      const product = jsonLd[0];
      boat = {
        make: product.brand?.name || product.brand || slug?.make,
        // Prefer an explicit model field; product.name is usually the full listing title.
        model: product.model || slug?.model || null,
        year: product.vehicleModelDate || product.productionDate || slug?.year,
        price: product.offers?.price || product.offers?.[0]?.price,
        image: product.image,
        name: product.name,
        id: product.productID || product.sku || listingId,
        location: product.offers?.availableAtOrFrom?.address,
        type: product.category || product.vehicleModelDate || null,
      };
    }
  }

  if (!boat) {
    try {
      const asJson = JSON.parse(html);
      boat = findBoatInPayload(asJson);
    } catch {
      // not raw JSON
    }
  }

  if (!boat) {
    boat = boatFromHtmlFallback(html, normalizedUrl);
    warnings.push('Used page text fallback — double-check make, length, and price.');
  }

  if (slug) {
    boat = {
      ...boat,
      make: boat.make || slug.make,
      model: boat.model || slug.model,
      year: boat.year || slug.year,
      id: boat.id || slug.listingId || listingId,
    };
  }

  const fields = mapBoatRecord(boat, { sourceUrl: normalizedUrl, listingId });

  if (!fields.listPrice) {
    warnings.push('Could not find a list price — enter it manually.');
  }
  if (!fields.lengthFt) {
    warnings.push('Could not find length — enter it manually.');
  }
  if (!fields.make && !fields.model) {
    warnings.push('Could not find make/model — enter them manually.');
  }
  if (!fields.city && !fields.state) {
    warnings.push('Could not find location — enter city/state manually.');
  }
  if (!fields.photoUrls?.length) {
    warnings.push('No photos found — you can add them later.');
  }

  return {
    fields,
    warnings,
    sourceSite: 'yachtworld',
  };
}

export function parseYachtWorldFromPaste({ pastedData }) {
  if (!pastedData?.trim()) {
    throw new Error('Pasted page data is required');
  }

  const resolvedUrl = guessYachtWorldUrlFromHtml(pastedData);
  if (!resolvedUrl) {
    throw new Error(
      'Could not find a YachtWorld listing URL inside the pasted page source.',
    );
  }

  // Parse the pasted HTML only — never fetch the listing URL.
  const result = parseYachtWorldHtml(pastedData, resolvedUrl);
  const needsPaste = Boolean(
    !result.fields?.listPrice
    || !result.fields?.lengthFt
    || (!result.fields?.city && !result.fields?.state),
  );
  return {
    ...result,
    fetchMethod: 'paste',
    needsPaste,
  };
}

async function fetchHtmlPlain(url) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    redirect: 'follow',
  });

  const html = await response.text();
  return { ok: response.ok, status: response.status, html };
}

function looksBlocked(html, status) {
  if (status === 403 || status === 503) return true;
  if (!html) return true;

  const hasListingSignal = /var __REDUX_STATE__\s*=|__NEXT_DATA__|application\/ld\+json|yacht\/\d{4}-/i.test(html);
  if (hasListingSignal) {
    return false;
  }

  // Real challenge pages — not Cloudflare analytics beacons on normal pages.
  return /cf-challenge|cf-browser-verification|just a moment|security verification|attention required|enable javascript and cookies|captcha-delivery|challenge-platform/i.test(html);
}

/**
 * Fetch a YachtWorld listing URL and parse it.
 * When Cloudflare/bot protection blocks the full payload, still parse whatever HTML we got
 * (JSON-LD / slug / partial fields) rather than failing the URL flow.
 */
export async function fetchListingFromYachtWorld(urlString) {
  const sourceUrl = normalizeYachtWorldUrl(urlString);
  const warnings = [];
  let html = null;
  let fetchMethod = 'fetch';

  try {
    const plain = await fetchHtmlPlain(sourceUrl);
    if (!looksBlocked(plain.html, plain.status) && hasRichYachtWorldPayload(plain.html)) {
      html = plain.html;
    } else if (!looksBlocked(plain.html, plain.status)) {
      // Thin page (often JSON-LD only) — try browser, then fall back to parsing this.
      console.info('[yachtworld] Direct fetch lacked Redux listing payload; falling back to browser render.');
      html = plain.html;
    } else {
      console.info('[yachtworld] Direct fetch blocked; falling back to browser render.');
    }
  } catch (error) {
    console.info(`[yachtworld] Direct fetch failed (${error.message}); falling back to browser render.`);
  }

  const thinHtml = html && !hasRichYachtWorldPayload(html) ? html : null;
  if (!html || thinHtml) {
    try {
      const browserHtml = await fetchHtmlWithPuppeteer(sourceUrl);
      fetchMethod = 'puppeteer';
      if (isPuppeteerDebugMode()) {
        console.info('[yachtworld] Fetched with visible browser (local debug mode).');
      }
      if (!looksBlocked(browserHtml, 200)) {
        html = browserHtml;
      } else if (!html) {
        throw new Error('YachtWorld still showed a security check page.');
      } else {
        console.warn('[yachtworld] Browser still blocked; using thin direct-fetch HTML.');
      }
      if (html && !hasRichYachtWorldPayload(html)) {
        console.warn('[yachtworld] Browser HTML missing Redux payload; parsing partial page data.');
      }
    } catch (error) {
      console.warn('[yachtworld] Browser fetch failed:', error.message);
      if (!html) {
        const slug = parseYachtWorldSlug(sourceUrl);
        if (slug?.make || slug?.year) {
          const fields = mapBoatRecord({
            make: slug.make,
            model: slug.model,
            year: slug.year,
            id: slug.listingId,
          }, { sourceUrl, listingId: slug.listingId });

          return {
            fields,
            warnings: [
              'Could not load the full listing page. Filled what we could from the link.',
            ],
            sourceSite: 'yachtworld',
            fetchMethod: 'url-slug',
            needsPaste: true,
          };
        }

        throw new Error(
          'Could not import from that YachtWorld link.',
        );
      }
    }
  }

  const parsed = parseYachtWorldHtml(html, sourceUrl);
  const needsPaste = Boolean(
    !parsed.fields?.listPrice
    || !parsed.fields?.lengthFt
    || (!parsed.fields?.city && !parsed.fields?.state),
  );
  return {
    ...parsed,
    warnings: [...warnings, ...parsed.warnings],
    fetchMethod,
    needsPaste,
  };
}
