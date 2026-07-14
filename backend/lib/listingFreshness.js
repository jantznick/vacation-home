export const STALE_LISTING_DAYS = 30;

function hostnameOf(sourceUrl) {
  if (!sourceUrl) {
    return null;
  }
  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return null;
  }
}

function isRefreshableSourceUrl(sourceUrl) {
  const hostname = hostnameOf(sourceUrl);
  if (!hostname) {
    return false;
  }
  return hostname === 'zillow.com'
    || hostname === 'www.zillow.com'
    || hostname === 'yachtworld.com'
    || hostname === 'www.yachtworld.com'
    || hostname.endsWith('.yachtworld.com');
}

export function getListingFreshness(listing) {
  const canRefresh = isRefreshableSourceUrl(listing.sourceUrl);

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
