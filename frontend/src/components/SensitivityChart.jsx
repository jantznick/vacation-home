import { useMemo } from 'react';
import { formatDisplayPrice } from '../lib/pricingDisplay';

const CHART_HEIGHT = 300;
const MARGIN = { top: 16, right: 20, bottom: 44, left: 72 };

export const REGION_LINE_COLORS = [
  '#2f5d45',
  '#b45309',
  '#0f766e',
  '#7c3aed',
  '#be123c',
  '#0369a1',
];

function formatAxisPrice(value) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return formatDisplayPrice(value);
}

function formatAxisX(point, variableType) {
  if (variableType === 'region' || variableType === 'boolean') {
    return point.x;
  }

  const value = point.xValue;
  if (value >= 1_000) {
    return Number(value).toLocaleString('en-US');
  }
  return String(value);
}

export function interpolateCurvePrice(points, value) {
  if (!points?.length || value == null) {
    return null;
  }

  if (typeof points[0].xValue === 'boolean' || typeof value === 'boolean') {
    return points.find((point) => point.xValue === value)?.y ?? null;
  }

  if (typeof points[0].xValue === 'string') {
    return points.find((point) => point.xValue === value)?.y ?? null;
  }

  const sorted = [...points].sort((a, b) => a.xValue - b.xValue);
  if (value <= sorted[0].xValue) {
    return sorted[0].y;
  }
  if (value >= sorted[sorted.length - 1].xValue) {
    return sorted[sorted.length - 1].y;
  }

  for (let index = 0; index < sorted.length - 1; index += 1) {
    const left = sorted[index];
    const right = sorted[index + 1];
    if (value >= left.xValue && value <= right.xValue) {
      const t = (value - left.xValue) / (right.xValue - left.xValue);
      return Math.round(left.y + t * (right.y - left.y));
    }
  }

  return null;
}

