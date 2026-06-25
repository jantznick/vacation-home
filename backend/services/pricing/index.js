import { fitPricingRegression, leaveOneOutMae, loadPricingRegression } from '../../lib/pricingRegression.js';
import prisma from '../../lib/prisma.js';
import { serializeListing } from '../../lib/listingHelpers.js';
import { compCriteriaDescription, findComps } from '../../lib/listingAnalysis.js';
import {
  PRICING_FEATURE_CATALOG,
  PRICING_FEATURE_KEYS,
  PRICING_ALGORITHMS,
  DEFAULT_PRICING_FEATURES,
  DEFAULT_PRICING_ALGORITHM,
  PRICING_TRAINING_PIPELINE_VERSION,
  buildTrainingMatrix,
  computeRegressionMetrics,
  extractNumericFeature,
  getAlgorithmCatalog,
  hasMixedVacancy,
  segmentHasSparseInteractions,
  segmentHasVacantLotInteractions,
  validateAlgorithm,
  validateFeatureKeys,
  vectorizeListing,
} from '../../lib/pricingFeatures.js';

const MIN_TRAINING_SAMPLES = 3;

const upgradingModelIds = new Set();

function getModelTrainingPipelineVersion(model) {
  return model?.modelData?.trainingPipelineVersion ?? 1;
}

function shouldUpgradeLegacyAlgorithm(model) {
  if (DEFAULT_PRICING_ALGORITHM === 'linear_regression') {
    return false;
  }

  return model.isDefault && (!model.algorithm || model.algorithm === 'linear_regression');
}

function modelNeedsUpgrade(model, pricedCount = 0) {
  if (!model) {
    return false;
  }

  if (shouldUpgradeLegacyAlgorithm(model)) {
    return true;
  }

  if (getModelTrainingPipelineVersion(model) < PRICING_TRAINING_PIPELINE_VERSION) {
    return true;
  }

  if (pricedCount >= MIN_TRAINING_SAMPLES && !model.modelData?.segments?.all) {
    return true;
  }

  return false;
}

export async function ensurePricingModelUpToDate(modelId) {
  if (!modelId || upgradingModelIds.has(modelId)) {
    return modelId
      ? prisma.pricingModel.findUnique({ where: { id: modelId } })
      : null;
  }

  const model = await prisma.pricingModel.findUnique({ where: { id: modelId } });
  if (!model) {
    return null;
  }

  const pricedCount = await prisma.listing.count({
    where: { searchId: model.searchId, listPrice: { not: null } },
  });

  if (!modelNeedsUpgrade(model, pricedCount)) {
    return model;
  }

  upgradingModelIds.add(modelId);

  try {
    if (shouldUpgradeLegacyAlgorithm(model)) {
      await prisma.pricingModel.update({
        where: { id: modelId },
        data: {
          algorithm: DEFAULT_PRICING_ALGORITHM,
          modelData: emptySegmentStore(DEFAULT_PRICING_ALGORITHM),
          sampleCount: null,
          trainedAt: null,
        },
      });
    }

    if (pricedCount >= MIN_TRAINING_SAMPLES) {
      return trainAllSegmentsForModel(modelId);
    }

    return prisma.pricingModel.findUnique({ where: { id: modelId } });
  } finally {
    upgradingModelIds.delete(modelId);
  }
}

export async function migratePricingModelsOnStartup() {
  const models = await prisma.pricingModel.findMany({
    select: { id: true, searchId: true },
  });

  if (!models.length) {
    return { checked: 0, upgraded: 0 };
  }

  let upgraded = 0;

  for (const model of models) {
    const current = await prisma.pricingModel.findUnique({ where: { id: model.id } });
    const pricedCount = await prisma.listing.count({
      where: { searchId: model.searchId, listPrice: { not: null } },
    });

    if (!modelNeedsUpgrade(current, pricedCount)) {
      continue;
    }

    await ensurePricingModelUpToDate(model.id);
    upgraded += 1;
  }

  if (upgraded > 0) {
    console.log(`Pricing migration: retrained ${upgraded} of ${models.length} model(s)`);
  }

  return { checked: models.length, upgraded };
}

function emptySegmentStore(algorithm = DEFAULT_PRICING_ALGORITHM) {
  return {
    algorithm,
    segments: {
      all: null,
      regions: {},
      similar: {},
    },
  };
}

function segmentAlgorithm(segment, modelAlgorithm = DEFAULT_PRICING_ALGORITHM) {
  return segment?.algorithm || modelAlgorithm || DEFAULT_PRICING_ALGORITHM;
}

function normalizeListingForPricing(listing) {
  const serialized = serializeListing(listing);
  return {
    ...serialized,
    sqftLiving: serialized.isVacantLot ? 0 : serialized.sqftLiving,
  };
}

function formatDealLabel(estimatedPrice, listPrice) {
  if (estimatedPrice == null || listPrice == null || listPrice === 0) {
    return null;
  }

  const delta = estimatedPrice - listPrice;
  const percent = Math.round((Math.abs(delta) / listPrice) * 100);
  const amount = formatCurrencyAbs(delta);

  if (delta > 0) {
    return `Priced ${amount} below model estimate (${percent}% under)`;
  }

  if (delta < 0) {
    return `Priced ${amount} above model estimate (${percent}% over)`;
  }

  return 'Priced at model estimate';
}

function formatCurrencyAbs(value) {
  const abs = Math.abs(value);
  return `$${abs.toLocaleString('en-US')}`;
}

function computePricePerAcreNote(spec, estimatedPrice) {
  if (spec?.isVacantLot !== true) {
    return null;
  }

  const acres = Number(spec.acres);
  if (!Number.isFinite(acres) || acres <= 0 || !estimatedPrice || estimatedPrice <= 0) {
    return null;
  }

  const perAcre = Math.round(estimatedPrice / acres);
  return `About ${formatCurrencyAbs(perAcre)} per acre at this lot size.`;
}

function fitSegment(poolListings, features, algorithm = DEFAULT_PRICING_ALGORITHM) {
  const matrix = buildTrainingMatrix(
    poolListings.map(normalizeListingForPricing),
    features,
    { algorithm, leaveOneOutMae },
  );

  if (matrix.sampleCount < MIN_TRAINING_SAMPLES) {
    return null;
  }

  const fitted = fitPricingRegression(matrix.rows, matrix.targets);
  const predictions = matrix.rows.map((row) => fitted.predict(row));
  const metrics = computeRegressionMetrics(matrix.targets, predictions);

  return {
    trainedAt: new Date().toISOString(),
    algorithm,
    sampleCount: matrix.sampleCount,
    columns: matrix.columns,
    regionIds: matrix.regionIds,
    imputeMeans: matrix.imputeMeans,
    regressionModel: fitted.regressionModel,
    regressionMethod: fitted.regressionMethod,
    regularizationLambda: fitted.regularizationLambda,
    sparseInteractions: matrix.sparseInteractions ?? [],
    metrics,
  };
}

