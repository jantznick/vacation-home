import express from 'express';
import prisma from '../lib/prisma.js';
import { searchIdFrom, getRegionInSearch, getLakeInSearch, getListingInSearch } from '../lib/searchScope.js';

const router = express.Router();

const validTargetTypes = ['region', 'lake', 'listing'];

async function targetExists(searchId, targetType, targetId) {
  if (targetType === 'region') {
    return getRegionInSearch(searchId, targetId);
  }
  if (targetType === 'lake') {
    return getLakeInSearch(searchId, targetId);
  }
  if (targetType === 'listing') {
    return getListingInSearch(searchId, targetId);
  }
  return null;
}

router.get('/', async (req, res) => {
  try {
    const { targetType, targetId } = req.query;

    if (!targetType || !targetId) {
      return res.status(400).json({ error: 'targetType and targetId are required' });
    }

    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({ error: 'Invalid targetType' });
    }

    const target = await targetExists(searchIdFrom(req), targetType, targetId);
    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const comments = await prisma.comment.findMany({
      where: {
        targetType,
        targetId,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({ error: 'Failed to list comments' });
  }
});

router.post('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const { targetType, targetId, body } = req.body;

    if (!targetType || !targetId || !body?.trim()) {
      return res.status(400).json({ error: 'targetType, targetId, and body are required' });
    }

    if (!validTargetTypes.includes(targetType)) {
      return res.status(400).json({ error: 'Invalid targetType' });
    }

    const target = await targetExists(searchId, targetType, targetId);
    if (!target) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        targetType,
        targetId,
        body: body.trim(),
        userId: req.session.userId,
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    res.status(201).json({ comment });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const isAuthor = comment.userId === req.session.userId;
    const isSearchOwner = req.searchMembership?.role === 'owner';

    if (!isAuthor && !isSearchOwner) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await prisma.comment.delete({ where: { id: req.params.id } });
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

export default router;