export default function SensitivityChart({
  points,
  series,
  variableType,
  variableLabel,
  activeValue,
  focusedRegionId,
  onFocusRegion,
}) {
  const chartSeries = useMemo(() => {
    if (series?.length && series.some((item) => item.regionId)) {
      return series.filter((item) => item.points?.length);
    }

    if (points?.length) {
      return [{ regionId: null, regionName: null, points }];
    }

    return [];
  }, [series, points]);

  const compareRegions = chartSeries.length > 1 && chartSeries[0]?.regionId;

  const layout = useMemo(() => {
    if (!chartSeries.length) {
      return null;
    }

    const width = 640;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    const allPoints = chartSeries.flatMap((item) => item.points);
    const yValues = allPoints.map((point) => point.y);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    const yPadding = Math.max((yMax - yMin) * 0.1, yMax * 0.05, 5_000);
    const domainYMin = Math.max(0, yMin - yPadding);
    const domainYMax = yMax + yPadding;

    const scaleY = (value) =>
      MARGIN.top + innerHeight - ((value - domainYMin) / (domainYMax - domainYMin)) * innerHeight;

    let scaleX;
    let markerX = null;
    let xLabelIndexes = [];

    if (variableType === 'numeric') {
      const xValues = allPoints.map((point) => point.xValue);
      const xMin = Math.min(...xValues);
      const xMax = Math.max(...xValues);
      scaleX = (value) =>
        MARGIN.left + ((value - xMin) / (xMax - xMin || 1)) * innerWidth;
      markerX = activeValue != null ? scaleX(activeValue) : null;
      const refPoints = chartSeries[0].points;
      xLabelIndexes = [0, Math.floor(refPoints.length / 2), refPoints.length - 1];
    } else {
      const refPoints = chartSeries[0].points;
      scaleX = (index) =>
        MARGIN.left + (index / Math.max(refPoints.length - 1, 1)) * innerWidth;
      const markerIndex = refPoints.findIndex((point) => point.xValue === activeValue);
      markerX = scaleX(markerIndex >= 0 ? markerIndex : 0);
      xLabelIndexes = refPoints.map((_, index) => index);
    }

    const seriesLayouts = chartSeries.map((item, index) => {
      const color = REGION_LINE_COLORS[index % REGION_LINE_COLORS.length];
      const isFocused = !compareRegions
        || !focusedRegionId
        || item.regionId === focusedRegionId;
      const linePath = item.points
        .map((point, pointIndex) => {
          const x = variableType === 'numeric'
            ? scaleX(point.xValue)
            : scaleX(pointIndex);
          const y = scaleY(point.y);
          return `${pointIndex === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');

      const markerY = interpolateCurvePrice(item.points, activeValue);
      const markerPointY = markerY != null ? scaleY(markerY) : null;

      return {
        ...item,
        color,
        isFocused,
        linePath,
        markerPointY,
        markerPrice: markerY,
      };
    });

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => domainYMin + t * (domainYMax - domainYMin));

    return {
      width,
      scaleY,
      scaleX,
      markerX,
      yTicks,
      xLabelIndexes,
      seriesLayouts,
      refPoints: chartSeries[0].points,
    };
  }, [chartSeries, variableType, activeValue, focusedRegionId, compareRegions]);

  if (!layout || !chartSeries.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-dashed border-pine-200 bg-pine-50/50 text-sm text-pine-600">
        Not enough data to draw this curve.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.width} ${CHART_HEIGHT}`}
        className="w-full min-w-[320px]"
        role="img"
        aria-label={`Estimated price vs ${variableLabel}`}
      >
        {layout.yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={MARGIN.left}
              x2={layout.width - MARGIN.right}
              y1={layout.scaleY(tick)}
              y2={layout.scaleY(tick)}
              stroke="#d8e5dc"
              strokeDasharray="4 4"
            />
            <text
              x={MARGIN.left - 8}
              y={layout.scaleY(tick) + 4}
              textAnchor="end"
              className="fill-pine-500 text-[11px]"
            >
              {formatAxisPrice(tick)}
            </text>
          </g>
        ))}

        {compareRegions && layout.markerX != null && variableType === 'numeric' && (
          <line
            x1={layout.markerX}
            x2={layout.markerX}
            y1={MARGIN.top}
            y2={CHART_HEIGHT - MARGIN.bottom}
            stroke="#9fb8a8"
            strokeDasharray="4 4"
          />
        )}

        {layout.seriesLayouts.map((item) => (
          <g key={item.regionId || 'default'} opacity={item.isFocused ? 1 : 0.55}>
            <path
              d={item.linePath}
              fill="none"
              stroke={item.color}
              strokeWidth={item.isFocused ? 2.75 : 2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {item.points.map((point, index) => {
              const x = variableType === 'numeric'
                ? layout.scaleX(point.xValue)
                : layout.scaleX(index);
              const y = layout.scaleY(point.y);
              return (
                <circle
                  key={`${item.regionId}-${point.x}-${index}`}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill={item.color}
                  opacity="0.45"
                />
              );
            })}
            {item.markerPointY != null && layout.markerX != null && (
              <circle
                cx={layout.markerX}
                cy={item.markerPointY}
                r={item.isFocused ? 6 : 4.5}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            )}
          </g>
        ))}

        {layout.xLabelIndexes.map((index) => {
          const point = layout.refPoints[index];
          if (!point) {
            return null;
          }

          const x = variableType === 'numeric'
            ? layout.scaleX(point.xValue)
            : layout.scaleX(index);

          return (
            <text
              key={`${point.x}-${index}-label`}
              x={x}
              y={CHART_HEIGHT - 14}
              textAnchor="middle"
              className="fill-pine-600 text-[11px]"
            >
              {formatAxisX(point, variableType)}
            </text>
          );
        })}

        <text
          x={layout.width / 2}
          y={CHART_HEIGHT - 2}
          textAnchor="middle"
          className="fill-pine-700 text-xs font-medium"
        >
          {variableLabel}
        </text>
      </svg>

      {compareRegions && (
        <div className="mt-3 flex flex-wrap gap-2">
          {layout.seriesLayouts.map((item) => (
            <button
              key={item.regionId}
              type="button"
              onClick={() => onFocusRegion?.(item.regionId)}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                item.regionId === focusedRegionId
                  ? 'bg-pine-100 text-pine-900 ring-1 ring-pine-300'
                  : 'bg-white text-pine-700 ring-1 ring-pine-200 hover:bg-pine-50'
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.regionName}
              {item.markerPrice != null && (
                <span className="tabular-nums text-pine-600">
                  {formatDisplayPrice(item.markerPrice)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <p className="mt-2 text-xs text-pine-500">
        {compareRegions
          ? 'Each line is the same property profile in a different region. A steeper line means that detail moves price more there.'
          : 'Move the slider to see how the estimate changes along this detail.'}
      </p>
    </div>
  );
}