function predictFromStoredSegment(segment, targetListing, { criteria, sampleCount, modelAlgorithm }) {
  const normalized = normalizeListingForPricing(targetListing);
  const algorithm = segmentAlgorithm(segment, modelAlgorithm);
  const vector = vectorizeListing(normalized, segment.columns, {
    imputeMeans: segment.imputeMeans,
    algorithm,
  });

  if (!vector) {
    return {
      criteria,
      sampleCount: sampleCount ?? segment.sampleCount,
      available: false,
      message: 'Add more property details (acres, beds, sqft, etc.) to get an estimate.',
    };
  }

  const regression = loadPricingRegression(segment);
  const predicted = regression.predict(vector);

  if (!Number.isFinite(predicted) || predicted <= 0) {
    return {
      criteria,
      sampleCount: sampleCount ?? segment.sampleCount,
      available: false,
      message:
        'Could not produce a reliable estimate from current data. Add more listings or more property details (acres, beds, sqft).',
    };
  }

  const estimatedPrice = Math.round(predicted);
  const listPrice = normalized.listPrice != null ? Number(normalized.listPrice) : null;
  const delta = listPrice != null ? estimatedPrice - listPrice : null;
  const lowConfidence = (sampleCount ?? segment.sampleCount) < 8;

  return {
    criteria,
    sampleCount: sampleCount ?? segment.sampleCount,
    available: true,
    estimatedPrice,
    listPrice,
    delta,
    deltaPercent: listPrice
      ? Math.round(((estimatedPrice - listPrice) / listPrice) * 100)
      : null,
    dealLabel: formatDealLabel(estimatedPrice, listPrice),
    lowConfidence,
    confidenceNote: lowConfidence
      ? `Based on only ${sampleCount ?? segment.sampleCount} ${(sampleCount ?? segment.sampleCount) === 1 ? 'home' : 'homes'} — estimates get more reliable as you add listings (aim for 10+).`
      : null,
  };
}

function tierFromStoredSegment(segment, listing, { title, criteria, emptyMessage, modelAlgorithm }) {
  if (!segment) {
    return {
      title,
      criteria,
      sampleCount: 0,
      needsMore: MIN_TRAINING_SAMPLES,
      available: false,
      message: emptyMessage,
    };
  }

  return {
    title,
    ...predictFromStoredSegment(segment, listing, {
      criteria,
      sampleCount: segment.sampleCount,
      modelAlgorithm,
    }),
  };
}

