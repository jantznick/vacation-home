/** Shared vacation asset-type constants (frontend). */

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
    supportsBoatMakes: true,
    supportsMarinas: true,
  },
  rv: {
    key: 'rv',
    label: 'RVs',
    singular: 'RV',
    listingLabel: 'RV',
    supportsRegions: false,
    supportsLakes: false,
    supportsBoatMakes: false,
    supportsMarinas: false,
  },
};

export const ASSET_TYPE_OPTIONS = [
  ASSET_TYPES.home,
  ASSET_TYPES.boat,
];

export const BOAT_PROPULSIONS = [
  { value: 'sail', label: 'Sail' },
  { value: 'motor', label: 'Motor' },
  { value: 'other', label: 'Other' },
];

export function assetTypeMeta(assetType) {
  return ASSET_TYPES[assetType] || ASSET_TYPES.home;
}

export function supportsRegions(assetType) {
  if (!assetType) return false;
  return assetTypeMeta(assetType).supportsRegions;
}

export function supportsBoatMakes(assetType) {
  if (!assetType) return false;
  return Boolean(assetTypeMeta(assetType).supportsBoatMakes);
}

export function supportsMarinas(assetType) {
  if (!assetType) return false;
  return Boolean(assetTypeMeta(assetType).supportsMarinas);
}

export function isBoatSearch(assetType) {
  return assetType === 'boat';
}

/** Split newline-separated pros/cons into trimmed non-empty lines. */
export function parseLineList(value) {
  if (!value) return [];
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function serializeLineList(lines) {
  return lines
    .map((line) => String(line).trim())
    .filter(Boolean)
    .join('\n') || null;
}
