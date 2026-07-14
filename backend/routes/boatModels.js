import express from 'express';
import prisma from '../lib/prisma.js';
import { searchIdFrom, getBoatModelInSearch } from '../lib/searchScope.js';
import { slugify } from '../lib/slug.js';
import { uniqueBoatModelSlug } from '../lib/boatMakes.js';
import { applyBrowseListingFilter } from '../lib/listingBrowse.js';
import { serializeListings } from '../lib/listingHelpers.js';
import { pickBoatModelPatch } from '../lib/boatModelSpecs.js';

const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getBoatModelInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const listingWhere = {};
    applyBrowseListingFilter(listingWhere, req.query);

    const model = await prisma.boatModel.findUnique({
      where: { id: req.params.id },
      include: {
        make: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            pros: true,
            cons: true,
            notes: true,
          },
        },
        listings: {
          where: listingWhere,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { listings: true } },
      },
    });

    res.json({
      model: {
        ...model,
        listings: serializeListings(model.listings),
      },
    });
  } catch (error) {
    console.error('Get boat model error:', error);
    res.status(500).json({ error: 'Failed to get model' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getBoatModelInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    const data = pickBoatModelPatch(req.body);

    if (data.name !== undefined) {
      if (!data.name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      data.name = data.name.trim();
      data.slug = await uniqueBoatModelSlug(prisma, existing.makeId, slugify(data.name), existing.id);
    }

    for (const key of ['description', 'pros', 'cons', 'notes', 'hullType', 'rigType', 'construction', 'designer', 'builder', 'engineMake', 'engineType', 'sailboatDataUrl']) {
      if (data[key] !== undefined && typeof data[key] === 'string') {
        data[key] = data[key].trim() || null;
      }
    }

    if (data.sailboatDataFetchedAt !== undefined && data.sailboatDataFetchedAt) {
      data.sailboatDataFetchedAt = new Date(data.sailboatDataFetchedAt);
    }

    const model = await prisma.boatModel.update({
      where: { id: existing.id },
      data,
      include: {
        make: { select: { id: true, name: true, slug: true } },
        _count: { select: { listings: true } },
      },
    });

    res.json({ model });
  } catch (error) {
    console.error('Update boat model error:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getBoatModelInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Model not found' });
    }

    await prisma.boatModel.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete boat model error:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
});

export default router;
