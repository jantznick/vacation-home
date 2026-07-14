import express from 'express';
import prisma from '../lib/prisma.js';
import {
  createPricingModel,
  deletePricingModel,
  getFeatureCatalog,
  getPricingModel,
  listPricingModels,
  predictListingPrice,
  predictFromSpec,
  computePricePickerSensitivity,
  getPricingModelFitFeedback,
  trainPricingModel,
  updatePricingModel,
} from '../services/pricing/index.js';
import { searchIdFrom, getPricingModelInSearch } from '../lib/searchScope.js';

const router = express.Router();

router.get('/features', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const search = await prisma.search.findUnique({
      where: { id: searchId },
      select: { assetType: true },
    });
    res.json(getFeatureCatalog(search?.assetType || 'home'));
  } catch (error) {
    console.error('Feature catalog error:', error);
    res.status(500).json({ error: 'Failed to load feature catalog' });
  }
});

router.get('/', async (req, res) => {
  try {
    const models = await listPricingModels(searchIdFrom(req));
    res.json({ models });
  } catch (error) {
    console.error('List pricing models error:', error);
    res.status(500).json({ error: 'Failed to list pricing models' });
  }
});

router.post('/estimate', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const { modelId, ...spec } = req.body || {};

    const result = await predictFromSpec(searchId, spec, modelId || null);
    res.json(result);
  } catch (error) {
    console.error('Estimate from spec error:', error);
    res.status(422).json({ error: error.message || 'Failed to estimate price' });
  }
});

router.post('/sensitivity', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const { modelId, variable, spec, anyFeatures } = req.body || {};

    if (!variable) {
      return res.status(400).json({ error: 'variable is required' });
    }

    const result = await computePricePickerSensitivity(searchId, {
      spec: spec || {},
      variable,
      modelId: modelId || null,
      anyFeatures: anyFeatures || [],
    });
    res.json(result);
  } catch (error) {
    console.error('Price picker sensitivity error:', error);
    res.status(422).json({ error: error.message || 'Failed to compute sensitivity curve' });
  }
});

router.get('/:id/fit', async (req, res) => {
  try {
    const searchId = searchIdFrom(req);
    const existing = await getPricingModelInSearch(searchId, req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }

    const feedback = await getPricingModelFitFeedback(searchId, req.params.id);
    if (!feedback) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }

    res.json(feedback);
  } catch (error) {
    console.error('Pricing model fit feedback error:', error);
    res.status(500).json({ error: 'Failed to load model fit feedback' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const model = await getPricingModelInSearch(searchIdFrom(req), req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }
    res.json({ model });
  } catch (error) {
    console.error('Get pricing model error:', error);
    res.status(500).json({ error: 'Failed to get pricing model' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, features, algorithm, isDefault } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const model = await createPricingModel({
      searchId: searchIdFrom(req),
      name,
      description,
      features,
      algorithm,
      isDefault,
    });

    res.status(201).json({ model });
  } catch (error) {
    console.error('Create pricing model error:', error);
    res.status(422).json({ error: error.message || 'Failed to create pricing model' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const existing = await getPricingModelInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }

    const model = await updatePricingModel(req.params.id, req.body);
    if (!model) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }
    res.json({ model });
  } catch (error) {
    console.error('Update pricing model error:', error);
    res.status(422).json({ error: error.message || 'Failed to update pricing model' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const existing = await getPricingModelInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }

    const model = await deletePricingModel(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }
    res.json({ message: 'Pricing model deleted' });
  } catch (error) {
    console.error('Delete pricing model error:', error);
    res.status(500).json({ error: 'Failed to delete pricing model' });
  }
});

router.post('/:id/train', async (req, res) => {
  try {
    const existing = await getPricingModelInSearch(searchIdFrom(req), req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }

    const model = await trainPricingModel(req.params.id);
    if (!model) {
      return res.status(404).json({ error: 'Pricing model not found' });
    }
    res.json({ model });
  } catch (error) {
    console.error('Train pricing model error:', error);
    res.status(422).json({ error: error.message || 'Failed to train pricing model' });
  }
});

router.post('/:id/predict', async (req, res) => {
  try {
    const { listingId } = req.body;
    if (!listingId) {
      return res.status(400).json({ error: 'listingId is required' });
    }

    const result = await predictListingPrice(listingId, req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    res.json(result);
  } catch (error) {
    console.error('Predict pricing model error:', error);
    res.status(422).json({ error: error.message || 'Failed to predict price' });
  }
});

export default router;
