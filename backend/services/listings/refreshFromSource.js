import prisma from '../../lib/prisma.js';
import {
  scrapedFieldsToListingData,
  serializeListing,
} from '../../lib/listingHelpers.js';
import { createListingSnapshot } from '../../lib/listingSnapshots.js';
import { previewListingFromUrl } from '../ingest/index.js';
import { retrainAfterListingChange } from '../pricing/index.js';

const listingInclude = {
  region: { select: { id: true, name: true, slug: true } },
  lake: { select: { id: true, name: true } },
};

import { REFRESH_PROTECTED_STATUSES } from '../../lib/listingBrowse.js';

export function buildRefreshUpdateData(existing, scrapedFields) {
  const scraped = scrapedFieldsToListingData(scrapedFields);
  const data = {
    sourceUrl: scraped.sourceUrl ?? existing.sourceUrl,
    sourceSite: scraped.sourceSite ?? existing.sourceSite,
    mlsNumber: scraped.mlsNumber ?? existing.mlsNumber,
    address: scraped.address ?? existing.address,
    city: scraped.city ?? existing.city,
    state: scraped.state ?? existing.state,
    zip: scraped.zip ?? existing.zip,
    latitude: scraped.latitude ?? existing.latitude,
    longitude: scraped.longitude ?? existing.longitude,
    listPrice: scraped.listPrice ?? existing.listPrice,
    soldPrice: scraped.soldPrice ?? existing.soldPrice,
    isVacantLot: scraped.isVacantLot ?? existing.isVacantLot,
    bedrooms: scraped.bedrooms ?? existing.bedrooms,
    bathrooms: scraped.bathrooms ?? existing.bathrooms,
    sqftLiving: scraped.sqftLiving ?? existing.sqftLiving,
    sqftLot: scraped.sqftLot ?? existing.sqftLot,
    acres: scraped.acres ?? existing.acres,
    yearBuilt: scraped.yearBuilt ?? existing.yearBuilt,
    waterfront: scraped.waterfront ?? existing.waterfront,
    waterfrontType: scraped.waterfrontType ?? existing.waterfrontType,
    lengthFt: scraped.lengthFt ?? existing.lengthFt,
    make: scraped.make ?? existing.make,
    model: scraped.model ?? existing.model,
    propulsion: scraped.propulsion ?? existing.propulsion,
    listingDate: scraped.listingDate ?? existing.listingDate,
    daysOnMarket: scraped.daysOnMarket ?? existing.daysOnMarket,
    photoUrls: scraped.photoUrls ?? existing.photoUrls,
    rawScrapedData: scraped.rawScrapedData ?? existing.rawScrapedData,
    fetchedAt: new Date(),
  };

  if (!REFRESH_PROTECTED_STATUSES.has(existing.status)) {
    data.status = scraped.status ?? existing.status;
  }

  return data;
}

export async function refreshListingFromSource(listing, context = {}) {
  if (!listing.sourceUrl) {
    throw new Error('Listing has no source URL to refresh');
  }

  const result = await previewListingFromUrl(listing.sourceUrl, context);
  const data = buildRefreshUpdateData(listing, result.fields);

  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data,
    include: listingInclude,
  });

  const priceChanged = listing.listPrice !== updated.listPrice;
  const statusChanged = listing.status !== updated.status;

  if (priceChanged || statusChanged) {
    await createListingSnapshot(updated.id, updated);
  }

  const pricing = await retrainAfterListingChange({
    before: listing,
    after: updated,
    searchId: listing.searchId,
  });

  return {
    listing: serializeListing(updated),
    warnings: result.warnings || [],
    pricing,
    priceChanged,
    statusChanged,
  };
}
