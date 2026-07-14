import { ASSET_TYPE_OPTIONS, assetTypeMeta } from '../lib/assetTypes';

/**
 * Homes | Boats filter for the searches picker / switcher.
 */
export default function AssetTypeTabs({ value, onChange, counts = {}, className = '' }) {
  return (
    <div
      className={`inline-flex rounded-lg border border-pine-200 bg-pine-50 p-0.5 ${className}`}
      role="tablist"
      aria-label="Vacation type"
    >
      {ASSET_TYPE_OPTIONS.map((type) => {
        const active = value === type.key;
        const count = counts[type.key];
        return (
          <button
            key={type.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(type.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-white text-pine-900 shadow-sm'
                : 'text-pine-600 hover:text-pine-900'
            }`}
          >
            {type.label}
            {typeof count === 'number' && (
              <span className={`ml-1.5 text-xs ${active ? 'text-pine-500' : 'text-pine-400'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AssetTypeBadge({ assetType, className = '' }) {
  const meta = assetTypeMeta(assetType);
  return (
    <span
      className={`inline-flex items-center rounded-md bg-pine-100 px-2 py-0.5 text-xs font-medium text-pine-700 ${className}`}
    >
      {meta.label}
    </span>
  );
}
