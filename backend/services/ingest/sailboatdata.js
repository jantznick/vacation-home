import * as cheerio from 'cheerio';
import { fetchHtmlWithPuppeteer } from './browser.js';

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

const SPEC_LABELS = [
  'Hull Type',
  'Rigging Type',
  'LOA',
  'LWL',
  'S.A. (reported)',
  'Beam',
  'Displacement',
  'Ballast',
  'Max Draft',
  'Construction',
  'First Built',
  'Last Built',
  '# Built',
  'Builder',
  'Designer',
  'Make',
  'Type',
  'HP',
  'Fuel',
  'Water',
  'S.A. / Displ.',
  'Bal. / Displ.',
  'Disp: / Len.',
  'Comfort Ratio',
  'Capsize Screening Formula',
  'Hull Speed',
];

export function isSailboatDataUrl(urlString) {
  try {
    const host = new URL(urlString).hostname.replace(/^www\./, '');
    return host === 'sailboatdata.com';
  } catch {
    return false;
  }
}

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function normalizeLabel(label) {
  return normalizeText(label).replace(/:$/, '');
}

function looksBlocked(html, status) {
  if (status === 403 || status === 503) return true;
  if (!html) return true;
  return /attention required|cf-error|just a moment|cloudflare|captcha/i.test(html)
    && !/sailboat specifications|first built|hull type/i.test(html);
}

function hasUsefulPayload(html) {
  return /sailboat specifications|hull type|first built|max draft/i.test(html || '');
}

async function fetchPlain(url) {
  const response = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
  const html = await response.text();
  return { status: response.status, html, finalUrl: response.url || url };
}

/**
 * Collect label/value pairs from common sailboatdata table layouts.
 */
export function extractSpecMap(html) {
  const $ = cheerio.load(html);
  const specs = {};

  const addPair = (rawLabel, rawValue) => {
    const label = normalizeLabel(rawLabel);
    const value = normalizeText(rawValue);
    if (!label || !value || label.length > 80) return;
    if (!specs[label]) {
      specs[label] = value;
    }
  };

  $('table tr').each((_, row) => {
    const $row = $(row);
    const th = $row.find('th').first();
    const tds = $row.find('td');

    if (th.length && tds.length) {
      addPair(th.text(), tds.first().text());
      return;
    }

    if (tds.length >= 2) {
      addPair(tds.eq(0).text(), tds.eq(1).text());
    }
  });

  $('dl').each((_, dl) => {
    const $dl = $(dl);
    $dl.find('dt').each((i, dt) => {
      const dd = $dl.find('dd').eq(i);
      addPair($(dt).text(), dd.text());
    });
  });

  return specs;
}

export function extractTitle(html) {
  const $ = cheerio.load(html);
  const h1 = normalizeText($('h1').first().text());
  if (h1 && !/attention required|just a moment/i.test(h1)) {
    return h1;
  }
  const title = normalizeText($('title').first().text())
    .replace(/\s*[-–|].*$/, '')
    .trim();
  return title || null;
}

export function extractNotes(html) {
  const $ = cheerio.load(html);
  const notes = [];

  $('h2, h3, h4').each((_, el) => {
    const heading = normalizeText($(el).text());
    if (!/^notes?$/i.test(heading)) return;

    let cursor = $(el).next();
    while (cursor.length && !cursor.is('h1,h2,h3,h4')) {
      const text = normalizeText(cursor.text());
      if (text && text.length > 3) {
        notes.push(text);
      }
      cursor = cursor.next();
    }
  });

  if (notes.length) {
    return notes.join('\n\n');
  }

  // Fallback: paragraph labeled Notes
  let fallback = null;
  $('p, div').each((_, el) => {
    const text = normalizeText($(el).text());
    if (/^notes?\s*:/i.test(text) && text.length > 10) {
      fallback = text.replace(/^notes?\s*:\s*/i, '');
    }
  });
  return fallback;
}

/**
 * Prefer a clean model label from "FIRST 36.7 (BENETEAU)" → "First 36.7".
 */
