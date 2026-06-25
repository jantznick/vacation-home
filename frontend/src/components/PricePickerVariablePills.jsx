/** Horizontally scrollable variable pills for Price Picker. */
export default function PricePickerVariablePills({
  features,
  activeVariable,
  anyFeatureSet,
  onSelect,
}) {
  return (
    <div
      className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:thin]"
      role="tablist"
      aria-label="Variables"
    >
      <div className="flex w-max min-w-full flex-nowrap gap-2 sm:w-auto">
        {features.map((feature) => {
          const selected = feature.key === activeVariable;
          const isAny = anyFeatureSet?.has(feature.key);

          return (
            <button
              key={feature.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(feature.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-pine-700 text-white'
                  : 'bg-pine-100 text-pine-700 hover:bg-pine-200'
              }`}
            >
              {feature.label}
              {isAny && !selected ? ' · any' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}
