import express from 'express';
import prisma from '../lib/prisma.js';
import { parseCoordinate } from '../lib/location.js';
import { geocodePoi, isMapsConfigured } from '../lib/locationService.js';
import { requireEditor } from '../middleware/searchAccess.js';

const router = express.Router();

const poiSelect = {
  id: true,
  searchId: true,
  type: true,
  label: true,
  address: true,
  city: true,
  state: true,
  zip: true,
  latitude: true,
  longitude: true,
  isPrimary: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
};

router.get('/', async (req, res) => {
  try {
    const pois = await prisma.pointOfInterest.findMany({
      where: { searchId: req.search.id },
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { label: 'asc' }],
      select: poiSelect,
    });

    res.json({ pois });
  } catch (error) {
    console.error('List POIs error:', error);
    res.status(500).json({ error: 'Failed to list points of interest' });
  }
});

router.post('/', requireEditor, async (req, res) => {
  try {
    const {
      type = 'other',
      label,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      isPrimary = false,
      sortOrder = 0,
    } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ error: 'label is required' });
    }

    const allowedTypes = ['current_home', 'work', 'school', 'family', 'other'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid POI type' });
    }

    let poi = await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.pointOfInterest.updateMany({
          where: { searchId: req.search.id },
          data: { isPrimary: false },
        });
      }

      return tx.pointOfInterest.create({
        data: {
          searchId: req.search.id,
          type,
          label: label.trim(),
          address: address?.trim() || null,
          city: city?.trim() || null,
          state: state?.trim()?.toUpperCase() || null,
          zip: zip?.trim() || null,
          latitude: parseCoordinate(latitude),
          longitude: parseCoordinate(longitude),
          isPrimary: Boolean(isPrimary),
          sortOrder: Number(sortOrder) || 0,
        },
        select: poiSelect,
      });
    });

    if (isMapsConfigured() && (poi.address || poi.city) && !poi.latitude) {
      try {
        poi = await geocodePoi(poi.id);
      } catch (geocodeError) {
        console.warn('POI geocode skipped:', geocodeError.message);
      }
    }

    res.status(201).json({ poi });
  } catch (error) {
    console.error('Create POI error:', error);
    res.status(500).json({ error: 'Failed to create point of interest' });
  }
});

router.patch('/:id', requireEditor, async (req, res) => {
  try {
    const existing = await prisma.pointOfInterest.findFirst({
      where: { id: req.params.id, searchId: req.search.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Point of interest not found' });
    }

    const {
      type,
      label,
      address,
      city,
      state,
      zip,
      latitude,
      longitude,
      isPrimary,
      sortOrder,
    } = req.body;

    const data = {};
    if (type !== undefined) data.type = type;
    if (label !== undefined) {
      if (!label.trim()) {
        return res.status(400).json({ error: 'label cannot be empty' });
      }
      data.label = label.trim();
    }
    if (address !== undefined) {
      data.address = address?.trim() || null;
      data.latitude = null;
      data.longitude = null;
    }
    if (city !== undefined) data.city = city?.trim() || null;
    if (state !== undefined) data.state = state?.trim()?.toUpperCase() || null;
    if (zip !== undefined) data.zip = zip?.trim() || null;
    if (latitude !== undefined) data.latitude = parseCoordinate(latitude);
    if (longitude !== undefined) data.longitude = parseCoordinate(longitude);
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;

    let poi = await prisma.$transaction(async (tx) => {
      if (isPrimary === true) {
        await tx.pointOfInterest.updateMany({
          where: { searchId: req.search.id },
          data: { isPrimary: false },
        });
        data.isPrimary = true;
      } else if (isPrimary === false) {
        data.isPrimary = false;
      }

      return tx.pointOfInterest.update({
        where: { id: req.params.id },
        data,
        select: poiSelect,
      });
    });

    if (isMapsConfigured() && (address !== undefined || city !== undefined) && !poi.latitude) {
      try {
        poi = await geocodePoi(poi.id);
      } catch (geocodeError) {
        console.warn('POI geocode skipped:', geocodeError.message);
      }
    }

    res.json({ poi });
  } catch (error) {
    console.error('Update POI error:', error);
    res.status(500).json({ error: 'Failed to update point of interest' });
  }
});

router.post('/:id/geocode', requireEditor, async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    const existing = await prisma.pointOfInterest.findFirst({
      where: { id: req.params.id, searchId: req.search.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Point of interest not found' });
    }

    const poi = await geocodePoi(req.params.id);
    res.json({ poi });
  } catch (error) {
    console.error('Geocode POI error:', error);
    res.status(422).json({ error: error.message || 'Failed to geocode point of interest' });
  }
});

router.delete('/:id', requireEditor, async (req, res) => {
  try {
    const existing = await prisma.pointOfInterest.findFirst({
      where: { id: req.params.id, searchId: req.search.id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Point of interest not found' });
    }

    await prisma.pointOfInterest.delete({ where: { id: req.params.id } });
    res.json({ message: 'Point of interest deleted' });
  } catch (error) {
    console.error('Delete POI error:', error);
    res.status(500).json({ error: 'Failed to delete point of interest' });
  }
});

export default router;