export function deriveModelName(title) {
  if (!title) return null;
  let name = normalizeText(title);
  name = name.replace(/\([^)]*\)\s*$/, '').trim();
  name = name.replace(/^sailboat\s+/i, '').trim();
  if (!name) return null;
  return name
    .split(' ')
    .map((part) => {
      if (/^\d/.test(part) || part.length <= 2) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

function pick(specs, ...labels) {
  for (const label of labels) {
    if (specs[label]) return specs[label];
  }
  // Case-insensitive match
  const entries = Object.entries(specs);
  for (const wanted of labels) {
    const found = entries.find(([key]) => key.toLowerCase() === wanted.toLowerCase());
    if (found) return found[1];
  }
  return null;
}

/** First number in a string (handles 12,941.00). */
function parseFirstNumber(value) {
  if (value == null || value === '') return null;
  const match = String(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const num = Number(match[0]);
  return Number.isFinite(num) ? num : null;
}

/** Prefer imperial feet from "35.76 ft / 10.90 m". */
function parseFeet(value) {
  if (!value) return null;
  const text = String(value);
  const ft = text.match(/([\d,.]+)\s*(?:ft|')/i);
  if (ft) return parseFirstNumber(ft[1]);
  return parseFirstNumber(text);
}

function parsePounds(value) {
  if (!value) return null;
  const text = String(value);
  const lb = text.match(/([\d,.]+)\s*(?:lb|lbs|#)/i);
  if (lb) return parseFirstNumber(lb[1]);
  return parseFirstNumber(text);
}

function parseSqFt(value) {
  if (!value) return null;
  const text = String(value);
  const sq = text.match(/([\d,.]+)\s*(?:ft²|ft2|sq\.?\s*ft|sqft)/i);
  if (sq) return parseFirstNumber(sq[1]);
  return parseFirstNumber(text);
}

function parseGallons(value) {
  if (!value) return null;
  const text = String(value);
  const gal = text.match(/([\d,.]+)\s*(?:gal|gals|gallon)/i);
  if (gal) return parseFirstNumber(gal[1]);
  return parseFirstNumber(text);
}

function parseKnots(value) {
  if (!value) return null;
  const text = String(value);
  const kn = text.match(/([\d,.]+)\s*(?:kn|knots?)/i);
  if (kn) return parseFirstNumber(kn[1]);
  return parseFirstNumber(text);
}

function parseYear(value) {
  const n = parseFirstNumber(value);
  if (n == null) return null;
  const year = Math.round(n);
  return year >= 1800 && year <= 2100 ? year : null;
}

function parseCount(value) {
  const n = parseFirstNumber(value);
  if (n == null) return null;
  return Math.round(n);
}

/**
 * Map scraped sailboatdata page into structured BoatModel fields (not a description blob).
 */
export function mapSailboatDataToModelFields({ title, specs, notes, sourceUrl }) {
  const warnings = [];
  const hull = pick(specs, 'Hull Type');
  const rig = pick(specs, 'Rigging Type');
  const loa = pick(specs, 'LOA');
  const lwl = pick(specs, 'LWL');
  const beam = pick(specs, 'Beam');
  const draft = pick(specs, 'Max Draft');
  const displacement = pick(specs, 'Displacement');
  const ballast = pick(specs, 'Ballast');
  const sailArea = pick(specs, 'S.A. (reported)', 'S.A. Total (100% Fore + Main Triangles)');
  const builder = pick(specs, 'Builder');
  const designer = pick(specs, 'Designer', 'Designers');
  const firstBuilt = pick(specs, 'First Built');
  const lastBuilt = pick(specs, 'Last Built');
  const builtCount = pick(specs, '# Built');
  const construction = pick(specs, 'Construction');
  const saDispl = pick(specs, 'S.A. / Displ.');
  const balDispl = pick(specs, 'Bal. / Displ.');
  const dispLen = pick(specs, 'Disp: / Len.', 'Disp:/Len');
  const comfort = pick(specs, 'Comfort Ratio');
  const capsize = pick(specs, 'Capsize Screening Formula');
  const hullSpeed = pick(specs, 'Hull Speed');
  const engineMake = pick(specs, 'Make');
  const engineType = pick(specs, 'Type');
  const hp = pick(specs, 'HP');
  const fuel = pick(specs, 'Fuel');
  const water = pick(specs, 'Water');

  const loaFt = parseFeet(loa);
  const beamFt = parseFeet(beam);
  const draftFt = parseFeet(draft);

  if (loaFt == null && beamFt == null && draftFt == null) {
    warnings.push('Could not find core dimensions — check the page or paste source.');
  }

  const noteParts = [];
  if (notes) noteParts.push(notes);

  const name = deriveModelName(title);
  const now = new Date().toISOString();

  return {
    fields: {
      name: name || null,
      notes: noteParts.length ? noteParts.join('\n\n') : null,
      hullType: hull || null,
      rigType: rig || null,
      loaFt,
      lwlFt: parseFeet(lwl),
      beamFt,
      draftFt,
      displacementLb: parsePounds(displacement),
      ballastLb: parsePounds(ballast),
      ballastRatio: parseFirstNumber(balDispl),
      sailAreaSqFt: parseSqFt(sailArea),
      construction: construction || null,
      designer: designer || null,
      builder: builder || null,
      firstBuilt: parseYear(firstBuilt),
      lastBuilt: parseYear(lastBuilt),
      builtCount: parseCount(builtCount),
      saDispl: parseFirstNumber(saDispl),
      dispLen: parseFirstNumber(dispLen),
      comfortRatio: parseFirstNumber(comfort),
      capsizeRatio: parseFirstNumber(capsize),
      hullSpeedKn: parseKnots(hullSpeed),
      engineMake: engineMake || null,
      engineType: engineType || null,
      engineHp: parseFirstNumber(hp),
      fuelGal: parseGallons(fuel),
      waterGal: parseGallons(water),
      sailboatDataUrl: sourceUrl || null,
      sailboatDataFetchedAt: sourceUrl || Object.keys(specs).length ? now : null,
      title: title || null,
      specs: Object.fromEntries(
        SPEC_LABELS
          .map((label) => [label, pick(specs, label)])
          .filter(([, value]) => value),
      ),
    },
    warnings,
  };
}

export function parseSailboatDataHtml(html, { sourceUrl = null } = {}) {
  if (!html?.trim()) {
    throw new Error('Sailboatdata HTML is required');
  }

  if (looksBlocked(html, 200) && !hasUsefulPayload(html)) {
    const error = new Error(
      'This looks like a Cloudflare block page. Paste View Page Source from sailboatdata.com instead.',
    );
    error.needsPaste = true;
    throw error;
  }

  if (!hasUsefulPayload(html)) {
    const error = new Error(
      'Could not find sailboat specs in that HTML. Paste the full page source from sailboatdata.com.',
    );
    error.needsPaste = true;
    throw error;
  }

  const title = extractTitle(html);
  const specs = extractSpecMap(html);
  const notes = extractNotes(html);
  const guessedUrl = sourceUrl
    || html.match(/https?:\/\/(?:www\.)?sailboatdata\.com\/sailboat\/[a-z0-9-]+\/?/i)?.[0]
    || null;

  const mapped = mapSailboatDataToModelFields({
    title,
    specs,
    notes,
    sourceUrl: guessedUrl,
  });

  return {
    fields: mapped.fields,
    warnings: mapped.warnings,
    source: 'sailboatdata',
    fetchMethod: 'paste',
  };
}

export async function fetchSailboatDataFromUrl(urlString) {
  if (!urlString?.trim()) {
    throw new Error('Sailboatdata URL is required');
  }

  const sourceUrl = urlString.trim();
  if (!isSailboatDataUrl(sourceUrl)) {
    throw new Error('Use a sailboatdata.com sailboat URL.');
  }

  let html = null;
  let fetchMethod = 'fetch';

  try {
    const plain = await fetchPlain(sourceUrl);
    if (!looksBlocked(plain.html, plain.status) && hasUsefulPayload(plain.html)) {
      html = plain.html;
    } else {
      const browserHtml = await fetchHtmlWithPuppeteer(sourceUrl);
      fetchMethod = 'puppeteer';
      if (!looksBlocked(browserHtml, 200) && hasUsefulPayload(browserHtml)) {
        html = browserHtml;
      }
    }
  } catch (error) {
    const wrapped = new Error(
      error.message?.includes('sailboat')
        ? error.message
        : `Could not load sailboatdata (${error.message}). Paste page source instead.`,
    );
    wrapped.needsPaste = true;
    throw wrapped;
  }

  if (!html) {
    const error = new Error(
      'sailboatdata.com blocked the automated request (Cloudflare). Paste View Page Source instead.',
    );
    error.needsPaste = true;
    throw error;
  }

  const parsed = parseSailboatDataHtml(html, { sourceUrl });
  return {
    ...parsed,
    fetchMethod,
    needsPaste: false,
  };
}
