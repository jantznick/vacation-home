/** Shared vacation asset-type constants (backend). */

export const ASSET_TYPES = {
  home: {
    key: 'home',
    label: 'Homes',
    singular: 'home',
    listingLabel: 'listing',
    supportsRegions: true,
    supportsLakes: true,
  },
  boat: {
    key: 'boat',
    label: 'Boats',
    singular: 'boat',
    listingLabel: 'boat',
    supportsRegions: false,
    supportsLakes: false,
  },
  rv: {
    key: 'rv',
    label: 'RVs',
    singular: 'RV',
    listingLabel: 'RV',
    supportsRegions: false,
    supportsLakes: false,
  },
};

export const ASSET_TYPE_KEYS = Object.keys(ASSET_TYPES);

export const BOAT_PROPULSIONS = {
  sail: { key: 'sail', label: 'Sail' },
  motor: { key: 'motor', label: 'Motor' },
  other: { key: 'other', label: 'Other' },
};

export const BOAT_PROPULSION_KEYS = Object.keys(BOAT_PROPULSIONS);

export function isAssetType(value) {
  return ASSET_TYPE_KEYS.includes(value);
}

export function assetTypeMeta(assetType) {
  return ASSET_TYPES[assetType] || ASSET_TYPES.home;
}

export function supportsRegions(assetType) {
  return assetTypeMeta(assetType).supportsRegions;
}

export function isBoatSearch(assetType) {
  return assetType === 'boat';
}

export function normalizeAssetType(value) {
  if (isAssetType(value)) {
    return value;
  }
  return 'home';
}

export function normalizePropulsion(value, { fallback = 'sail' } = {}) {
  if (BOAT_PROPULSION_KEYS.includes(value)) {
    return value;
  }
  return fallback;
}
