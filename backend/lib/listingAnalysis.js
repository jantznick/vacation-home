import { serializeListing } from './listingHelpers.js';

const ACRE_TOLERANCE = 0.5;
const SQFT_TOLERANCE = 0.3;

function acreBounds(acres) {
  return {
    min: acres * (1 - ACRE_TOLERANCE),
    max: acres * (1 + ACRE_TOLERANCE),
  };
}

function sqftBounds(sqftLiving) {
  return {
    min: sqftLiving * (1 - SQFT_TOLERANCE),
    max: sqftLiving * (1 + SQFT_TOLERANCE),
  };
}

function formatAcres(value) {
  return parseFloat(value.toFixed(2));
}

function formatSqft(value) {
  return Math.round(value).toLocaleString('en-US');
}

function sortNumbers(values) {
  return [...values].sort((a, b) => a - b);
}

export function computeStats(values) {
  if (!values.length) {
    return null;
  }

  const sorted = sortNumbers(values);
  const count = sorted.length;
  const sum = sorted.reduce((total, value) => total + value, 0);

  const median = count % 2 === 0
    ? Math.round((sorted[count / 2 - 1] + sorted[count / 2]) / 2)
    : sorted[Math.floor(count / 2)];

  const percentile = (percent) => {
    if (count === 1) {
      return sorted[0];
    }

    const index = (percent / 100) * (count - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower));
  };

  return {
    count,
    min: sorted[0],
    max: sorted[count - 1],
    median,
    p25: percentile(25),
    p75: percentile(75),
    mean: Math.round(sum / count),
  };
}

export function percentileRank(value, sortedValues) {
  if (!sortedValues.length || value == null) {
    return null;
  }

  const below = sortedValues.filter((item) => item < value).length;
  const equal = sortedValues.filter((item) => item === value).length;

  return Math.round(((below + equal / 2) / sortedValues.length) * 100);
}

export function percentDiffFromMedian(value, median) {
  if (value == null || median == null || median === 0) {
    return null;
  }

  return Math.round(((value - median) / median) * 100);
}

export function primaryMetricKey(listing) {
  if (listing.isVacantLot) {
    return 'pricePerAcre';
  }

  if (listing.sqftLiving) {
    return 'pricePerSqft';
  }

  if (listing.acres) {
    return 'pricePerAcre';
  }

  return null;
}

export function getMetricValue(listing, metricKey) {
  if (metricKey === 'pricePerAcre') {
    return listing.pricePerAcre ?? null;
  }

  if (metricKey === 'pricePerSqft') {
    return listing.pricePerSqft ?? null;
  }

  return null;
}

export function metricLabel(metricKey) {
  if (metricKey === 'pricePerAcre') {
    return '$/acre';
  }

  if (metricKey === 'pricePerSqft') {
    return '$/sqft';
  }

  return metricKey;
}

export function isCompCandidate(target, candidate, { requireSameRegion = true } = {}) {
  if (target.id === candidate.id) {
    return false;
  }

  if (!candidate.listPrice) {
    return false;
  }

  if (requireSameRegion && target.regionId !== candidate.regionId) {
    return false;
  }

  if (target.isVacantLot !== candidate.isVacantLot) {
    return false;
  }

  if (target.waterfront !== candidate.waterfront) {
    return false;
  }

  if (target.acres && candidate.acres) {
    const { min: minAcres, max: maxAcres } = acreBounds(target.acres);
    if (candidate.acres < minAcres || candidate.acres > maxAcres) {
      return false;
    }
  }

  if (!target.isVacantLot && target.sqftLiving && candidate.sqftLiving) {
    const { min: minSqft, max: maxSqft } = sqftBounds(target.sqftLiving);
    if (candidate.sqftLiving < minSqft || candidate.sqftLiving > maxSqft) {
      return false;
    }
  }

  return true;
}

export function findComps(target, listings, options = {}) {
  return listings.filter((listing) => isCompCandidate(target, listing, options));
}

function formatDealLabel(vsMedianPercent, metricKey) {
  if (vsMedianPercent == null) {
    return null;
  }

  const label = metricLabel(metricKey);
  const abs = Math.abs(vsMedianPercent);

  if (vsMedianPercent < 0) {
    return `${abs}% below median ${label}`;
  }

  if (vsMedianPercent > 0) {
    return `${abs}% above median ${label}`;
  }

  return `At median ${label}`;
}

export function analyzeListingAgainstComps(target, comps, options = {}) {
  const { criteria, emptyMessage } = options;
  const metricKey = primaryMetricKey(target);

  if (!metricKey) {
    return {
      metricKey: null,
      message: 'Not enough data for comparison (need acres or living sqft).',
    };
  }

  const targetValue = getMetricValue(target, metricKey);

  if (targetValue == null) {
    return {
      metricKey,
      message: `Listing has no ${metricLabel(metricKey)} to compare.`,
    };
  }

  const compValues = comps
    .map((comp) => getMetricValue(comp, metricKey))
    .filter((value) => value != null);

  const resolvedCriteria = criteria ?? compCriteriaDescription(target);

  if (!compValues.length) {
    return {
      metricKey,
      metricLabel: metricLabel(metricKey),
      targetValue,
      compCount: 0,
      message: emptyMessage || 'No comparable listings yet.',
      criteria: resolvedCriteria,
    };
  }

  const sorted = sortNumbers(compValues);
  const stats = computeStats(compValues);
  const percentile = percentileRank(targetValue, sorted);
  const vsMedianPercent = percentDiffFromMedian(targetValue, stats.median);

  return {
    metricKey,
    metricLabel: metricLabel(metricKey),
    targetValue,
    compCount: compValues.length,
    stats,
    percentile,
    vsMedianPercent,
    dealLabel: formatDealLabel(vsMedianPercent, metricKey),
    criteria: resolvedCriteria,
  };
}

