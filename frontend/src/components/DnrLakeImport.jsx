import { useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import { dnrFieldsToFormValues } from '../lib/lakeForm';
import Button from './Button';
import FormField from './FormField';

export default function DnrLakeImport({
  url,
  onUrlChange,
  onImport,
  importing: importingProp = false,
  warnings = [],
  label = 'WI DNR lake URL',
  description = 'Paste a DNR lake URL (overview or facts page) — e.g. ...LakeDetail.aspx?wbic=968800',
}) {
  const api = useSearchAPI();
  const [importingLocal, setImportingLocal] = useState(false);
  const importing = importingProp || importingLocal;

  const handleImport = async () => {
    if (!url.trim()) return;

    setImportingLocal(true);
    try {
      const data = await api.ingest.previewDnrLake(url.trim());
      onImport(data.fields, data.warnings || []);
    } finally {
      setImportingLocal(false);
    }
  };

  return (
    <div className="rounded-lg border border-pine-200 bg-pine-50 p-4 sm:col-span-2">
      <h3 className="text-sm font-medium text-pine-900">Import from WI DNR</h3>
      <p className="mt-1 text-sm text-pine-600">{description}</p>
      <FormField label={label} htmlFor="dnr-import-url" className="mt-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="dnr-import-url"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=..."
            className="flex-1 rounded-md border border-pine-300 bg-white px-3 py-2 text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleImport}
            disabled={importing || !url.trim()}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </FormField>
      {warnings.length > 0 && (
        <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function mergeDnrIntoLakeForm(currentForm, fields) {
  return {
    ...currentForm,
    ...dnrFieldsToFormValues(fields),
  };
}
