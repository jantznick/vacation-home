/** Region multi-select — scrolls after ~3.5 rows on desktop and mobile. */
export default function PricePickerRegionCheckboxes({
  regions,
  selectedRegionIds,
  disabled,
  onToggle,
}) {
  return (
    <div className="mt-2 max-h-[8.75rem] space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:thin]">
      {regions.map((region) => {
        const checked = selectedRegionIds.includes(region.id);
        const onlySelected = checked && selectedRegionIds.length === 1;

        return (
          <label
            key={region.id}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              disabled ? 'border-pine-100 text-pine-400' : 'border-pine-200 text-pine-800'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled || onlySelected}
              onChange={(event) => onToggle(region.id, event.target.checked)}
            />
            {region.name}
          </label>
        );
      })}
    </div>
  );
}
