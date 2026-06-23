import { useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import { formValuesToLakePayload, lakeToFormValues } from '../lib/lakeForm';
import Button from './Button';
import DnrLakeImport, { mergeDnrIntoLakeForm } from './DnrLakeImport';
import LakeFormFields from './LakeFormFields';
import Modal from './Modal';

export default function LakeEditModal({ lake, onClose, onSaved }) {
  const api = useSearchAPI();
  const [form, setForm] = useState(() => lakeToFormValues(lake));
  const [dnrImportUrl, setDnrImportUrl] = useState(lake.dnrSourceUrl || '');
  const [dnrImportWarnings, setDnrImportWarnings] = useState([]);
  const [refreshDnrOnSave, setRefreshDnrOnSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleDnrImport = (fields, warnings) => {
    setDnrImportWarnings(warnings);
    setForm((current) => ({
      ...mergeDnrIntoLakeForm(current, fields),
      dnrSourceUrl: dnrImportUrl.trim() || fields.dnrSourceUrl || current.dnrSourceUrl,
    }));
  };

  const resolveFormForSave = async () => {
    const trimmedUrl = form.dnrSourceUrl.trim();
    if (!refreshDnrOnSave || !trimmedUrl) {
      return form;
    }

    const preview = await api.ingest.previewDnrLake(trimmedUrl);
    return {
      ...mergeDnrIntoLakeForm(form, preview.fields),
      dnrSourceUrl: trimmedUrl,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const resolvedForm = await resolveFormForSave();
      await api.lakes.update(lake.id, formValuesToLakePayload(resolvedForm));
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Edit ${lake.name}`} onClose={onClose}>
      <form id="lake-edit-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}

        <DnrLakeImport
          url={dnrImportUrl}
          onUrlChange={setDnrImportUrl}
          onImport={handleDnrImport}
          warnings={dnrImportWarnings}
          description="Import lake stats from DNR, or check “Refresh from DNR on save” below to pull latest data when saving."
        />

        <LakeFormFields values={form} onChange={setForm} idPrefix="edit-lake" />

        <label className="flex items-start gap-2 text-sm text-pine-800 sm:col-span-2">
          <input
            type="checkbox"
            checked={refreshDnrOnSave}
            onChange={(e) => setRefreshDnrOnSave(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-pine-900">Refresh from DNR on save</span>
            <span className="mt-1 block text-xs text-pine-500">
              Replaces lake stats with data from the DNR URL above when you save.
            </span>
          </span>
        </label>
      </form>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" form="lake-edit-form" disabled={saving}>
          {saving ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </Modal>
  );
}
