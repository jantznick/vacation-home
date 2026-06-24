import { MultivariateLinearRegression } from 'ml-regression';
import prisma from '../../lib/prisma.js';
import { serializeListing } from '../../lib/listingHelpers.js';
import { compCriteriaDescription, findComps } from '../../lib/listingAnalysis.js';
import {
  PRICING_FEATURE_CATALOG,
  PRICING_FEATURE_KEYS,
  DEFAULT_PRICING_FEATURES,
  buildTrainingMatrix,
  computeRegressionMetrics,
  validateFeatureKeys,
  vectorizeListing,
} from '../../lib/pricingFeatures.js';

const MIN_TRAINING_SAMPLES = 3;

function emptySegmentStore() {
  return {
    algorithm: 'linear_regression',
    segments: {
      all: null,
      regions: {},
      similar: {},
    },
  };
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

function fitSegment(poolListings, features) {
  const matrix = buildTrainingMatrix(poolListings.map(normalizeListingForPricing), features);

  if (matrix.sampleCount < MIN_TRAINING_SAMPLES) {
    return null;
  }

  const targets2d = matrix.targets.map((price) => [price]);
  const regression = new MultivariateLinearRegression(matrix.rows, targets2d);
  const predictions = matrix.rows.map((row) => regression.predict(row)[0]);
  const metrics = computeRegressionMetrics(matrix.targets, predictions);

  return {
    trainedAt: new Date().toISOString(),
    sampleCount: matrix.sampleCount,
    columns: matrix.columns,
    regionIds: matrix.regionIds,
    imputeMeans: matrix.imputeMeans,
    regressionModel: regression.toJSON(),
    metrics,
  };
}

function predictFromStoredSegment(segment, targetListing, { criteria, sampleCount }) {
  const normalized = normalizeListingForPricing(targetListing);
  const vector = vectorizeListing(normalized, segment.columns, { imputeMeans: segment.imputeMeans });

  if (!vector) {
    return {
      criteria,
      sampleCount: sampleCount ?? segment.sampleCount,
      available: false,
      message: 'Add more property details (acres, beds, sqft, etc.) to get an estimate.',
    };
  }

  const regression = MultivariateLinearRegression.load(segment.regressionModel);
  const predicted = regression.predict(vector)[0];

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

function tierFromStoredSegment(segment, listing, { title, criteria, emptyMessage }) {
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
    }),
  };
}