function buildListingTiersFromStoredModel(listing, modelData, modelAlgorithm = DEFAULT_PRICING_ALGORITHM) {
  const regionName = listing.region?.name ?? 'this region';
  const target = normalizeListingForPricing(listing);
  const segments = modelData?.segments ?? {};

  return {
    allListings: tierFromStoredSegment(segments.all, listing, {
      title: 'All listings',
      criteria: 'all listings you\'ve saved',
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings with list prices.`,
      modelAlgorithm,
    }),
    region: tierFromStoredSegment(segments.regions?.[listing.regionId], listing, {
      title: `All in ${regionName}`,
      criteria: `all listings in ${regionName}`,
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings in ${regionName} with list prices.`,
      modelAlgorithm,
    }),
    similar: tierFromStoredSegment(segments.similar?.[listing.id], listing, {
      title: 'Similar listings',
      criteria: compCriteriaDescription(target),
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} similar listings with list prices.`,
      modelAlgorithm,
    }),
  };
}

function predictFromPool(
  targetListing,
  poolListings,
  features,
  { criteria, emptyMessage, algorithm = DEFAULT_PRICING_ALGORITHM },
) {
  if (poolListings.length < MIN_TRAINING_SAMPLES) {
    const needsMore = MIN_TRAINING_SAMPLES - poolListings.length;
    return {
      criteria,
      sampleCount: poolListings.length,
      needsMore,
      available: false,
      message: `Add ${needsMore} more priced ${needsMore === 1 ? 'listing' : 'listings'} to see an estimate.`,
    };
  }

  const matrix = buildTrainingMatrix(
    poolListings.map(normalizeListingForPricing),
    features,
    { algorithm, leaveOneOutMae },
  );
  const normalized = normalizeListingForPricing(targetListing);
  const vector = vectorizeListing(normalized, matrix.columns, {
    imputeMeans: matrix.imputeMeans,
    algorithm,
  });

  if (!vector) {
    return {
      criteria,
      sampleCount: poolListings.length,
      available: false,
      message: 'Add more property details (acres, beds, sqft, etc.) to get an estimate.',
    };
  }

  const fitted = fitPricingRegression(matrix.rows, matrix.targets);
  const predicted = fitted.predict(vector);

  if (!Number.isFinite(predicted) || predicted <= 0) {
    return {
      criteria,
      sampleCount: poolListings.length,
      available: false,
      message:
        'Could not produce a reliable estimate from current data. Add more listings or more property details (acres, beds, sqft).',
    };
  }

  const estimatedPrice = Math.round(predicted);
  const listPrice = normalized.listPrice != null ? Number(normalized.listPrice) : null;
  const delta = listPrice != null ? estimatedPrice - listPrice : null;

  const lowConfidence = poolListings.length < 8;

  return {
    criteria,
    sampleCount: poolListings.length,
    available: true,
    estimatedPrice,
    listPrice,
    delta,
    deltaPercent: listPrice
      ? Math.round(((estimatedPrice - listPrice) / listPrice) * 100)
      : null,
    dealLabel: formatDealLabel(estimatedPrice, listPrice),
    lowConfidence,
    confidenceNote: lowConfidence
      ? `Based on only ${poolListings.length} ${poolListings.length === 1 ? 'home' : 'homes'} — estimates get more reliable as you add listings (aim for 10+).`
      : null,
  };
}

async function resolveModelConfig(modelId, searchId = null) {
  let resolvedId = modelId;

  if (!resolvedId && searchId) {
    const defaultModel = await prisma.pricingModel.findFirst({
      where: { searchId, isDefault: true },
      orderBy: { updatedAt: 'desc' },
    });
    resolvedId = defaultModel?.id ?? null;
  }

  if (!resolvedId && searchId) {
    const fallbackModel = await prisma.pricingModel.findFirst({
      where: { searchId },
      orderBy: { createdAt: 'asc' },
    });
    resolvedId = fallbackModel?.id ?? null;
  }

  if (resolvedId) {
    await ensurePricingModelUpToDate(resolvedId);
    const model = await prisma.pricingModel.findUnique({ where: { id: resolvedId } });
    if (model?.features) {
      return {
        model: {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
          algorithm: model.algorithm || DEFAULT_PRICING_ALGORITHM,
          modelData: model.modelData,
        },
        features: validateFeatureKeys(model.features),
        algorithm: model.algorithm || DEFAULT_PRICING_ALGORITHM,
        modelData: model.modelData || emptySegmentStore(model.algorithm),
      };
    }
  }

  return {
    model: null,
    features: DEFAULT_PRICING_FEATURES,
    algorithm: DEFAULT_PRICING_ALGORITHM,
    modelData: emptySegmentStore(),
  };
}

export function getSimilarRetrainTargets(changedListingIds, allListings) {
  const serialized = allListings.map(normalizeListingForPricing);
  const targets = new Set(changedListingIds);
  const changedSet = new Set(changedListingIds);

  for (const listing of allListings) {
    const target = normalizeListingForPricing(listing);
    const comps = findComps(target, serialized);
    if (comps.some((comp) => changedSet.has(comp.id))) {
      targets.add(listing.id);
    }
  }

  return [...targets];
}

function pricedListings(listings) {
  return listings.filter((listing) => listing.listPrice != null);
}

function trainSimilarSegment(targetListing, allListings, features, algorithm = DEFAULT_PRICING_ALGORITHM) {
  const normalized = normalizeListingForPricing(targetListing);
  const serialized = allListings.map(normalizeListingForPricing);
  const compIds = new Set(findComps(normalized, serialized).map((comp) => comp.id));
  compIds.add(targetListing.id);
  const pool = allListings.filter((listing) => compIds.has(listing.id));
  return fitSegment(pool, features, algorithm);
}

export async function ensureDefaultPricingModel(searchId) {
  const defaultModel = await prisma.pricingModel.findFirst({
    where: { searchId, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (defaultModel) {
    await ensurePricingModelUpToDate(defaultModel.id);
    return prisma.pricingModel.findUnique({ where: { id: defaultModel.id } });
  }

  const anyModel = await prisma.pricingModel.findFirst({
    where: { searchId },
    orderBy: { createdAt: 'asc' },
  });
  if (anyModel) {
    await ensurePricingModelUpToDate(anyModel.id);
    return prisma.pricingModel.findUnique({ where: { id: anyModel.id } });
  }

  return prisma.pricingModel.create({
    data: {
      searchId,
      name: 'Default',
      description: 'Built-in north woods feature set (lot, house, beds/baths, waterfront, region)',
      features: DEFAULT_PRICING_FEATURES,
      algorithm: DEFAULT_PRICING_ALGORITHM,
      isDefault: true,
    },
  });
}

export async function trainAllSegmentsForModel(modelId) {
  const model = await prisma.pricingModel.findUnique({ where: { id: modelId } });
  if (!model) {
    return null;
  }

  const features = validateFeatureKeys(model.features);
  const algorithm = model.algorithm || DEFAULT_PRICING_ALGORITHM;
  const allListings = await prisma.listing.findMany({
    where: { searchId: model.searchId },
    include: { region: { select: { id: true, name: true } } },
  });
  const priced = pricedListings(allListings);
  const existingData = model.modelData || emptySegmentStore(algorithm);
  const segments = {
    all: fitSegment(priced, features, algorithm),
    regions: { ...existingData.segments?.regions },
    similar: { ...existingData.segments?.similar },
  };

  const regionIds = [...new Set(priced.map((listing) => listing.regionId).filter(Boolean))];
  for (const regionId of regionIds) {
    const pool = priced.filter((listing) => listing.regionId === regionId);
    const segment = fitSegment(pool, features, algorithm);
    if (segment) {
      segments.regions[regionId] = segment;
    } else {
      delete segments.regions[regionId];
    }
  }

  for (const listing of allListings) {
    const segment = trainSimilarSegment(listing, allListings, features, algorithm);
    if (segment) {
      segments.similar[listing.id] = segment;
    } else {
      delete segments.similar[listing.id];
    }
  }

  const modelData = {
    algorithm,
    trainingPipelineVersion: PRICING_TRAINING_PIPELINE_VERSION,
    segments,
  };

  const summarySampleCount = segments.all?.sampleCount ?? 0;

  return prisma.pricingModel.update({
    where: { id: modelId },
    data: {
      modelData,
      sampleCount: summarySampleCount,
      trainedAt: new Date(),
    },
  });
}

export async function retrainAffectedSegments({
  searchId,
  regionIds = [],
  similarListingIds = [],
  deletedListingIds = [],
} = {}) {
  await ensureDefaultPricingModel(searchId);

  const models = await prisma.pricingModel.findMany({ where: { searchId } });
  const allListings = await prisma.listing.findMany({
    where: { searchId },
    include: { region: { select: { id: true, name: true } } },
  });
  const priced = pricedListings(allListings);
  const results = [];

  for (const model of models) {
    const features = validateFeatureKeys(model.features);
    const algorithm = model.algorithm || DEFAULT_PRICING_ALGORITHM;
    const existingData = model.modelData || emptySegmentStore(algorithm);
    const segments = {
      all: fitSegment(priced, features, algorithm),
      regions: { ...existingData.segments?.regions },
      similar: { ...existingData.segments?.similar },
    };

    for (const deletedId of deletedListingIds) {
      delete segments.similar[deletedId];
    }

    const regionsToRetrain = new Set(regionIds);

    for (const regionId of regionsToRetrain) {
      const pool = priced.filter((listing) => listing.regionId === regionId);
      const segment = fitSegment(pool, features, algorithm);
      if (segment) {
        segments.regions[regionId] = segment;
      } else {
        delete segments.regions[regionId];
      }
    }

    for (const listingId of similarListingIds) {
      const listing = allListings.find((item) => item.id === listingId);
      if (!listing) {
        delete segments.similar[listingId];
        continue;
      }

      const segment = trainSimilarSegment(listing, allListings, features, algorithm);
      if (segment) {
        segments.similar[listingId] = segment;
      } else {
        delete segments.similar[listingId];
      }
    }

    const updated = await prisma.pricingModel.update({
      where: { id: model.id },
      data: {
        modelData: {
          algorithm,
          trainingPipelineVersion: PRICING_TRAINING_PIPELINE_VERSION,
          segments,
        },
        sampleCount: segments.all?.sampleCount ?? 0,
        trainedAt: new Date(),
      },
    });

    results.push({
      modelId: updated.id,
      modelName: updated.name,
      allReady: Boolean(segments.all),
      regionCount: Object.keys(segments.regions).length,
      similarCount: Object.keys(segments.similar).length,
    });
  }

  return results;
}

export async function retrainAfterListingChange({
  searchId,
  before = null,
  after = null,
  deletedId = null,
} = {}) {
  const allListings = await prisma.listing.findMany({
    where: { searchId },
    include: { region: { select: { id: true, name: true } } },
  });

  const regionIds = new Set();
  const changedListingIds = new Set();

  if (deletedId) {
    changedListingIds.add(deletedId);
    if (before?.regionId) {
      regionIds.add(before.regionId);
    }
  } else if (after) {
    changedListingIds.add(after.id);
    if (after.regionId) {
      regionIds.add(after.regionId);
    }
    if (before?.regionId && before.regionId !== after.regionId) {
      regionIds.add(before.regionId);
    }
  }

  const similarListingIds = getSimilarRetrainTargets([...changedListingIds], allListings);

  const results = await retrainAffectedSegments({
    searchId,
    regionIds: [...regionIds],
    similarListingIds,
    deletedListingIds: deletedId ? [deletedId] : [],
  });

  return {
    updated: results.length > 0,
    models: results,
    similarListingIds,
  };
}

export function getFeatureCatalog() {
  const defaultSet = new Set(DEFAULT_PRICING_FEATURES);
  const orderedKeys = [
    ...DEFAULT_PRICING_FEATURES,
    ...PRICING_FEATURE_KEYS.filter((key) => !defaultSet.has(key)),
  ];

  return {
    ...getAlgorithmCatalog(),
    defaultFeatures: DEFAULT_PRICING_FEATURES,
    features: orderedKeys.map((key) => PRICING_FEATURE_CATALOG[key]),
  };
}

export async function listPricingModels(searchId) {
  return prisma.pricingModel.findMany({
    where: { searchId },
    orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function getPricingModel(id) {
  return prisma.pricingModel.findUnique({ where: { id } });
}

export async function createPricingModel({
  searchId,
  name,
  description,
  features,
  algorithm = DEFAULT_PRICING_ALGORITHM,
  isDefault = false,
}) {
  const validatedFeatures = validateFeatureKeys(features);
  const validatedAlgorithm = validateAlgorithm(algorithm);

  if (isDefault) {
    await prisma.pricingModel.updateMany({
      where: { searchId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const model = await prisma.pricingModel.create({
    data: {
      searchId,
      name: name.trim(),
      description: description?.trim() || null,
      features: validatedFeatures,
      algorithm: validatedAlgorithm,
      isDefault,
    },
  });

  return trainAllSegmentsForModel(model.id);
}

export async function updatePricingModel(id, { name, description, features, algorithm, isDefault }) {
  const existing = await prisma.pricingModel.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  const data = {};
  let shouldRetrain = false;

  if (name !== undefined) {
    data.name = name.trim();
  }

  if (description !== undefined) {
    data.description = description?.trim() || null;
  }

  if (features !== undefined) {
    data.features = validateFeatureKeys(features);
    data.modelData = emptySegmentStore(existing.algorithm || DEFAULT_PRICING_ALGORITHM);
    data.sampleCount = null;
    data.trainedAt = null;
    shouldRetrain = true;
  }

  if (algorithm !== undefined) {
    data.algorithm = validateAlgorithm(algorithm);
    data.modelData = emptySegmentStore(data.algorithm);
    data.sampleCount = null;
    data.trainedAt = null;
    shouldRetrain = true;
  }

  if (isDefault === true) {
    await prisma.pricingModel.updateMany({
      where: { searchId: existing.searchId, isDefault: true },
      data: { isDefault: false },
    });
    data.isDefault = true;
  } else if (isDefault === false) {
    data.isDefault = false;
  }

  const updated = await prisma.pricingModel.update({
    where: { id },
    data,
  });

  if (shouldRetrain) {
    return trainAllSegmentsForModel(updated.id);
  }

  return updated;
}

export async function deletePricingModel(id) {
  const existing = await prisma.pricingModel.findUnique({ where: { id } });
  if (!existing) {
    return null;
  }

  await prisma.pricingModel.delete({ where: { id } });
  return existing;
}

export async function trainPricingModel(id) {
  return trainAllSegmentsForModel(id);
}

function pickBestListingPrediction(tiers) {
  return tiers.similar.estimatedPrice != null
    ? tiers.similar
    : tiers.region.estimatedPrice != null
      ? tiers.region
      : tiers.allListings.estimatedPrice != null
        ? tiers.allListings
        : null;
}

function buildListingPredictionTiers(listing, allListings, features) {
  const target = normalizeListingForPricing(listing);
  const regionName = listing.region?.name ?? 'this region';
  const priced = pricedListings(allListings);
  const serialized = allListings.map(normalizeListingForPricing);

  const allPool = priced;
  const regionPool = priced.filter((item) => item.regionId === listing.regionId);
  const similarCompListings = findComps(target, serialized);
  const similarPool = priced.filter(
    (item) => item.id === listing.id || similarCompListings.some((comp) => comp.id === item.id),
  );

  return {
    allListings: {
      title: 'All listings',
      ...predictFromPool(listing, allPool, features, {
        criteria: 'all listings you\'ve saved',
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings with list prices.`,
      }),
    },
    region: {
      title: `All in ${regionName}`,
      ...predictFromPool(listing, regionPool, features, {
        criteria: `all listings in ${regionName}`,
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings in ${regionName} with list prices.`,
      }),
    },
    similar: {
      title: 'Similar listings',
      ...predictFromPool(listing, similarPool, features, {
        criteria: compCriteriaDescription(target),
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} similar listings with list prices.`,
      }),
    },
  };
}

