import express from 'express';
import prisma from '../lib/prisma.js';
import { searchIdFrom, getLakeInSearch, getRegionInSearch, getListingInSearch } from '../lib/searchScope.js';
import { requireEditor } from '../middleware/searchAccess.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const { regionId } = req.query;

    const where = regionId
      ? { regionId, region: { searchId } }
      : { region: { searchId } };

    const lakes = await prisma.lake.findMany({
      where,
      include: {
        region: { select: { id: true, name: true, slug: true } },
        _count: { select: { listings: true } },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ lakes });
  } catch (error) {
    console.error('List lakes error:', error);
    res.status(500).json({ error: 'Failed to list lakes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const lake = await getLakeInSearch(searchIdFrom(req), req.params.id);
    if (!lake) {
      return res.status(404).json({ error: 'Lake not found' });
    }

    const full = await prisma.lake.findUnique({
      where: { id: req.params.id },
      include: {
        region: true,
        listings: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json({ lake: full });
  } catch (error) {
    console.error('Get lake error:', error);
    res.status(500).json({ error: 'Failed to get lake' });
  }
});

router.post('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const {
      regionId,
      name,
      acreage,
      maxDepthFeet,
      avgDepthFeet,
      waterClarity,
      edgeType,
      notes,
      dnrSourceUrl,
    } = req.body;

    if (!regionId) {
      return res.status(400).json({ error: 'regionId is required' });
    }
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const region = await getRegionInSearch(searchId, regionId);
    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const lake = await prisma.lake.create({
      data: {
        regionId,
        name: name.trim(),
        acreage: acreage ?? null,
        maxDepthFeet: maxDepthFeet ?? null,
        avgDepthFeet: avgDepthFeet ?? null,
        waterClarity: waterClarity ?? null,
        edgeType: edgeType ?? null,
        notes: notes ?? null,
        dnrSourceUrl: dnrSourceUrl ?? null,
      },
      include: {
        region: { select: { id: true, name: true, slug: true } },
        _count: { select: { listings: true } },
      },
    });

    res.status(201).json({ lake });
  } catch (error) {
    console.error('Create lake error:', error);
    res.status(500).json({ error: 'Failed to create lake' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await getLakeInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lake not found' });
    }

    const {
      name,
      acreage,
      maxDepthFeet,
      avgDepthFeet,
      waterClarity,
      edgeType,
      notes,
      dnrSourceUrl,
    } = req.body;

    const data = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      data.name = name.trim();
    }
    if (acreage !== undefined) data.acreage = acreage;
    if (maxDepthFeet !== undefined) data.maxDepthFeet = maxDepthFeet;
    if (avgDepthFeet !== undefined) data.avgDepthFeet = avgDepthFeet;
    if (waterClarity !== undefined) data.waterClarity = waterClarity;
    if (edgeType !== undefined) data.edgeType = edgeType;
    if (notes !== undefined) data.notes = notes;
    if (dnrSourceUrl !== undefined) data.dnrSourceUrl = dnrSourceUrl;

    const lake = await prisma.lake.update({
      where: { id: req.params.id },
      data,
      include: {
        region: { select: { id: true, name: true, slug: true } },
        _count: { select: { listings: true } },
      },
    });

    res.json({ lake });
  } catch (error) {
    console.error('Update lake error:', error);
    res.status(500).json({ error: 'Failed to update lake' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getLakeInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Lake not found' });
    }

    await prisma.lake.delete({ where: { id: req.params.id } });
    res.json({ message: 'Lake deleted' });
  } catch (error) {
    console.error('Delete lake error:', error);
    res.status(500).json({ error: 'Failed to delete lake' });
  }
});

export default router;
