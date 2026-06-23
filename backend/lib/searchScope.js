import prisma from './prisma.js';

export function searchIdFrom(req) {
  return req.params.searchId || req.search?.id;
}

export async function getRegionInSearch(searchId, regionId) {
  return prisma.region.findFirst({
    where: { id: regionId, searchId },
  });
}

export async function getListingInSearch(searchId, listingId) {
  return prisma.listing.findFirst({
    where: { id: listingId, searchId },
  });
}

export async function getLakeInSearch(searchId, lakeId) {
  const lake = await prisma.lake.findUnique({
    where: { id: lakeId },
    include: { region: { select: { searchId: true } } },
  });

  if (!lake || lake.region.searchId !== searchId) {
    return null;
  }

  return lake;
}

export async function getPricingModelInSearch(searchId, modelId) {
  return prisma.pricingModel.findFirst({
    where: { id: modelId, searchId },
  });
}