export function priceSignalFromPrediction(prediction) {
  if (!prediction?.estimatedPrice || prediction.listPrice == null) {
    return null;
  }

  if (prediction.available === false) {
    return null;
  }

  const listPrice = Number(prediction.listPrice);
  if (!listPrice) {
    return null;
  }

  const delta = prediction.estimatedPrice - listPrice;
  const percent = Math.abs(Math.round((delta / listPrice) * 100));

  if (percent === 0) {
    return { direction: 'inline', percent: 0 };
  }

  // delta > 0: list price is below model estimate
  return {
    direction: delta > 0 ? 'below' : 'above',
    percent,
  };
}

export async function computeListingPriceSignals(searchId, serializedListings) {
  const pricedOnPage = serializedListings.filter((listing) => listing.listPrice != null);
  if (pricedOnPage.length === 0) {
    return {};
  }

  const defaultModel = await prisma.pricingModel.findFirst({
    where: { searchId, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });

  const allSegment = defaultModel?.modelData?.segments?.all;
  if (!allSegment) {
    return {};
  }

  const allListings = await prisma.listing.findMany({
    where: { searchId },
    include: { region: { select: { id: true, name: true } } },
  });

  const signals = {};

  for (const listing of pricedOnPage) {
    const dbListing = allListings.find((item) => item.id === listing.id);
    if (!dbListing) {
      continue;
    }

    const tier = predictFromStoredSegment(allSegment, dbListing, {
      criteria: 'all listings you\'ve saved',
      sampleCount: allSegment.sampleCount,
      modelAlgorithm: defaultModel?.algorithm,
    });
    const signal = priceSignalFromPrediction(tier);
    if (signal) {
      signals[listing.id] = signal;
    }
  }

  return signals;
}

export async function predictListingPrice(listingId, modelId = null) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { region: true },
  });

  if (!listing) {
    return null;
  }

  await ensureDefaultPricingModel(listing.searchId);

  let { model, modelData, algorithm } = await resolveModelConfig(modelId, listing.searchId);
  const tiers = buildListingTiersFromStoredModel(listing, modelData, algorithm);

  return {
    listing: serializeListing(listing),
    model: model
      ? {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
          algorithm: model.algorithm,
        }
      : null,
    features: model?.features,
    tiers,
    prediction: pickBestListingPrediction(tiers),
    message: model
      ? null
      : 'Using built-in default features. Create a custom pricing model to change feature selection.',
  };
}

function isAnyRegionSpec(spec) {
  const regionId = spec?.regionId;
  return regionId == null || regionId === '' || regionId === 'any';
}

function featuresForDreamMode(features, anyRegion) {
  if (!anyRegion) {
    return features;
  }
  return features.filter((feature) => feature !== 'region');
}

