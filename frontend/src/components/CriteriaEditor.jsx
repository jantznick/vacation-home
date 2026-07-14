import {
  CRITERIA_OPS,
  createEmptyCriterion,
  criteriaFieldsForAssetType,
  fieldDef,
} from '../lib/searchCriteria';
import Button from './Button';

/**
 * Editor for one bucket of structured search criteria.
 */
export default function CriteriaEditor({
  title,
  description,
  value = [],
  onChange,
  assetType,
  disabled = false,
}) {
  const fields = criteriaFieldsForAssetType(assetType);

  const updateRow = (id, patch) => {
    onChange(
      value.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.field) {
          const def = fieldDef(assetType, patch.field);
          next.op = def?.ops?.[0] || 'gte';
          next.value = def?.type === 'boolean' ? true : '';
        }
        return next;
      }),
    );
  };

  const removeRow = (id) => {
    onChange(value.filter((row) => row.id !== id));
  };

  const addRow = () => {
    onChange([...value, createEmptyCriterion(assetType)]);
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-pine-950">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-pine-600">{description}</p>
        )}
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-pine-500">None yet.</p>
      ) : (
        <ul className="space-y-3">
          {value.map((row) => {
            const def = fieldDef(assetType, row.field) || fields[0];
            const ops = CRITERIA_OPS.filter((op) => def.ops.includes(op.value));
            return (
              <li
                key={row.id}
                className="grid gap-2 rounded-xl border border-pine-200 bg-pine-50/40 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]"
              >
                <label className="block text-xs text-pine-600">
                  Field
                  <select
                    value={row.field}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { field: e.target.value })}
                    className="mt-1 w-full rounded-md border border-pine-300 bg-white px-2 py-1.5 text-sm text-pine-900"
                  >
                    {fields.map((field) => (
                      <option key={field.field} value={field.field}>{field.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-pine-600">
                  Rule
                  <select
                    value={row.op}
                    disabled={disabled}
                    onChange={(e) => updateRow(row.id, { op: e.target.value })}
                    className="mt-1 w-full rounded-md border border-pine-300 bg-white px-2 py-1.5 text-sm text-pine-900"
                  >
                    {ops.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-xs text-pine-600">
                  Value
                  {def.type === 'boolean' ? (
                    <select
                      value={String(row.value)}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.id, { value: e.target.value === 'true' })}
                      className="mt-1 w-full rounded-md border border-pine-300 bg-white px-2 py-1.5 text-sm text-pine-900"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : def.type === 'enum' ? (
                    <select
                      value={row.value}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="mt-1 w-full rounded-md border border-pine-300 bg-white px-2 py-1.5 text-sm text-pine-900"
                    >
                      {def.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      step="any"
                      value={row.value}
                      disabled={disabled}
                      onChange={(e) => updateRow(row.id, { value: e.target.value })}
                      className="mt-1 w-full rounded-md border border-pine-300 bg-white px-2 py-1.5 text-sm text-pine-900"
                    />
                  )}
                </label>

                {!disabled && (
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="rounded-md px-2 py-1.5 text-sm text-rose-700 hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!disabled && (
        <Button type="button" variant="secondary" onClick={addRow}>
          Add rule
        </Button>
      )}
    </div>
  );
}
