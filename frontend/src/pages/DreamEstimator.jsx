import { useEffect, useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PriceEstimate from '../components/PriceEstimate';

export const ANY_REGION = 'any';

const emptySpec = {
  regionId: ANY_REGION,
  isVacantLot: false,
  acres: '',
  sqftLiving: '',
  bedrooms: '',
  bathrooms: '',
  waterfront: false,
};

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

export default function DreamEstimator() {
  const api = useSearchAPI();
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState(emptySpec);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAnyRegion = form.regionId === ANY_REGION;
  const showAnyRegionHelp = estimate?.mode === 'anyRegion' || (!estimate && isAnyRegion);

  useEffect(() => {
    api.regions.list().then((data) => setRegions(data.regions)).catch(() => {});
  }, [api]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'isVacantLot' && checked) {
      setForm((current) => ({
        ...current,
        isVacantLot: true,
        bedrooms: '',
        bathrooms: '',
        sqftLiving: '',
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleEstimate = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const payload = {
        isVacantLot: form.isVacantLot,
        waterfront: form.waterfront,
        acres: form.acres ? Number(form.acres) : null,
        sqftLiving: form.sqftLiving ? Number(form.sqftLiving) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      };

      if (!isAnyRegion) {
        payload.regionId = form.regionId;
      }

      const data = await api.pricingModels.estimate(payload);
      setEstimate(data);
    } catch (err) {
      setError(err.message);
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  };

  const resultsSubtitle = isAnyRegion
    ? 'Ballpark from all your saved listings'
    : 'Based on listings in your search';

  return (
    <div>
      <PageHeader
        title="Dream home estimator"
        description="Describe the vacation home you want and see what your saved listings suggest it should cost."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={handleEstimate} className="space-y-4">
            <h2 className="text-lg font-medium text-pine-900">Your ideal property</h2>
            <p className="text-sm text-pine-600">
              Estimates improve as you add more priced listings. Pick a specific region to see
              regional and in-area similar comps.
            </p>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <FormField label="Region" htmlFor="regionId">
              <select
                id="regionId"
                name="regionId"
                value={form.regionId}
                onChange={handleChange}
                className={inputClass}
              >
                <option value={ANY_REGION}>Any region</option>
                {regions.map((region) => (
                  <option key={region.id} value={region.id}>{region.name}</option>
                ))}
              </select>
            </FormField>

            <label className="flex items-center gap-2 text-sm text-pine-800">
              <input
                type="checkbox"
                name="isVacantLot"
                checked={form.isVacantLot}
                onChange={handleChange}
              />
              Vacant lot (land only)
            </label>

            <label className="flex items-center gap-2 text-sm text-pine-800">
              <input
                type="checkbox"
                name="waterfront"
                checked={form.waterfront}
                onChange={handleChange}
              />
              Waterfront
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Acres" htmlFor="acres">
                <input
                  id="acres"
                  name="acres"
                  type="number"
                  step="0.01"
                  value={form.acres}
                  onChange={handleChange}
                  className={inputClass}
                />
              </FormField>

              {!form.isVacantLot && (
                <>
                  <FormField label="Bedrooms" htmlFor="bedrooms">
                    <input
                      id="bedrooms"
                      name="bedrooms"
                      type="number"
                      step="0.5"
                      value={form.bedrooms}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Bathrooms" htmlFor="bathrooms">
                    <input
                      id="bathrooms"
                      name="bathrooms"
                      type="number"
                      step="0.5"
                      value={form.bathrooms}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>
                  <FormField label="Living area (sq ft)" htmlFor="sqftLiving">
                    <input
                      id="sqftLiving"
                      name="sqftLiving"
                      type="number"
                      value={form.sqftLiving}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>
                </>
              )}
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Estimating...' : 'Estimate price'}
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          {estimate?.tiers ? (
            <PriceEstimate
              data={estimate}
              title="What to expect"
              subtitle={resultsSubtitle}
              planningMode
            />
          ) : (
            <Card>
              <h2 className="text-lg font-medium text-pine-900">What to expect</h2>
              <p className="mt-2 text-sm text-pine-600">
                Fill in your dream property and click Estimate price. You need at least 3 saved
                listings with prices per segment.
              </p>
            </Card>
          )}

          <Card className="bg-pine-50/60">
            <h3 className="text-sm font-medium text-pine-900">How to read these tabs</h3>
            {showAnyRegionHelp ? (
              <p className="mt-2 text-sm text-pine-600">
                <strong className="font-medium text-pine-800">All listings</strong> uses every priced
                listing in your search — best ballpark when you have not picked an area yet.{' '}
                <strong className="font-medium text-pine-800">Similar properties</strong> narrows to
                listings that match your lot type, waterfront, and size across all regions. Pick a
                specific region to also see in-area comps.
              </p>
            ) : (
              <p className="mt-2 text-sm text-pine-600">
                Every tab prices the same dream property in your selected region.{' '}
                <strong className="font-medium text-pine-800">All listings</strong> trains on your
                full search (most data, mixes regions).{' '}
                <strong className="font-medium text-pine-800">All in region</strong> uses only
                listings there.{' '}
                <strong className="font-medium text-pine-800">Similar</strong> uses the closest
                matches in that region — most specific, but needs at least 3 comps. Estimates may
                differ between tabs; that is normal with limited data.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
