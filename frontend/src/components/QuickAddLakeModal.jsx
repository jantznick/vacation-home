import { useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import Button from './Button';
import Modal from './Modal';

export default function QuickAddLakeModal({ regionId, onClose, onCreated }) {
  const api = useSearchAPI();
  const [name, setName] = useState('');
  const [dnrUrl, setDnrUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      let payload = {
        regionId,
        name: name.trim(),
        dnrSourceUrl: dnrUrl.trim() || null,
      };

      if (dnrUrl.trim()) {
        const preview = await api.ingest.previewDnrLake(dnrUrl.trim());
        const fields = preview.fields;
        payload = {
          regionId,
          name: fields.name || name.trim(),
          acreage: fields.acreage,
          maxDepthFeet: fields.maxDepthFeet,
          avgDepthFeet: fields.avgDepthFeet,
          waterClarity: fields.waterClarity,
          edgeType: fields.edgeType,
          notes: fields.notes,
          dnrSourceUrl: fields.dnrSourceUrl || dnrUrl.trim(),
        };
      }

      const data = await api.lakes.create(payload);
      await onCreated(data.lake);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Add lake" onClose={onClose}>
      <form id="quick-add-lake-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div>
          <label htmlFor="lake-name" className="mb-1 block text-sm font-medium text-pine-800">
            Lake name
          </label>
          <input
            id="lake-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Anvil Lake"
            className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label htmlFor="lake-dnr-url" className="mb-1 block text-sm font-medium text-pine-800">
            WI DNR link (optional)
          </label>
          <input
            id="lake-dnr-url"
            value={dnrUrl}
            onChange={(e) => setDnrUrl(e.target.value)}
            placeholder="https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=..."
            className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-xs text-pine-500">
            Add a DNR URL now to import lake stats, or add just the name and enrich later on the region page.
          </p>
        </div>
      </form>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" form="quick-add-lake-form" disabled={saving || !name.trim()}>
          {saving ? 'Saving...' : 'Add lake'}
        </Button>
      </div>
    </Modal>
  );
}
