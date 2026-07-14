/**
 * Shared boat-model encyclopedia / sailboatdata field helpers.
 */

export const BOAT_MODEL_SPEC_KEYS = [
  'hullType',
  'rigType',
  'loaFt',
  'lwlFt',
  'beamFt',
  'draftFt',
  'displacementLb',
  'ballastLb',
  'ballastRatio',
  'sailAreaSqFt',
  'construction',
  'designer',
  'builder',
  'firstBuilt',
  'lastBuilt',
  'builtCount',
  'saDispl',
  'dispLen',
  'comfortRatio',
  'capsizeRatio',
  'hullSpeedKn',
  'engineMake',
  'engineType',
  'engineHp',
  'fuelGal',
  'waterGal',
  'sailboatDataUrl',
  'sailboatDataFetchedAt',
];

export const BOAT_MODEL_PATCH_KEYS = [
  'name',
  'description',
  'pros',
  'cons',
  'notes',
  ...BOAT_MODEL_SPEC_KEYS,
];

/** Prisma select shape for cascading model specs onto listings. */
export const boatModelSpecSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  pros: true,
  cons: true,
  notes: true,
  makeId: true,
  hullType: true,
  rigType: true,
  loaFt: true,
  lwlFt: true,
  beamFt: true,
  draftFt: true,
  displacementLb: true,
  ballastLb: true,
  ballastRatio: true,
  sailAreaSqFt: true,
  construction: true,
  designer: true,
  builder: true,
  firstBuilt: true,
  lastBuilt: true,
  builtCount: true,
  saDispl: true,
  dispLen: true,
  comfortRatio: true,
  capsizeRatio: true,
  hullSpeedKn: true,
  engineMake: true,
  engineType: true,
  engineHp: true,
  fuelGal: true,
  waterGal: true,
  sailboatDataUrl: true,
  sailboatDataFetchedAt: true,
};

export function pickBoatModelPatch(body = {}) {
  const data = {};
  for (const key of BOAT_MODEL_PATCH_KEYS) {
    if (body[key] !== undefined) {
      data[key] = body[key];
    }
  }
  return data;
}

export function boatModelHasSpecs(model) {
  if (!model) return false;
  return BOAT_MODEL_SPEC_KEYS.some((key) => {
    if (key === 'sailboatDataUrl' || key === 'sailboatDataFetchedAt') return false;
    return model[key] != null && model[key] !== '';
  });
}
