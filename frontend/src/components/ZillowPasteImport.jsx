import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import { ZILLOW_COPY_SNIPPET } from '../lib/zillowSnippet';
import Button from './Button';
import Card from './Card';

function formatPreviewValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? `${value.length} items` : '—';
  return String(value);
}

export default function ZillowPasteImport({ canEdit }) {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const [sourceUrl, setSourceUrl] = useState('');
  const [pastedData, setPastedData] = useState('');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [preview, setPreview] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(ZILLOW_COPY_SNIPPET);
      setWarnings(['Copied — paste into the Zillow page console, press Enter, then paste the result below.']);
    } catch {
      setError('Could not copy snippet — select and copy it manually from the code block.');
    }
  };

  const handleImport = async () => {
    if (!sourceUrl.trim()) {
      setError('Paste the Zillow listing URL first');
      return;
    }
    if (!pastedData.trim()) {
      setError('Paste the page data from your browser');
      return;
    }

    setImporting(true);
    setError('');
    setWarnings([]);

    try {
      const data = await api.ingest.previewPaste(sourceUrl.trim(), pastedData.trim());
      setPreview(data);
      setWarnings(data.warnings || []);
    } catch (err) {
      setError(err.message);
      setPreview(null);
    } finally {
      setImporting(false);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <Card className="mt-6">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-lg font-medium text-pine-900">Advanced: Zillow browser paste</h2>
          <p className="mt-1 text-sm text-pine-600">
            Fallback when URL import is unavailable. Uses free browser paste — no API credits.
          </p>
        </div>
        <span className="ml-4 text-sm text-pine-500">{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-pine-100 pt-4">
          <p className="text-sm text-pine-600">
            Open the listing in Chrome → DevTools console → run the line below → paste URL + JSON here.
            Desktop only; does not work on mobile.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="flex-1 rounded-md bg-pine-900 px-3 py-2 text-xs text-pine-100">
              {ZILLOW_COPY_SNIPPET}
            </code>
            <Button type="button" variant="secondary" onClick={handleCopySnippet}>
              Copy
            </Button>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-pine-800">Zillow URL</label>
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://www.zillow.com/homedetails/..."
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-pine-800">Pasted JSON</label>
            <textarea
              value={pastedData}
              onChange={(e) => setPastedData(e.target.value)}
              rows={6}
              placeholder="Paste whatever the console copied — big file is fine"
              className="w-full rounded-md border border-pine-300 px-3 py-2 font-mono text-xs"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={handleImport} disabled={importing}>
              {importing ? 'Parsing...' : 'Parse pasted data'}
            </Button>
            {preview?.fields && (
              <Link
                to={searchPath(searchId, '/listings/new')}
                state={{ importedFields: preview.fields, importWarnings: preview.warnings || [] }}
              >
                <Button type="button" variant="secondary">Add listing with this data</Button>
              </Link>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {warnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {warnings.map((warning) => (
                <li key={warning} className="text-sm text-amber-700">• {warning}</li>
              ))}
            </ul>
          )}

          {preview?.fields && (
            <div className="mt-4 rounded-md border border-pine-100 bg-pine-50 p-3 text-sm text-pine-800">
              <p className="font-medium text-pine-900">Parsed preview</p>
              <dl className="mt-2 grid gap-1 sm:grid-cols-2">
                <div><dt className="text-pine-500">Address</dt><dd>{formatPreviewValue(preview.fields.address)}</dd></div>
                <div><dt className="text-pine-500">Price</dt><dd>{formatPreviewValue(preview.fields.listPrice)}</dd></div>
                <div><dt className="text-pine-500">Beds / baths</dt><dd>{formatPreviewValue(preview.fields.bedrooms)} / {formatPreviewValue(preview.fields.bathrooms)}</dd></div>
                <div><dt className="text-pine-500">Photos</dt><dd>{formatPreviewValue(preview.fields.photoUrls)}</dd></div>
              </dl>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
