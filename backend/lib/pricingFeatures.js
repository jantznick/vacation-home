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
  lengthFt: {
    key: 'lengthFt',
    label: 'Length (ft)',
    description: 'Overall length in feet',
  },
  isSail: {
    key: 'isSail',
    label: 'Sailboat',
    description: 'Sail vs motor/other propulsion',
  },
};

/** Built-in feature set when no custom default model exists (home Searches). */
export const DEFAULT_PRICING_FEATURES = [
  'acres',
  'isVacantLot',
  'sqftLiving',
  'bedrooms',
  'bathrooms',
  'waterfront',
  'region',
];

/** Built-in feature set for boat Searches. */
export const DEFAULT_BOAT_PRICING_FEATURES = [
  'lengthFt',
  'yearBuilt',
];

export function defaultPricingFeaturesForAssetType(assetType) {
  if (assetType === 'boat') {
    return [...DEFAULT_BOAT_PRICING_FEATURES];
  }
  return [...DEFAULT_PRICING_FEATURES];
}

export const PRICING_FEATURE_KEYS = Object.keys(PRICING_FEATURE_CATALOG);

export const PRICING_ALGORITHMS = {
  linear_regression: {
    key: 'linear_regression',
    label: 'Straight-line',
    description:
      'Each feature adds or subtracts a fixed dollar amount. Simple and stable when you have few listings.',
    pricePickerNote:
      'Straight-line estimate from your saved listings — price changes at a steady rate as you adjust the selected detail.',
  },
  log_size_linear_regression: {
    key: 'log_size_linear_regression',
    label: 'Diminishing size effect',
    description:
      'Lot and house size taper off — extra acres or sqft matter less as size grows. Helpful when listings span a wide size range.',
    pricePickerNote:
      'Curved estimate — lot and house size contribute with diminishing returns, based on your saved listings.',
  },
};

export const DEFAULT_PRICING_ALGORITHM = 'log_size_linear_regression';

/** Bump when training output shape or default algorithm changes — triggers auto-retrain. */
export const PRICING_TRAINING_PIPELINE_VERSION = 3;

const LOG_SIZE_FEATURES = new Set(['acres', 'sqftLiving', 'sqftLot', 'lengthFt']);

const LOG_SIZE_FLOOR = {
  acres: 0.1,
  sqftLiving: 100,
  sqftLot: 100,
  lengthFt: 10,
};

/** Paired with isVacantLot when training data includes both land and homes. */
export const VACANT_LOT_INTERACTION_PARTNERS = ['acres', 'sqftLot', 'waterfront'];

/** Optional cross-feature interactions validated with leave-one-out error before training. */
export const SPARSE_INTERACTION_CANDIDATES = [
  { leftFeatureKey: 'waterfront', rightFeatureKey: 'acres' },
  { leftFeatureKey: 'waterfront', rightFeatureKey: 'sqftLiving' },
];

const MIN_SAMPLES_FOR_SPARSE_INTERACTION = 5;

export function hasMixedVacancy(listings) {
  const priced = listings.filter((listing) => listing.listPrice != null);
  const hasVacant = priced.some((listing) => listing.isVacantLot);
  const hasHome = priced.some((listing) => !listing.isVacantLot);
  return hasVacant && hasHome;
}

export function vacantLotInteractionPartners(features, listings) {
  if (!features.includes('isVacantLot') || !hasMixedVacancy(listings)) {
    return [];
  }

  return VACANT_LOT_INTERACTION_PARTNERS.filter((key) => features.includes(key));
}

export function segmentHasVacantLotInteractions(columns) {
  return columns?.some((column) => column.type === 'interaction' && column.rightFeatureKey === 'isVacantLot') ?? false;
}

export function segmentHasSparseInteractions(columns) {
  return columns?.some((column) => column.type === 'interaction' && column.rightFeatureKey !== 'isVacantLot') ?? false;
}

function interactionColumnName(leftFeatureKey, rightFeatureKey) {
  return `${leftFeatureKey}:${rightFeatureKey}`;
}

