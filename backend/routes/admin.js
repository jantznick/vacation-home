import express from 'express';
import { listIngestApiCalls } from '../services/ingest/apiUsage.js';

const router = express.Router();

router.get('/ingest-calls', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const provider = req.query.provider?.trim() || 'zillapi';

    const result = await listIngestApiCalls({ provider, limit, offset });

    res.json(result);
  } catch (error) {
    console.error('Admin ingest calls error:', error);
    res.status(500).json({ error: 'Failed to load ingest API calls' });
  }
});

export default router;
