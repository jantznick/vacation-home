import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import FormField from '../components/FormField';
import QuickAddLakeModal from '../components/QuickAddLakeModal';
import { LISTING_STATUSES } from '../lib/format';
import { buildPricingNotice } from '../lib/pricingNotice';
import { BOAT_PROPULSIONS, isBoatSearch, supportsRegions } from '../lib/assetTypes';

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

const emptyForm = {
  regionId: '',
  lakeId: '',
  sourceUrl: '',
  sourceSite: 'zillow',
  mlsNumber: '',
  status: 'active',
  address: '',
  city: '',
  state: 'WI',
  zip: '',
  listPrice: '',
  soldPrice: '',
  isVacantLot: false,
  bedrooms: '',
  bathrooms: '',
  sqftLiving: '',
  sqftLot: '',
  acres: '',
  yearBuilt: '',
  waterfront: false,
  waterfrontType: '',
  make: '',
  model: '',
  lengthFt: '',
  propulsion: 'sail',
  pros: '',
  cons: '',
  notes: '',
  interestLevel: '',
  visited: false,
  visitNotes: '',
  daysOnMarket: '',
  photoUrls: [],
};

export default function ListingForm() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { assetType, loading: searchLoading } = useCurrentSearch();
  const boatMode = isBoatSearch(assetType);
  const homeMode = supportsRegions(assetType);
  const { canEdit, loading: accessLoading } = useSearchAccess({ redirectIfViewer: true });
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    ...emptyForm,
    regionId: searchParams.get('regionId') || '',
  });
  const [importUrl, setImportUrl] = useState('');
  const [pasteSource, setPasteSource] = useState('');
  const [pasteFallbackOpen, setPasteFallbackOpen] = useState(false);
  const [regions, setRegions] = useState([]);
  const [lakes, setLakes] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchWarnings, setFetchWarnings] = useState([]);
  const [rawScrapedData, setRawScrapedData] = useState(null);
  const [error, setError] = useState('');
  const [showAddLake, setShowAddLake] = useState(false);

  useEffect(() => {
    if (!homeMode) {
      setRegions([]);
      return undefined;
    }

    const loadRegions = async () => {
      const data = await api.regions.list();
      setRegions(data.regions);
    };

    loadRegions();
    return undefined;
  }, [api, homeMode]);

  useEffect(() => {
    if (!homeMode || !form.regionId) {
      setLakes([]);
      return;
    }

    const loadLakes = async () => {
      const data = await api.lakes.list(form.regionId);
      setLakes(data.lakes);
    };

    loadLakes();
  }, [api, form.regionId, homeMode]);

  const handleLakeCreated = async (lake) => {
    const data = await api.lakes.list(form.regionId);
    setLakes(data.lakes);
    setForm((current) => ({ ...current, lakeId: lake.id }));
  };

  useEffect(() => {
    if (!isEdit) return;

    const load = async () => {
      try {
        const data = await api.listings.get(id);
        const listing = data.listing;
        setForm({
          regionId: listing.regionId || '',
          lakeId: listing.lakeId || '',
          sourceUrl: listing.sourceUrl || '',
          sourceSite: listing.sourceSite || (boatMode ? '' : 'zillow'),
          mlsNumber: listing.mlsNumber || '',
          status: listing.status || 'active',
          address: listing.address || '',
          city: listing.city || '',
          state: listing.state || (boatMode ? '' : 'WI'),
          zip: listing.zip || '',
          listPrice: listing.listPrice ?? '',
          soldPrice: listing.soldPrice ?? '',
          isVacantLot: listing.isVacantLot,
          bedrooms: listing.bedrooms ?? '',
          bathrooms: listing.bathrooms ?? '',
          sqftLiving: listing.sqftLiving ?? '',
          sqftLot: listing.sqftLot ?? '',
          acres: listing.acres ?? '',
          yearBuilt: listing.yearBuilt ?? '',
          waterfront: listing.waterfront,
          waterfrontType: listing.waterfrontType || '',
          make: listing.make || '',
          model: listing.model || '',
          lengthFt: listing.lengthFt ?? '',
          propulsion: listing.propulsion || 'sail',
          pros: listing.pros || '',
          cons: listing.cons || '',
          notes: listing.notes || '',
          interestLevel: listing.interestLevel ?? '',
          visited: listing.visited,
          visitNotes: listing.visitNotes || '',
          daysOnMarket: listing.daysOnMarket ?? '',
        });
        if (listing.sourceUrl) {
          setImportUrl(listing.sourceUrl);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, isEdit, api, boatMode]);

  const applyPreviewFields = (fields) => {
    setForm((current) => ({
      ...current,
      sourceUrl: fields.sourceUrl || current.sourceUrl,
      sourceSite: fields.sourceSite || (boatMode ? 'yachtworld' : 'zillow'),
      mlsNumber: fields.mlsNumber ?? current.mlsNumber,
      status: fields.status || current.status,
      address: fields.address ?? current.address,
      city: fields.city ?? current.city,
      state: fields.state || current.state,
      zip: fields.zip ?? current.zip,
      listPrice: fields.listPrice ?? current.listPrice,
      soldPrice: fields.soldPrice ?? current.soldPrice,
      isVacantLot: fields.isVacantLot ?? current.isVacantLot,
      bedrooms: fields.bedrooms ?? current.bedrooms,
      bathrooms: fields.bathrooms ?? current.bathrooms,
      sqftLiving: fields.sqftLiving ?? current.sqftLiving,
      sqftLot: fields.sqftLot ?? current.sqftLot,
      acres: fields.acres ?? current.acres,
      yearBuilt: fields.yearBuilt ?? current.yearBuilt,
      waterfront: fields.waterfront ?? current.waterfront,
      waterfrontType: fields.waterfrontType ?? current.waterfrontType,
      make: fields.make ?? current.make,
      model: fields.model ?? current.model,
      lengthFt: fields.lengthFt ?? current.lengthFt,
      propulsion: fields.propulsion || current.propulsion || 'sail',
      daysOnMarket: fields.daysOnMarket ?? current.daysOnMarket,
      photoUrls: fields.photoUrls ?? current.photoUrls,
    }));
    setRawScrapedData(fields.rawScrapedData ?? null);

    if (boatMode) {
      return null;
    }

    if (!fields.isVacantLot && (fields.bedrooms || fields.sqftLiving)) {
      return 'Zillow imported this as a home — check "Vacant lot" and clear house fields if it\'s land only.';
    }
    return null;
  };

  useEffect(() => {
    if (isEdit || !location.state?.importedFields) return;

    const importWarning = applyPreviewFields(location.state.importedFields);
    setFetchWarnings([
      ...(location.state.importWarnings || []),
      ...(importWarning ? [importWarning] : []),
    ]);
    if (location.state.importedFields.sourceUrl) {
      setImportUrl(location.state.importedFields.sourceUrl);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [isEdit, boatMode, location.pathname, location.state, navigate]);

  const handleUrlImport = async (urlOverride) => {
    const url = (urlOverride ?? importUrl).trim();
    if (!url) {
      setError(boatMode ? 'Paste a YachtWorld listing URL first' : 'Paste a Zillow listing URL first');
      return;
    }

    setImporting(true);
    setError('');
    setFetchWarnings([]);

    try {
      const data = await api.ingest.preview(url);
      const importWarning = applyPreviewFields(data.fields);
      setImportUrl(data.fields.sourceUrl || url);
      setFetchWarnings([
        ...(data.warnings || []),
        ...(importWarning ? [importWarning] : []),
      ]);
      if (boatMode && data.needsPaste) {
        setPasteFallbackOpen(true);
      }
    } catch (err) {
      setError(err.message);
      if (boatMode) {
        setPasteFallbackOpen(true);
      }
    } finally {
      setImporting(false);
    }
  };

  const handlePasteImport = async () => {
    if (!pasteSource.trim()) {
      setError('Paste the listing page source');
      return;
    }

    setImporting(true);
    setError('');
    setFetchWarnings([]);

    try {
      // Page-source import is HTML-only. Do not send or update the URL field.
      const data = await api.ingest.previewPaste(null, pasteSource.trim());
      const importWarning = applyPreviewFields(data.fields);
      setFetchWarnings([
        ...(data.warnings || []),
        ...(importWarning ? [importWarning] : []),
      ]);
      setPasteSource('');
      if (!data.needsPaste) {
        setPasteFallbackOpen(false);
      }
    } catch (err) {
      setError(err.message);
      setPasteFallbackOpen(true);
    } finally {
      setImporting(false);
    }
  };

  const handleSoldCompToggle = (event) => {
    const checked = event.target.checked;
    setForm((current) => ({
      ...current,
      status: checked ? 'sold' : (current.status === 'sold' ? 'active' : current.status),
    }));
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    if (name === 'isVacantLot' && checked) {
      setForm((current) => ({
        ...current,
        isVacantLot: true,
        bedrooms: '',
        bathrooms: '',
        sqftLiving: '',
        yearBuilt: '',
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    const payload = boatMode
      ? {
          regionId: null,
          lakeId: null,
          sourceUrl: form.sourceUrl || null,
          sourceSite: form.sourceSite || null,
          mlsNumber: form.mlsNumber || null,
          status: form.status,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
          zip: form.zip || null,
          listPrice: form.listPrice ? Number(form.listPrice) : null,
          soldPrice: form.soldPrice ? Number(form.soldPrice) : null,
          make: form.make || null,
          model: form.model || null,
          lengthFt: form.lengthFt ? Number(form.lengthFt) : null,
          yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
          propulsion: form.propulsion || 'sail',
          pros: form.pros || null,
          cons: form.cons || null,
          notes: form.notes || null,
          interestLevel: form.interestLevel ? Number(form.interestLevel) : null,
          visited: form.visited,
          visitNotes: form.visitNotes || null,
          daysOnMarket: form.daysOnMarket ? Number(form.daysOnMarket) : null,
          photoUrls: form.photoUrls?.length ? form.photoUrls : null,
        }
      : {
          regionId: form.regionId,
          lakeId: form.lakeId || null,
          sourceUrl: form.sourceUrl || null,
          sourceSite: form.sourceSite || null,
          mlsNumber: form.mlsNumber || null,
          status: form.status,
          address: form.address || null,
          city: form.city || null,
          state: form.state || 'WI',
          zip: form.zip || null,
          listPrice: form.listPrice ? Number(form.listPrice) : null,
          soldPrice: form.soldPrice ? Number(form.soldPrice) : null,
          isVacantLot: form.isVacantLot,
          bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
          bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
          sqftLiving: form.sqftLiving ? Number(form.sqftLiving) : null,
          sqftLot: form.sqftLot ? Number(form.sqftLot) : null,
          acres: form.acres ? Number(form.acres) : null,
          yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : null,
          waterfront: form.waterfront,
          waterfrontType: form.waterfrontType || null,
          pros: form.pros || null,
          cons: form.cons || null,
          notes: form.notes || null,
          interestLevel: form.interestLevel ? Number(form.interestLevel) : null,
          visited: form.visited,
          visitNotes: form.visitNotes || null,
          daysOnMarket: form.daysOnMarket ? Number(form.daysOnMarket) : null,
          photoUrls: form.photoUrls?.length ? form.photoUrls : null,
          ...(rawScrapedData != null ? { rawScrapedData } : {}),
        };

    try {
      if (isEdit) {
        const data = await api.listings.update(id, payload);
        navigate(searchPath(searchId, `/listings/${id}`), {
          state: { pricingNotice: buildPricingNotice(data.pricing) },
        });
      } else {
        const data = await api.listings.create(payload);
        navigate(searchPath(searchId, `/listings/${data.listing.id}`), {
          state: { pricingNotice: buildPricingNotice(data.pricing) },
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (accessLoading || searchLoading || loading) {
    return <p className="text-pine-600">Loading listing...</p>;
  }

  if (!canEdit) {
    return null;
  }

  const pageTitle = isEdit
    ? (boatMode ? 'Edit boat' : 'Edit listing')
    : (boatMode ? 'Add boat' : 'Add listing');

  return (
    <div>
      <PageHeader
        title={pageTitle}
        description={
          boatMode
            ? 'Paste a YachtWorld link to fill details, or enter them yourself.'
            : 'Paste a Zillow listing URL to import details and photos.'
        }
      />

      {boatMode && (
        <Card className="mb-6 max-w-4xl">
          <h2 className="text-lg font-medium text-pine-900">Import from YachtWorld</h2>
          <p className="mt-1 text-sm text-pine-600">
            Paste a listing link to fill in details and photos.
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-pine-800">YachtWorld URL</label>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.yachtworld.com/yacht/..."
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => handleUrlImport()} disabled={importing}>
              {importing ? 'Importing...' : isEdit ? 'Refresh from YachtWorld' : 'Import from URL'}
            </Button>
          </div>

          <details
            className="mt-4 rounded-md border border-pine-200 bg-pine-50/50 px-3 py-2"
            open={pasteFallbackOpen}
            onToggle={(event) => setPasteFallbackOpen(event.currentTarget.open)}
          >
            <summary className="cursor-pointer select-none text-sm font-medium text-pine-800">
              If import didn’t work — paste page source
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-sm text-pine-600">
                On the listing page, use View Page Source, copy everything, and paste it here.
                This only reads the pasted HTML — it does not fetch from YachtWorld.
              </p>
              <textarea
                value={pasteSource}
                onChange={(e) => setPasteSource(e.target.value)}
                rows={5}
                placeholder="Paste page source here"
                className="w-full rounded-md border border-pine-300 bg-white px-3 py-2 font-mono text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handlePasteImport}
                disabled={importing || !pasteSource.trim()}
              >
                Import from page source
              </Button>
            </div>
          </details>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {fetchWarnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {fetchWarnings.map((warning) => (
                <li key={warning} className="text-sm text-amber-700">• {warning}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {!boatMode && (
        <Card className="mb-6 max-w-4xl">
          <h2 className="text-lg font-medium text-pine-900">Import from Zillow URL</h2>
          <p className="mt-1 text-sm text-pine-600">
            Copy the link from Zillow (Share → Copy Link on mobile) and paste it below.
          </p>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-pine-800">Zillow URL</label>
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://www.zillow.com/homedetails/..."
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={() => handleUrlImport()} disabled={importing}>
              {importing ? 'Importing...' : isEdit ? 'Refresh from Zillow' : 'Import'}
            </Button>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {fetchWarnings.length > 0 && (
            <ul className="mt-3 space-y-1">
              {fetchWarnings.map((warning) => (
                <li key={warning} className="text-sm text-amber-700">• {warning}</li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          {boatMode ? (
            <>
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Boat details</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Make" htmlFor="make">
                    <input id="make" name="make" value={form.make} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Model" htmlFor="model">
                    <input id="model" name="model" value={form.model} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Length (ft)" htmlFor="lengthFt">
                    <input id="lengthFt" name="lengthFt" type="number" step="0.1" value={form.lengthFt} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Year built" htmlFor="yearBuilt">
                    <input id="yearBuilt" name="yearBuilt" type="number" value={form.yearBuilt} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Propulsion" htmlFor="propulsion">
                    <select id="propulsion" name="propulsion" value={form.propulsion} onChange={handleChange} className={inputClass}>
                      {BOAT_PROPULSIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="List price ($)" htmlFor="listPrice">
                    <input id="listPrice" name="listPrice" type="number" value={form.listPrice} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Days on market" htmlFor="daysOnMarket">
                    <input id="daysOnMarket" name="daysOnMarket" type="number" value={form.daysOnMarket} onChange={handleChange} className={inputClass} />
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Location (optional)</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="City" htmlFor="city">
                    <input id="city" name="city" value={form.city} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="State" htmlFor="state">
                    <input id="state" name="state" value={form.state} onChange={handleChange} maxLength={2} className={`${inputClass} uppercase`} />
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Status</h2>
                <FormField label="Status" htmlFor="status">
                  <select id="status" name="status" value={form.status} onChange={handleChange} className={inputClass}>
                    {LISTING_STATUSES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </FormField>
                <label className="flex items-center gap-2 text-sm text-pine-800">
                  <input
                    type="checkbox"
                    name="isSoldComp"
                    checked={form.status === 'sold'}
                    onChange={handleSoldCompToggle}
                  />
                  Already sold (keeps it for price comparisons)
                </label>
                {form.status === 'sold' && (
                  <FormField label="Sold price ($)" htmlFor="soldPrice">
                    <input
                      id="soldPrice"
                      name="soldPrice"
                      type="number"
                      value={form.soldPrice}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>
                )}
              </section>
            </>
          ) : (
            <>
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Location</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Region" htmlFor="regionId" className="sm:col-span-2">
                    <select
                      id="regionId"
                      name="regionId"
                      value={form.regionId}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    >
                      <option value="">Select a region</option>
                      {regions.map((region) => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Lake (optional)" htmlFor="lakeId" className="sm:col-span-2">
                    <div className="flex gap-2">
                      <select
                        id="lakeId"
                        name="lakeId"
                        value={form.lakeId}
                        onChange={handleChange}
                        disabled={!form.regionId}
                        className={`${inputClass} flex-1 disabled:bg-pine-50`}
                      >
                        <option value="">No lake selected</option>
                        {lakes.map((lake) => (
                          <option key={lake.id} value={lake.id}>{lake.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddLake(true)}
                        disabled={!form.regionId}
                        title="Add lake"
                        aria-label="Add lake"
                        className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-md border border-pine-300 text-pine-700 hover:bg-pine-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
                          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                        </svg>
                      </button>
                    </div>
                  </FormField>
                  <FormField label="Street address" htmlFor="address" className="sm:col-span-2">
                    <input id="address" name="address" value={form.address} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="City" htmlFor="city">
                    <input id="city" name="city" value={form.city} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="ZIP code" htmlFor="zip">
                    <input id="zip" name="zip" value={form.zip} onChange={handleChange} className={inputClass} />
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Listing source</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="MLS number" htmlFor="mlsNumber">
                    <input id="mlsNumber" name="mlsNumber" value={form.mlsNumber} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Listing status" htmlFor="status">
                    <select id="status" name="status" value={form.status} onChange={handleChange} className={inputClass}>
                      {LISTING_STATUSES.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </FormField>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Sold</h2>
                <label className="flex items-center gap-2 text-sm text-pine-800">
                  <input
                    type="checkbox"
                    name="isSoldComp"
                    checked={form.status === 'sold'}
                    onChange={handleSoldCompToggle}
                  />
                  Already sold (keeps it for price comparisons)
                </label>
                <p className="text-xs text-pine-500">
                  Mark sold listings to hide them from your active list while still using them for price estimates.
                </p>
                {form.status === 'sold' && (
                  <FormField label="Sold price ($)" htmlFor="soldPrice">
                    <input
                      id="soldPrice"
                      name="soldPrice"
                      type="number"
                      value={form.soldPrice}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </FormField>
                )}
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-pine-900">Property facts</h2>
                <label className="flex items-center gap-2 text-sm text-pine-800">
                  <input
                    type="checkbox"
                    name="isVacantLot"
                    checked={form.isVacantLot}
                    onChange={handleChange}
                  />
                  Vacant lot (no structure on property)
                </label>
                <p className="text-xs text-pine-500">
                  Check this for land-only listings. House fields will be hidden and cleared.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="List price ($)" htmlFor="listPrice">
                    <input id="listPrice" name="listPrice" type="number" value={form.listPrice} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Acres" htmlFor="acres">
                    <input id="acres" name="acres" type="number" step="0.01" value={form.acres} onChange={handleChange} className={inputClass} />
                  </FormField>
                  {!form.isVacantLot && (
                    <>
                      <FormField label="Bedrooms" htmlFor="bedrooms">
                        <input id="bedrooms" name="bedrooms" type="number" step="0.5" value={form.bedrooms} onChange={handleChange} className={inputClass} />
                      </FormField>
                      <FormField label="Bathrooms" htmlFor="bathrooms">
                        <input id="bathrooms" name="bathrooms" type="number" step="0.5" value={form.bathrooms} onChange={handleChange} className={inputClass} />
                      </FormField>
                      <FormField label="Living area (sq ft)" htmlFor="sqftLiving">
                        <input id="sqftLiving" name="sqftLiving" type="number" value={form.sqftLiving} onChange={handleChange} className={inputClass} />
                      </FormField>
                      <FormField label="Year built" htmlFor="yearBuilt">
                        <input id="yearBuilt" name="yearBuilt" type="number" value={form.yearBuilt} onChange={handleChange} className={inputClass} />
                      </FormField>
                    </>
                  )}
                  <FormField label="Lot size (sq ft)" htmlFor="sqftLot">
                    <input id="sqftLot" name="sqftLot" type="number" value={form.sqftLot} onChange={handleChange} className={inputClass} />
                  </FormField>
                  <FormField label="Days on market" htmlFor="daysOnMarket">
                    <input id="daysOnMarket" name="daysOnMarket" type="number" value={form.daysOnMarket} onChange={handleChange} className={inputClass} />
                  </FormField>
                </div>

                <label className="flex items-center gap-2 text-sm text-pine-800">
                  <input type="checkbox" name="waterfront" checked={form.waterfront} onChange={handleChange} />
                  Waterfront
                </label>
                {form.waterfront && (
                  <FormField label="Waterfront type" htmlFor="waterfrontType">
                    <input
                      id="waterfrontType"
                      name="waterfrontType"
                      value={form.waterfrontType}
                      onChange={handleChange}
                      placeholder="lake, river, creek..."
                      className={inputClass}
                    />
                  </FormField>
                )}
              </section>
            </>
          )}

          <section className="space-y-4">
            <h2 className="text-lg font-medium text-pine-900">Your evaluation</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Interest level (1–5)" htmlFor="interestLevel">
                <input id="interestLevel" name="interestLevel" type="number" min="1" max="5" value={form.interestLevel} onChange={handleChange} className={inputClass} />
              </FormField>
              <div className="flex items-end">
                <label className="flex items-center gap-2 pb-2 text-sm text-pine-800">
                  <input type="checkbox" name="visited" checked={form.visited} onChange={handleChange} />
                  {boatMode ? 'Inspected in person' : 'Visited in person'}
                </label>
              </div>
            </div>
            <FormField label="Pros" htmlFor="pros">
              <textarea id="pros" name="pros" value={form.pros} onChange={handleChange} rows={3} className={inputClass} />
            </FormField>
            <FormField label="Cons" htmlFor="cons">
              <textarea id="cons" name="cons" value={form.cons} onChange={handleChange} rows={3} className={inputClass} />
            </FormField>
            <FormField label="Notes" htmlFor="notes">
              <textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={3} className={inputClass} />
            </FormField>
            <FormField label={boatMode ? 'Inspection notes' : 'Visit notes'} htmlFor="visitNotes">
              <textarea id="visitNotes" name="visitNotes" value={form.visitNotes} onChange={handleChange} rows={3} className={inputClass} />
            </FormField>
          </section>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : boatMode ? 'Create boat' : 'Create listing'}
            </Button>
            <Link to={isEdit ? searchPath(searchId, `/listings/${id}`) : searchPath(searchId, '/listings')}>
              <Button variant="secondary" type="button">Cancel</Button>
            </Link>
          </div>
        </form>
      </Card>

      {showAddLake && homeMode && (
        <QuickAddLakeModal
          regionId={form.regionId}
          onClose={() => setShowAddLake(false)}
          onCreated={handleLakeCreated}
        />
      )}
    </div>
  );
}
