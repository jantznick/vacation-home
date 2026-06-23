export const PRICING_FEATURE_CATALOG = {
  acres: {
    key: 'acres',
    label: 'Lot size (acres)',
    description: 'Lot size in acres',
  },
  isVacantLot: {
    key: 'isVacantLot',
    label: 'Vacant lot',
    description: 'Vacant lot vs home with structure',
  },
  sqftLiving: {
    key: 'sqftLiving',
    label: 'House size (sqft)',
    description: 'Finished living area',
  },
  bedrooms: {
    key: 'bedrooms',
    label: 'Bedrooms',
    description: 'Bedroom count',
  },
  bathrooms: {
    key: 'bathrooms',
    label: 'Bathrooms',
    description: 'Bathroom count',
  },
  waterfront: {
    key: 'waterfront',
    label: 'Waterfront',
    description: 'Waterfront yes/no',
  },
  region: {
    key: 'region',
    label: 'Region',
    description: 'One-hot encoded region',
  },
  sqftLot: {
    key: 'sqftLot',
    label: 'Lot sqft',
    description: 'Total lot square footage (if acres unknown)',
  },
  yearBuilt: {
    key: 'yearBuilt',
    label: 'Year built',
    description: 'Structure year built',
  },
  daysOnMarket: {
    key: 'daysOnMarket',
    label: 'Days on market',
    description: 'Days listed',
  },
};

/** Built-in feature set when no custom default model exists. */
export const DEFAULT_PRICING_FEATURES = [
  'acres',
  'isVacantLot',
  'sqftLiving',
  'bedrooms',
  'bathrooms',
  'waterfront',
  'region',
];

export const PRICING_FEATURE_KEYS = Object.keys(PRICING_FEATURE_CATALOG);

function numericValue(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function booleanValue(value) {
  return value ? 1 : 0;
}

export function extractNumericFeature(listing, featureKey) {
  switch (featureKey) {
    case 'acres':
      return numericValue(listing.acres);
    case 'sqftLiving':
      if (listing.isVacantLot) {
        return 0;
      }
      return numericValue(listing.sqftLiving);
    case 'sqftLot':
      return numericValue(listing.sqftLot);
    case 'bedrooms':
      return numericValue(listing.bedrooms);
    case 'bathrooms':
      return numericValue(listing.bathrooms);
    case 'yearBuilt':
      return numericValue(listing.yearBuilt);
    case 'daysOnMarket':
      return numericValue(listing.daysOnMarket);
    case 'waterfront':
      return booleanValue(listing.waterfront);
    case 'isVacantLot':
      return booleanValue(listing.isVacantLot);
    default:
      return null;
  }
}

export function validateFeatureKeys(features) {
  if (!Array.isArray(features) || features.length === 0) {
    throw new Error('At least one feature is required');
  }

  const invalid = features.filter((feature) => !PRICING_FEATURE_KEYS.includes(feature));
  if (invalid.length) {
    throw new Error(`Unknown features: ${invalid.join(', ')}`);
  }

  return features;
}

export function buildFeatureColumns(features, regionIds = []) {
  const columns = [];

  for (const feature of features) {
    if (feature === 'region') {
      for (const regionId of regionIds) {
        columns.push({
          name: `region:${regionId}`,
          type: 'region',
          regionId,
        });
      }
      continue;
    }

    columns.push({
      name: feature,
      type: 'numeric',
      featureKey: feature,
    });
  }

  return columns;
}

export function vectorizeListing(listing, columns, { imputeMeans = null } = {}) {
  const values = columns.map((column, index) => {
    if (column.type === 'region') {
      return listing.regionId === column.regionId ? 1 : 0;
    }

    const value = extractNumericFeature(listing, column.featureKey);

    if (value != null) {
      return value;
    }

    if (imputeMeans && imputeMeans[index] != null) {
      return imputeMeans[index];
    }

    return null;
  });

  if (values.some((value) => value == null)) {
    return null;
  }

  return values;
}

export function buildTrainingMatrix(listings, features) {
  const pricedListings = listings.filter((listing) => listing.listPrice != null);

  const regionIds = features.includes('region')
    ? [...new Set(pricedListings.map((listing) => listing.regionId).filter(Boolean))].sort()
    : [];

  const columns = buildFeatureColumns(features, regionIds);
  const numericIndexes = columns
    .map((column, index) => (column.type === 'numeric' ? index : null))
    .filter((index) => index != null);

  const imputeMeans = columns.map((column, index) => {
    if (column.type !== 'numeric') {
      return null;
    }

    const values = pricedListings
      .map((listing) => extractNumericFeature(listing, column.featureKey))
      .filter((value) => value != null);

    if (!values.length) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  const rows = [];
  const targets = [];

  for (const listing of pricedListings) {
    const vector = vectorizeListing(listing, columns, { imputeMeans });
    if (!vector) {
      continue;
    }

    rows.push(vector);
    targets.push(Number(listing.listPrice));
  }

  return {
    rows,
    targets,
    columns,
    regionIds,
    imputeMeans,
    sampleCount: rows.length,
  };
}

export function computeRegressionMetrics(actual, predicted) {
  if (!actual.length) {
    return null;
  }

  const n = actual.length;
  let sumAbsError = 0;
  let sumSquaredError = 0;
  const actualMean = actual.reduce((sum, value) => sum + value, 0) / n;

  let totalSumSquares = 0;

  for (let index = 0; index < n; index += 1) {
    const error = predicted[index] - actual[index];
    sumAbsError += Math.abs(error);
    sumSquaredError += error * error;
    totalSumSquares += (actual[index] - actualMean) ** 2;
  }

  const mae = Math.round(sumAbsError / n);
  const rmse = Math.round(Math.sqrt(sumSquaredError / n));
  const r2 = totalSumSquares === 0
    ? null
    : Math.round((1 - sumSquaredError / totalSumSquares) * 1000) / 1000;

  return { mae, rmse, r2, sampleCount: n };
}
