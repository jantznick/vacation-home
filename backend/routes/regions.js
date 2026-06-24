import express from 'express';
import prisma from '../lib/prisma.js';
import { slugify, uniqueRegionSlug } from '../lib/slug.js';
import { searchIdFrom, getRegionInSearch } from '../lib/searchScope.js';
import { parseCoordinate } from '../lib/location.js';
import {
  computeRegionDriveTime,
  geocodeRegion,
  isMapsConfigured,
} from '../lib/locationService.js';

const router = express.Router();

const regionInclude = {
  _count: {
    select: {
      lakes: true,
      listings: true,
    },
  },
};

router.get('/', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const regions = await prisma.region.findMany({
      where: { searchId },
      include: regionInclude,
      orderBy: { name: 'asc' },
    });
    res.json({ regions });
  } catch (error) {
    console.error('List regions error:', error);
    res.status(500).json({ error: 'Failed to list regions' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const region = await prisma.region.findFirst({
      where: { id: req.params.id, searchId },
      include: {
        lakes: { orderBy: { name: 'asc' } },
        listings: {
          orderBy: { createdAt: 'desc' },
          include: { lake: { select: { id: true, name: true } } },
        },
        _count: {
          select: { lakes: true, listings: true },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    res.json({ region });
  } catch (error) {
    console.error('Get region error:', error);
    res.status(500).json({ error: 'Failed to get region' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      centerAddress,
      latitude,
      longitude,
      driveTimeMinutes,
      driveDistanceMiles,
      radiusMiles,
      pros,
      cons,
      overallScore,
      status,
      notes,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const searchId = searchIdFrom(req);
    const baseSlug = slugify(name);
    const slug = await uniqueRegionSlug(prisma, searchId, baseSlug);

    let region = await prisma.region.create({
      data: {
        searchId,
        name: name.trim(),
        slug,
        description: description ?? null,
        centerAddress: centerAddress?.trim() ?? null,
        latitude: parseCoordinate(latitude),
        longitude: parseCoordinate(longitude),
        driveTimeMinutes: driveTimeMinutes ?? null,
        driveDistanceMiles: driveDistanceMiles ?? null,
        radiusMiles: radiusMiles != null && radiusMiles !== '' ? Number(radiusMiles) : null,
        pros: pros ?? null,
        cons: cons ?? null,
        overallScore: overallScore ?? null,
        status: status ?? undefined,
        notes: notes ?? null,
      },
      include: regionInclude,
    });

    if (isMapsConfigured() && region.centerAddress && !region.latitude) {
      try {
        region = await geocodeRegion(region.id);
        region = await prisma.region.findUnique({
          where: { id: region.id },
          include: regionInclude,
        });
      } catch (geocodeError) {
        console.warn('Region geocode skipped:', geocodeError.message);
      }
    }

    res.status(201).json({ region });
  } catch (error) {
    console.error('Create region error:', error);
    res.status(500).json({ error: 'Failed to create region' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getRegionInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Region not found' });
    }

    const {
      name,
      description,
      centerAddress,
      latitude,
      longitude,
      driveTimeMinutes,
      driveDistanceMiles,
      radiusMiles,
      pros,
      cons,
      overallScore,
      status,
      notes,
    } = req.body;

    const data = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      data.name = name.trim();
      if (slugify(name) !== existing.slug) {
        data.slug = await uniqueRegionSlug(prisma, searchId, slugify(name), existing.id);
      }
    }
    if (description !== undefined) data.description = description;
    if (centerAddress !== undefined) {
      data.centerAddress = centerAddress?.trim() || null;
      data.latitude = null;
      data.longitude = null;
      data.driveTimeMinutes = null;
      data.driveDistanceMiles = null;
    }
    if (latitude !== undefined) data.latitude = parseCoordinate(latitude);
    if (longitude !== undefined) data.longitude = parseCoordinate(longitude);
    if (driveTimeMinutes !== undefined) data.driveTimeMinutes = driveTimeMinutes;
    if (driveDistanceMiles !== undefined) data.driveDistanceMiles = driveDistanceMiles;
    if (radiusMiles !== undefined) {
      data.radiusMiles = radiusMiles === '' || radiusMiles == null ? null : Number(radiusMiles);
    }
    if (pros !== undefined) data.pros = pros;
    if (cons !== undefined) data.cons = cons;
    if (overallScore !== undefined) data.overallScore = overallScore;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes;

    const region = await prisma.region.update({
      where: { id: req.params.id },
      data,
      include: regionInclude,
    });

    let updatedRegion = region;
    if (isMapsConfigured() && (centerAddress !== undefined || latitude !== undefined || longitude !== undefined)) {
      if (updatedRegion.centerAddress && !updatedRegion.latitude) {
        try {
          updatedRegion = await geocodeRegion(updatedRegion.id);
          updatedRegion = await prisma.region.findUnique({
            where: { id: updatedRegion.id },
            include: regionInclude,
          });
        } catch (geocodeError) {
          console.warn('Region geocode skipped:', geocodeError.message);
        }
      }
    }

    res.json({ region: updatedRegion });
  } catch (error) {
    console.error('Update region error:', error);
    res.status(500).json({ error: 'Failed to update region' });
  }
});

router.post('/:id/geocode', async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    await geocodeRegion(req.params.id);

    let region;
    try {
      region = await computeRegionDriveTime(req.params.id, searchIdFrom(req));
    } catch (driveError) {
      console.warn('Drive time after region geocode skipped:', driveError.message);
      region = await prisma.region.findUnique({
        where: { id: req.params.id },
        include: regionInclude,
      });
    }

    res.json({ region });
  } catch (error) {
    console.error('Geocode region error:', error);
    res.status(422).json({ error: error.message || 'Failed to geocode region' });
  }
});

router.post('/:id/drive-time', async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const region = await computeRegionDriveTime(req.params.id, searchIdFrom(req));
    res.json({ region });
  } catch (error) {
    console.error('Region drive time error:', error);
    res.status(422).json({ error: error.message || 'Failed to calculate drive time' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getRegionInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Region not found' });
    }

    await prisma.region.delete({ where: { id: req.params.id } });
    res.json({ message: 'Region deleted' });
  } catch (error) {
    console.error('Delete region error:', error);
    res.status(500).json({ error: 'Failed to delete region' });
  }
});

export default router;
