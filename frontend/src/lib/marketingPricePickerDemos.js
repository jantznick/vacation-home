const SWEEP_STEPS = 36;

function logSize(value, floor = 0.1) {
  return Math.log(Math.max(value, floor));
}

function sweepValues(min, max, steps = SWEEP_STEPS) {
  if (min === max) {
    return [min];
  }

  const values = [];
  for (let index = 0; index <= steps; index += 1) {
    values.push(min + ((max - min) * index) / steps);
  }

  return values;
}

function formatSweepLabel(variable, value) {
  if (variable === 'waterfront' || variable === 'isVacantLot') {
    return value ? 'Yes' : 'No';
  }

  if (variable === 'sqftLiving' || variable === 'sqftLot') {
    return Number(value).toLocaleString('en-US');
  }

  if (variable === 'acres') {
    return Number(value) % 1 === 0 ? String(value) : Number(value).toFixed(1);
  }

  return String(value);
}

function formatCompactDelta(value) {
  const abs = Math.abs(Math.round(value));
  if (abs >= 1_000_000) {
    return `$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${Math.round(abs / 1_000)}k`;
  }
  return `$${abs.toLocaleString('en-US')}`;
}

function estimateFromCoeffs(spec, coeffs) {
  if (spec.isVacantLot) {
    return Math.round(
      coeffs.base
      + logSize(spec.acres) * coeffs.acres
      + (spec.waterfront ? coeffs.waterfront : 0),
    );
  }

  return Math.round(
    coeffs.base
    + logSize(spec.acres) * (coeffs.acres ?? 0)
    + spec.sqftLiving * (coeffs.sqftLinear ?? 0)
    + (spec.bedrooms ?? 0) * (coeffs.bedrooms ?? 0)
    + (spec.bathrooms ?? 0) * (coeffs.bathrooms ?? 0)
    + (spec.waterfront ? coeffs.waterfront : 0),
  );
}

const FOREST_DEMO = {
  modelName: 'North woods default',
  algorithmLabel: 'Diminishing size effect',
  sampleCount: 14,
  pricePickerNote:
    'Illustrative curves from a typical north woods search — the same slider can move price faster in one town than another.',
  comparePrompt:
    'All three regions are selected so you can see how lot size, waterfront, and house size land differently on each lake market.',
  regions: [
    { id: 'eagle-river', name: 'Eagle River' },
    { id: 'minocqua', name: 'Minocqua' },
    { id: 'boulder-junction', name: 'Boulder Junction' },
  ],
  defaultRegionIds: ['eagle-river', 'minocqua', 'boulder-junction'],
  defaultSpec: {
    acres: 2.1,
    sqftLiving: 2840,
    bedrooms: 4,
    bathrooms: 3,
    waterfront: true,
    isVacantLot: false,
  },
  defaultVariable: 'acres',
  features: [
    { key: 'acres', label: 'Lot size (acres)', type: 'numeric' },
    { key: 'sqftLiving', label: 'House size (sqft)', type: 'numeric' },
    { key: 'waterfront', label: 'Waterfront', type: 'boolean' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'numeric' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'numeric' },
  ],
  ranges: {
    acres: { min: 0.5, max: 8 },
    sqftLiving: { min: 1200, max: 4200 },
    bedrooms: { min: 2, max: 5 },
    bathrooms: { min: 1, max: 4 },
  },
  regionCoeffs: {
    'eagle-river': {
      base: 168_000,
      acres: 42_000,
      sqftLinear: 88,
      bedrooms: 11_500,
      bathrooms: 14_000,
      waterfront: 72_000,
    },
    minocqua: {
      base: 130_000,
      acres: 28_000,
      sqftLinear: 102,
      bedrooms: 12_000,
      bathrooms: 14_500,
      waterfront: 135_000,
    },
    'boulder-junction': {
      base: 200_000,
      acres: 78_000,
      sqftLinear: 72,
      bedrooms: 10_000,
      bathrooms: 12_000,
      waterfront: 58_000,
    },
  },
  variableStories: {
    acres:
      'Boulder Junction reacts sharply to lot size — extra acres matter more there than in Minocqua, where house size and waterfront often dominate.',
    sqftLiving:
      'Minocqua moves fastest with house size; Boulder Junction is more of a land market on this profile.',
    waterfront:
      'Waterfront premiums run highest around Minocqua on this demo profile — Eagle River and Boulder Junction respond, but less dramatically.',
  },
  estimate(spec, regionId) {
    return estimateFromCoeffs(spec, this.regionCoeffs[regionId] ?? this.regionCoeffs['eagle-river']);
  },
};

