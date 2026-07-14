import express from 'express';
import prisma from '../lib/prisma.js';
import { searchIdFrom, getBoatMakeInSearch, getBoatModelInSearch } from '../lib/searchScope.js';
import { slugify } from '../lib/slug.js';
import { uniqueBoatMakeSlug, uniqueBoatModelSlug, ensureBoatMakeAndModel } from '../lib/boatMakes.js';
import { applyBrowseListingFilter } from '../lib/listingBrowse.js';
import { serializeListings } from '../lib/listingHelpers.js';

const router = express.Router();

const makeListInclude = {
  _count: {
    select: {
      models: true,
      listings: true,
    },
  },
};

const modelSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  pros: true,
  cons: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { listings: true } },
};

router.get('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);

    const unlinked = await prisma.listing.findMany({
      where: {
        searchId,
        make: { not: null },
        OR: [
          { boatMakeId: null },
          {
            AND: [
              { model: { not: null } },
              { boatModelId: null },
            ],
          },
        ],
      },
      select: { id: true, make: true, model: true, boatMakeId: true, boatModelId: true },
    });

    for (const listing of unlinked) {
      const linked = await ensureBoatMakeAndModel(prisma, searchId, listing.make, listing.model);
      if (
        linked.boatMakeId !== listing.boatMakeId
        || linked.boatModelId !== listing.boatModelId
      ) {
        await prisma.listing.update({
          where: { id: listing.id },
          data: linked,
        });
      }
    }

    const makes = await prisma.boatMake.findMany({
      where: { searchId },
      include: makeListInclude,
      orderBy: { name: 'asc' },
    });
    res.json({ makes });
  } catch (error) {
    console.error('List boat makes error:', error);
    res.status(500).json({ error: 'Failed to list makes' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const listingWhere = {};
    applyBrowseListingFilter(listingWhere, req.query);

    const make = await prisma.boatMake.findFirst({
      where: { id: req.params.id, searchId },
      include: {
        models: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { listings: true } } },
        },
        listings: {
          where: listingWhere,
          orderBy: { createdAt: 'desc' },
          include: {
            boatModel: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { models: true, listings: true },
        },
      },
    });

    if (!make) {
      return res.status(404).json({ error: 'Make not found' });
    }

    res.json({
      make: {
        ...make,
        listings: serializeListings(make.listings),
      },
    });
  } catch (error) {
    console.error('Get boat make error:', error);
    res.status(500).json({ error: 'Failed to get make' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, pros, cons, notes } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const searchId = searchIdFrom(req);
    const trimmed = name.trim();
    const slug = await uniqueBoatMakeSlug(prisma, searchId, slugify(trimmed));

    const make = await prisma.boatMake.create({
      data: {
        searchId,
        name: trimmed,
        slug,
        description: description || null,
        pros: pros || null,
        cons: cons || null,
        notes: notes || null,
      },
      include: makeListInclude,
    });

    res.status(201).json({ make });
  } catch (error) {
    console.error('Create boat make error:', error);
    res.status(500).json({ error: 'Failed to create make' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getBoatMakeInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Make not found' });
    }

    const { name, description, pros, cons, notes } = req.body;
    const data = {};

    if (name !== undefined) {
      if (!name?.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      data.name = name.trim();
      data.slug = await uniqueBoatMakeSlug(prisma, searchId, slugify(data.name), existing.id);
    }
    if (description !== undefined) data.description = description || null;
    if (pros !== undefined) data.pros = pros || null;
    if (cons !== undefined) data.cons = cons || null;
    if (notes !== undefined) data.notes = notes || null;

    const make = await prisma.boatMake.update({
      where: { id: existing.id },
      data,
      include: makeListInclude,
    });

    res.json({ make });
  } catch (error) {
    console.error('Update boat make error:', error);
    res.status(500).json({ error: 'Failed to update make' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getBoatMakeInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Make not found' });
    }

    await prisma.boatMake.delete({ where: { id: existing.id } });
    res.status(204).send();
  } catch (error) {
    console.error('Delete boat make error:', error);
    res.status(500).json({ error: 'Failed to delete make' });
  }
});

router.post('/:id/models', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const make = await getBoatMakeInSearch(searchId, req.params.id);
    if (!make) {
      return res.status(404).json({ error: 'Make not found' });
    }

    const { name, description, pros, cons, notes } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const trimmed = name.trim();
    const slug = await uniqueBoatModelSlug(prisma, make.id, slugify(trimmed));

    const model = await prisma.boatModel.create({
      data: {
        makeId: make.id,
        name: trimmed,
        slug,
        description: description || null,
        pros: pros || null,
        cons: cons || null,
        notes: notes || null,
      },
      select: modelSelect,
    });

    res.status(201).json({ model });
  } catch (error) {
    console.error('Create boat model error:', error);
    res.status(500).json({ error: 'Failed to create model' });
  }
});

export default router;
