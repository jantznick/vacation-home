import express from 'express';
import prisma from '../lib/prisma.js';
import { hasCoordinates } from '../lib/location.js';
import { searchIdFrom } from '../lib/searchScope.js';
import { getDrivingRoute, isMapsConfigured } from '../services/maps/index.js';

const router = express.Router();

router.get('/overview', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);

    const [pois, regions, listings] = await Promise.all([
      prisma.pointOfInterest.findMany({
        where: { searchId },
        select: {
          id: true,
          type: true,
          label: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          latitude: true,
          longitude: true,
          isPrimary: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
      }),
      prisma.region.findMany({
        where: {
          searchId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          centerAddress: true,
          latitude: true,
          longitude: true,
          driveTimeMinutes: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.listing.findMany({
        where: {
          searchId,
          latitude: { not: null },
          longitude: { not: null },
        },
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          listPrice: true,
          latitude: true,
          longitude: true,
          driveTimeMinutes: true,
          region: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const primaryPoi = pois.find((p) => p.isPrimary && hasCoordinates(p))
      || pois.find((p) => hasCoordinates(p))
      || null;

    res.json({ pois, primaryPoi, regions, listings });
  } catch (error) {
    console.error('Map overview error:', error);
    res.status(500).json({ error: 'Failed to load map data' });
  }
});

router.get('/route', async (req, res) => {
  try {
    if (!isMapsConfigured()) {
      return res.status(503).json({ error: 'Google Maps is not configured (GOOGLE_MAPS_API_KEY)' });
    }

    const searchId = searchIdFrom(req);
    const toLat = Number(req.query.toLat);
    const toLng = Number(req.query.toLng);
    const fromLat = req.query.fromLat != null ? Number(req.query.fromLat) : null;
    const fromLng = req.query.fromLng != null ? Number(req.query.fromLng) : null;
    const poiId = req.query.poiId || null;

    if (Number.isNaN(toLat) || Number.isNaN(toLng)) {
      return res.status(400).json({ error: 'toLat and toLng are required' });
    }

    let originLat = fromLat;
    let originLng = fromLng;

    if (originLat == null || originLng == null) {
      let poi = null;

      if (poiId) {
        poi = await prisma.pointOfInterest.findFirst({
          where: { id: poiId, searchId },
        });
      }

      if (!poi) {
        poi = await prisma.pointOfInterest.findFirst({
          where: { searchId, isPrimary: true },
        });
      }

      if (!poi || !hasCoordinates(poi)) {
        poi = await prisma.pointOfInterest.findFirst({
          where: {
            searchId,
            latitude: { not: null },
            longitude: { not: null },
          },
          orderBy: { sortOrder: 'asc' },
        });
      }

      if (!poi || !hasCoordinates(poi)) {
        return res.status(422).json({ error: 'Add a point of interest with an address in search settings' });
      }

      originLat = poi.latitude;
      originLng = poi.longitude;
    }

    const route = await getDrivingRoute({
      originLat,
      originLng,
      destLat: toLat,
      destLng: toLng,
    });

    res.json({
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: toLat, longitude: toLng },
      route,
    });
  } catch (error) {
    console.error('Map route error:', error);
    res.status(422).json({ error: error.message || 'Failed to load route' });
  }
});

export default router;
