/**
 * Serialize a listing for API responses with derived metrics.
 */
export function serializeListing(listing) {
  const { rawScrapedData: _rawScrapedData, ...rest } = listing;
  const listPrice = listing.listPrice != null ? Number(listing.listPrice) : null;
  const soldPrice = listing.soldPrice != null ? Number(listing.soldPrice) : null;
  const acres = listing.acres != null ? Number(listing.acres) : null;
  const sqftLiving = listing.sqftLiving != null ? Number(listing.sqftLiving) : null;

  return {
    ...rest,
    listPrice,
    soldPrice,
    acres,
    sqftLiving,
    pricePerAcre: listPrice && acres ? Math.round(listPrice / acres) : null,
    pricePerSqft: listPrice && sqftLiving ? Math.round(listPrice / sqftLiving) : null,
  };
}

export function serializeListings(listings) {
  return listings.map(serializeListing);
}

/**
 * Build Prisma create/update data from scraped ingest fields.
 */
export function scrapedFieldsToListingData(scraped, { fetchedAt = new Date() } = {}) {
  return {
    sourceUrl: scraped.sourceUrl ?? null,
    sourceSite: scraped.sourceSite ?? null,
    mlsNumber: scraped.mlsNumber ?? null,
    status: scraped.status ?? undefined,
    address: scraped.address ?? null,
    city: scraped.city ?? null,
    state: scraped.state ?? 'WI',
    zip: scraped.zip ?? null,
    latitude: scraped.latitude ?? null,
    longitude: scraped.longitude ?? null,
    listPrice: scraped.listPrice ?? null,
    soldPrice: scraped.soldPrice ?? null,
    isVacantLot: scraped.isVacantLot ?? false,
    bedrooms: scraped.bedrooms ?? null,
    bathrooms: scraped.bathrooms ?? null,
    sqftLiving: scraped.sqftLiving ?? null,
    sqftLot: scraped.sqftLot ?? null,
    acres: scraped.acres ?? null,
    yearBuilt: scraped.yearBuilt ?? null,
    waterfront: scraped.waterfront ?? false,
    waterfrontType: scraped.waterfrontType ?? null,
    listingDate: scraped.listingDate ? new Date(scraped.listingDate) : null,
    daysOnMarket: scraped.daysOnMarket ?? null,
    photoUrls: scraped.photoUrls ?? null,
    rawScrapedData: scraped.rawScrapedData ?? null,
    fetchedAt,
  };
}

export function snapshotFromListing(listing) {
  return {
    listPrice: listing.listPrice ?? null,
    soldPrice: listing.soldPrice ?? null,
    status: listing.status ?? null,
    daysOnMarket: listing.daysOnMarket ?? null,
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
