import express from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { slugify, uniqueSearchSlug } from '../lib/slug.js';
import { loadSearchMembership, requireEditor, requireOwner } from '../middleware/searchAccess.js';
import { sendInviteEmail } from '../services/email/resend.js';
import { isAssetType, normalizeAssetType, supportsRegions, isBoatSearch } from '../lib/assetTypes.js';
import regionRoutes from './regions.js';
import lakeRoutes from './lakes.js';
import boatMakeRoutes from './boatMakes.js';
import boatModelRoutes from './boatModels.js';
import listingRoutes from './listings.js';
import commentRoutes from './comments.js';
import ingestRoutes from './ingest.js';
import analysisRoutes from './analysis.js';
import pricingModelRoutes from './pricingModels.js';
import mapsRoutes from './maps.js';
import poiRoutes from './pois.js';

const router = express.Router();

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function inviteUrlForToken(token) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `${frontendUrl}/invites/${token}`;
}

/** Never expose raw invite tokens in API JSON — use inviteUrl only. */
function serializeInvite(invite, { includeUrl = true } = {}) {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.createdAt,
    expiresAt: invite.expiresAt,
    ...(includeUrl && invite.token ? { inviteUrl: inviteUrlForToken(invite.token) } : {}),
  };
}

async function countSearchOwners(searchId) {
  return prisma.searchMember.count({
    where: { searchId, role: 'owner' },
  });
}

const searchSelect = {
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
};

function normalizeTextField(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed || null;
}

