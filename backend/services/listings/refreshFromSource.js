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
  boatMake: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      pros: true,
      cons: true,
      notes: true,
    },
  },
  boatModel: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      pros: true,
      cons: true,
      notes: true,
      makeId: true,
    },
  },
};

function photoCount(urls) {
  return Array.isArray(urls) ? urls.length : 0;
}

/**
 * Refresh keeps existing listing details intact. Only list price is updated from
 * the source; photos are replaced only when the scrape returns strictly more.
 */
export function buildRefreshUpdateData(existing, scrapedFields) {
  const scraped = scrapedFieldsToListingData(scrapedFields);
  const existingPhotos = existing.photoUrls;
  const scrapedPhotos = scraped.photoUrls;
  const shouldReplacePhotos = photoCount(scrapedPhotos) > photoCount(existingPhotos);

  return {
    listPrice: scraped.listPrice ?? existing.listPrice,
    photoUrls: shouldReplacePhotos ? scrapedPhotos : existingPhotos,
    rawScrapedData: scraped.rawScrapedData ?? existing.rawScrapedData,
    fetchedAt: new Date(),
  };
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
  const statusChanged = false;

  if (priceChanged) {
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
