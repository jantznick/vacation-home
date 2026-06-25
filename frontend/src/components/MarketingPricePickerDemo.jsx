import { useEffect, useMemo, useState } from 'react';
import SensitivityChart, { interpolateCurvePrice } from './SensitivityChart';
import PricePickerVariablePills from './PricePickerVariablePills';
import PricePickerRegionCheckboxes from './PricePickerRegionCheckboxes';
import CollapsiblePanel from './CollapsiblePanel';
import MarketingRegionSensitivityInsight from './MarketingRegionSensitivityInsight';
import { formatDisplayPrice } from '../lib/pricingDisplay';
import {
  buildMarketingPricePickerState,
  getMarketingPricePickerDemo,
} from '../lib/marketingPricePickerDemos';

const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

export default function MarketingPricePickerDemo({ scenarioId, theme, className = '' }) {
  const demo = getMarketingPricePickerDemo(scenarioId);
  const [spec, setSpec] = useState(demo.defaultSpec);
  const [regionIds, setRegionIds] = useState(demo.defaultRegionIds);
  const [focusedRegionId, setFocusedRegionId] = useState(demo.defaultRegionIds[0]);
  const [activeVariable, setActiveVariable] = useState(demo.defaultVariable);

  const curve = useMemo(
    () => buildMarketingPricePickerState(demo, {
      spec,
      regionIds,
      focusedRegionId,
      variable: activeVariable,
    }),
    [demo, spec, regionIds, focusedRegionId, activeVariable],
  );

  const activeValue = spec[activeVariable];
  const compareRegions = curve.compareRegions;

  const displayPrice = useMemo(() => {
    if (compareRegions && curve.series?.length) {
      const focused = curve.series.find((item) => item.regionId === focusedRegionId)
        || curve.series[0];
      return interpolateCurvePrice(focused?.points, activeValue);
    }

    return interpolateCurvePrice(curve.points, activeValue);
  }, [curve, activeValue, compareRegions, focusedRegionId]);

  const seriesEstimates = useMemo(() => {
    if (!curve.series?.length || activeValue == null) {
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

  const handleRegionToggle = (regionId, checked) => {
    const nextIds = checked
      ? [...new Set([...regionIds, regionId])]
      : regionIds.filter((id) => id !== regionId);

    if (nextIds.length === 0) {
      return;
    }

    const nextFocused = nextIds.includes(focusedRegionId) ? focusedRegionId : nextIds[0];
    setRegionIds(nextIds);
    setFocusedRegionId(nextFocused);
  };

  const handleProfileChange = (key, rawValue) => {
    const value = key === 'waterfront'
      ? Boolean(rawValue)
      : rawValue === ''
        ? null
        : Number(rawValue);

    setSpec((current) => ({ ...current, [key]: value }));
  };

  const handleSliderChange = (rawValue) => {
    if (curve.variableType === 'boolean') {
      setSpec((current) => ({ ...current, [activeVariable]: rawValue === '1' || rawValue === true }));
      return;
    }

    setSpec((current) => ({ ...current, [activeVariable]: Number(rawValue) }));
  };

  const sliderConfig = useMemo(() => {
    if (curve.variableType === 'boolean') {
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
      step: activeVariable === 'bedrooms' || activeVariable === 'bathrooms' ? 0.5 : 1,
      value: activeValue ?? curve.range?.min ?? 0,
      labels: null,
    };
  }, [curve, activeVariable, activeValue]);

  useEffect(() => {
    if (curve.sensitivityInsight?.steepestRegionId) {
      setFocusedRegionId(curve.sensitivityInsight.steepestRegionId);
    }
  }, [activeVariable, scenarioId]);

  const shellBorder = theme?.demoBorder || 'border-pine-200/80';
  const shellShadow = theme?.demoShadow || 'shadow-pine-900/10 ring-pine-900/5';

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-xl ring-1 ${shellBorder} ${shellShadow} ${className}`}
    >
      <div className={`border-b px-4 py-3 sm:px-5 ${theme?.demoHeaderBorder || 'border-pine-100'} ${theme?.demoHeaderBg || 'bg-pine-50/80'}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-pine-500">Price picker</p>
        <p className="mt-0.5 text-sm text-pine-600">
          {demo.comparePrompt}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,280px)_1fr]">
        <div className="order-2 border-pine-100 p-4 sm:p-5 lg:order-1 lg:border-r">
          <CollapsiblePanel
            title="Property profile"
            description="Regions, beds, waterfront — tap to adjust the demo profile"
          >
            <div className="mt-4 space-y-4 lg:mt-0">
              <div>
                <p className="text-sm font-medium text-pine-800">Region</p>
                <p className="mt-1 text-xs text-pine-500">
                  Select multiple to compare lines on the chart.
                </p>
                <PricePickerRegionCheckboxes
                  regions={demo.regions}
                  selectedRegionIds={regionIds}
                  onToggle={handleRegionToggle}
                />
              </div>

              {demo.features
                .filter((field) => field.key !== 'region')
                .map((field) => (
                  <div key={field.key}>
                    <label className="text-sm font-medium text-pine-800" htmlFor={`demo-${field.key}`}>
                      {field.label}
                    </label>
                    {field.type === 'boolean' ? (
                      <label className="mt-2 flex items-center gap-2 text-sm text-pine-800">
                        <input
                          id={`demo-${field.key}`}
                          type="checkbox"
                          checked={Boolean(spec[field.key])}
                          disabled={field.key === activeVariable}
                          onChange={(event) => handleProfileChange(field.key, event.target.checked)}
                        />
                        Yes
                      </label>
                    ) : (
                      <input
                        id={`demo-${field.key}`}
                        type="number"
                        step={field.key === 'acres' ? '0.01' : '1'}
                        value={spec[field.key] ?? ''}
                        disabled={field.key === activeVariable}
                        onChange={(event) => handleProfileChange(field.key, event.target.value)}
                        className={`${inputClass} mt-2 disabled:bg-pine-50 disabled:text-pine-400`}
                      />
                    )}
                    {field.key === activeVariable && (
                      <p className="mt-1 text-xs text-pine-500">Adjust this with the slider below the chart.</p>
                    )}
                  </div>
                ))}
            </div>
          </CollapsiblePanel>
        </div>

        <div className="order-1 p-4 sm:p-5 lg:order-2">
          <p className="mb-3 text-sm text-pine-600">
            <span className="font-medium text-pine-800">Try it:</span>
            {' '}switch variables above the chart — each region responds differently to lot size, waterfront, and more.
          </p>

          <PricePickerVariablePills
            features={demo.features}
            activeVariable={activeVariable}
            onSelect={setActiveVariable}
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
                      onClick={() => setFocusedRegionId(item.regionId)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ${
                        item.regionId === focusedRegionId
                          ? 'bg-pine-100 font-medium text-pine-900'
                          : 'text-pine-700 hover:bg-pine-50'
                      }`}
                    >
                      <span>{item.regionName}</span>
                      <span className="tabular-nums">{formatDisplayPrice(item.estimatedPrice)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums text-pine-900 sm:text-3xl">
                {formatDisplayPrice(displayPrice)}
              </p>
            )}
            <p className="mt-1 text-xs text-pine-500">
              From {curve.model.name} · {curve.model.algorithmLabel} · {curve.sampleCount} sample homes
            </p>
            {curve.holdingSummary && (
              <p className="mt-3 text-sm text-pine-600">
                Holding constant: {curve.holdingSummary}
              </p>
            )}
            {curve.regionCompareNote && compareRegions && (
              <p className="mt-2 text-xs text-pine-500">{curve.regionCompareNote}</p>
            )}
          </div>

          {compareRegions && (
            <MarketingRegionSensitivityInsight
              insight={curve.sensitivityInsight}
              focusedRegionId={focusedRegionId}
              onFocusRegion={setFocusedRegionId}
            />
          )}

          <SensitivityChart
            points={curve.points}
            series={curve.series}
            variableType={curve.variableType}
            variableLabel={curve.variableLabel}
            activeValue={activeValue}
            focusedRegionId={focusedRegionId}
            onFocusRegion={setFocusedRegionId}
          />

          <div className="mt-6">
            <div className="flex items-center justify-between text-sm text-pine-700">
              <span>{curve.variableLabel}</span>
              <span className="font-medium tabular-nums text-pine-900">
                {curve.variableType === 'boolean'
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
                curve.variableType === 'boolean'
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
          </div>

          <p className="mt-6 text-xs text-pine-500">{curve.pricePickerNote}</p>
        </div>
      </div>
    </div>
  );
}