function buildSyntheticListing(searchId, region, spec) {
  const isVacantLot = spec.isVacantLot == null ? null : Boolean(spec.isVacantLot);
  const vacant = isVacantLot === true;

  return normalizeListingForPricing({
    id: '__hypothetical__',
    searchId,
    regionId: region?.id ?? null,
    listPrice: null,
    isVacantLot: isVacantLot === null ? null : vacant,
    acres: spec.acres ?? null,
    sqftLiving: vacant ? 0 : (spec.sqftLiving ?? null),
    sqftLot: spec.sqftLot ?? null,
    bedrooms: vacant ? null : (spec.bedrooms ?? null),
    bathrooms: vacant ? null : (spec.bathrooms ?? null),
    waterfront: spec.waterfront == null ? null : Boolean(spec.waterfront),
    yearBuilt: vacant ? null : (spec.yearBuilt ?? null),
    region: region ? { id: region.id, name: region.name } : null,
  });
}

export async function predictFromSpec(searchId, spec, modelId = null) {
  const anyRegion = isAnyRegionSpec(spec);
  const regionId = anyRegion ? null : spec?.regionId;

  let region = null;
  if (!anyRegion) {
    if (!regionId) {
      throw new Error('regionId is required');
    }

    region = await prisma.region.findFirst({
      where: { id: regionId, searchId },
    });

    if (!region) {
      throw new Error('Region not found');
    }
  }

  await ensureDefaultPricingModel(searchId);

  const { model, features: modelFeatures, algorithm } = await resolveModelConfig(modelId, searchId);
  const features = featuresForDreamMode(modelFeatures, anyRegion);
  const syntheticListing = buildSyntheticListing(searchId, region, spec);
  const target = syntheticListing;

  const allListings = await prisma.listing.findMany({
    where: { searchId },
    include: { region: { select: { id: true, name: true } } },
  });
  const priced = pricedListings(allListings);
  const serialized = allListings.map(normalizeListingForPricing);

  const compOptions = { requireSameRegion: !anyRegion };
  const similarCompListings = findComps(target, serialized, compOptions);
  const similarPool = priced.filter((item) =>
    similarCompListings.some((comp) => comp.id === item.id),
  );

  const similarCriteria = compCriteriaDescription(target, { includeRegion: !anyRegion });
  const similarTitle = anyRegion ? 'Similar properties' : 'Similar listings';

  const tiers = {
    allListings: {
      title: 'All listings',
      ...predictFromPool(syntheticListing, priced, features, {
        criteria: 'all listings you\'ve saved',
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings with list prices.`,
        algorithm,
      }),
    },
    similar: {
      title: similarTitle,
      ...predictFromPool(syntheticListing, similarPool, features, {
        criteria: similarCriteria,
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} similar listings with list prices.`,
        algorithm,
      }),
    },
  };

  if (!anyRegion) {
    const regionPool = priced.filter((item) => item.regionId === regionId);
    tiers.region = {
      title: `All in ${region.name}`,
      ...predictFromPool(syntheticListing, regionPool, features, {
        criteria: `all listings in ${region.name}`,
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings in ${region.name} with list prices.`,
        algorithm,
      }),
    };
  }

  const visibleTiers = anyRegion
    ? ['allListings', 'similar']
    : ['allListings', 'region', 'similar'];

  const recommendedTier = anyRegion
    ? (tiers.similar.estimatedPrice != null
      ? 'similar'
      : tiers.allListings.estimatedPrice != null
        ? 'allListings'
        : null)
    : (tiers.similar.estimatedPrice != null
      ? 'similar'
      : tiers.region.estimatedPrice != null
        ? 'region'
        : tiers.allListings.estimatedPrice != null
          ? 'allListings'
          : null);

  const prediction = anyRegion
    ? (tiers.similar.estimatedPrice != null
      ? tiers.similar
      : tiers.allListings.estimatedPrice != null
        ? tiers.allListings
        : null)
    : (tiers.similar.estimatedPrice != null
      ? tiers.similar
      : tiers.region.estimatedPrice != null
        ? tiers.region
        : tiers.allListings.estimatedPrice != null
          ? tiers.allListings
          : null);

  return {
    mode: anyRegion ? 'anyRegion' : 'regional',
    visibleTiers,
    model: model
      ? {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
        }
      : null,
    features,
    recommendedTier,
    tiers,
    prediction,
    message: model
      ? null
      : 'Using built-in default features. Create a custom pricing model to change feature selection.',
  };
}

const PRICE_PICKER_STEPS = 40;

function pricePickerVariableType(featureKey) {
  if (featureKey === 'region') {
    return 'region';
  }
  if (featureKey === 'isVacantLot' || featureKey === 'waterfront') {
    return 'boolean';
  }
  return 'numeric';
}

function expandFeatureRange(min, max) {
  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.2, 1);
    return {
      min: Math.max(0, min - padding),
      max: max + padding,
    };
  }

  const padding = (max - min) * 0.05;
  return {
    min: Math.max(0, min - padding),
    max: max + padding,
  };
}

function computeProfileDefaultsAndRanges(normalizedListings, features) {
  const defaults = {
    isVacantLot: false,
    waterfront: false,
  };
  const ranges = {};

  for (const featureKey of features) {
    if (featureKey === 'region') {
      continue;
    }

    if (featureKey === 'isVacantLot' || featureKey === 'waterfront') {
      defaults[featureKey] = false;
      continue;
    }

    const values = normalizedListings
      .map((listing) => extractNumericFeature(listing, featureKey))
      .filter((value) => value != null && Number.isFinite(value));

    if (!values.length) {
      continue;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    defaults[featureKey] = featureKey === 'bedrooms' || featureKey === 'bathrooms'
      ? median
      : Math.round(median * 100) / 100;
    ranges[featureKey] = expandFeatureRange(sorted[0], sorted[sorted.length - 1]);
  }

  return { defaults, ranges };
}

const PRICE_PICKER_ANY_NOTE =
  'Details set to Any use a standard value learned from your saved listings. That stand-in is not exact—pinning a real value may move the estimate higher or lower.';

function normalizeAnyFeatures(anyFeatures, features, variable) {
  const allowed = new Set(
    features.filter((featureKey) => featureKey !== 'region' && featureKey !== variable),
  );

  return [...new Set((anyFeatures || []).filter((featureKey) => allowed.has(featureKey)))];
}

function normalizeRegionIds(spec, regions) {
  const validIds = new Set(regions.map((region) => region.id));
  const fromArray = Array.isArray(spec?.regionIds)
    ? spec.regionIds.filter((id) => validIds.has(id))
    : [];
  const fromSingle = spec?.regionId && validIds.has(spec.regionId) ? [spec.regionId] : [];

  const regionIds = fromArray.length ? fromArray : fromSingle.length
    ? fromSingle
    : regions[0]?.id
      ? [regions[0].id]
      : [];

  const focusedRegionId = spec?.focusedRegionId && regionIds.includes(spec.focusedRegionId)
    ? spec.focusedRegionId
    : regionIds[0] ?? null;

  return { regionIds, focusedRegionId };
}

function mergePickerSpec(spec, defaults, regions, anyFeatures = []) {
  const anySet = new Set(anyFeatures);
  const { regionIds, focusedRegionId } = normalizeRegionIds(spec, regions);

  const resolve = (key, fallback = null) => {
    if (anySet.has(key)) {
      return null;
    }

    if (spec[key] !== undefined && spec[key] !== null) {
      return spec[key];
    }

    if (defaults[key] !== undefined && defaults[key] !== null) {
      return defaults[key];
    }

    return fallback;
  };

  const merged = {
    isVacantLot: anySet.has('isVacantLot') ? null : resolve('isVacantLot', false),
    waterfront: anySet.has('waterfront') ? null : resolve('waterfront', false),
    acres: resolve('acres'),
    sqftLiving: resolve('sqftLiving'),
    bedrooms: resolve('bedrooms'),
    bathrooms: resolve('bathrooms'),
    sqftLot: resolve('sqftLot'),
    yearBuilt: resolve('yearBuilt'),
    daysOnMarket: resolve('daysOnMarket'),
    regionIds,
    regionId: focusedRegionId,
    focusedRegionId,
  };

  if (merged.isVacantLot === true) {
    merged.sqftLiving = null;
    merged.bedrooms = null;
    merged.bathrooms = null;
  }

  return merged;
}

function applyPickerVariable(spec, variable, value) {
  const next = { ...spec };

  switch (variable) {
    case 'acres':
      next.acres = value;
      break;
    case 'sqftLiving':
      next.sqftLiving = value;
      break;
    case 'sqftLot':
      next.sqftLot = value;
      break;
    case 'bedrooms':
      next.bedrooms = value;
      break;
    case 'bathrooms':
      next.bathrooms = value;
      break;
    case 'yearBuilt':
      next.yearBuilt = value;
      break;
    case 'daysOnMarket':
      next.daysOnMarket = value;
      break;
    case 'waterfront':
      next.waterfront = Boolean(value);
      break;
    case 'isVacantLot':
      next.isVacantLot = Boolean(value);
      if (next.isVacantLot) {
        next.sqftLiving = null;
        next.bedrooms = null;
        next.bathrooms = null;
      }
      break;
    case 'region':
      next.regionId = value;
      break;
    default:
      break;
  }

  return next;
}

function formatPickerValue(featureKey, value, regionsById) {
  if (value == null) {
    return '—';
  }

  if (featureKey === 'region') {
    return regionsById.get(value)?.name ?? 'Unknown region';
  }

  if (featureKey === 'isVacantLot' || featureKey === 'waterfront') {
    return value ? 'Yes' : 'No';
  }

  if (featureKey === 'acres') {
    return `${value} acres`;
  }

  if (featureKey === 'sqftLiving' || featureKey === 'sqftLot') {
    return `${Number(value).toLocaleString('en-US')} sq ft`;
  }

  if (featureKey === 'bedrooms') {
    return `${value} bed`;
  }

  if (featureKey === 'bathrooms') {
    return `${value} bath`;
  }

  return String(value);
}

function buildHoldingSummary(
  features,
  spec,
  activeVariable,
  regionsById,
  anyFeatures = [],
  { compareRegions = false, regionIds = [] } = {},
) {
  const anySet = new Set(anyFeatures);

  const parts = features
    .filter((featureKey) => {
      if (featureKey === activeVariable) {
        return false;
      }
      if (compareRegions && featureKey === 'region') {
        return false;
      }
      return true;
    })
    .map((featureKey) => {
      const label = PRICING_FEATURE_CATALOG[featureKey]?.label ?? featureKey;

      if (anySet.has(featureKey)) {
        return `${label}: any (typical from your listings)`;
      }

      const value = featureKey === 'region' ? spec.regionId : spec[featureKey];
      return `${label}: ${formatPickerValue(featureKey, value, regionsById)}`;
    });

  if (compareRegions && regionIds.length > 1) {
    const names = regionIds
      .map((id) => regionsById.get(id)?.name)
      .filter(Boolean)
      .join(', ');
    parts.unshift(`Comparing regions: ${names}`);
  }

  return parts.join(' · ');
}

function predictPickerPoint(segment, searchId, spec, regions, regionsById, modelAlgorithm) {
  const region = regionsById.get(spec.regionId) ?? null;
  const listing = buildSyntheticListing(searchId, region, spec);
  return predictFromStoredSegment(segment, listing, {
    criteria: 'all listings you\'ve saved',
    sampleCount: segment.sampleCount,
    modelAlgorithm,
  });
}

function getPickerActiveValue(spec, variable) {
  if (variable === 'region') {
    return spec.focusedRegionId ?? spec.regionId;
  }
  return spec[variable];
}

function interpolateSeriesPrice(points, activeValue, variableType) {
  if (!points?.length || activeValue == null) {
    return null;
  }

  if (variableType === 'boolean' || variableType === 'region') {
    return points.find((point) => point.xValue === activeValue)?.y ?? null;
  }

  const sorted = [...points].sort((a, b) => a.xValue - b.xValue);
  if (activeValue <= sorted[0].xValue) {
    return sorted[0].y;
  }
  if (activeValue >= sorted[sorted.length - 1].xValue) {
    return sorted[sorted.length - 1].y;
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (activeValue >= left.xValue && activeValue <= right.xValue) {
      const t = (activeValue - left.xValue) / (right.xValue - left.xValue);
      return Math.round(left.y + t * (right.y - left.y));
    }
  }

  return null;
}

function buildSweepPoints({
  segment,
  searchId,
  spec,
  variable,
  variableType,
  range,
  regions,
  regionsById,
  modelAlgorithm,
}) {
  const points = [];

  if (variableType === 'boolean') {
    for (const value of [false, true]) {
      const pointSpec = applyPickerVariable(spec, variable, value);
      const prediction = predictPickerPoint(
        segment,
        searchId,
        pointSpec,
        regions,
        regionsById,
        modelAlgorithm,
      );
      if (!prediction.available || prediction.estimatedPrice <= 0) {
        continue;
      }

      points.push({
        x: value ? 'Yes' : 'No',
        xValue: value,
        y: prediction.estimatedPrice,
      });
    }

    return points;
  }

  const { min, max } = range;
  for (let step = 0; step <= PRICE_PICKER_STEPS; step += 1) {
    const raw = min + ((max - min) * step) / PRICE_PICKER_STEPS;
    const value = variable === 'bedrooms' || variable === 'bathrooms'
      ? Math.round(raw * 2) / 2
      : Math.round(raw * 100) / 100;
    const pointSpec = applyPickerVariable(spec, variable, value);
    const prediction = predictPickerPoint(
      segment,
      searchId,
      pointSpec,
      regions,
      regionsById,
      modelAlgorithm,
    );
    if (!prediction.available || prediction.estimatedPrice <= 0) {
      continue;
    }

    points.push({
      x: value,
      xValue: value,
      y: prediction.estimatedPrice,
    });
  }

  return points;
}

function buildPickerSeries({
  segment,
  searchId,
  spec,
  variable,
  variableType,
  regions,
  regionsById,
  range,
  modelAlgorithm,
  selectedRegionIds,
}) {
  if (variableType === 'region') {
    const targetRegions = regions.filter((region) => selectedRegionIds.includes(region.id));
    const points = [];

    for (const region of targetRegions) {
      const pointSpec = applyPickerVariable(spec, 'region', region.id);
      const prediction = predictPickerPoint(
        segment,
        searchId,
        pointSpec,
        regions,
        regionsById,
        modelAlgorithm,
      );
      if (!prediction.available || prediction.estimatedPrice <= 0) {
        continue;
      }

      points.push({
        x: region.name,
        xValue: region.id,
        y: prediction.estimatedPrice,
      });
    }

    return {
      series: points.length
        ? [{ regionId: null, regionName: 'Selected regions', points }]
        : [],
      points,
    };
  }

  const series = [];

  for (const regionId of selectedRegionIds) {
    const region = regionsById.get(regionId);
    if (!region) {
      continue;
    }

    const regionSpec = { ...spec, regionId, focusedRegionId: regionId };
    const points = buildSweepPoints({
      segment,
      searchId,
      spec: regionSpec,
      variable,
      variableType,
      range,
      regions,
      regionsById,
      modelAlgorithm,
    });

    if (points.length) {
      series.push({
        regionId,
        regionName: region.name,
        points,
      });
    }
  }

  const focusedId = spec.focusedRegionId || selectedRegionIds[0];
  const focusedSeries = series.find((item) => item.regionId === focusedId) || series[0];

  return {
    series,
    points: focusedSeries?.points ?? [],
  };
}

function buildPickerPoints({
  segment,
  searchId,
  spec,
  variable,
  variableType,
  regions,
  regionsById,
  range,
  modelAlgorithm,
  selectedRegionIds,
}) {
  return buildPickerSeries({
    segment,
    searchId,
    spec,
    variable,
    variableType,
    regions,
    regionsById,
    range,
    modelAlgorithm,
    selectedRegionIds,
  }).points;
}

export async function computePricePickerSensitivity(
  searchId,
  { spec = {}, variable, modelId = null, anyFeatures = [] },
) {
  if (!variable) {
    throw new Error('variable is required');
  }

  await ensureDefaultPricingModel(searchId);

  const { model, features, modelData, algorithm } = await resolveModelConfig(modelId, searchId);
  if (!features.includes(variable)) {
    throw new Error(`Variable "${variable}" is not in the active pricing model`);
  }

  const modelAlgorithm = algorithm || DEFAULT_PRICING_ALGORITHM;
  const algorithmMeta = PRICING_ALGORITHMS[modelAlgorithm] || PRICING_ALGORITHMS[DEFAULT_PRICING_ALGORITHM];

  const segment = modelData?.segments?.all;
  if (!segment) {
    return {
      available: false,
      variable,
      message: `Need at least ${MIN_TRAINING_SAMPLES} listings with list prices to build the model.`,
      model: model
        ? {
            id: model.id,
            name: model.name,
            features: model.features,
            algorithm: modelAlgorithm,
            algorithmLabel: algorithmMeta.label,
          }
        : null,
      features: features.map((key) => ({
        key,
        label: PRICING_FEATURE_CATALOG[key]?.label ?? key,
        type: pricePickerVariableType(key),
      })),
    };
  }

  const [regions, allListings] = await Promise.all([
    prisma.region.findMany({
      where: { searchId },
      orderBy: { name: 'asc' },
    }),
    prisma.listing.findMany({
      where: { searchId, listPrice: { not: null } },
      include: { region: { select: { id: true, name: true } } },
    }),
  ]);

  const regionsById = new Map(regions.map((region) => [region.id, region]));
  const normalizedListings = allListings.map(normalizeListingForPricing);
  const { defaults, ranges } = computeProfileDefaultsAndRanges(normalizedListings, features);
  const normalizedAnyFeatures = normalizeAnyFeatures(anyFeatures, features, variable);
  const mergedSpec = mergePickerSpec(spec, defaults, regions, normalizedAnyFeatures);
  const variableType = pricePickerVariableType(variable);
  const range = ranges[variable] ?? { min: 0, max: 1 };
  const selectedRegionIds = mergedSpec.regionIds || [];
  const compareRegions = selectedRegionIds.length > 1 && variableType !== 'region';

  const { series, points } = buildPickerSeries({
    segment,
    searchId,
    spec: mergedSpec,
    variable,
    variableType,
    regions,
    regionsById,
    range,
    modelAlgorithm,
    selectedRegionIds,
  });

  const focusedSpec = {
    ...mergedSpec,
    regionId: mergedSpec.focusedRegionId,
  };

  const currentPrediction = predictPickerPoint(
    segment,
    searchId,
    focusedSpec,
    regions,
    regionsById,
    modelAlgorithm,
  );

  const activeValue = getPickerActiveValue(mergedSpec, variable);

  const seriesAtActive = series.map((item) => ({
    regionId: item.regionId,
    regionName: item.regionName,
    estimatedPrice: item.points.length
      ? interpolateSeriesPrice(item.points, activeValue, variableType)
      : null,
  })).filter((item) => item.estimatedPrice != null);

  const hasEnoughPoints = series.some((item) => item.points.length >= 2)
    || (variableType === 'region' && points.length >= 2);

  return {
    available: hasEnoughPoints && (seriesAtActive.length > 0 || currentPrediction.available),
    variable,
    variableLabel: PRICING_FEATURE_CATALOG[variable]?.label ?? variable,
    variableType,
    range: variableType === 'numeric' ? range : null,
    points,
    series,
    regionIds: selectedRegionIds,
    focusedRegionId: mergedSpec.focusedRegionId,
    compareRegions,
    regionCompareNote: compareRegions
      ? 'Each line shows how the estimate changes for the same property profile in a different region — steeper lines mean that detail matters more there.'
      : null,
    spec: mergedSpec,
    defaults,
    ranges,
    anyFeatures: normalizedAnyFeatures,
    anyFeaturesNote: PRICE_PICKER_ANY_NOTE,
    estimatedPrice: currentPrediction.available ? currentPrediction.estimatedPrice : null,
    pricePerAcreNote: computePricePerAcreNote(
      mergedSpec,
      currentPrediction.available ? currentPrediction.estimatedPrice : null,
    ),
    seriesEstimates: seriesAtActive,
    holdingSummary: buildHoldingSummary(
      features,
      mergedSpec,
      variable,
      regionsById,
      normalizedAnyFeatures,
      { compareRegions, regionIds: selectedRegionIds },
    ),
    sampleCount: segment.sampleCount,
    lowConfidence: segment.sampleCount < 8,
    confidenceNote: segment.sampleCount < 8
      ? `Based on only ${segment.sampleCount} ${segment.sampleCount === 1 ? 'home' : 'homes'} — estimates get more reliable as you add listings (aim for 10+).`
      : null,
    algorithm: modelAlgorithm,
    algorithmLabel: algorithmMeta.label,
    pricePickerNote: algorithmMeta.pricePickerNote,
    model: model
      ? {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
          algorithm: modelAlgorithm,
          algorithmLabel: algorithmMeta.label,
        }
      : null,
    features: features.map((key) => ({
      key,
      label: PRICING_FEATURE_CATALOG[key]?.label ?? key,
      type: pricePickerVariableType(key),
    })),
    message: !hasEnoughPoints
      ? 'Could not draw a sensitivity line for this variable with the current data.'
      : currentPrediction.available || seriesAtActive.length
        ? null
        : currentPrediction.message,
  };
}

function roundFriendlyDollars(value) {
  if (!value || value <= 0) {
    return 0;
  }

  if (value >= 100_000) {
    return Math.round(value / 10_000) * 10_000;
  }

  if (value >= 25_000) {
    return Math.round(value / 5_000) * 5_000;
  }

  if (value >= 5_000) {
    return Math.round(value / 1_000) * 1_000;
  }

  return Math.round(value / 100) * 100;
}

function typicalErrorFromPoints(points) {
  if (!points?.length) {
    return null;
  }

  const errors = points
    .map((point) => Math.abs(point.predicted - point.actual))
    .filter((value) => Number.isFinite(value));

  if (!errors.length) {
    return null;
  }

  return errors.reduce((sum, value) => sum + value, 0) / errors.length;
}

function medianValue(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function listingFitLabel(listing) {
  const parts = [listing.address, listing.city].filter(Boolean);
  if (parts.length) {
    return parts.join(', ');
  }

  return listing.region?.name || 'Saved listing';
}

export function summarizeModelFitInPlainLanguage(metrics, sampleCount, points = []) {
  if (sampleCount < MIN_TRAINING_SAMPLES) {
    return {
      tone: 'warning',
      headline: 'Not enough data yet',
      detail: `Need at least ${MIN_TRAINING_SAMPLES} priced listings before fit feedback is meaningful.`,
      typicalError: null,
      sampleCount,
    };
  }

  const rawError = metrics?.mae ?? typicalErrorFromPoints(points);
  const typicalError = rawError != null ? roundFriendlyDollars(rawError) : null;
  const errorPhrase = typicalError
    ? formatCurrencyAbs(typicalError)
    : null;

  const actuals = points.map((point) => point.actual).filter((value) => value > 0);
  const medianPrice = medianValue(actuals);
  const errorRatio = typicalError && medianPrice ? typicalError / medianPrice : null;

  // Internal fit quality — never exposed to the client.
  const fitScore = metrics?.r2;

  let tone = 'good';
  let headline = 'Estimates track your list prices fairly closely';
  let detail = errorPhrase
    ? `On your saved homes, estimates were typically within about ${errorPhrase} of list price.`
    : 'This model lines up reasonably well with list prices on your saved homes.';

  if (sampleCount < 8) {
    tone = 'caution';
    headline = 'Limited data';
    detail = `Based on only ${sampleCount} ${sampleCount === 1 ? 'home' : 'homes'} — add more priced listings for steadier estimates. ${
      errorPhrase ? `So far, typical gap is about ${errorPhrase}.` : ''
    }`.trim();
  }

  if (fitScore != null && fitScore < 0.25) {
    tone = 'warning';
    headline = 'Estimates vary quite a bit';
    detail = `List prices spread wider than this model captures. Try adding more listings, simplifying features, or switching estimation style.${
      errorPhrase ? ` Typical gap: about ${errorPhrase}.` : ''
    }`;
  } else if (fitScore != null && fitScore < 0.55 && tone !== 'warning') {
    tone = 'caution';
    headline = 'Rough ballpark only';
    detail = `The model catches broad trends but can miss on individual homes.${
      errorPhrase ? ` Typical gap: about ${errorPhrase}.` : ' More listings help.'
    }`;
  } else if (errorRatio != null && errorRatio > 0.35 && tone === 'good') {
    tone = 'caution';
    headline = 'Wide spread on list prices';
    detail = `Your saved homes vary a lot in price, so estimates may be off on any single listing.${
      errorPhrase ? ` Typical gap: about ${errorPhrase}.` : ''
    }`;
  }

  return {
    tone,
    headline,
    detail,
    typicalError,
    sampleCount,
  };
}

export async function getPricingModelFitFeedback(searchId, modelId) {
  const model = await prisma.pricingModel.findFirst({
    where: { id: modelId, searchId },
  });

  if (!model) {
    return null;
  }

  const segment = model.modelData?.segments?.all;
  if (!segment) {
    return {
      available: false,
      segment: 'all',
      message: `Need at least ${MIN_TRAINING_SAMPLES} priced listings to show how this model fits your data.`,
    };
  }

  const listings = await prisma.listing.findMany({
    where: { searchId, listPrice: { not: null } },
    include: { region: { select: { id: true, name: true } } },
    orderBy: { updatedAt: 'desc' },
  });

  const modelAlgorithm = model.algorithm || DEFAULT_PRICING_ALGORITHM;
  const points = [];

  for (const listing of listings) {
    const prediction = predictFromStoredSegment(segment, listing, {
      criteria: 'all listings you\'ve saved',
      sampleCount: segment.sampleCount,
      modelAlgorithm,
    });

    if (!prediction.available || prediction.estimatedPrice <= 0) {
      continue;
    }

    points.push({
      id: listing.id,
      label: listingFitLabel(listing),
      actual: Number(listing.listPrice),
      predicted: prediction.estimatedPrice,
    });
  }

  const summary = summarizeModelFitInPlainLanguage(segment.metrics, segment.sampleCount, points);
  const mixedVacancy = hasMixedVacancy(listings);
  const usesVacantInteractions = segmentHasVacantLotInteractions(segment.columns);
  const usesSparseInteractions = segmentHasSparseInteractions(segment.columns);
  const usesRidge = segment.regressionMethod === 'ridge';

  let mixedListingNote = null;
  if (mixedVacancy && usesVacantInteractions) {
    mixedListingNote =
      'Your saved listings mix vacant lots and homes — lot size and waterfront can move price differently on land vs structures.';
  } else if (mixedVacancy && model.features?.includes('isVacantLot')) {
    mixedListingNote =
      'You have both vacant lots and homes saved. Retrain this model to learn separate land pricing.';
  }

  let stabilizationNote = null;
  if (usesRidge) {
    stabilizationNote =
      'You have many regions or features relative to your listing count — estimates are smoothed to stay stable.';
  } else if (usesSparseInteractions) {
    const interaction = segment.sparseInteractions?.[0];
    if (interaction?.leftFeatureKey === 'waterfront' && interaction?.rightFeatureKey === 'acres') {
      stabilizationNote =
        'Waterfront premium varies with lot size on your saved listings — the model learned that combined effect.';
    } else if (interaction?.leftFeatureKey === 'waterfront' && interaction?.rightFeatureKey === 'sqftLiving') {
      stabilizationNote =
        'Waterfront premium varies with house size on your saved listings — the model learned that combined effect.';
    }
  }

  return {
    available: points.length >= MIN_TRAINING_SAMPLES,
    segment: 'all',
    segmentLabel: 'All listings',
    summary,
    points,
    mixedListingNote,
    stabilizationNote,
    message: points.length < MIN_TRAINING_SAMPLES
      ? 'Not enough priced listings with complete details to chart model fit.'
      : null,
  };
}
