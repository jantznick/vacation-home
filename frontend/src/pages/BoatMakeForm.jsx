import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import EditableLineList from '../components/EditableLineList';

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';
const textareaClass = `${inputClass} min-h-[88px]`;

const emptyForm = {
  name: '',
  description: '',
  pros: '',
  cons: '',
  notes: '',
};

export default function BoatMakeForm() {
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
    if (!isEdit) return undefined;

    const load = async () => {
      try {
        const data = await api.boatMakes.get(id);
        const make = data.make;
        setForm({
          name: make.name || '',
          description: make.description || '',
          pros: make.pros || '',
          cons: make.cons || '',
          notes: make.notes || '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
    return undefined;
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
      pros: form.pros || null,
      cons: form.cons || null,
      notes: form.notes || null,
    };

    try {
      if (isEdit) {
        await api.boatMakes.update(id, payload);
        navigate(searchPath(searchId, `/makes/${id}`));
      } else {
        const data = await api.boatMakes.create(payload);
        navigate(searchPath(searchId, `/makes/${data.make.id}`));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading || loading) {
    return <p className="text-pine-600">Loading make...</p>;
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit make' : 'Add make'}
        description="Builder-level notes that apply to every boat of this make."
      />

      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-pine-800">Name</label>
            <input
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              className={inputClass}
              placeholder="Catalina"
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-pine-800">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              className={textareaClass}
              placeholder="Short overview of this builder"
            />
          </div>

          <EditableLineList
            label="Pros"
            value={form.pros}
            onChange={(pros) => setForm((current) => ({ ...current, pros: pros || '' }))}
            placeholder="Add a pro…"
          />

          <EditableLineList
            label="Cons"
            value={form.cons}
            onChange={(cons) => setForm((current) => ({ ...current, cons: cons || '' }))}
            placeholder="Add a con…"
          />

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-pine-800">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className={textareaClass}
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save make' : 'Create make'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? searchPath(searchId, `/makes/${id}`) : searchPath(searchId, '/makes'))}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