function interactionHasSignal(listings, candidate, algorithm) {
  const values = listings
    .map((listing) => {
      const left = extractModelFeature(listing, candidate.leftFeatureKey, algorithm);
      const right = extractModelFeature(listing, candidate.rightFeatureKey, algorithm);
      if (left == null || right == null) {
        return null;
      }

      return left * right;
    })
    .filter((value) => value != null);

  if (values.length < 3) {
    return false;
  }

  const unique = new Set(values.map((value) => Math.round(value * 1000)));
  return unique.size >= 2;
}

function extractInteractionValue(listing, column, algorithm) {
  const left = extractModelFeature(listing, column.leftFeatureKey, algorithm);
  const right = extractModelFeature(listing, column.rightFeatureKey, algorithm);
  if (left == null || right == null) {
    return null;
  }

  return left * right;
}

function extractColumnValue(listing, column, algorithm) {
  if (column.type === 'region') {
    return listing.regionId === column.regionId ? 1 : 0;
  }

  if (column.type === 'interaction') {
    return extractInteractionValue(listing, column, algorithm);
  }

  return extractModelFeature(listing, column.featureKey, algorithm);
}

export function getAlgorithmCatalog() {
  return {
    defaultAlgorithm: DEFAULT_PRICING_ALGORITHM,
    algorithms: Object.values(PRICING_ALGORITHMS),
  };
}

