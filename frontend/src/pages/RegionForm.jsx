import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { REGION_STATUSES } from '../lib/format';

const emptyForm = {
  name: '',
  description: '',
  centerAddress: '',
  radiusMiles: '',
  pros: '',
  cons: '',
  overallScore: '',
  status: 'researching',
  notes: '',
};

export default function RegionForm() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit, loading: accessLoading } = useSearchAccess({ redirectIfViewer: true });
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const data = await api.regions.get(id);
        const region = data.region;
        setForm({
          name: region.name || '',
          description: region.description || '',
          centerAddress: region.centerAddress || '',
          radiusMiles: region.radiusMiles ?? '',
          pros: region.pros || '',
          cons: region.cons || '',
          overallScore: region.overallScore ?? '',
          status: region.status || 'researching',
          notes: region.notes || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit, api]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = {
      name: form.name,
      description: form.description || null,
      centerAddress: form.centerAddress || null,
      radiusMiles: form.radiusMiles !== '' ? Number(form.radiusMiles) : null,
      pros: form.pros || null,
      cons: form.cons || null,
      overallScore: form.overallScore ? Number(form.overallScore) : null,
      status: form.status,
      notes: form.notes || null,
    };

    try {
      if (isEdit) {
        await api.regions.update(id, payload);
        navigate(searchPath(searchId, `/regions/${id}`));
      } else {
        const data = await api.regions.create(payload);
        navigate(searchPath(searchId, `/regions/${data.region.id}`));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading || loading) {
    return <p className="text-pine-600">Loading region...</p>;
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit region' : 'Add region'}
        description="Track a broad area you're researching for vacation homes."
      />

      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              placeholder="Eagle River / Three Lakes"
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Center location</label>
            <input
              name="centerAddress"
              value={form.centerAddress}
              onChange={handleChange}
              placeholder="Eagle River, WI"
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-pine-500">
              Town or landmark for the map pin and drive time. Leave blank to use the region name.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Area radius (miles)</label>
            <input
              name="radiusMiles"
              type="number"
              min="0"
              step="1"
              value={form.radiusMiles}
              onChange={handleChange}
              placeholder="e.g. 25"
              className="w-full max-w-xs rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-pine-500">
              Optional. Shows a circle on the map for how far from the center you are considering.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              >
                {REGION_STATUSES.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Overall score (1-10)</label>
              <input
                name="overallScore"
                type="number"
                min="1"
                max="10"
                value={form.overallScore}
                onChange={handleChange}
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Pros</label>
            <textarea name="pros" value={form.pros} onChange={handleChange} rows={3} className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Cons</label>
            <textarea name="cons" value={form.cons} onChange={handleChange} rows={3} className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Notes</label>
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm" />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create region'}
            </Button>
            <Link to={isEdit ? searchPath(searchId, `/regions/${id}`) : searchPath(searchId, '/regions')}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
