export const STALE_LISTING_DAYS = 30;

function isZillowSourceUrl(sourceUrl) {
  if (!sourceUrl) {
    return false;
  }
  try {
    const { hostname } = new URL(sourceUrl);
    return hostname === 'zillow.com' || hostname === 'www.zillow.com';
  } catch {
    return false;
  }
}

export function getListingFreshness(listing) {
  const canRefresh = isZillowSourceUrl(listing.sourceUrl);

  if (!canRefresh) {
    return {
      canRefresh: false,
      isStale: false,
      daysSinceFetch: null,
    };
  }

  const fetchedAt = listing.fetchedAt ? new Date(listing.fetchedAt) : null;

  if (!fetchedAt || Number.isNaN(fetchedAt.getTime())) {
    return {
      canRefresh: true,
      isStale: true,
      daysSinceFetch: null,
    };
  }

  const daysSinceFetch = Math.floor((Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    canRefresh: true,
    isStale: daysSinceFetch >= STALE_LISTING_DAYS,
    daysSinceFetch,
  };
}

export function staleListingCutoff(date = new Date()) {
  return new Date(date.getTime() - STALE_LISTING_DAYS * 24 * 60 * 60 * 1000);
}

export function listingNeedsRefresh(listing) {
  const { canRefresh, isStale } = getListingFreshness(listing);
  return canRefresh && isStale;
}
