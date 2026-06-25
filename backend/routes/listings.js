import express from 'express';
import prisma from '../lib/prisma.js';
import {
  serializeListing,
  serializeListings,
  scrapedFieldsToListingData,
} from '../lib/listingHelpers.js';
import { sortSerializedListings } from '../lib/listingAnalysis.js';
import { createListingSnapshot } from '../lib/listingSnapshots.js';
import { parseCoordinate } from '../lib/location.js';
import { searchIdFrom, getRegionInSearch, getListingInSearch } from '../lib/searchScope.js';
import {
  computeListingDriveTime,
  computeAllListingCommutes,
  geocodeListing,
  getListingCommutes,
  isMapsConfigured,
  maybeGeocodeListingFromAddress,
} from '../lib/locationService.js';
import {
  predictListingPrice,
  retrainAfterListingChange,
  computeListingPriceSignals,
} from '../services/pricing/index.js';
import { previewListingFromUrl } from '../services/ingest/index.js';
import { refreshListingFromSource } from '../services/listings/refreshFromSource.js';
import { staleListingCutoff } from '../lib/listingFreshness.js';
import {
  applyBrowseListingFilter,
  BROWSE_EXCLUDED_STATUSES,
} from '../lib/listingBrowse.js';

const router = express.Router();

const listingInclude = {
  region: { select: { id: true, name: true, slug: true } },
  lake: { select: { id: true, name: true } },
};

function buildListingWhere(searchId, query) {
  const where = { searchId };

  if (query.regionId) {
    where.regionId = query.regionId;
  }
  if (query.lakeId) {
    where.lakeId = query.lakeId;
  }
  if (query.isVacantLot !== undefined) {
    where.isVacantLot = query.isVacantLot === 'true';
  }
  if (query.waterfront !== undefined) {
    where.waterfront = query.waterfront === 'true';
  }

  if (query.needsRefresh === 'true') {
    const cutoff = staleListingCutoff();
    where.sourceUrl = { contains: 'zillow.com' };
    where.OR = [
      { fetchedAt: null },
      { fetchedAt: { lt: cutoff } },
    ];
  }

  applyBrowseListingFilter(where, query);

  return where;
}

async function validateRegionAndLake(searchId, regionId, lakeId) {
  const region = await getRegionInSearch(searchId, regionId);
  if (!region) {
    return { error: 'Region not found', status: 404 };
  }

  if (lakeId) {
    const lake = await prisma.lake.findUnique({ where: { id: lakeId } });
    if (!lake || lake.regionId !== regionId) {
      return { error: 'Lake must belong to the selected region', status: 400 };
    }
  }

  return { region };
}

router.get('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const where = buildListingWhere(searchId, req.query);

    const listings = await prisma.listing.findMany({
      where,
      include: listingInclude,
      orderBy: { createdAt: 'desc' },
    });

    const serialized = serializeListings(listings);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc';
    const sorted = sortSerializedListings(serialized, sortBy, sortDir);

    if (req.query.includePriceSignal === 'true') {
      const signals = await computeListingPriceSignals(searchId, sorted);
      res.json({
        listings: sorted.map((listing) => ({
          ...listing,
          priceSignal: signals[listing.id] ?? null,
        })),
      });
      return;
    }

    res.json({ listings: sorted });
  } catch (error) {
    console.error('List listings error:', error);
    res.status(500).json({ error: 'Failed to list listings' });
  }
});

router.post('/refresh-bulk', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const { listingIds, staleOnly = true } = req.body || {};

    let listings;
    if (Array.isArray(listingIds) && listingIds.length > 0) {
      listings = await prisma.listing.findMany({
        where: {
          searchId,
          id: { in: listingIds },
          sourceUrl: { contains: 'zillow.com' },
        },
      });
    } else {
      const cutoff = staleListingCutoff();
      listings = await prisma.listing.findMany({
        where: {
          searchId,
          sourceUrl: { contains: 'zillow.com' },
          status: { notIn: BROWSE_EXCLUDED_STATUSES },
          ...(staleOnly
            ? {
              OR: [
                { fetchedAt: null },
                { fetchedAt: { lt: cutoff } },
              ],
            }
            : {}),
        },
        orderBy: { fetchedAt: 'asc' },
      });
    }

    const context = {
      searchId,
      userId: req.session?.userId ?? null,
    };

    const results = await Promise.all(
      listings.map(async (listing) => {
        try {
          const refreshed = await refreshListingFromSource(listing, context);
          return {
            listingId: listing.id,
            success: true,
            listing: refreshed.listing,
            priceChanged: refreshed.priceChanged,
            statusChanged: refreshed.statusChanged,
            warnings: refreshed.warnings,
          };
        } catch (error) {
          return {
            listingId: listing.id,
            success: false,
            error: error.message || 'Refresh failed',
          };
        }
      }),
    );

    const priceChanges = results.filter(
      (result) => result.success && (result.priceChanged || result.statusChanged),
    ).length;

    const succeeded = results.filter((result) => result.success).length;
    const failed = results.length - succeeded;

    res.json({
      results,
      summary: {
        total: results.length,
        succeeded,
        failed,
        priceChanges,
      },
    });
  } catch (error) {
    console.error('Bulk refresh listings error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh listings' });
  }
});