router.get('/', async (req, res) => {
  try {
    const memberships = await prisma.searchMember.findMany({
      where: { userId: req.session.userId },
      include: {
        search: {
          select: {
            ...searchSelect,
            _count: {
              select: {
                regions: true,
                listings: true,
                members: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    res.json({
      searches: memberships.map((m) => ({
        ...m.search,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error('List searches error:', error);
    res.status(500).json({ error: 'Failed to list searches' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, assetType, pros, cons } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (assetType !== undefined && !isAssetType(assetType)) {
      return res.status(400).json({ error: 'assetType must be home, boat, or rv' });
    }

    const slug = await uniqueSearchSlug(prisma, slugify(name));
    const userId = req.session.userId;
    const resolvedAssetType = normalizeAssetType(assetType);

    const search = await prisma.$transaction(async (tx) => {
      const created = await tx.search.create({
        data: {
          name: name.trim(),
          slug,
          description: normalizeTextField(description) ?? null,
          assetType: resolvedAssetType,
          pros: normalizeTextField(pros) ?? null,
          cons: normalizeTextField(cons) ?? null,
          createdById: userId,
          members: {
            create: {
              userId,
              role: 'owner',
            },
          },
        },
        select: searchSelect,
      });

      return created;
    });

    res.status(201).json({ search: { ...search, role: 'owner' } });
  } catch (error) {
    console.error('Create search error:', error);
    res.status(500).json({ error: 'Failed to create search' });
  }
});

router.post('/invites/accept', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const invite = await prisma.searchInvite.findUnique({
      where: { token },
      include: { search: { select: searchSelect } },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.acceptedAt) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite has expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { email: true },
    });

    if (user.email !== invite.email) {
      return res.status(403).json({
        error: 'This invite was sent to a different email address. Log in with the invited email.',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.searchMember.upsert({
        where: {
          searchId_userId: {
            searchId: invite.searchId,
            userId: req.session.userId,
          },
        },
        create: {
          searchId: invite.searchId,
          userId: req.session.userId,
          role: invite.role,
        },
        update: {
          role: invite.role,
        },
      });

      await tx.searchInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return tx.searchMember.findUnique({
        where: {
          searchId_userId: {
            searchId: invite.searchId,
            userId: req.session.userId,
          },
        },
      });
    });

    res.json({
      search: { ...invite.search, role: result.role },
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

const scopedRouter = express.Router({ mergeParams: true });
scopedRouter.use(loadSearchMembership);

scopedRouter.get('/', async (req, res) => {
  res.json({
    search: {
      ...req.search,
      role: req.searchMembership.role,
    },
  });
});

scopedRouter.patch('/', requireEditor, async (req, res) => {
  try {
    const { name, description, pros, cons, assetType } = req.body;
    const data = {};

    if (assetType !== undefined) {
      return res.status(400).json({
        error: 'assetType cannot be changed after a search is created',
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      data.name = name.trim();
      data.slug = await uniqueSearchSlug(prisma, slugify(name), req.search.id);
    }
    if (description !== undefined) {
      data.description = normalizeTextField(description);
    }
    if (pros !== undefined) {
      data.pros = normalizeTextField(pros);
    }
    if (cons !== undefined) {
      data.cons = normalizeTextField(cons);
    }

    const search = await prisma.search.update({
      where: { id: req.search.id },
      data,
      select: searchSelect,
    });

    res.json({ search: { ...search, role: req.searchMembership.role } });
  } catch (error) {
    console.error('Update search error:', error);
    res.status(500).json({ error: 'Failed to update search' });
  }
});

scopedRouter.delete('/', requireOwner, async (req, res) => {
  try {
    await prisma.search.delete({ where: { id: req.search.id } });
    res.json({ message: 'Search deleted' });
  } catch (error) {
    console.error('Delete search error:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});

scopedRouter.get('/members', async (req, res) => {
  try {
    const members = await prisma.searchMember.findMany({
      where: { searchId: req.search.id },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    let pendingInvites = [];
    if (req.searchMembership.role === 'owner') {
      const invites = await prisma.searchInvite.findMany({
        where: {
          searchId: req.search.id,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          expiresAt: true,
          token: true,
        },
      });

      pendingInvites = invites.map((invite) => serializeInvite(invite));
    }

    res.json({ members, pendingInvites });
  } catch (error) {
    console.error('List members error:', error);
    res.status(500).json({ error: 'Failed to list members' });
  }
});

scopedRouter.get('/invites', requireOwner, async (req, res) => {
  try {
    const invites = await prisma.searchInvite.findMany({
      where: {
        searchId: req.search.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ invites: invites.map((invite) => serializeInvite(invite)) });
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ error: 'Failed to list invites' });
  }
});

scopedRouter.post('/invites', requireOwner, async (req, res) => {
  try {
    const { email, role = 'editor' } = req.body;

    if (!email?.trim()) {
      return res.status(400).json({ error: 'email is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const allowedRoles = ['owner', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'role must be owner, editor, or viewer' });
    }

    const existingMember = await prisma.searchMember.findFirst({
      where: {
        searchId: req.search.id,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      return res.status(400).json({ error: 'This user is already a member' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const invite = await prisma.searchInvite.upsert({
      where: {
        searchId_email: {
          searchId: req.search.id,
          email: normalizedEmail,
        },
      },
      create: {
        searchId: req.search.id,
        email: normalizedEmail,
        role,
        token,
        invitedById: req.session.userId,
        expiresAt,
      },
      update: {
        role,
        token,
        invitedById: req.session.userId,
        expiresAt,
        acceptedAt: null,
      },
    });

    const inviteUrl = inviteUrlForToken(invite.token);

    const inviter = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { email: true },
    });

    let emailResult = { skipped: true };
    try {
      emailResult = await sendInviteEmail({
        to: normalizedEmail,
        searchName: req.search.name,
        inviteUrl,
        inviterEmail: inviter.email,
      });
    } catch (emailError) {
      console.error('Invite email failed:', emailError);
      return res.status(201).json({
        invite: serializeInvite(invite),
        inviteUrl,
        emailSent: false,
        warning: 'Invite created but email failed to send. Share the link manually.',
      });
    }

    res.status(201).json({
      invite: serializeInvite(invite),
      inviteUrl,
      emailSent: !emailResult.skipped,
    });
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

scopedRouter.delete('/invites/:inviteId', requireOwner, async (req, res) => {
  try {
    const invite = await prisma.searchInvite.findFirst({
      where: {
        id: req.params.inviteId,
        searchId: req.search.id,
        acceptedAt: null,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    await prisma.searchInvite.delete({ where: { id: invite.id } });
    res.json({ message: 'Invite cancelled' });
  } catch (error) {
    console.error('Cancel invite error:', error);
    res.status(500).json({ error: 'Failed to cancel invite' });
  }
});

scopedRouter.post('/invites/:inviteId/resend', requireOwner, async (req, res) => {
  try {
    const invite = await prisma.searchInvite.findFirst({
      where: {
        id: req.params.inviteId,
        searchId: req.search.id,
        acceptedAt: null,
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    const updated = await prisma.searchInvite.update({
      where: { id: invite.id },
      data: { token, expiresAt },
    });

    const inviteUrl = inviteUrlForToken(updated.token);

    const inviter = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { email: true },
    });

    let emailSent = false;
    try {
      const emailResult = await sendInviteEmail({
        to: updated.email,
        searchName: req.search.name,
        inviteUrl,
        inviterEmail: inviter.email,
      });
      emailSent = !emailResult.skipped;
    } catch (emailError) {
      console.error('Resend invite email failed:', emailError);
    }

    res.json({ invite: serializeInvite(updated), inviteUrl, emailSent });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

scopedRouter.patch('/members/:userId', requireOwner, async (req, res) => {
  try {
    const { role } = req.body;
    const allowedRoles = ['owner', 'editor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'role must be owner, editor, or viewer' });
    }

    const targetUserId = req.params.userId;
    const member = await prisma.searchMember.findUnique({
      where: {
        searchId_userId: {
          searchId: req.search.id,
          userId: targetUserId,
        },
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === role) {
      return res.json({ member });
    }

    if (member.role === 'owner' && role !== 'owner') {
      const ownerCount = await countSearchOwners(req.search.id);
      if (ownerCount <= 1) {
        return res.status(400).json({
          error: 'At least one owner is required. Promote another member to owner first.',
        });
      }
    }

    const updated = await prisma.searchMember.update({
      where: { id: member.id },
      data: { role },
      include: { user: { select: { id: true, email: true } } },
    });

    res.json({ member: updated });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
});

scopedRouter.delete('/members/:userId', requireOwner, async (req, res) => {
  try {
    const member = await prisma.searchMember.findUnique({
      where: {
        searchId_userId: {
          searchId: req.search.id,
          userId: req.params.userId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }

    if (member.role === 'owner') {
      const ownerCount = await countSearchOwners(req.search.id);
      if (ownerCount <= 1) {
        return res.status(400).json({
          error: 'At least one owner is required. Promote another member to owner first.',
        });
      }
    }

    await prisma.searchMember.delete({
      where: { id: member.id },
    });

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

scopedRouter.use('/pois', poiRoutes);
scopedRouter.use('/regions', requireHomeAssetType, requireEditorUnlessRead, regionRoutes);
scopedRouter.use('/lakes', requireHomeAssetType, requireEditorUnlessRead, lakeRoutes);
scopedRouter.use('/boat-makes', requireBoatAssetType, requireEditorUnlessRead, boatMakeRoutes);
scopedRouter.use('/boat-models', requireBoatAssetType, requireEditorUnlessRead, boatModelRoutes);
scopedRouter.use('/listings', requireEditorUnlessRead, listingRoutes);
scopedRouter.use('/comments', commentRoutes);
scopedRouter.use('/ingest', requireEditor, ingestRoutes);
scopedRouter.use('/analysis', analysisRoutes);
scopedRouter.use('/pricing-models', requireEditorUnlessRead, pricingModelRoutes);
scopedRouter.use('/maps', mapsRoutes);

router.use('/:searchId', scopedRouter);

function requireEditorUnlessRead(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return next();
  }
  return requireEditor(req, res, next);
}

function requireHomeAssetType(req, res, next) {
  if (supportsRegions(req.search?.assetType)) {
    return next();
  }
  return res.status(404).json({ error: 'Not found' });
}

function requireBoatAssetType(req, res, next) {
  if (isBoatSearch(req.search?.assetType)) {
    return next();
  }
  return res.status(404).json({ error: 'Not found' });
}

export const publicSearchRoutes = express.Router();

publicSearchRoutes.get('/invites/:token', async (req, res) => {
  try {
    const invite = await prisma.searchInvite.findUnique({
      where: { token: req.params.token },
      include: {
        search: { select: { id: true, name: true, slug: true } },
        invitedBy: { select: { email: true } },
      },
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.acceptedAt) {
      return res.status(410).json({ error: 'This invite has already been used' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(410).json({ error: 'This invite has expired' });
    }

    res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        search: invite.search,
        invitedBy: invite.invitedBy.email,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ error: 'Failed to load invite' });
  }
});

export default router;
