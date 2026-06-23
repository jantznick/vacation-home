import prisma from './prisma.js';
import {
  formatListingAddress,
  formatPoiAddress,
  formatRegionLocation,
  hasCoordinates,
} from './location.js';
import { geocodeAddress, getDriveTime, isMapsConfigured } from '../services/maps/index.js';

export { isMapsConfigured };

export async function geocodePoi(poiId) {
  const poi = await prisma.pointOfInterest.findUnique({ where: { id: poiId } });
  if (!poi) {
    throw new Error('Point of interest not found');
  }

  const address = formatPoiAddress(poi);
  if (!address) {
    throw new Error('Add an address for this point of interest first');
  }

  const result = await geocodeAddress(address);

  return prisma.pointOfInterest.update({
    where: { id: poiId },
    data: {
      latitude: result.latitude,
      longitude: result.longitude,
    },
  });
}

export async function geocodeRegion(regionId) {
  const region = await prisma.region.findUnique({ where: { id: regionId } });
  if (!region) {
    throw new Error('Region not found');
  }

  const address = formatRegionLocation(region);
  if (!address) {
    throw new Error('Add a center location for this region first');
  }

  const result = await geocodeAddress(address);

  await prisma.region.update({
    where: { id: regionId },
    data: {
      latitude: result.latitude,
      longitude: result.longitude,
    },
  });

  return prisma.region.findUnique({ where: { id: regionId } });
}

export async function geocodeListing(listingId) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    throw new Error('Listing not found');
  }

  if (hasCoordinates(listing)) {
    return listing;
  }

  const address = formatListingAddress(listing);
  if (!address) {
    throw new Error('Listing needs an address to look up its location');
  }

  const result = await geocodeAddress(address);

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      latitude: result.latitude,
      longitude: result.longitude,
    },
  });

  return prisma.listing.findUnique({ where: { id: listingId } });
}

async function getSearchPois(searchId) {
  const pois = await prisma.pointOfInterest.findMany({
    where: { searchId },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
  });

  const geocoded = [];
  for (const poi of pois) {
    if (hasCoordinates(poi)) {
      geocoded.push(poi);
    } else if (formatPoiAddress(poi)) {
      geocoded.push(await geocodePoi(poi.id));
    }
  }

  return geocoded;
}

async function getPrimaryPoi(searchId) {
  const pois = await getSearchPois(searchId);
  if (!pois.length) {
    throw new Error('Add at least one point of interest with an address in search settings');
  }
  return pois.find((p) => p.isPrimary) || pois[0];
}

async function upsertListingCommute(listingId, poi, drive) {
  return prisma.listingCommute.upsert({
    where: {
      listingId_poiId: { listingId, poiId: poi.id },
    },
    create: {
      listingId,
      poiId: poi.id,
      driveTimeMinutes: drive.driveTimeMinutes,
      driveDistanceMiles: drive.driveDistanceMiles,
    },
    update: {
      driveTimeMinutes: drive.driveTimeMinutes,
      driveDistanceMiles: drive.driveDistanceMiles,
      calculatedAt: new Date(),
    },
    include: {
      poi: {
        select: {
          id: true,
          type: true,
          label: true,
          isPrimary: true,
        },
      },
    },
  });
}

export async function computeRegionDriveTime(regionId, searchId) {
  let region = await prisma.region.findFirst({
    where: { id: regionId, searchId },
  });
  if (!region) {
    throw new Error('Region not found');
  }

  if (!hasCoordinates(region)) {
    region = await geocodeRegion(regionId);
  }

  const poi = await getPrimaryPoi(searchId);
  const drive = await getDriveTime({
    originLat: poi.latitude,
    originLng: poi.longitude,
    destLat: region.latitude,
    destLng: region.longitude,
  });

  await prisma.region.update({
    where: { id: regionId },
    data: {
      driveTimeMinutes: drive.driveTimeMinutes,
      driveDistanceMiles: drive.driveDistanceMiles,
    },
  });

  return prisma.region.findUnique({ where: { id: regionId } });
}

export async function computeListingDriveTime(listingId, searchId) {
  const result = await computeAllListingCommutes(listingId, searchId);
  return result.listing;
}

export async function computeAllListingCommutes(listingId, searchId) {
  let listing = await prisma.listing.findFirst({
    where: { id: listingId, searchId },
  });
  if (!listing) {
    throw new Error('Listing not found');
  }

  if (!hasCoordinates(listing)) {
    listing = await geocodeListing(listingId);
  }

  const pois = await getSearchPois(searchId);
  if (!pois.length) {
    throw new Error('Add at least one point of interest with an address in search settings');
  }

  const commutes = [];
  for (const poi of pois) {
    const drive = await getDriveTime({
      originLat: poi.latitude,
      originLng: poi.longitude,
      destLat: listing.latitude,
      destLng: listing.longitude,
    });
    commutes.push(await upsertListingCommute(listingId, poi, drive));
  }

  const primary = commutes.find((c) => c.poi.isPrimary) || commutes[0];

  listing = await prisma.listing.update({
    where: { id: listingId },
    data: {
      driveTimeMinutes: primary?.driveTimeMinutes ?? null,
      driveDistanceMiles: primary?.driveDistanceMiles ?? null,
    },
  });

  return { listing, commutes };
}

export async function getListingCommutes(listingId, searchId) {
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, searchId },
  });
  if (!listing) {
    return null;
  }

  return prisma.listingCommute.findMany({
    where: { listingId },
    include: {
      poi: {
        select: {
          id: true,
          type: true,
          label: true,
          isPrimary: true,
        },
      },
    },
    orderBy: [{ poi: { isPrimary: 'desc' } }, { poi: { sortOrder: 'asc' } }],
  });
}

export async function maybeGeocodeListingFromAddress(listing) {
  if (!isMapsConfigured() || hasCoordinates(listing)) {
    return listing;
  }

  const address = formatListingAddress(listing);
  if (!address) {
    return listing;
  }

  try {
    const result = await geocodeAddress(address);
    return prisma.listing.update({
      where: { id: listing.id },
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
      },
    });
  } catch (error) {
    console.warn('Listing geocode skipped:', error.message);
    return listing;
  }
}