function buildListingTiersFromStoredModel(listing, modelData) {
  const regionName = listing.region?.name ?? 'this region';
  const target = normalizeListingForPricing(listing);
  const segments = modelData?.segments ?? {};

  return {
    allListings: tierFromStoredSegment(segments.all, listing, {
      title: 'All listings',
      criteria: 'all listings you\'ve saved',
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings with list prices.`,
    }),
    region: tierFromStoredSegment(segments.regions?.[listing.regionId], listing, {
      title: `All in ${regionName}`,
      criteria: `all listings in ${regionName}`,
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} listings in ${regionName} with list prices.`,
    }),
    similar: tierFromStoredSegment(segments.similar?.[listing.id], listing, {
      title: 'Similar listings',
      criteria: compCriteriaDescription(target),
      emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} similar listings with list prices.`,
    }),
  };
}

function predictFromPool(targetListing, poolListings, features, { criteria, emptyMessage }) {
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

  const matrix = buildTrainingMatrix(poolListings.map(normalizeListingForPricing), features);
  const normalized = normalizeListingForPricing(targetListing);
  const vector = vectorizeListing(normalized, matrix.columns, { imputeMeans: matrix.imputeMeans });

  if (!vector) {
    return {
      criteria,
      sampleCount: poolListings.length,
      available: false,
      message: 'Add more property details (acres, beds, sqft, etc.) to get an estimate.',
    };
  }

  const targets2d = matrix.targets.map((price) => [price]);
  const regression = new MultivariateLinearRegression(matrix.rows, targets2d);
  const predicted = regression.predict(vector)[0];

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
  if (modelId) {
    const model = await prisma.pricingModel.findUnique({ where: { id: modelId } });
    if (model?.features) {
      return {
        model: {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
          modelData: model.modelData,
        },
        features: validateFeatureKeys(model.features),
        modelData: model.modelData || emptySegmentStore(),
      };
    }
  }

  const defaultModel = await prisma.pricingModel.findFirst({
    where: searchId ? { searchId, isDefault: true } : { isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });

  if (defaultModel?.features) {
    return {
      model: {
        id: defaultModel.id,
        name: defaultModel.name,
        trainedAt: defaultModel.trainedAt,
        features: defaultModel.features,
        modelData: defaultModel.modelData,
      },
      features: validateFeatureKeys(defaultModel.features),
      modelData: defaultModel.modelData || emptySegmentStore(),
    };
  }

  return {
    model: null,
    features: DEFAULT_PRICING_FEATURES,
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

function trainSimilarSegment(targetListing, allListings, features) {
  const normalized = normalizeListingForPricing(targetListing);
  const serialized = allListings.map(normalizeListingForPricing);
  const compIds = new Set(findComps(normalized, serialized).map((comp) => comp.id));
  compIds.add(targetListing.id);
  const pool = allListings.filter((listing) => compIds.has(listing.id));
  return fitSegment(pool, features);
}

export async function ensureDefaultPricingModel(searchId) {
  const defaultModel = await prisma.pricingModel.findFirst({
    where: { searchId, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (defaultModel) {
    return defaultModel;
  }

  const anyModel = await prisma.pricingModel.findFirst({
    where: { searchId },
    orderBy: { createdAt: 'asc' },
  });
  if (anyModel) {
    return anyModel;
  }

  return prisma.pricingModel.create({
    data: {
      searchId,
      name: 'Default',
      description: 'Built-in north woods feature set (lot, house, beds/baths, waterfront, region)',
      features: DEFAULT_PRICING_FEATURES,
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
  const allListings = await prisma.listing.findMany({
    where: { searchId: model.searchId },
    include: { region: { select: { id: true, name: true } } },
  });
  const priced = pricedListings(allListings);
  const existingData = model.modelData || emptySegmentStore();
  const segments = {
    all: fitSegment(priced, features),
    regions: { ...existingData.segments?.regions },
    similar: { ...existingData.segments?.similar },
  };

  const regionIds = [...new Set(priced.map((listing) => listing.regionId).filter(Boolean))];
  for (const regionId of regionIds) {
    const pool = priced.filter((listing) => listing.regionId === regionId);
    const segment = fitSegment(pool, features);
    if (segment) {
      segments.regions[regionId] = segment;
    } else {
      delete segments.regions[regionId];
    }
  }

  for (const listing of allListings) {
    const segment = trainSimilarSegment(listing, allListings, features);
    if (segment) {
      segments.similar[listing.id] = segment;
    } else {
      delete segments.similar[listing.id];
    }
  }

  const modelData = {
    algorithm: 'linear_regression',
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
    const existingData = model.modelData || emptySegmentStore();
    const segments = {
      all: fitSegment(priced, features),
      regions: { ...existingData.segments?.regions },
      similar: { ...existingData.segments?.similar },
    };

    for (const deletedId of deletedListingIds) {
      delete segments.similar[deletedId];
    }

    const regionsToRetrain = new Set(regionIds);

    for (const regionId of regionsToRetrain) {
      const pool = priced.filter((listing) => listing.regionId === regionId);
      const segment = fitSegment(pool, features);
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

      const segment = trainSimilarSegment(listing, allListings, features);
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
          algorithm: 'linear_regression',
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

export async function createPricingModel({ searchId, name, description, features, isDefault = false }) {
  const validatedFeatures = validateFeatureKeys(features);

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
      isDefault,
    },
  });

  return trainAllSegmentsForModel(model.id);
}

export async function updatePricingModel(id, { name, description, features, isDefault }) {
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
    data.modelData = emptySegmentStore();
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

  const pricedCount = await prisma.listing.count({
    where: { searchId: listing.searchId, listPrice: { not: null } },
  });
  const defaultModel = await prisma.pricingModel.findFirst({
    where: { searchId: listing.searchId, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (
    pricedCount >= MIN_TRAINING_SAMPLES
    && defaultModel
    && !defaultModel.modelData?.segments?.all
  ) {
    await trainAllSegmentsForModel(defaultModel.id);
  }

  let { model, modelData } = await resolveModelConfig(modelId, listing.searchId);
  const tiers = buildListingTiersFromStoredModel(listing, modelData);

  return {
    listing: serializeListing(listing),
    model: model
      ? {
          id: model.id,
          name: model.name,
          trainedAt: model.trainedAt,
          features: model.features,
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
  const isVacantLot = Boolean(spec.isVacantLot);

  return normalizeListingForPricing({
    id: '__hypothetical__',
    searchId,
    regionId: region?.id ?? null,
    listPrice: null,
    isVacantLot,
    acres: spec.acres ?? null,
    sqftLiving: isVacantLot ? 0 : (spec.sqftLiving ?? null),
    sqftLot: spec.sqftLot ?? null,
    bedrooms: isVacantLot ? null : (spec.bedrooms ?? null),
    bathrooms: isVacantLot ? null : (spec.bathrooms ?? null),
    waterfront: Boolean(spec.waterfront),
    yearBuilt: isVacantLot ? null : (spec.yearBuilt ?? null),
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

  const pricedCount = await prisma.listing.count({
    where: { searchId, listPrice: { not: null } },
  });
  const defaultModel = await prisma.pricingModel.findFirst({
    where: { searchId, isDefault: true },
    orderBy: { updatedAt: 'desc' },
  });
  if (
    pricedCount >= MIN_TRAINING_SAMPLES
    && defaultModel
    && !defaultModel.modelData?.segments?.all
  ) {
    await trainAllSegmentsForModel(defaultModel.id);
  }

  const { model, features: modelFeatures } = await resolveModelConfig(modelId);
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
      }),
    },
    similar: {
      title: similarTitle,
      ...predictFromPool(syntheticListing, similarPool, features, {
        criteria: similarCriteria,
        emptyMessage: `Need at least ${MIN_TRAINING_SAMPLES} similar listings with list prices.`,
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
