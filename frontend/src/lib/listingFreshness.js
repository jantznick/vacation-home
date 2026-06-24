export const STALE_LISTING_DAYS = 30;

export function formatFetchedAt(fetchedAt) {
  if (!fetchedAt) {
    return null;
  }
  return new Date(fetchedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function staleBadgeLabel(listing) {
  if (!listing?.isStale) {
    return null;
  }
  if (listing.daysSinceFetch == null) {
    return 'Needs refresh';
  }
  return `Needs refresh (${listing.daysSinceFetch}d)`;
}
