import prisma from '../lib/prisma.js';

const ROLE_RANK = { viewer: 1, editor: 2, owner: 3 };

export async function loadSearchMembership(req, res, next) {
  const { searchId } = req.params;

  if (!searchId) {
    return res.status(400).json({ error: 'searchId is required' });
  }

  try {
    const search = await prisma.search.findUnique({
      where: { id: searchId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        assetType: true,
        pros: true,
        cons: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!search) {
      return res.status(404).json({ error: 'Search not found' });
    }

    const membership = await prisma.searchMember.findUnique({
      where: {
        searchId_userId: {
          searchId,
          userId: req.session.userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have access to this search' });
    }

    req.search = search;
    req.searchMembership = membership;
    next();
  } catch (error) {
    console.error('Search access error:', error);
    res.status(500).json({ error: 'Failed to verify search access' });
  }
}

export function requireSearchRole(...roles) {
  const minRank = Math.min(...roles.map((role) => ROLE_RANK[role] ?? 99));

  return (req, res, next) => {
    const rank = ROLE_RANK[req.searchMembership?.role] ?? 0;
    if (rank < minRank) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export const requireEditor = requireSearchRole('editor', 'owner');
export const requireOwner = requireSearchRole('owner');
