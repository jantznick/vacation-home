import { useEffect, useState } from 'react';
import { useSearchAPI } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';
import PriceEstimate from '../components/PriceEstimate';
import { BOAT_PROPULSIONS, isBoatSearch, supportsRegions } from '../lib/assetTypes';

export const ANY_REGION = 'any';

const emptyHomeSpec = {
  regionId: ANY_REGION,
  isVacantLot: false,
  acres: '',
  sqftLiving: '',
  bedrooms: '',
  bathrooms: '',
  waterfront: false,
};

const emptyBoatSpec = {
  lengthFt: '',
  yearBuilt: '',
  propulsion: 'sail',
};

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

export default function DreamEstimator() {
  const api = useSearchAPI();
  const { assetType, loading: searchLoading } = useCurrentSearch();
  const boatMode = isBoatSearch(assetType);
  const homeMode = supportsRegions(assetType);
  const [regions, setRegions] = useState([]);
  const [form, setForm] = useState(emptyHomeSpec);
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAnyRegion = form.regionId === ANY_REGION;
  const showAnyRegionHelp = !boatMode && (estimate?.mode === 'anyRegion' || (!estimate && isAnyRegion));

  useEffect(() => {
    setEstimate(null);
    setError('');
    setForm(boatMode ? emptyBoatSpec : emptyHomeSpec);
  }, [boatMode]);

  useEffect(() => {
    if (!homeMode) {
      setRegions([]);
      return undefined;
    }

    api.regions.list().then((data) => setRegions(data.regions)).catch(() => {});
    return undefined;
  }, [api, homeMode]);

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
      const payload = boatMode
        ? {
            lengthFt: form.lengthFt ? Number(form.lengthFt) : null,
            yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
            propulsion: form.propulsion || 'sail',
          }
        : {
            isVacantLot: form.isVacantLot,
            waterfront: form.waterfront,
            acres: form.acres ? Number(form.acres) : null,
            sqftLiving: form.sqftLiving ? Number(form.sqftLiving) : null,
            bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
            bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          };

      if (!boatMode && !isAnyRegion) {
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

  const resultsSubtitle = boatMode
    ? 'Based on boats in your search'
    : isAnyRegion
      ? 'Ballpark from all your saved listings'
      : 'Based on listings in your search';

  if (searchLoading) {
    return <p className="text-pine-600">Loading estimator...</p>;
  }

  return (
    <div>
      <PageHeader
        title={boatMode ? 'Dream boat estimator' : 'Dream home estimator'}
        description={
          boatMode
            ? 'Describe the boat you want and see what your saved listings suggest it should cost.'
            : 'Describe the vacation home you want and see what your saved listings suggest it should cost.'
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={handleEstimate} className="space-y-4">
            <h2 className="text-lg font-medium text-pine-900">
              {boatMode ? 'Your ideal boat' : 'Your ideal property'}
            </h2>
            <p className="text-sm text-pine-600">
              {boatMode
                ? 'Estimates improve as you add more priced boats. Length and year are the main inputs.'
                : 'Estimates improve as you add more priced listings. Pick a specific region to see regional and in-area similar comps.'}
            </p>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            {boatMode ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Length (ft)" htmlFor="lengthFt">
                  <input
                    id="lengthFt"
                    name="lengthFt"
                    type="number"
                    step="0.1"
                    value={form.lengthFt || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Year built" htmlFor="yearBuilt">
                  <input
                    id="yearBuilt"
                    name="yearBuilt"
                    type="number"
                    value={form.yearBuilt || ''}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="Propulsion" htmlFor="propulsion" className="sm:col-span-2">
                  <select
                    id="propulsion"
                    name="propulsion"
                    value={form.propulsion || 'sail'}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    {BOAT_PROPULSIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </FormField>
              </div>
            ) : (
              <>
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
              </>
            )}

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
                {boatMode
                  ? 'Fill in length and year, then click Estimate price. You need at least 3 saved boats with prices.'
                  : 'Fill in your dream property and click Estimate price. You need at least 3 saved listings with prices per segment.'}
              </p>
            </Card>
          )}

          <Card className="bg-pine-50/60">
            <h3 className="text-sm font-medium text-pine-900">How to read these tabs</h3>
            {boatMode ? (
              <p className="mt-2 text-sm text-pine-600">
                <strong className="font-medium text-pine-800">All listings</strong> uses every priced
                boat in your search.{' '}
                <strong className="font-medium text-pine-800">Similar</strong> narrows to boats
                close in length (and matching propulsion when set). Estimates improve as you add more
                comps.
              </p>
            ) : showAnyRegionHelp ? (
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
