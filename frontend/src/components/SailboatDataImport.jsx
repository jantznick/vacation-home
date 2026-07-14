import { useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import Button from './Button';
import { BOAT_MODEL_SPEC_FIELD_KEYS } from '../lib/boatModelSpecs';

/**
 * Import boat-model specs from sailboatdata.com (URL or page-source paste).
 */
export default function SailboatDataImport({ onImport, defaultUrl = '' }) {
  const api = useSearchAPI();
  const [url, setUrl] = useState(defaultUrl);
  const [pasteSource, setPasteSource] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  const applyResult = (data) => {
    setWarnings(data.warnings || []);
    onImport(data.fields, data.warnings || []);
  };

  const handleUrlImport = async () => {
    if (!url.trim()) {
      setError('Paste a Sailboatdata link first');
      return;
    }

    setImporting(true);
    setError('');
    setWarnings([]);

    try {
      const data = await api.ingest.previewSailboatData(url.trim());
      applyResult(data);
      setShowPaste(false);
    } catch {
      setError("Couldn't load that page. Try pasting the page source instead.");
      setShowPaste(true);
    } finally {
      setImporting(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteSource.trim()) {
      setError('Paste the page source first');
      return;
    }

    setImporting(true);
    setError('');
    setWarnings([]);

    try {
      const data = await api.ingest.previewSailboatDataPaste(
        pasteSource.trim(),
        url.trim() || null,
      );
      applyResult(data);
      setPasteSource('');
      setShowPaste(false);
    } catch {
      setError("Couldn't read that page source. Make sure you copied the full page.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-pine-200 bg-pine-50/60 p-4">
      <h3 className="text-sm font-medium text-pine-900">Import from Sailboatdata</h3>
      <p className="mt-1 text-sm text-pine-600">
        Fills in specs and notes for this model.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://sailboatdata.com/sailboat/..."
          className="min-w-0 flex-1 rounded-md border border-pine-300 bg-white px-3 py-2 text-sm"
        />
        <Button
          type="button"
          variant="secondary"
          onClick={handleUrlImport}
          disabled={importing || !url.trim()}
        >
          {importing ? 'Importing…' : 'Import'}
        </Button>
      </div>

      <button
        type="button"
        className="mt-3 text-sm font-medium text-pine-700 hover:text-pine-950"
        onClick={() => setShowPaste((open) => !open)}
      >
        {showPaste ? 'Hide page source' : 'Paste page source instead'}
      </button>

      {showPaste && (
        <div className="mt-3 space-y-2">
          <textarea
            value={pasteSource}
            onChange={(e) => setPasteSource(e.target.value)}
            rows={4}
            placeholder="Paste the page source here"
            className="w-full rounded-md border border-pine-300 bg-white px-3 py-2 font-mono text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handlePasteImport}
            disabled={importing || !pasteSource.trim()}
          >
            {importing ? 'Importing…' : 'Import'}
          </Button>
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {warnings.length > 0 && (
        <ul className="mt-3 list-disc pl-5 text-sm text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Merge sailboatdata fields into an existing model record patch. */
export function mergeSailboatDataIntoModel(current, fields) {
  const patch = {};

  for (const key of BOAT_MODEL_SPEC_FIELD_KEYS) {
    if (fields[key] !== undefined) {
      patch[key] = fields[key];
    }
  }

  // Drop leftover wall-of-text "description" from the old import format.
  if (
    current.description
    && (/LOA\s+/i.test(current.description) || / · /.test(current.description))
  ) {
    patch.description = null;
  }

  if (fields.notes) {
    const existing = current.notes?.trim() || '';
    if (!existing) {
      patch.notes = fields.notes;
    } else if (!fields.notes || existing.includes(fields.notes)) {
      // keep existing
    } else {
      patch.notes = `${existing}\n\n${fields.notes}`;
    }
  }

  if (!current.name?.trim() && fields.name) {
    patch.name = fields.name;
  }

  return patch;
}
