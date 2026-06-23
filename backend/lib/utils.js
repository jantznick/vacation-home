export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function serializeListing(listing) {
  const listPrice = listing.listPrice != null ? Number(listing.listPrice) : null;
  const soldPrice = listing.soldPrice != null ? Number(listing.soldPrice) : null;
  const acres = listing.acres != null ? Number(listing.acres) : null;
  const sqftLiving = listing.sqftLiving != null ? Number(listing.sqftLiving) : null;

  return {
    ...listing,
    listPrice,
    soldPrice,
    acres,
    sqftLiving,
    pricePerAcre: listPrice && acres ? Math.round(listPrice / acres) : null,
    pricePerSqft: listPrice && sqftLiving ? Math.round(listPrice / sqftLiving) : null,
  };
}

export function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseOptionalInt(value) {
  const parsed = parseOptionalNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

export function parseOptionalBoolean(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true' || value === '1') {
    return true;
  }
  if (value === 'false' || value === '0') {
    return false;
  }
  return undefined;
}