function buildCompSummaries(comps, metricKey, limit = 12) {
  if (!metricKey) {
    return [];
  }

  return comps
    .map((comp) => ({
      id: comp.id,
      address: comp.address,
      listPrice: comp.listPrice,
      acres: comp.acres,
      sqftLiving: comp.sqftLiving,
      pricePerAcre: comp.pricePerAcre,
      pricePerSqft: comp.pricePerSqft,
      metricValue: getMetricValue(comp, metricKey),
      regionName: comp.region?.name ?? null,
    }))
    .filter((comp) => comp.metricValue != null)
    .sort((left, right) => left.metricValue - right.metricValue)
    .slice(0, limit);
}

function buildTierAnalysis(target, comps, { title, criteria, emptyMessage }) {
  const analysis = analyzeListingAgainstComps(target, comps, { criteria, emptyMessage });

  return {
    title,
    analysis,
    comps: buildCompSummaries(comps, analysis.metricKey),
  };
}

function compsWithMetric(target, listings) {
  const metricKey = primaryMetricKey(target);

  return listings.filter((listing) => {
    if (listing.id === target.id || !listing.listPrice) {
      return false;
    }

    if (!metricKey) {
      return false;
    }

    return getMetricValue(listing, metricKey) != null;
  });
}

export function buildListingAnalysis(targetListing, allListings) {
  const target = serializeListing(targetListing);
  const serialized = allListings.map((listing) => ({
    ...serializeListing(listing),
    region: listing.region ?? null,
  }));

  const metricLabelText = primaryMetricKey(target)
    ? metricLabel(primaryMetricKey(target))
    : null;

  const allComps = compsWithMetric(target, serialized);
  const regionComps = compsWithMetric(
    target,
    serialized.filter((listing) => listing.regionId === target.regionId),
  );
  const similarComps = findComps(target, serialized);

  const regionName = targetListing.region?.name ?? null;

  const tiers = {
    allListings: buildTierAnalysis(target, allComps, {
      title: 'All listings',
      criteria: metricLabelText
        ? `all listings in your dataset with ${metricLabelText} data`
        : 'all listings in your dataset',
      emptyMessage: 'No other listings with enough data to compare.',
    }),
    region: buildTierAnalysis(target, regionComps, {
      title: regionName ? `All in ${regionName}` : 'All in region',
      criteria: metricLabelText
        ? `all listings in ${regionName || 'this region'} with ${metricLabelText} data`
        : `all listings in ${regionName || 'this region'}`,
      emptyMessage: `No other listings in ${regionName || 'this region'} with enough data to compare.`,
    }),
    similar: buildTierAnalysis(target, similarComps, {
      title: 'Similar listings',
      criteria: compCriteriaDescription(target),
      emptyMessage: 'No similar listings in this region yet.',
    }),
  };

  return {
    listingId: target.id,
    tiers,
    analysis: tiers.similar.analysis,
    comps: tiers.similar.comps,
  };
}

export function compCriteriaDescription(target, { includeRegion = true } = {}) {
  const parts = [];

  if (includeRegion) {
    parts.push('same region');
  }

  parts.push(
    target.isVacantLot ? 'vacant lots' : 'homes with structures',
    target.waterfront ? 'waterfront' : 'non-waterfront',
  );

  if (target.acres) {
    const { min, max } = acreBounds(target.acres);
    parts.push(`between ${formatAcres(min)} and ${formatAcres(max)} acres`);
  }

  if (!target.isVacantLot && target.sqftLiving) {
    const { min, max } = sqftBounds(target.sqftLiving);
    parts.push(`between ${formatSqft(min)} and ${formatSqft(max)} sqft`);
  }

  return parts.join(' · ');
}

export function sortSerializedListings(listings, sortBy = 'createdAt', sortDir = 'desc') {
  const direction = sortDir === 'asc' ? 1 : -1;

  const compareNullable = (left, right) => {
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (left === right) return 0;
    return left < right ? -1 : 1;
  };

  return [...listings].sort((left, right) => {
    let result = 0;

    switch (sortBy) {
      case 'listPrice':
        result = compareNullable(left.listPrice, right.listPrice);
        break;
      case 'pricePerAcre':
        result = compareNullable(left.pricePerAcre, right.pricePerAcre);
        break;
      case 'pricePerSqft':
        result = compareNullable(left.pricePerSqft, right.pricePerSqft);
        break;
      case 'acres':
        result = compareNullable(left.acres, right.acres);
        break;
      default:
        result = new Date(left.createdAt) - new Date(right.createdAt);
        break;
    }

    if (result === 0) {
      result = new Date(left.createdAt) - new Date(right.createdAt);
    }

    return result * direction;
  });
}
