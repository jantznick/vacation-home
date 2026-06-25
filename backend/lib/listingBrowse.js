/** Hidden from default listings, map, dashboard browse — still used for pricing comps. */
export const BROWSE_EXCLUDED_STATUSES = ['sold', 'off_market'];

/** Status not overwritten by Zillow refresh (user or sold-comp intent). */
export const REFRESH_PROTECTED_STATUSES = new Set(['interested', 'passed', 'sold']);

export function isSoldCompListing(listing) {
  return listing?.status === 'sold';
}

export function isBrowsableListing(listing) {
  return listing?.status && !BROWSE_EXCLUDED_STATUSES.includes(listing.status);
}

/**
 * Price used when training pricing models.
 * Sold comps prefer closing price; fall back to last list price.
 */
export function trainingListPrice(listing) {
  if (listing?.status === 'sold') {
    if (listing.soldPrice != null) {
      return Number(listing.soldPrice);
    }
    if (listing.listPrice != null) {
      return Number(listing.listPrice);
    }
    return null;
  }

  if (listing?.listPrice != null) {
    return Number(listing.listPrice);
  }

  return null;
}

export function isPricingCompListing(listing) {
  return trainingListPrice(listing) != null;
}

export function applyBrowseListingFilter(where, query = {}) {
  if (query.status) {
    where.status = query.status;
    return where;
  }

  const includeSold = query.includeSold === 'true' || query.includeSold === true;
  if (!includeSold) {
    where.status = { notIn: BROWSE_EXCLUDED_STATUSES };
  }

  return where;
}
