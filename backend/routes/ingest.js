import express from 'express';
import {
  previewDnrLakeFromHtml,
  previewDnrLakeFromUrl,
  previewListingFromPaste,
  previewListingFromUrl,
} from '../services/ingest/index.js';

const router = express.Router();

function ingestContext(req) {
  return {
    searchId: req.params.searchId ?? null,
    userId: req.session?.userId ?? null,
  };
}

router.post('/preview', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url?.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const result = await previewListingFromUrl(url.trim(), ingestContext(req));

    res.json({
      fields: result.fields,
      warnings: result.warnings,
      sourceSite: result.sourceSite,
      fetchMethod: result.fetchMethod,
      needsPaste: Boolean(result.needsPaste),
      apiUsage: result.apiUsage ?? null,
    });
  } catch (error) {
    console.error('Ingest preview error:', error);
    res.status(422).json({
      error: error.message || 'Failed to fetch listing from URL',
      needsPaste: Boolean(error.needsPaste),
    });
  }
});

router.post('/preview-paste', async (req, res) => {
  try {
    const { url, pastedData } = req.body;

    if (!pastedData?.trim()) {
      return res.status(400).json({ error: 'Pasted page data is required' });
    }

    const result = previewListingFromPaste({
      sourceUrl: url?.trim() || null,
      pastedData,
    });

    res.json({
      fields: result.fields,
      warnings: result.warnings,
      sourceSite: result.sourceSite,
      fetchMethod: result.fetchMethod,
      needsPaste: Boolean(result.needsPaste),
    });
  } catch (error) {
    console.error('Ingest paste preview error:', error);
    res.status(422).json({
      error: error.message || 'Failed to parse pasted listing data',
    });
  }
});

router.post('/dnr-lake/preview', async (req, res) => {
  try {
    const { url, wbic } = req.body;

    if (!url?.trim() && !wbic?.trim()) {
      return res.status(400).json({ error: 'DNR lake URL or WBIC is required' });
    }

    const result = await previewDnrLakeFromUrl(url?.trim() || wbic.trim());

    res.json({
      fields: result.fields,
      warnings: result.warnings,
      source: result.source,
    });
  } catch (error) {
    console.error('DNR lake preview error:', error);
    res.status(422).json({
      error: error.message || 'Failed to import lake from WI DNR',
    });
  }
});

router.post('/dnr-lake/preview-paste', async (req, res) => {
  try {
    const { wbic, overviewHtml, factsHtml } = req.body;

    if (!overviewHtml?.trim() && !factsHtml?.trim()) {
      return res.status(400).json({ error: 'Overview or facts HTML is required' });
    }

    const result = previewDnrLakeFromHtml({
      wbic: wbic?.trim() || null,
      overviewHtml: overviewHtml?.trim() || null,
      factsHtml: factsHtml?.trim() || null,
    });

    res.json({
      fields: result.fields,
      warnings: result.warnings,
      source: result.source,
    });
  } catch (error) {
    console.error('DNR lake paste preview error:', error);
    res.status(422).json({
      error: error.message || 'Failed to parse pasted DNR lake HTML',
    });
  }
});

export default router;
