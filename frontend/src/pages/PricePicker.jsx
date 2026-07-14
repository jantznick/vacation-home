import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, useSearchId, searchPath } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import SensitivityChart, { interpolateCurvePrice } from '../components/SensitivityChart';
import PricePickerVariablePills from '../components/PricePickerVariablePills';
import PricePickerRegionCheckboxes from '../components/PricePickerRegionCheckboxes';
import CollapsiblePanel from '../components/CollapsiblePanel';
import { formatDisplayPrice } from '../lib/pricingDisplay';
import { isBoatSearch, supportsRegions } from '../lib/assetTypes';

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

const PROFILE_FIELDS = [
  { key: 'regionId', label: 'Region', type: 'region' },
  { key: 'isVacantLot', label: 'Vacant lot', type: 'boolean' },
  { key: 'waterfront', label: 'Waterfront', type: 'boolean' },
  { key: 'isSail', label: 'Sailboat', type: 'boolean' },
  { key: 'acres', label: 'Acres', type: 'numeric', step: '0.01' },
  { key: 'lengthFt', label: 'Length (ft)', type: 'numeric', step: '0.1' },
  { key: 'sqftLiving', label: 'Living area (sq ft)', type: 'numeric' },
  { key: 'bedrooms', label: 'Bedrooms', type: 'numeric', step: '0.5' },
  { key: 'bathrooms', label: 'Bathrooms', type: 'numeric', step: '0.5' },
  { key: 'sqftLot', label: 'Lot sq ft', type: 'numeric' },
  { key: 'yearBuilt', label: 'Year built', type: 'numeric' },
  { key: 'daysOnMarket', label: 'Days on market', type: 'numeric' },
];

function getActiveValue(spec, variable) {
  if (variable === 'region') {
    return spec?.focusedRegionId ?? spec?.regionId;
  }
  return spec?.[variable];
}

function setActiveValue(spec, variable, value) {
  if (variable === 'region') {
    return { ...spec, focusedRegionId: value, regionId: value };
  }

  const next = { ...spec, [variable]: value };

  if (variable === 'isVacantLot' && value) {
    next.sqftLiving = null;
    next.bedrooms = null;
    next.bathrooms = null;
  }

  return next;
}

function PinAnyToggle({ mode, onChange, disabled }) {
  const base =
    'rounded-md px-2 py-0.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const active = 'bg-pine-700 text-white';
  const idle = 'bg-pine-100 text-pine-700 hover:bg-pine-200';

  return (
    <div className="flex gap-1" role="group" aria-label="Pin or use any value">
      <button
        type="button"
        disabled={disabled}
        aria-pressed={mode === 'pinned'}
        onClick={() => onChange('pinned')}
        className={`${base} ${mode === 'pinned' ? active : idle}`}
      >
        Pinned
      </button>
      <button
        type="button"
        disabled={disabled}
        aria-pressed={mode === 'any'}
        onClick={() => onChange('any')}
        className={`${base} ${mode === 'any' ? active : idle}`}
      >
        Any
      </button>
    </div>
  );
}