export function validateAlgorithm(algorithm) {
  if (!algorithm || !PRICING_ALGORITHMS[algorithm]) {
    throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  return algorithm;
}

export function usesLogSizeTransform(algorithm) {
  return algorithm === 'log_size_linear_regression';
}

export function transformModelFeatureValue(featureKey, rawValue, algorithm = DEFAULT_PRICING_ALGORITHM) {
  if (rawValue == null || !Number.isFinite(rawValue)) {
    return null;
  }

  if (!usesLogSizeTransform(algorithm) || !LOG_SIZE_FEATURES.has(featureKey)) {
    return rawValue;
  }

  if (rawValue <= 0) {
    const floor = LOG_SIZE_FLOOR[featureKey] ?? 1;
    return Math.log(floor);
  }

  return Math.log(rawValue);
}

export function extractModelFeature(listing, featureKey, algorithm = DEFAULT_PRICING_ALGORITHM) {
  const raw = extractNumericFeature(listing, featureKey);
  if (raw == null) {
    return null;
  }

  return transformModelFeatureValue(featureKey, raw, algorithm);
}

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
    case 'lengthFt':
      return numericValue(listing.lengthFt);
    case 'waterfront':
      if (listing.waterfront === null || listing.waterfront === undefined) {
        return null;
      }
      return booleanValue(listing.waterfront);
    case 'isVacantLot':
      if (listing.isVacantLot === null || listing.isVacantLot === undefined) {
        return null;
      }
      return booleanValue(listing.isVacantLot);
    case 'isSail':
      if (!listing.propulsion) {
        return null;
      }
      return booleanValue(listing.propulsion === 'sail');
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

export function buildFeatureColumns(
  features,
  regionIds = [],
  { vacantLotInteractions = [], sparseInteractions = [] } = {},
) {
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

  for (const partner of vacantLotInteractions) {
    columns.push({
      name: interactionColumnName(partner, 'isVacantLot'),
      type: 'interaction',
      leftFeatureKey: partner,
      rightFeatureKey: 'isVacantLot',
    });
  }

  for (const candidate of sparseInteractions) {
    columns.push({
      name: interactionColumnName(candidate.leftFeatureKey, candidate.rightFeatureKey),
      type: 'interaction',
      leftFeatureKey: candidate.leftFeatureKey,
      rightFeatureKey: candidate.rightFeatureKey,
    });
  }

  return columns;
}

export function vectorizeListing(listing, columns, { imputeMeans = null, algorithm = DEFAULT_PRICING_ALGORITHM } = {}) {
  const values = columns.map((column, index) => {
    const value = extractColumnValue(listing, column, algorithm);

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

export function appendInteractionToMatrix(matrixBundle, candidate, algorithm) {
  const { rows, rowListings, columns, imputeMeans } = matrixBundle;
  const interactionColumn = {
    name: interactionColumnName(candidate.leftFeatureKey, candidate.rightFeatureKey),
    type: 'interaction',
    leftFeatureKey: candidate.leftFeatureKey,
    rightFeatureKey: candidate.rightFeatureKey,
  };

  const interactionValues = rowListings.map((listing) =>
    extractInteractionValue(listing, interactionColumn, algorithm),
  );
  const validValues = interactionValues.filter((value) => value != null);
  const imputeValue = validValues.length
    ? validValues.reduce((sum, value) => sum + value, 0) / validValues.length
    : 0;

  return {
    ...matrixBundle,
    columns: [...columns, interactionColumn],
    imputeMeans: [...imputeMeans, imputeValue],
    rows: rows.map((row, index) => [
      ...row,
      interactionValues[index] ?? imputeValue,
    ]),
  };
}

export function selectValidatedSparseInteractions(matrixBundle, features, algorithm, leaveOneOutMae) {
  if (matrixBundle.sampleCount < MIN_SAMPLES_FOR_SPARSE_INTERACTION || !leaveOneOutMae) {
    return [];
  }

  const candidates = SPARSE_INTERACTION_CANDIDATES.filter(
    (candidate) =>
      features.includes(candidate.leftFeatureKey)
      && features.includes(candidate.rightFeatureKey),
  );

  if (!candidates.length) {
    return [];
  }

  const baselineMae = leaveOneOutMae(matrixBundle.rows, matrixBundle.targets);
  if (baselineMae == null) {
    return [];
  }

  let bestCandidate = null;
  let bestMae = baselineMae;
  const improvementThreshold = Math.max(5_000, baselineMae * 0.02);

  for (const candidate of candidates) {
    if (!interactionHasSignal(matrixBundle.rowListings, candidate, algorithm)) {
      continue;
    }

    const augmented = appendInteractionToMatrix(matrixBundle, candidate, algorithm);
    const candidateMae = leaveOneOutMae(augmented.rows, augmented.targets);
    if (candidateMae == null) {
      continue;
    }

    const improvement = baselineMae - candidateMae;
    if (improvement >= improvementThreshold && candidateMae < bestMae) {
      bestCandidate = candidate;
      bestMae = candidateMae;
    }
  }

  return bestCandidate ? [bestCandidate] : [];
}

export function buildTrainingMatrix(
  listings,
  features,
  { algorithm = DEFAULT_PRICING_ALGORITHM, leaveOneOutMae = null } = {},
) {
  const pricedListings = listings.filter((listing) => listing.listPrice != null);

  const regionIds = features.includes('region')
    ? [...new Set(pricedListings.map((listing) => listing.regionId).filter(Boolean))].sort()
    : [];

  const vacantLotInteractions = vacantLotInteractionPartners(features, pricedListings);
  const columns = buildFeatureColumns(features, regionIds, { vacantLotInteractions });

  const imputeMeans = columns.map((column) => {
    if (column.type === 'region') {
      return null;
    }

    const values = pricedListings
      .map((listing) => extractColumnValue(listing, column, algorithm))
      .filter((value) => value != null);

    if (!values.length) {
      return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  });

  const rows = [];
  const targets = [];
  const rowListings = [];

  for (const listing of pricedListings) {
    const vector = vectorizeListing(listing, columns, { imputeMeans, algorithm });
    if (!vector) {
      continue;
    }

    rows.push(vector);
    targets.push(Number(listing.listPrice));
    rowListings.push(listing);
  }

  const baseBundle = {
    rows,
    targets,
    rowListings,
    columns,
    imputeMeans,
    sampleCount: rows.length,
  };

  const sparseInteractions = selectValidatedSparseInteractions(
    baseBundle,
    features,
    algorithm,
    leaveOneOutMae,
  );

  if (sparseInteractions.length) {
    const augmented = appendInteractionToMatrix(baseBundle, sparseInteractions[0], algorithm);
    return {
      rows: augmented.rows,
      targets: augmented.targets,
      columns: augmented.columns,
      regionIds,
      imputeMeans: augmented.imputeMeans,
      sampleCount: augmented.rows.length,
      algorithm,
      vacantLotInteractions,
      sparseInteractions,
    };
  }

  return {
    rows,
    targets,
    columns,
    regionIds,
    imputeMeans,
    sampleCount: rows.length,
    algorithm,
    vacantLotInteractions,
    sparseInteractions,
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