router.get('/:id/commutes', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const commutes = await getListingCommutes(req.params.id, searchId);
    if (!commutes) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ commutes });
  } catch (error) {
    console.error('List commutes error:', error);
    res.status(500).json({ error: 'Failed to list commutes' });
  }
});

router.get('/:id/price-estimate', async (req, res) => {
  try {
    const result = await predictListingPrice(req.params.id, req.query.modelId || null);

    if (!result) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Price estimate error:', error);
    res.status(500).json({ error: 'Failed to estimate price' });
  }
});

router.get('/:id/snapshots', async (req, res) => {
  try {
    const listing = await getListingInSearch(searchIdFrom(req), req.params.id);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const snapshots = await prisma.listingSnapshot.findMany({
      where: { listingId: req.params.id },
      orderBy: { capturedAt: 'desc' },
    });

    res.json({ snapshots });
  } catch (error) {
    console.error('List snapshots error:', error);
    res.status(500).json({ error: 'Failed to list snapshots' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const listing = await prisma.listing.findFirst({
      where: { id: req.params.id, searchId: searchIdFrom(req) },
      include: {
        region: true,
        lake: true,
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json({ listing: serializeListing(listing) });
  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({ error: 'Failed to get listing' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { regionId, lakeId, rawScrapedData, fetchFromSource, ...fields } = req.body;

    const searchId = searchIdFrom(req);

    if (!regionId) {
      return res.status(400).json({ error: 'regionId is required' });
    }

    const validation = await validateRegionAndLake(searchId, regionId, lakeId);
    if (validation.error) {
      return res.status(validation.status).json({ error: validation.error });
    }

    let scrapedData = {};
    let warnings = [];

    if (fetchFromSource && fields.sourceUrl) {
      const result = await previewListingFromUrl(fields.sourceUrl);
      scrapedData = scrapedFieldsToListingData(result.fields);
      warnings = result.warnings;
    } else if (rawScrapedData) {
      scrapedData.rawScrapedData = rawScrapedData;
      scrapedData.fetchedAt = new Date();
    }

    let listing = await prisma.listing.create({
      data: {
        searchId,
        regionId,
        lakeId: lakeId ?? null,
        sourceUrl: fields.sourceUrl ?? scrapedData.sourceUrl ?? null,
        sourceSite: fields.sourceSite ?? scrapedData.sourceSite ?? null,
        mlsNumber: fields.mlsNumber ?? scrapedData.mlsNumber ?? null,
        status: fields.status ?? scrapedData.status ?? undefined,
        address: fields.address ?? scrapedData.address ?? null,
        city: fields.city ?? scrapedData.city ?? null,
        state: fields.state ?? scrapedData.state ?? 'WI',
        zip: fields.zip ?? scrapedData.zip ?? null,
        latitude: parseCoordinate(fields.latitude ?? scrapedData.latitude),
        longitude: parseCoordinate(fields.longitude ?? scrapedData.longitude),
        listPrice: fields.listPrice ?? scrapedData.listPrice ?? null,
        soldPrice: fields.soldPrice ?? scrapedData.soldPrice ?? null,
        isVacantLot: fields.isVacantLot ?? scrapedData.isVacantLot ?? false,
        bedrooms: fields.bedrooms ?? scrapedData.bedrooms ?? null,
        bathrooms: fields.bathrooms ?? scrapedData.bathrooms ?? null,
        sqftLiving: fields.sqftLiving ?? scrapedData.sqftLiving ?? null,
        sqftLot: fields.sqftLot ?? scrapedData.sqftLot ?? null,
        acres: fields.acres ?? scrapedData.acres ?? null,
        yearBuilt: fields.yearBuilt ?? scrapedData.yearBuilt ?? null,
        waterfront: fields.waterfront ?? scrapedData.waterfront ?? false,
        waterfrontType: fields.waterfrontType ?? scrapedData.waterfrontType ?? null,
        pros: fields.pros ?? null,
        cons: fields.cons ?? null,
        notes: fields.notes ?? null,
        interestLevel: fields.interestLevel ?? null,
        visited: fields.visited ?? false,
        visitNotes: fields.visitNotes ?? null,
        listingDate: fields.listingDate
          ? new Date(fields.listingDate)
          : scrapedData.listingDate ?? null,
        daysOnMarket: fields.daysOnMarket ?? scrapedData.daysOnMarket ?? null,
        photoUrls: fields.photoUrls ?? scrapedData.photoUrls ?? null,
        rawScrapedData: scrapedData.rawScrapedData ?? rawScrapedData ?? null,
        fetchedAt: scrapedData.fetchedAt ?? (fields.sourceUrl ? new Date() : null),
      },
      include: listingInclude,
    });

    await createListingSnapshot(listing.id, listing);

    listing = await maybeGeocodeListingFromAddress(listing);

    const pricing = await retrainAfterListingChange({ after: listing, searchId });

    res.status(201).json({
      listing: serializeListing(listing),
      warnings,
      pricing,
    });
  } catch (error) {
    console.error('Create listing error:', error);
    res.status(error.message?.includes('Zillow') || error.message?.includes('URL') ? 422 : 500).json({
      error: error.message || 'Failed to create listing',
    });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getListingInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const { regionId, lakeId, listingDate, rawScrapedData, fetchFromSource, ...fields } = req.body;
    const data = { ...fields };

    if (regionId !== undefined) {
      const validation = await validateRegionAndLake(searchId, regionId, lakeId ?? existing.lakeId);
      if (validation.error) {
        return res.status(validation.status).json({ error: validation.error });
      }
      data.regionId = regionId;
    }

    if (lakeId !== undefined) {
      if (lakeId === null) {
        data.lakeId = null;
      } else {
        const targetRegionId = data.regionId ?? existing.regionId;
        const validation = await validateRegionAndLake(searchId, targetRegionId, lakeId);
        if (validation.error) {
          return res.status(validation.status).json({ error: validation.error });
        }
        data.lakeId = lakeId;
      }
    }

    if (listingDate !== undefined) {
      data.listingDate = listingDate ? new Date(listingDate) : null;
    }

    if (rawScrapedData !== undefined) {
      data.rawScrapedData = rawScrapedData;
    }

    if (fields.latitude !== undefined) {
      data.latitude = parseCoordinate(fields.latitude);
    }
    if (fields.longitude !== undefined) {
      data.longitude = parseCoordinate(fields.longitude);
    }

    const addressFields = ['address', 'city', 'state', 'zip'];
    const addressChanged = addressFields.some(
      (key) => fields[key] !== undefined && fields[key] !== existing[key],
    );
    if (addressChanged) {
      if (fields.latitude === undefined) data.latitude = null;
      if (fields.longitude === undefined) data.longitude = null;
      data.driveTimeMinutes = null;
      data.driveDistanceMiles = null;
    }

    if (fetchFromSource && (fields.sourceUrl || existing.sourceUrl)) {
      const result = await previewListingFromUrl(fields.sourceUrl || existing.sourceUrl);
      Object.assign(data, scrapedFieldsToListingData(result.fields));
    }

    let listing = await prisma.listing.update({
      where: { id: req.params.id },
      data,
      include: listingInclude,
    });

    listing = await maybeGeocodeListingFromAddress(listing);

    const priceChanged = existing.listPrice !== listing.listPrice;
    const statusChanged = existing.status !== listing.status;

    if (priceChanged || statusChanged) {
      await createListingSnapshot(listing.id, listing);
    }

    const pricing = await retrainAfterListingChange({ before: existing, after: listing, searchId });

    res.json({ listing: serializeListing(listing), pricing });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

router.post('/:id/refresh', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const listing = await getListingInSearch(searchId, req.params.id);

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const refreshed = await refreshListingFromSource(listing, {
      searchId,
      userId: req.session?.userId ?? null,
    });

    res.json({
      listing: refreshed.listing,
      warnings: refreshed.warnings,
      pricing: refreshed.pricing,
      priceChanged: refreshed.priceChanged,
      statusChanged: refreshed.statusChanged,
    });
  } catch (error) {
    console.error('Refresh listing error:', error);
    res.status(422).json({ error: error.message || 'Failed to refresh listing' });
  }
});

router.post('/:id/geocode', async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    const searchId = searchIdFrom(req);
    await geocodeListing(req.params.id);

    let listing;
    let commutes = [];
    try {
      const result = await computeAllListingCommutes(req.params.id, searchId);
      listing = result.listing;
      commutes = result.commutes;
    } catch (driveError) {
      console.warn('Drive time after listing geocode skipped:', driveError.message);
      listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
    }

    res.json({ listing: serializeListing(listing), commutes });
  } catch (error) {
    console.error('Geocode listing error:', error);
    res.status(422).json({ error: error.message || 'Failed to geocode listing' });
  }
});

router.post('/:id/drive-time', async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const searchId = searchIdFrom(req);
    const result = await computeAllListingCommutes(req.params.id, searchId);
    res.json({
      listing: serializeListing(result.listing),
      commutes: result.commutes,
    });
  } catch (error) {
    console.error('Listing drive time error:', error);
    res.status(422).json({ error: error.message || 'Failed to calculate drive time' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getListingInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    await prisma.listing.delete({ where: { id: req.params.id } });
    const pricing = await retrainAfterListingChange({ before: existing, deletedId: existing.id, searchId });
    res.json({ message: 'Listing deleted', pricing });
  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({ error: 'Failed to delete listing' });
  }
});

export default router;
