import prisma from '../../lib/prisma.js';
import { serializeListing } from '../../lib/listingHelpers.js';
import { BROWSE_EXCLUDED_STATUSES } from '../../lib/listingBrowse.js';

export async function getPriceDrops(searchId) {
  const listings = await prisma.listing.findMany({
    where: {
      searchId,
      status: { notIn: BROWSE_EXCLUDED_STATUSES },
      snapshots: {
        some: {},
      },
    },
    include: {
      region: { select: { id: true, name: true } },
      snapshots: {
        orderBy: { capturedAt: 'desc' },
        take: 2,
      },
    },
  });

  const drops = [];

  for (const listing of listings) {
    const [latest, previous] = listing.snapshots;

    if (!latest || !previous) {
      continue;
    }

    if (latest.listPrice == null || previous.listPrice == null) {
      continue;
    }

    if (latest.listPrice >= previous.listPrice) {
      continue;
    }

    const dropAmount = previous.listPrice - latest.listPrice;

    drops.push({
      listingId: listing.id,
      address: listing.address,
      region: listing.region,
      previousPrice: previous.listPrice,
      currentPrice: latest.listPrice,
      dropAmount,
      dropPercent: Math.round((dropAmount / previous.listPrice) * 100),
      droppedAt: latest.capturedAt,
      listing: serializeListing(listing),
    });
  }

  return drops.sort((left, right) => right.dropAmount - left.dropAmount);
}
