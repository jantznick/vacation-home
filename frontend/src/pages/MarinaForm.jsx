import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';

const MONTHS = [
  { value: '', label: '—' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const emptyForm = {
  name: '',
  description: '',
  address: '',
  city: '',
  state: '',
  website: '',
  slipOptions: [],
  winterStorageCost: '',
  liveaboardAllowed: false,
  seasonOpen: '',
  seasonClose: '',
  yearRound: true,
  amenities: '',
  maxLengthFt: '',
  maxDraftFt: '',
  pros: '',
  cons: '',
  notes: '',
  overallScore: '',
};

const FEE_TYPES = [
  { value: 'fixed', label: 'Fixed rate' },
  { value: 'per_ft', label: 'Per foot' },
];

const FEE_PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'seasonal', label: 'Seasonal' },
  { value: 'annual', label: 'Annual' },
];

const emptySlip = { name: '', feeType: 'per_ft', feeAmount: '', feePeriod: 'monthly', maxLengthFt: '', notes: '' };

function SlipOptionsEditor({ options, onChange }) {
  const addSlip = () => onChange([...options, { ...emptySlip }]);
  const removeSlip = (idx) => onChange(options.filter((_, i) => i !== idx));
  const updateSlip = (idx, field, value) => {
    const next = options.map((opt, i) => (i === idx ? { ...opt, [field]: value } : opt));
    onChange(next);
  };

  const cls = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-pine-800">Slip options</label>
        <button type="button" onClick={addSlip} className="text-xs font-medium text-pine-600 hover:text-pine-900">
          + Add slip option
        </button>
      </div>
      {options.length === 0 && (
        <p className="text-xs text-pine-500">No slip options yet. Add one to track pricing.</p>
      )}
      <div className="space-y-3">
        {options.map((opt, idx) => (
          <div key={idx} className="rounded-lg border border-pine-200 bg-pine-50/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-pine-500">Slip {idx + 1}</span>
              <button type="button" onClick={() => removeSlip(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-pine-600">Name</label>
                <input value={opt.name} onChange={(e) => updateSlip(idx, 'name', e.target.value)} placeholder="e.g. Star Dock, Standard Slip" className={cls} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-pine-600">Pricing</label>
                  <select value={opt.feeType} onChange={(e) => updateSlip(idx, 'feeType', e.target.value)} className={cls}>
                    {FEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-pine-600">Period</label>
                  <select value={opt.feePeriod} onChange={(e) => updateSlip(idx, 'feePeriod', e.target.value)} className={cls}>
                    {FEE_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-pine-600">
                  {opt.feeType === 'per_ft' ? 'Amount ($/ft)' : 'Amount ($)'}
                </label>
                <input type="number" min="0" step="0.01" value={opt.feeAmount} onChange={(e) => updateSlip(idx, 'feeAmount', e.target.value)} placeholder={opt.feeType === 'per_ft' ? 'e.g. 15' : 'e.g. 1750'} className={cls} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-pine-600">Max LOA (ft)</label>
                <input type="number" min="0" step="1" value={opt.maxLengthFt || ''} onChange={(e) => updateSlip(idx, 'maxLengthFt', e.target.value || null)} placeholder="Optional" className={cls} />
              </div>
            </div>
            <div className="mt-2">
              <label className="mb-1 block text-xs text-pine-600">Notes</label>
              <input value={opt.notes || ''} onChange={(e) => updateSlip(idx, 'notes', e.target.value)} placeholder="Covered, seasonal discount, etc." className={cls} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormField({ label, children, hint }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-pine-800">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-pine-500">{hint}</p>}
    </div>
  );
}

export default function MarinaForm() {
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
        const data = await api.marinas.get(id);
        const m = data.marina;
        setForm({
          name: m.name || '',
          description: m.description || '',
          address: m.address || '',
          city: m.city || '',
          state: m.state || '',
          website: m.website || '',
          slipOptions: Array.isArray(m.slipOptions) ? m.slipOptions : [],
          winterStorageCost: m.winterStorageCost ?? '',
          liveaboardAllowed: m.liveaboardAllowed ?? false,
          seasonOpen: m.seasonOpen != null ? String(m.seasonOpen) : '',
          seasonClose: m.seasonClose != null ? String(m.seasonClose) : '',
          yearRound: m.yearRound ?? true,
          amenities: m.amenities || '',
          maxLengthFt: m.maxLengthFt ?? '',
          maxDraftFt: m.maxDraftFt ?? '',
          pros: m.pros || '',
          cons: m.cons || '',
          notes: m.notes || '',
          overallScore: m.overallScore ?? '',
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit, api]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const intOrNull = (v) => (v === '' || v == null ? null : Number(v));
    const floatOrNull = (v) => (v === '' || v == null ? null : Number(v));

    const payload = {
      name: form.name,
      description: form.description || null,
      address: form.address || null,
      city: form.city || null,
      state: form.state || null,
      website: form.website || null,
      slipOptions: form.slipOptions.length > 0 ? form.slipOptions : null,
      winterStorageCost: intOrNull(form.winterStorageCost),
      liveaboardAllowed: form.liveaboardAllowed,
      seasonOpen: intOrNull(form.seasonOpen),
      seasonClose: intOrNull(form.seasonClose),
      yearRound: form.yearRound,
      amenities: form.amenities || null,
      maxLengthFt: floatOrNull(form.maxLengthFt),
      maxDraftFt: floatOrNull(form.maxDraftFt),
      pros: form.pros || null,
      cons: form.cons || null,
      notes: form.notes || null,
      overallScore: intOrNull(form.overallScore),
    };

    try {
      if (isEdit) {
        await api.marinas.update(id, payload);
        navigate(searchPath(searchId, `/marinas/${id}`));
      } else {
        const data = await api.marinas.create(payload);
        navigate(searchPath(searchId, `/marinas/${data.marina.id}`));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading || loading) {
    return <p className="text-pine-600">Loading marina...</p>;
  }

  if (!canEdit) return null;

  const input = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';
  const halfInput = `${input} max-w-xs`;

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit marina' : 'Add marina'}
        description="Track a marina you're considering for berthing and storage."
      />

      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <FormField label="Name">
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Bayfield Marina" className={input} />
          </FormField>

          <FormField label="Description">
            <textarea name="description" value={form.description} onChange={handleChange} rows={2} className={input} />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Address">
              <input name="address" value={form.address} onChange={handleChange} placeholder="1 Marina Dr" className={input} />
            </FormField>
            <FormField label="City">
              <input name="city" value={form.city} onChange={handleChange} placeholder="Bayfield" className={input} />
            </FormField>
            <FormField label="State">
              <input name="state" value={form.state} onChange={handleChange} placeholder="WI" className={input} />
            </FormField>
          </div>

          <FormField label="Website" hint="Full URL including https://">
            <input name="website" value={form.website} onChange={handleChange} placeholder="https://example.com" className={input} />
          </FormField>

          <div className="border-t border-pine-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-pine-800">Carrying costs</h3>
            <SlipOptionsEditor
              options={form.slipOptions}
              onChange={(slipOptions) => setForm((prev) => ({ ...prev, slipOptions }))}
            />
            <div className="mt-4">
              <FormField label="Winter storage ($/yr)" hint="Haul-out + storage for the off-season.">
                <input name="winterStorageCost" type="number" min="0" value={form.winterStorageCost} onChange={handleChange} placeholder="e.g. 3000" className={halfInput} />
              </FormField>
            </div>
          </div>

          <div className="border-t border-pine-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-pine-800">Seasonality & capacity</h3>
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm text-pine-700">
                <input type="checkbox" name="yearRound" checked={form.yearRound} onChange={handleChange} />
                Open year-round
              </label>
            </div>
            {!form.yearRound && (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Season opens">
                  <select name="seasonOpen" value={form.seasonOpen} onChange={handleChange} className={input}>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </FormField>
                <FormField label="Season closes">
                  <select name="seasonClose" value={form.seasonClose} onChange={handleChange} className={input}>
                    {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </FormField>
              </div>
            )}
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <FormField label="Max LOA (ft)">
                <input name="maxLengthFt" type="number" step="0.1" min="0" value={form.maxLengthFt} onChange={handleChange} className={halfInput} />
              </FormField>
              <FormField label="Max draft (ft)">
                <input name="maxDraftFt" type="number" step="0.1" min="0" value={form.maxDraftFt} onChange={handleChange} className={halfInput} />
              </FormField>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-pine-700">
                  <input type="checkbox" name="liveaboardAllowed" checked={form.liveaboardAllowed} onChange={handleChange} />
                  Liveaboard allowed
                </label>
              </div>
            </div>
          </div>

          <FormField label="Amenities" hint="Fuel, pumpout, electric, water, showers, laundry, wifi, etc.">
            <textarea name="amenities" value={form.amenities} onChange={handleChange} rows={2} className={input} />
          </FormField>

          <div className="border-t border-pine-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-pine-800">Evaluation</h3>
            <FormField label="Overall score (1-10)">
              <input name="overallScore" type="number" min="1" max="10" value={form.overallScore} onChange={handleChange} className={halfInput} />
            </FormField>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Pros">
                <textarea name="pros" value={form.pros} onChange={handleChange} rows={3} className={input} placeholder="One per line" />
              </FormField>
              <FormField label="Cons">
                <textarea name="cons" value={form.cons} onChange={handleChange} rows={3} className={input} placeholder="One per line" />
              </FormField>
            </div>
            <div className="mt-4">
              <FormField label="Notes">
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} className={input} />
              </FormField>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create marina'}
            </Button>
            <Link to={isEdit ? searchPath(searchId, `/marinas/${id}`) : searchPath(searchId, '/marinas')}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