const BEACH_DEMO = {
  modelName: 'Coastal default',
  algorithmLabel: 'Diminishing size effect',
  sampleCount: 22,
  pricePickerNote:
    'Coastal markets rarely move in parallel — gulf-front premiums and square footage hit differently by town.',
  comparePrompt:
    'Compare Destin, 30A, and Panama City Beach — switch between sqft, waterfront, and lot size to see which town cares about what.',
  regions: [
    { id: 'destin', name: 'Destin' },
    { id: '30a', name: '30A / Rosemary' },
    { id: 'panama-city', name: 'Panama City Beach' },
  ],
  defaultRegionIds: ['destin', '30a', 'panama-city'],
  defaultSpec: {
    acres: 0.18,
    sqftLiving: 2150,
    bedrooms: 3,
    bathrooms: 2,
    waterfront: true,
    isVacantLot: false,
  },
  defaultVariable: 'sqftLiving',
  features: [
    { key: 'sqftLiving', label: 'House size (sqft)', type: 'numeric' },
    { key: 'waterfront', label: 'Waterfront', type: 'boolean' },
    { key: 'acres', label: 'Lot size (acres)', type: 'numeric' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'numeric' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'numeric' },
  ],
  ranges: {
    sqftLiving: { min: 1100, max: 3400 },
    bedrooms: { min: 2, max: 5 },
    bathrooms: { min: 1, max: 4 },
    acres: { min: 0.08, max: 0.6 },
  },
  regionCoeffs: {
    destin: {
      base: 410_000,
      sqftLiving: 0.14,
      acres: 42_000,
      bedrooms: 18_000,
      bathrooms: 22_000,
      waterfront: 95_000,
    },
    '30a': {
      base: 555_000,
      sqftLiving: 0.22,
      acres: 28_000,
      bedrooms: 22_000,
      bathrooms: 26_000,
      waterfront: 195_000,
    },
    'panama-city': {
      base: 315_000,
      sqftLiving: 0.09,
      acres: 35_000,
      bedrooms: 14_000,
      bathrooms: 18_000,
      waterfront: 62_000,
    },
  },
  variableStories: {
    sqftLiving:
      '30A reacts steeply to square footage — the same floor plan gains more value there than in Panama City Beach.',
    waterfront:
      'Flipping waterfront matters most on 30A in this demo; Destin moves too, but Panama City Beach is relatively flat on water access.',
    acres:
      'Lot size is a smaller lever on this coastal profile — try sqft or waterfront to see bigger spreads between towns.',
  },
  estimate(spec, regionId) {
    const coeffs = this.regionCoeffs[regionId] ?? this.regionCoeffs.destin;
    return Math.round(
      coeffs.base
      + logSize(spec.sqftLiving, 100) * coeffs.sqftLiving
      + logSize(spec.acres, 0.05) * coeffs.acres
      + spec.bedrooms * coeffs.bedrooms
      + spec.bathrooms * coeffs.bathrooms
      + (spec.waterfront ? coeffs.waterfront : -35_000),
    );
  },
};

