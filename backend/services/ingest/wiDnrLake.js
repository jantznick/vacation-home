import * as cheerio from 'cheerio';

const DNR_BASE = 'https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx';
const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; VacationHomeTracker/1.0; personal research)',
  Accept: 'text/html',
};

export function parseWbicFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const wbic = url.searchParams.get('wbic');
    if (wbic && /^\d+$/.test(wbic)) {
      return wbic;
    }
  } catch {
    // fall through
  }
  return null;
}

function normalizeCellText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function parseNumber(value) {
  if (!value) return null;
  const match = String(value).match(/[\d.]+/);
  return match ? Number(match[0]) : null;
}

/**
 * Parse key/value rows from the DNR Facts & Figures table.
 */
export function parseDnrFactsHtml(html) {
  const $ = cheerio.load(html);
  const facts = {};

  $('table.tableLeft tr').each((_, row) => {
    const $row = $(row);
    if ($row.hasClass('grayHeader')) {
      return;
    }

    const th = $row.find('th').first();
    if (!th.length || th.attr('colspan')) {
      return;
    }

    const label = normalizeCellText(th.text()).replace(/\s*[\*#]+$/, '');
    const value = normalizeCellText($row.find('td').first().text());

    if (label && value) {
      facts[label] = value;
    }
  });

  return facts;
}

/**
 * Parse overview page blurb and fish list.
 */
export function parseDnrOverviewHtml(html) {
  const $ = cheerio.load(html);

  const name = normalizeCellText($('h1').first().text());
  const overviewText = normalizeCellText($('#ctl00_LeftPageContent_divOverview p').first().text());

  const fish = [];
  $('ul.fishBullets li').each((_, el) => {
    const item = normalizeCellText($(el).text());
    if (item) fish.push(item);
  });

  let waterClarity = null;
  const clarityMatch = overviewText.match(/water is ([^.]+)\./i);
  if (clarityMatch) {
    waterClarity = clarityMatch[1].trim();
  }

  return {
    name: name || null,
    overviewText: overviewText || null,
    fish,
    waterClarity,
  };
}

function buildDnrUrls(wbic) {
  return {
    overviewUrl: `${DNR_BASE}?wbic=${wbic}`,
    factsUrl: `${DNR_BASE}?wbic=${wbic}&page=facts`,
  };
}

export function mapDnrToLakeFields({ wbic, facts, overview }) {
  const { overviewUrl, factsUrl } = buildDnrUrls(wbic);
  const warnings = [];

  const name = facts.Name || overview?.name;
  if (!name) {
    warnings.push('Could not find lake name — enter manually.');
  }

  const acreage = parseNumber(facts.Area);
  const maxDepthFeet = parseNumber(facts['Maximum Depth']);
  const avgDepthFeet = parseNumber(facts['Mean Depth']);
  const edgeType = facts.Bottom || null;

  let waterClarity = overview?.waterClarity || null;
  if (!waterClarity && facts['Trophic Status']) {
    waterClarity = facts['Trophic Status'];
  }

  const noteParts = [];
  if (overview?.overviewText) noteParts.push(overview.overviewText);
  if (facts.County) noteParts.push(`County: ${facts.County}`);
  if (facts.Fish) noteParts.push(`Fish: ${facts.Fish}`);
  else if (overview?.fish?.length) noteParts.push(`Fish: ${overview.fish.join(', ')}`);
  if (facts['Trophic Status']) noteParts.push(`Trophic status: ${facts['Trophic Status']}`);
  if (facts['Invasive Species']) noteParts.push(`Invasive species: ${facts['Invasive Species']}`);
  if (facts['Hydrologic Lake Type']) noteParts.push(`Hydrologic type: ${facts['Hydrologic Lake Type']}`);

  if (!acreage) warnings.push('Could not parse acreage.');
  if (!maxDepthFeet) warnings.push('Could not parse max depth.');

  return {
    fields: {
      name: name || null,
      acreage,
      maxDepthFeet,
      avgDepthFeet,
      waterClarity,
      edgeType,
      notes: noteParts.length ? noteParts.join('\n\n') : null,
      dnrSourceUrl: overviewUrl,
      dnrFactsUrl: factsUrl,
      wbic,
    },
    warnings,
    source: 'wi-dnr',
  };
}

async function fetchDnrPage(url) {
  const response = await fetch(url, { headers: FETCH_HEADERS });
  if (!response.ok) {
    throw new Error(`DNR returned HTTP ${response.status} for ${url}`);
  }
  return response.text();
}

export async function importDnrLakeFromWbic(wbic) {
  const { overviewUrl, factsUrl } = buildDnrUrls(wbic);

  const [overviewHtml, factsHtml] = await Promise.all([
    fetchDnrPage(overviewUrl),
    fetchDnrPage(factsUrl),
  ]);

  return importDnrLakeFromHtml({ wbic, overviewHtml, factsHtml });
}

export function importDnrLakeFromHtml({ wbic, overviewHtml, factsHtml }) {
  if (!overviewHtml && !factsHtml) {
    throw new Error('Overview or facts HTML is required');
  }

  const facts = factsHtml ? parseDnrFactsHtml(factsHtml) : {};
  const overview = overviewHtml ? parseDnrOverviewHtml(overviewHtml) : null;

  const resolvedWbic = wbic
    || facts['Waterbody ID (WBIC)']
    || null;

  return mapDnrToLakeFields({
    wbic: resolvedWbic,
    facts,
    overview,
  });
}

export async function importDnrLakeFromUrl(urlString) {
  const wbic = parseWbicFromUrl(urlString);
  if (!wbic) {
    throw new Error('URL must be a WI DNR lake page with a wbic parameter');
  }
  return importDnrLakeFromWbic(wbic);
}
