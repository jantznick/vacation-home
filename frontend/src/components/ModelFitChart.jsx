import { useMemo } from 'react';
import { formatDisplayPrice } from '../lib/pricingDisplay';

const CHART_HEIGHT = 280;
const MARGIN = { top: 16, right: 20, bottom: 44, left: 72 };

function formatAxisPrice(value) {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return formatDisplayPrice(value);
}

export default function ModelFitChart({ points }) {
  const layout = useMemo(() => {
    if (!points?.length) {
      return null;
    }

    const width = 640;
    const innerWidth = width - MARGIN.left - MARGIN.right;
    const innerHeight = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

    const values = points.flatMap((point) => [point.actual, point.predicted]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = Math.max((maxValue - minValue) * 0.08, maxValue * 0.05, 5_000);
    const domainMin = Math.max(0, minValue - padding);
    const domainMax = maxValue + padding;

    const scale = (value) =>
      MARGIN.left + ((value - domainMin) / (domainMax - domainMin || 1)) * innerWidth;
    const scaleY = (value) =>
      MARGIN.top + innerHeight - ((value - domainMin) / (domainMax - domainMin || 1)) * innerHeight;

    const diagonal = `M ${scale(domainMin)} ${scaleY(domainMin)} L ${scale(domainMax)} ${scaleY(domainMax)}`;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => domainMin + t * (domainMax - domainMin));

    return {
      width,
      scale,
      scaleY,
      diagonal,
      ticks,
      domainMin,
      domainMax,
    };
  }, [points]);

  if (!layout || !points?.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-pine-200 bg-pine-50/50 text-sm text-pine-600">
        Not enough data to chart model fit.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${layout.width} ${CHART_HEIGHT}`}
        className="w-full min-w-[320px]"
        role="img"
        aria-label="Chart comparing list prices to model estimates"
      >
        {layout.ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={layout.scale(tick)}
              x2={layout.scale(tick)}
              y1={MARGIN.top}
              y2={CHART_HEIGHT - MARGIN.bottom}
              stroke="#e5efe8"
            />
            <line
              x1={MARGIN.left}
              x2={layout.width - MARGIN.right}
              y1={layout.scaleY(tick)}
              y2={layout.scaleY(tick)}
              stroke="#e5efe8"
            />
            <text
              x={layout.scale(tick)}
              y={CHART_HEIGHT - 8}
              textAnchor="middle"
              className="fill-pine-500 text-[10px]"
            >
              {formatAxisPrice(tick)}
            </text>
            <text
              x={MARGIN.left - 8}
              y={layout.scaleY(tick) + 4}
              textAnchor="end"
              className="fill-pine-500 text-[10px]"
            >
              {formatAxisPrice(tick)}
            </text>
          </g>
        ))}

        <path
          d={layout.diagonal}
          fill="none"
          stroke="#9fb8a8"
          strokeDasharray="5 5"
          strokeWidth="1.5"
        />

        {points.map((point) => (
          <circle
            key={point.id}
            cx={layout.scale(point.actual)}
            cy={layout.scaleY(point.predicted)}
            r="5"
            className="fill-pine-600/70 stroke-white"
            strokeWidth="1.5"
          >
            <title>
              {point.label}: list {formatDisplayPrice(point.actual)}, estimate{' '}
              {formatDisplayPrice(point.predicted)}
            </title>
          </circle>
        ))}

        <text
          x={layout.width / 2}
          y={CHART_HEIGHT - 24}
          textAnchor="middle"
          className="fill-pine-700 text-xs font-medium"
        >
          List price
        </text>
        <text
          x={14}
          y={CHART_HEIGHT / 2}
          transform={`rotate(-90 14 ${CHART_HEIGHT / 2})`}
          textAnchor="middle"
          className="fill-pine-700 text-xs font-medium"
        >
          Model estimate
        </text>
      </svg>
      <p className="mt-2 text-xs text-pine-500">
        Each dot is a saved listing. Closer to the dashed line means the model matched list price
        more closely.
      </p>
    </div>
  );
}