const SKI_DEMO = {
  modelName: 'Ski town default',
  algorithmLabel: 'Diminishing size effect',
  sampleCount: 18,
  pricePickerNote:
    'Resort towns price proximity and size differently — Breckenridge and Keystone rarely slope the same way.',
  comparePrompt:
    'Breckenridge, Keystone, and Frisco are all selected — slide house size or year built to see which resort cares more.',
  regions: [
    { id: 'breckenridge', name: 'Breckenridge' },
    { id: 'keystone', name: 'Keystone' },
    { id: 'frisco', name: 'Frisco' },
  ],
  defaultRegionIds: ['breckenridge', 'keystone', 'frisco'],
  defaultSpec: {
    acres: 0.22,
    sqftLiving: 2620,
    bedrooms: 4,
    bathrooms: 3,
    waterfront: false,
    isVacantLot: false,
    yearBuilt: 2008,
  },
  defaultVariable: 'sqftLiving',
  features: [
    { key: 'sqftLiving', label: 'House size (sqft)', type: 'numeric' },
    { key: 'yearBuilt', label: 'Year built', type: 'numeric' },
    { key: 'bedrooms', label: 'Bedrooms', type: 'numeric' },
    { key: 'bathrooms', label: 'Bathrooms', type: 'numeric' },
    { key: 'acres', label: 'Lot size (acres)', type: 'numeric' },
  ],
  ranges: {
    sqftLiving: { min: 1400, max: 3800 },
    bedrooms: { min: 2, max: 6 },
    bathrooms: { min: 2, max: 5 },
    yearBuilt: { min: 1975, max: 2022 },
    acres: { min: 0.1, max: 1.2 },
  },
  regionCoeffs: {
    breckenridge: {
      base: 720_000,
      sqftLiving: 0.24,
      acres: 38_000,
      bedrooms: 28_000,
      bathrooms: 32_000,
      yearBuilt: 2_400,
    },
    keystone: {
      base: 555_000,
      sqftLiving: 0.15,
      acres: 22_000,
      bedrooms: 22_000,
      bathrooms: 26_000,
      yearBuilt: 1_200,
    },
    frisco: {
      base: 510_000,
      sqftLiving: 0.12,
      acres: 18_000,
      bedrooms: 20_000,
      bathrooms: 24_000,
      yearBuilt: 900,
    },
  },
  variableStories: {
    sqftLiving:
      'Breckenridge slopes steeply with size — Keystone and Frisco gain value too, but a bigger house buys less extra premium there.',
    yearBuilt:
      'Newer builds matter far more in Breckenridge on this profile; Frisco is comparatively flat on year built.',
    acres:
      'Lot size is a secondary lever in these ski towns — try sqft or year built for clearer separation between lines.',
  },
  estimate(spec, regionId) {
    const coeffs = this.regionCoeffs[regionId] ?? this.regionCoeffs.breckenridge;
    const agePremium = Math.max(0, spec.yearBuilt - 1990) * coeffs.yearBuilt;
    return Math.round(
      coeffs.base
      + logSize(spec.sqftLiving, 100) * coeffs.sqftLiving
      + logSize(spec.acres, 0.08) * coeffs.acres
      + spec.bedrooms * coeffs.bedrooms
      + spec.bathrooms * coeffs.bathrooms
      + agePremium,
    );
  },
};

export const MARKETING_PRICE_PICKER_DEMOS = {
  forest: FOREST_DEMO,
  beach: BEACH_DEMO,
  ski: SKI_DEMO,
};

function applyVariable(spec, variable, value) {
  const next = { ...spec, [variable]: value };

  if (variable === 'isVacantLot' && value) {
    next.sqftLiving = 0;
    next.bedrooms = 0;
    next.bathrooms = 0;
  }

  return next;
}

function buildPoints(demo, spec, variable, regionId) {
  const feature = demo.features.find((item) => item.key === variable);
  const variableType = feature?.type ?? 'numeric';

  if (variableType === 'boolean') {
    return [false, true].map((value) => ({
      x: value ? 'Yes' : 'No',
      xValue: value,
      y: demo.estimate(applyVariable(spec, variable, value), regionId),
    }));
  }

  const range = demo.ranges[variable] ?? { min: 0, max: 1 };
  return sweepValues(range.min, range.max).map((value) => ({
    x: formatSweepLabel(variable, value),
    xValue: value,
    y: demo.estimate(applyVariable(spec, variable, value), regionId),
  }));
}

function measureSeriesSpread(points) {
  if (!points?.length) {
    return 0;
  }

  const prices = points.map((point) => point.y);
  return Math.max(...prices) - Math.min(...prices);
}

