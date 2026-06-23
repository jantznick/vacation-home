import { useEffect, useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import FormField from '../components/FormField';

const FALLBACK_FEATURES = [
  'acres',
  'isVacantLot',
  'sqftLiving',
  'bedrooms',
  'bathrooms',
  'waterfront',
  'region',
];

function segmentSummary(modelData) {
  const segments = modelData?.segments;
  if (!segments) {
    return { all: false, regions: 0, similar: 0 };
  }

  return {
    all: Boolean(segments.all),
    regions: Object.keys(segments.regions || {}).length,
    similar: Object.keys(segments.similar || {}).length,
  };
}

function buildPricingNotice(pricing) {
  if (!pricing?.updated) {
    return 'Listing saved. Add more priced listings to activate segment models.';
  }

  const active = (pricing.models || []).some((model) => model.allReady);
  if (!active) {
    return 'Listing saved. Segment models activate at 3+ listings with list prices.';
  }

  return 'Listing saved. Pricing models updated for affected segments.';
}

export default function PricingModels() {
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const [models, setModels] = useState([]);
  const [features, setFeatures] = useState([]);
  const [defaultFeatures, setDefaultFeatures] = useState(FALLBACK_FEATURES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [trainingId, setTrainingId] = useState(null);
  const [modelToDelete, setModelToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    features: FALLBACK_FEATURES,
    isDefault: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const [modelsData, featuresData] = await Promise.all([
        api.pricingModels.list(),
        api.pricingModels.features(),
      ]);
      setModels(modelsData.models);
      setFeatures(featuresData.features);
      if (featuresData.defaultFeatures?.length) {
        setDefaultFeatures(featuresData.defaultFeatures);
        setForm((current) => ({
          ...current,
          features: current.features.length ? current.features : featuresData.defaultFeatures,
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [api]);

  const toggleFeature = (key) => {
    setForm((current) => ({
      ...current,
      features: current.features.includes(key)
        ? current.features.filter((feature) => feature !== key)
        : [...current.features, key],
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await api.pricingModels.create(form);
      setForm({
        name: '',
        description: '',
        features: defaultFeatures,
        isDefault: models.length === 0,
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTrain = async (id) => {
    setTrainingId(id);
    setError('');

    try {
      await api.pricingModels.train(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTrainingId(null);
    }
  };

  const handleSetDefault = async (id) => {
    setError('');
    try {
      await api.pricingModels.update(id, { isDefault: true });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!modelToDelete) return;

    setDeleting(true);
    setError('');

    try {
      await api.pricingModels.remove(modelToDelete.id);
      setModelToDelete(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Pricing models"
        description="ML models trained per segment — all listings, each region, and similar homes. Models retrain automatically when listings change."
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {canEdit && (
      <Card className="mb-6">
        <h2 className="text-lg font-medium text-pine-900">Create model</h2>
        <p className="mt-1 text-sm text-pine-600">
          Pick features and save — all three segments train immediately (when enough listings exist).
        </p>

        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Model name" htmlFor="model-name">
              <input
                id="model-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              />
            </FormField>
            <FormField label="Description" htmlFor="model-description">
              <input
                id="model-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Optional"
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-pine-800">Features</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {features.map((feature) => (
                <label
                  key={feature.key}
                  className="flex items-start gap-2 rounded-md border border-pine-200 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.features.includes(feature.key)}
                    onChange={() => toggleFeature(feature.key)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-pine-900">{feature.label}</span>
                    <span className="block text-xs text-pine-500">{feature.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-pine-700">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            />
            Use as default model on listing pages
          </label>

          <Button type="submit" disabled={saving || form.features.length === 0}>
            {saving ? 'Creating...' : 'Create & train segments'}
          </Button>
        </form>
      </Card>
      )}

      {loading ? (
        <p className="text-pine-600">Loading models...</p>
      ) : models.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">
            No custom models yet. A built-in default is used until you create one.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {models.map((model) => {
            const segments = segmentSummary(model.modelData);

            return (
              <Card key={model.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-pine-900">{model.name}</h3>
                      {model.isDefault && (
                        <span className="rounded-full bg-pine-100 px-2 py-0.5 text-xs font-medium text-pine-700">
                          Default
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="mt-1 text-sm text-pine-600">{model.description}</p>
                    )}
                    <p className="mt-2 text-xs text-pine-500">
                      Features: {(model.features || []).join(', ')}
                    </p>
                    <p className="mt-1 text-xs text-pine-500">
                      Segments: {segments.all ? 'All ✓' : 'All —'}
                      {' · '}
                      {segments.regions} region{segments.regions === 1 ? '' : 's'}
                      {' · '}
                      {segments.similar} similar pool{segments.similar === 1 ? '' : 's'}
                    </p>
                  </div>
                  {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {!model.isDefault && (
                      <Button variant="secondary" onClick={() => handleSetDefault(model.id)}>
                        Set default
                      </Button>
                    )}
                    <Button
                      onClick={() => handleTrain(model.id)}
                      disabled={trainingId === model.id}
                    >
                      {trainingId === model.id ? 'Training...' : 'Retrain all segments'}
                    </Button>
                    <Button variant="danger" onClick={() => setModelToDelete(model)}>
                      Delete
                    </Button>
                  </div>
                  )}
                </div>

                {model.trainedAt ? (
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-pine-500">Last updated</dt>
                      <dd className="font-medium text-pine-900">
                        {new Date(model.trainedAt).toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-pine-500">All listings</dt>
                      <dd className="font-medium text-pine-900">
                        {model.modelData?.segments?.all?.sampleCount ?? 0} homes
                      </dd>
                    </div>
                    <div>
                      <dt className="text-pine-500">Coverage</dt>
                      <dd className="font-medium text-pine-900">
                        {segments.regions} region{segments.regions === 1 ? '' : 's'}
                        {' · '}
                        {segments.similar} similar {segments.similar === 1 ? 'set' : 'sets'}
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-amber-700">
                    Waiting for 3+ listings with list prices to train segments.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modelToDelete && (
        <ConfirmModal
          title="Delete pricing model"
          message={`Delete "${modelToDelete.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setModelToDelete(null)}
          loading={deleting}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
