import prisma from './prisma.js';
import { snapshotFromListing } from './listingHelpers.js';

export async function createListingSnapshot(listingId, listing) {
  const data = snapshotFromListing(listing);

  if (data.listPrice == null && data.status == null) {
    return null;
  }

  return prisma.listingSnapshot.create({
    data: {
      listingId,
      ...data,
    },
  });
}