export function computeMarketingSensitivityInsight(demo, spec, variable, regionIds) {
  if (regionIds.length < 2) {
    return null;
  }

  const feature = demo.features.find((item) => item.key === variable);
  const variableLabel = feature?.label ?? variable;

  const ranked = regionIds
    .map((regionId) => {
      const points = buildPoints(demo, spec, variable, regionId);
      const spread = measureSeriesSpread(points);
      return {
        regionId,
        regionName: demo.regions.find((region) => region.id === regionId)?.name ?? regionId,
        spread,
        lowPrice: Math.min(...points.map((point) => point.y)),
        highPrice: Math.max(...points.map((point) => point.y)),
      };
    })
    .sort((left, right) => right.spread - left.spread);

  const steepest = ranked[0];
  const flattest = ranked[ranked.length - 1];

  if (!steepest?.spread || steepest.spread - flattest.spread < 15_000) {
    return null;
  }

  const story = demo.variableStories?.[variable];
  const ratio = flattest.spread > 0
    ? Math.round(steepest.spread / flattest.spread)
    : null;

  return {
    variable,
    variableLabel,
    headline: `${steepest.regionName} is most affected by ${variableLabel.toLowerCase()}`,
    detail: story
      || `Across the range shown, estimates in ${steepest.regionName} swing about ${formatCompactDelta(steepest.spread)} vs ${formatCompactDelta(flattest.spread)} in ${flattest.regionName}${ratio && ratio >= 2 ? ` — roughly ${ratio}× the movement` : ''}.`,
    ranked,
    steepestRegionId: steepest.regionId,
    flattestRegionId: flattest.regionId,
  };
}

export function buildMarketingPricePickerState(demo, {
  spec,
  regionIds,
  focusedRegionId,
  variable,
}) {
  const compareRegions = regionIds.length > 1;
  const feature = demo.features.find((item) => item.key === variable);
  const variableType = feature?.type ?? 'numeric';
  const range = demo.ranges[variable] ?? null;

  const series = regionIds.map((regionId) => {
    const points = buildPoints(demo, spec, variable, regionId);
    return {
      regionId,
      regionName: demo.regions.find((region) => region.id === regionId)?.name ?? regionId,
      points,
      spread: measureSeriesSpread(points),
    };
  });

  const points = compareRegions ? [] : series[0]?.points ?? [];

  const activeValue = spec[variable];
  const focusedRegion = focusedRegionId || regionIds[0];
  const sensitivityInsight = computeMarketingSensitivityInsight(demo, spec, variable, regionIds);

  return {
    variable,
    variableLabel: feature?.label ?? variable,
    variableType,
    range,
    points,
    series,
    compareRegions,
    regionCompareNote: compareRegions
      ? 'Steeper lines mean that detail moves price more in that region. Flatter lines mean other factors dominate there.'
      : null,
    comparePrompt: demo.comparePrompt,
    sensitivityInsight,
    focusedRegionId: focusedRegion,
    pricePickerNote: demo.pricePickerNote,
    model: {
      name: demo.modelName,
      algorithmLabel: demo.algorithmLabel,
    },
    sampleCount: demo.sampleCount,
    holdingSummary: buildHoldingSummary(demo, spec, variable, regionIds, compareRegions),
  };
}

function buildHoldingSummary(demo, spec, activeVariable, regionIds, compareRegions) {
  const parts = [];

  if (compareRegions) {
    const names = regionIds
      .map((id) => demo.regions.find((region) => region.id === id)?.name)
      .filter(Boolean)
      .join(', ');
    parts.push(`Comparing regions: ${names}`);
  }

  for (const feature of demo.features) {
    if (feature.key === activeVariable) {
      continue;
    }

    const value = spec[feature.key];
    if (feature.type === 'boolean') {
      parts.push(`${feature.label}: ${value ? 'Yes' : 'No'}`);
    } else if (feature.key === 'acres') {
      parts.push(`${feature.label}: ${value} acres`);
    } else if (feature.key === 'sqftLiving') {
      parts.push(`${feature.label}: ${Number(value).toLocaleString('en-US')} sq ft`);
    } else if (feature.key === 'yearBuilt') {
      parts.push(`${feature.label}: ${value}`);
    } else {
      parts.push(`${feature.label}: ${value}`);
    }
  }

  return parts.join(' · ');
}

export function getMarketingPricePickerDemo(scenarioId) {
  return MARKETING_PRICE_PICKER_DEMOS[scenarioId] ?? MARKETING_PRICE_PICKER_DEMOS.forest;
}
