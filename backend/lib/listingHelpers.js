import { getListingFreshness } from './listingFreshness.js';
import {
  isSoldCompListing,
  trainingListPrice,
} from './listingBrowse.js';
import {
  compareListingToBoatModel,
  summarizeListingModelCheck,
} from './listingModelCheck.js';

/**
 * Serialize a listing for API responses with derived metrics.
 */
export function serializeListing(listing) {
  const { rawScrapedData: _rawScrapedData, ...rest } = listing;
  const listPrice = listing.listPrice != null ? Number(listing.listPrice) : null;
  const soldPrice = listing.soldPrice != null ? Number(listing.soldPrice) : null;
  const acres = listing.acres != null ? Number(listing.acres) : null;
  const sqftLiving = listing.sqftLiving != null ? Number(listing.sqftLiving) : null;
  const compPrice = trainingListPrice(listing);
  const freshness = getListingFreshness(listing);

  const lengthFt = listing.lengthFt != null ? Number(listing.lengthFt) : null;

  const modelCheck = listing.boatModel
    ? (() => {
      const comparison = compareListingToBoatModel(listing, listing.boatModel);
      return {
        ...comparison,
        summary: summarizeListingModelCheck(comparison),
      };
    })()
    : null;

  return {
    ...rest,
    listPrice,
    soldPrice,
    acres,
    sqftLiving,
    lengthFt,
    isSoldComp: isSoldCompListing(listing),
    pricePerAcre: compPrice && acres ? Math.round(compPrice / acres) : null,
    pricePerSqft: compPrice && sqftLiving ? Math.round(compPrice / sqftLiving) : null,
    pricePerFoot: compPrice && lengthFt ? Math.round(compPrice / lengthFt) : null,
    modelCheck,
    ...freshness,
    canRefresh: freshness.canRefresh && !isSoldCompListing(listing),
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
    state: scraped.state ?? null,
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
    lengthFt: scraped.lengthFt ?? null,
    lwlFt: scraped.lwlFt ?? null,
    beamFt: scraped.beamFt ?? null,
    draftFt: scraped.draftFt ?? null,
    draftMinFt: scraped.draftMinFt ?? null,
    displacementLb: scraped.displacementLb ?? null,
    ballastLb: scraped.ballastLb ?? null,
    engineMake: scraped.engineMake ?? null,
    engineModel: scraped.engineModel ?? null,
    engineHp: scraped.engineHp ?? null,
    engineHours: scraped.engineHours ?? null,
    fuelGal: scraped.fuelGal ?? null,
    waterGal: scraped.waterGal ?? null,
    hullMaterial: scraped.hullMaterial ?? null,
    keelType: scraped.keelType ?? null,
    make: scraped.make ?? null,
    model: scraped.model ?? null,
    propulsion: scraped.propulsion ?? null,
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
