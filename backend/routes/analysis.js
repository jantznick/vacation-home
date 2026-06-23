import express from 'express';
import { getPriceDrops } from '../services/analysis/index.js';
import { searchIdFrom } from '../lib/searchScope.js';

const router = express.Router();

router.get('/price-drops', async (req, res) => {
  try {
    const drops = await getPriceDrops(searchIdFrom(req));
    res.json({ drops });
  } catch (error) {
    console.error('Price drops error:', error);
    res.status(500).json({ error: 'Failed to load price drops' });
  }
});

export default router;