export default function PricePicker() {
  const api = useSearchAPI();
  const searchId = useSearchId();
  const { assetType, loading: searchLoading } = useCurrentSearch();
  const boatMode = isBoatSearch(assetType);
  const homeMode = supportsRegions(assetType);
  const [regions, setRegions] = useState([]);
  const [activeVariable, setActiveVariable] = useState(boatMode ? 'lengthFt' : 'acres');
  const [spec, setSpec] = useState(null);
  const [anyFeatures, setAnyFeatures] = useState([]);
  const [focusedRegionId, setFocusedRegionId] = useState(null);
  const [curve, setCurve] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCurve = useCallback(async (nextSpec, variable, nextAnyFeatures = []) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.pricingModels.sensitivity({
        spec: nextSpec || {},
        variable,
        anyFeatures: nextAnyFeatures,
      });
      setCurve(result);
      setSpec(result.spec || nextSpec);
      setAnyFeatures(result.anyFeatures || nextAnyFeatures);
      setFocusedRegionId(result.focusedRegionId ?? null);
      if (result.variable && result.variable !== variable) {
        setActiveVariable(result.variable);
      }
    } catch (err) {
      setError(err.message);
      setCurve(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (searchLoading) return;
    const initialVariable = boatMode ? 'lengthFt' : 'acres';
    setActiveVariable(initialVariable);
    if (homeMode) {
      api.regions.list().then((data) => setRegions(data.regions)).catch(() => {});
    } else {
      setRegions([]);
    }
    loadCurve({}, initialVariable, []);
  }, [api, loadCurve, boatMode, homeMode, searchLoading]);

  const anyFeatureSet = useMemo(() => new Set(anyFeatures), [anyFeatures]);

  const modelFeatures = curve?.features ?? [];
  const variableType = curve?.variableType ?? 'numeric';
  const activeValue = spec ? getActiveValue(spec, activeVariable) : null;

  const selectedRegionIds = spec?.regionIds ?? curve?.regionIds ?? [];
  const compareRegions = Boolean(curve?.compareRegions);

  const displayPrice = useMemo(() => {
    if (compareRegions && curve?.seriesEstimates?.length) {
      const focused = curve.seriesEstimates.find(
        (item) => item.regionId === (focusedRegionId ?? curve.focusedRegionId),
      );
      return focused?.estimatedPrice ?? curve.seriesEstimates[0]?.estimatedPrice ?? null;
    }

    if (curve?.series?.length && activeValue != null) {
      const focusedSeries = curve.series.find(
        (item) => item.regionId === (focusedRegionId ?? curve.focusedRegionId),
      ) || curve.series[0];
      if (focusedSeries?.points?.length) {
        return interpolateCurvePrice(focusedSeries.points, activeValue);
      }
    }

    if (curve?.points?.length && activeValue != null) {
      return interpolateCurvePrice(curve.points, activeValue);
    }

    return curve?.estimatedPrice ?? null;
  }, [curve, activeValue, compareRegions, focusedRegionId]);

  const seriesEstimates = useMemo(() => {
    if (curve?.seriesEstimates?.length) {
      return curve.seriesEstimates;
    }

    if (!curve?.series?.length || activeValue == null) {
      return [];
    }

    return curve.series
      .map((item) => ({
        regionId: item.regionId,
        regionName: item.regionName,
        estimatedPrice: interpolateCurvePrice(item.points, activeValue),
      }))
      .filter((item) => item.estimatedPrice != null);
  }, [curve, activeValue]);

  const profileFields = useMemo(() => {
    const modelKeys = new Set(modelFeatures.map((feature) => feature.key));
    return PROFILE_FIELDS.filter((field) => {
      const key = field.key === 'regionId' ? 'region' : field.key;
      return modelKeys.has(key);
    });
  }, [modelFeatures]);

  const handleRegionToggle = (regionId, checked) => {
    const current = spec?.regionIds?.length
      ? spec.regionIds
      : curve?.regionIds?.length
        ? curve.regionIds
        : regions.map((region) => region.id);

    const nextIds = checked
      ? [...new Set([...current, regionId])]
      : current.filter((id) => id !== regionId);

    if (nextIds.length === 0) {
      return;
    }

    const nextFocused = nextIds.includes(focusedRegionId ?? spec?.focusedRegionId)
      ? (focusedRegionId ?? spec?.focusedRegionId)
      : nextIds[0];

    const nextSpec = {
      ...(spec || {}),
      regionIds: nextIds,
      focusedRegionId: nextFocused,
      regionId: nextFocused,
    };

    setFocusedRegionId(nextFocused);
    setSpec(nextSpec);
    loadCurve(nextSpec, activeVariable, anyFeatures);
  };

  const handleFocusRegion = (regionId) => {
    setFocusedRegionId(regionId);
    setSpec((current) => ({
      ...current,
      focusedRegionId: regionId,
      regionId: regionId,
    }));
  };

  const handleVariableChange = (variable) => {
    let nextAny = anyFeatures.filter((feature) => feature !== variable);
    let nextSpec = { ...(spec || {}) };

    if (anyFeatureSet.has(variable)) {
      const defaultValue = curve?.defaults?.[variable];
      if (defaultValue != null) {
        nextSpec = setActiveValue(nextSpec, variable, defaultValue);
      }
    }

    setActiveVariable(variable);
    setAnyFeatures(nextAny);
    loadCurve(nextSpec, variable, nextAny);
  };

  const handlePinModeChange = (fieldKey, mode) => {
    const modelKey = fieldKey === 'regionId' ? 'region' : fieldKey;
    if (modelKey === 'region') {
      return;
    }

    let nextAny = [...anyFeatures];
    let nextSpec = { ...(spec || {}) };

    if (mode === 'any') {
      if (!nextAny.includes(modelKey)) {
        nextAny.push(modelKey);
      }
      nextSpec[modelKey] = null;
    } else {
      nextAny = nextAny.filter((feature) => feature !== modelKey);
      const defaultValue = curve?.defaults?.[modelKey];
      if (defaultValue != null) {
        nextSpec[modelKey] = defaultValue;
      } else if (fieldKey === 'isVacantLot' || fieldKey === 'waterfront') {
        nextSpec[modelKey] = false;
      }
    }

    setAnyFeatures(nextAny);
    setSpec(nextSpec);
    loadCurve(nextSpec, activeVariable, nextAny);
  };

  const handleProfileChange = (fieldKey, rawValue) => {
    const modelKey = fieldKey === 'regionId' ? 'region' : fieldKey;

    let value = rawValue;
    if (fieldKey !== 'regionId' && fieldKey !== 'isVacantLot' && fieldKey !== 'waterfront') {
      value = rawValue === '' ? null : Number(rawValue);
    }

    const nextSpec = fieldKey === 'regionId'
      ? { ...spec, regionId: rawValue }
      : fieldKey === 'isVacantLot' || fieldKey === 'waterfront'
        ? { ...spec, [fieldKey]: Boolean(rawValue) }
        : { ...spec, [fieldKey]: value };

    if (fieldKey === 'isVacantLot' && rawValue) {
      nextSpec.sqftLiving = null;
      nextSpec.bedrooms = null;
      nextSpec.bathrooms = null;
    }

    setSpec(nextSpec);

    if (modelKey === activeVariable) {
      return;
    }

    loadCurve(nextSpec, activeVariable, anyFeatures);
  };

  const handleSliderChange = (rawValue) => {
    if (!spec) {
      return;
    }

    let value = rawValue;
    if (variableType === 'boolean') {
      value = rawValue === '1' || rawValue === true;
    } else if (variableType === 'region') {
      value = rawValue;
      setFocusedRegionId(value);
    } else if (variableType === 'numeric') {
      value = Number(rawValue);
    }

    setSpec(setActiveValue(spec, activeVariable, value));
  };

  const sliderConfig = useMemo(() => {
    if (!curve || variableType === 'region') {
      return null;
    }

    if (variableType === 'boolean') {
      return {
        min: 0,
        max: 1,
        step: 1,
        value: activeValue ? 1 : 0,
        labels: ['No', 'Yes'],
      };
    }

    return {
      min: curve.range?.min ?? 0,
      max: curve.range?.max ?? 1,
      step: activeVariable === 'bedrooms' || activeVariable === 'bathrooms' ? 0.5 : 0.01,
      value: activeValue ?? curve.range?.min ?? 0,
      labels: null,
    };
  }, [curve, variableType, activeVariable, activeValue]);

  const anyNote = curve?.anyFeaturesNote
    || 'Details set to Any use a standard value learned from your saved listings. That stand-in is not exact—pinning a real value may move the estimate higher or lower.';

  return (
    <div>
      <PageHeader
        title="Price picker"
        description={
          boatMode
            ? 'See how price changes with length or year based on boats you’ve saved.'
            : 'Explore how estimated price changes along one variable at a time, using the listings you’ve saved.'
        }
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Card className="order-2 lg:order-1">
          <CollapsiblePanel
            title="Property profile"
            description="Pin values you care about, or set a detail to Any when you are flexible. Select one or more regions to compare how estimates differ by area."
          >
            {anyFeatures.length > 0 && (
              <p className="mt-3 rounded-md bg-pine-50 px-3 py-2 text-xs text-pine-600 lg:mt-4">
                {anyNote}
              </p>
            )}

            <div className="mt-4 space-y-4 lg:mt-0">
            {profileFields.map((field) => {
              const modelKey = field.key === 'regionId' ? 'region' : field.key;
              const isActive = modelKey === activeVariable;
              const isAny = anyFeatureSet.has(modelKey);
              const supportsAny = field.type !== 'region';
              const controlsDisabled = isActive || loading || !spec;

              if (field.type === 'region') {
                if (!homeMode || regions.length === 0) {
                  return null;
                }
                const regionDisabled = isActive || loading;
                return (
                  <div key={field.key}>
                    <p className="text-sm font-medium text-pine-800">{field.label}</p>
                    <p className="mt-1 text-xs text-pine-500">
                      Select multiple to compare lines on the chart.
                    </p>
                    <PricePickerRegionCheckboxes
                      regions={regions}
                      selectedRegionIds={selectedRegionIds}
                      disabled={regionDisabled}
                      onToggle={handleRegionToggle}
                    />
                    {isActive && (
                      <p className="mt-1 text-xs text-pine-500">
                        Region comparison uses your selected regions below the chart.
                      </p>
                    )}
                  </div>
                );
              }

              if (spec?.isVacantLot === true && ['sqftLiving', 'bedrooms', 'bathrooms'].includes(field.key)) {
                return null;
              }

              return (
                <div key={field.key}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-pine-800">{field.label}</span>
                    {supportsAny && (
                      <PinAnyToggle
                        mode={isAny ? 'any' : 'pinned'}
                        disabled={controlsDisabled}
                        onChange={(mode) => handlePinModeChange(field.key, mode)}
                      />
                    )}
                  </div>

                  {isAny ? (
                    <p className="rounded-md border border-dashed border-pine-200 bg-pine-50/80 px-3 py-2 text-sm text-pine-600">
                      Any — using a typical value from your saved listings
                    </p>
                  ) : field.type === 'boolean' ? (
                    <label
                      className={`flex items-center gap-2 text-sm ${
                        controlsDisabled ? 'text-pine-400' : 'text-pine-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(spec?.[field.key])}
                        disabled={controlsDisabled}
                        onChange={(event) => handleProfileChange(field.key, event.target.checked)}
                      />
                      Yes
                      {isActive && (
                        <span className="text-xs text-pine-500">(use slider below)</span>
                      )}
                    </label>
                  ) : (
                    <>
                      <input
                        id={field.key}
                        type="number"
                        step={field.step || '1'}
                        value={spec?.[field.key] ?? ''}
                        disabled={controlsDisabled}
                        onChange={(event) => handleProfileChange(field.key, event.target.value)}
                        className={`${inputClass} disabled:bg-pine-50 disabled:text-pine-400`}
                      />
                      {isActive && (
                        <p className="mt-1 text-xs text-pine-500">Adjust this with the slider below.</p>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            </div>
          </CollapsiblePanel>
        </Card>

        <Card className="order-1 lg:order-2">
          <PricePickerVariablePills
            features={modelFeatures}
            activeVariable={activeVariable}
            anyFeatureSet={anyFeatureSet}
            onSelect={handleVariableChange}
          />

          <div className="mt-5 border-b border-pine-100 pb-5">
            <p className="text-xs font-medium uppercase tracking-wide text-pine-500">
              Estimated price
            </p>
            {compareRegions && seriesEstimates.length > 1 ? (
              <ul className="mt-2 space-y-1">
                {seriesEstimates.map((item) => (
                  <li key={item.regionId}>
                    <button
                      type="button"
                      onClick={() => handleFocusRegion(item.regionId)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                        item.regionId === (focusedRegionId ?? curve?.focusedRegionId)
                          ? 'bg-pine-100 font-medium text-pine-900'
                          : 'text-pine-700 hover:bg-pine-50'
                      }`}
                    >
                      <span>{item.regionName}</span>
                      <span className="tabular-nums">
                        {loading ? '…' : formatDisplayPrice(item.estimatedPrice)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-3xl font-semibold tabular-nums text-pine-900">
                {loading ? '…' : formatDisplayPrice(displayPrice)}
              </p>
            )}
            {curve?.pricePerAcreNote && !compareRegions && (
              <p className="mt-1 text-sm text-pine-600">{curve.pricePerAcreNote}</p>
            )}
            {curve?.model && (
              <p className="mt-1 text-xs text-pine-500">
                From {curve.model.name}
                {curve.model.algorithmLabel ? ` · ${curve.model.algorithmLabel}` : ''}
                {' · all listings segment · '}
                {curve.sampleCount ?? 0} homes
              </p>
            )}
            {curve?.holdingSummary && (
              <p className="mt-3 text-sm leading-relaxed text-pine-600 line-clamp-4 sm:line-clamp-none">
                Holding constant: {curve.holdingSummary}
              </p>
            )}
            {curve?.regionCompareNote && compareRegions && (
              <p className="mt-2 text-xs text-pine-500">{curve.regionCompareNote}</p>
            )}
            {anyFeatures.length > 0 && (
              <p className="mt-2 text-xs text-pine-500">{anyNote}</p>
            )}
            {curve?.confidenceNote && (
              <p className="mt-2 text-sm text-amber-700">{curve.confidenceNote}</p>
            )}
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-pine-600">Loading curve…</p>
          ) : curve?.available === false ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
              <p>{curve.message || 'Model not ready yet.'}</p>
              <p className="mt-2">
                Add more priced listings or configure a model in{' '}
                <Link to={searchPath(searchId, '/pricing-models')} className="font-medium underline">
                  pricing settings
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <SensitivityChart
                  points={curve.points}
                  series={curve.series}
                  variableType={curve.variableType}
                  variableLabel={curve.variableLabel}
                  activeValue={activeValue}
                  focusedRegionId={focusedRegionId ?? curve.focusedRegionId}
                  onFocusRegion={handleFocusRegion}
                />
              </div>

              {sliderConfig ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm text-pine-700">
                    <span>{curve.variableLabel}</span>
                    <span className="font-medium tabular-nums text-pine-900">
                      {variableType === 'boolean'
                        ? (activeValue ? 'Yes' : 'No')
                        : activeValue}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={sliderConfig.min}
                    max={sliderConfig.max}
                    step={sliderConfig.step}
                    value={sliderConfig.value}
                    onChange={(event) => handleSliderChange(
                      variableType === 'boolean'
                        ? event.target.value === '1'
                        : Number(event.target.value),
                    )}
                    className="mt-3 w-full accent-pine-700"
                  />
                  {sliderConfig.labels && (
                    <div className="mt-1 flex justify-between text-xs text-pine-500">
                      <span>{sliderConfig.labels[0]}</span>
                      <span>{sliderConfig.labels[1]}</span>
                    </div>
                  )}
                  {curve.range && variableType === 'numeric' && (
                    <p className="mt-2 text-xs text-pine-500">
                      Range based on your saved listings ({curve.range.min}–{curve.range.max}).
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-6">
                  <label className="text-sm font-medium text-pine-800" htmlFor="region-marker">
                    Highlight region
                  </label>
                  <select
                    id="region-marker"
                    value={focusedRegionId ?? spec?.focusedRegionId ?? ''}
                    onChange={(event) => handleSliderChange(event.target.value)}
                    className={`${inputClass} mt-2`}
                  >
                    {regions
                      .filter((region) => selectedRegionIds.includes(region.id))
                      .map((region) => (
                        <option key={region.id} value={region.id}>{region.name}</option>
                      ))}
                  </select>
                  <p className="mt-2 text-xs text-pine-500">
                    Each point shows the estimate for your selected regions at this profile.
                  </p>
                </div>
              )}

              <p className="mt-6 text-xs text-pine-500">
                {curve.pricePickerNote || 'Estimate from your saved listings — price changes as you adjust the selected detail.'}
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
