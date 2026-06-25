import { formatDisplayPrice } from '../lib/pricingDisplay';

function formatCompactDelta(value) {
  const abs = Math.abs(Math.round(value));
  if (abs >= 1_000_000) {
    return `$${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `$${Math.round(abs / 1_000)}k`;
  }
  return formatDisplayPrice(abs);
}

export default function MarketingRegionSensitivityInsight({
  insight,
  focusedRegionId,
  onFocusRegion,
}) {
  if (!insight?.ranked?.length) {
    return null;
  }

  const maxSpread = insight.ranked[0].spread || 1;

  return (
    <div className="mt-4 rounded-xl border border-pine-200 bg-gradient-to-br from-pine-50 via-white to-amber-50/60 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-pine-500">
        How regions compare on {insight.variableLabel.toLowerCase()}
      </p>
      <p className="mt-1 font-medium text-pine-900">{insight.headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-pine-700">{insight.detail}</p>

      <ul className="mt-4 space-y-3">
        {insight.ranked.map((item) => {
          const selected = item.regionId === focusedRegionId;
          const width = Math.max(8, Math.round((item.spread / maxSpread) * 100));

          return (
            <li key={item.regionId}>
              <button
                type="button"
                onClick={() => onFocusRegion(item.regionId)}
                className={`w-full rounded-lg px-2 py-2 text-left transition-colors ${
                  selected ? 'bg-pine-100 ring-1 ring-pine-300' : 'hover:bg-pine-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={selected ? 'font-medium text-pine-900' : 'text-pine-800'}>
                    {item.regionName}
                    {item.regionId === insight.steepestRegionId && (
                      <span className="ml-2 text-xs font-normal text-amber-800">steepest</span>
                    )}
                    {item.regionId === insight.flattestRegionId && insight.ranked.length > 1 && (
                      <span className="ml-2 text-xs font-normal text-pine-500">flattest</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-pine-600">
                    ~{formatCompactDelta(item.spread)} swing
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-pine-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      item.regionId === insight.steepestRegionId ? 'bg-pine-700' : 'bg-pine-400'
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-pine-500">
                  {formatDisplayPrice(item.lowPrice)} – {formatDisplayPrice(item.highPrice)} across slider range
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
