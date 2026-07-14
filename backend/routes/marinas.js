import express from 'express';
import prisma from '../lib/prisma.js';
import { slugify, uniqueMarinaSlug } from '../lib/slug.js';
import { searchIdFrom, getMarinaInSearch } from '../lib/searchScope.js';
import { parseCoordinate } from '../lib/location.js';

const router = express.Router();

const VALID_FEE_TYPES = ['fixed', 'per_ft'];
const VALID_FEE_PERIODS = ['monthly', 'seasonal', 'annual'];

function normalizeSlipOptions(raw) {
  if (!Array.isArray(raw)) return null;
  const cleaned = raw
    .filter((opt) => opt && typeof opt === 'object' && opt.name?.trim())
    .map((opt) => ({
      name: opt.name.trim(),
      feeType: VALID_FEE_TYPES.includes(opt.feeType) ? opt.feeType : 'fixed',
      feeAmount: opt.feeAmount != null ? Number(opt.feeAmount) : null,
      feePeriod: VALID_FEE_PERIODS.includes(opt.feePeriod) ? opt.feePeriod : 'monthly',
      maxLengthFt: opt.maxLengthFt != null ? Number(opt.maxLengthFt) : null,
      notes: opt.notes?.trim() || null,
    }));
  return cleaned.length > 0 ? cleaned : null;
}

const marinaInclude = {
  _count: {
    select: { listings: true },
  },
};

function parseOptionalInt(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

function parseOptionalFloat(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

router.get('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const marinas = await prisma.marina.findMany({
      where: { searchId },
      include: marinaInclude,
      orderBy: { name: 'asc' },
    });
    res.json({ marinas });
  } catch (error) {
    console.error('List marinas error:', error);
    res.status(500).json({ error: 'Failed to list marinas' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const marina = await prisma.marina.findFirst({
      where: { id: req.params.id, searchId },
      include: {
        listings: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            make: true,
            model: true,
            nickname: true,
            lengthFt: true,
            yearBuilt: true,
            listPrice: true,
            status: true,
          },
        },
        _count: { select: { listings: true } },
      },
    });

    if (!marina) {
      return res.status(404).json({ error: 'Marina not found' });
    }

    res.json({ marina });
  } catch (error) {
    console.error('Get marina error:', error);
    res.status(500).json({ error: 'Failed to get marina' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name, description, address, city, state,
      latitude, longitude, website,
      slipOptions, winterStorageCost,
      liveaboardAllowed, seasonOpen, seasonClose, yearRound,
      amenities, maxLengthFt, maxDraftFt,
      pros, cons, notes, overallScore,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const searchId = searchIdFrom(req);
    const baseSlug = slugify(name);
    const slug = await uniqueMarinaSlug(prisma, searchId, baseSlug);

    const marina = await prisma.marina.create({
      data: {
        searchId,
        name: name.trim(),
        slug,
        description: description ?? null,
        address: address?.trim() ?? null,
        city: city?.trim() ?? null,
        state: state?.trim() ?? null,
        latitude: parseCoordinate(latitude),
        longitude: parseCoordinate(longitude),
        website: website?.trim() ?? null,
        slipOptions: normalizeSlipOptions(slipOptions),
        winterStorageCost: parseOptionalInt(winterStorageCost),
        liveaboardAllowed: liveaboardAllowed ?? false,
        seasonOpen: parseOptionalInt(seasonOpen),
        seasonClose: parseOptionalInt(seasonClose),
        yearRound: yearRound ?? true,
        amenities: amenities ?? null,
        maxLengthFt: parseOptionalFloat(maxLengthFt),
        maxDraftFt: parseOptionalFloat(maxDraftFt),
        pros: pros ?? null,
        cons: cons ?? null,
        notes: notes ?? null,
        overallScore: parseOptionalInt(overallScore),
      },
      include: marinaInclude,
    });

    res.status(201).json({ marina });
  } catch (error) {
    console.error('Create marina error:', error);
    res.status(500).json({ error: 'Failed to create marina' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getMarinaInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Marina not found' });
    }

    const {
      name, description, address, city, state,
      latitude, longitude, website,
      slipOptions, winterStorageCost,
      liveaboardAllowed, seasonOpen, seasonClose, yearRound,
      amenities, maxLengthFt, maxDraftFt,
      pros, cons, notes, overallScore,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      data.name = name.trim();
      if (slugify(name) !== existing.slug) {
        data.slug = await uniqueMarinaSlug(prisma, searchId, slugify(name), existing.id);
      }
    }
    if (description !== undefined) data.description = description;
    if (address !== undefined) data.address = address?.trim() || null;
    if (city !== undefined) data.city = city?.trim() || null;
    if (state !== undefined) data.state = state?.trim() || null;
    if (latitude !== undefined) data.latitude = parseCoordinate(latitude);
    if (longitude !== undefined) data.longitude = parseCoordinate(longitude);
    if (website !== undefined) data.website = website?.trim() || null;
    if (slipOptions !== undefined) data.slipOptions = normalizeSlipOptions(slipOptions);
    if (winterStorageCost !== undefined) data.winterStorageCost = parseOptionalInt(winterStorageCost);
    if (liveaboardAllowed !== undefined) data.liveaboardAllowed = liveaboardAllowed;
    if (seasonOpen !== undefined) data.seasonOpen = parseOptionalInt(seasonOpen);
    if (seasonClose !== undefined) data.seasonClose = parseOptionalInt(seasonClose);
    if (yearRound !== undefined) data.yearRound = yearRound;
    if (amenities !== undefined) data.amenities = amenities;
    if (maxLengthFt !== undefined) data.maxLengthFt = parseOptionalFloat(maxLengthFt);
    if (maxDraftFt !== undefined) data.maxDraftFt = parseOptionalFloat(maxDraftFt);
    if (pros !== undefined) data.pros = pros;
    if (cons !== undefined) data.cons = cons;
    if (notes !== undefined) data.notes = notes;
    if (overallScore !== undefined) data.overallScore = parseOptionalInt(overallScore);

    const marina = await prisma.marina.update({
      where: { id: req.params.id },
      data,
      include: marinaInclude,
    });

    res.json({ marina });
  } catch (error) {
    console.error('Update marina error:', error);
    res.status(500).json({ error: 'Failed to update marina' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getMarinaInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Marina not found' });
    }

    await prisma.marina.delete({ where: { id: req.params.id } });
    res.json({ message: 'Marina deleted' });
  } catch (error) {
    console.error('Delete marina error:', error);
    res.status(500).json({ error: 'Failed to delete marina' });
  }
});

export default router;
