/**
 * Structured must-have / nice-to-have criteria for a Search.
 * Shape: { id, field, op, value, label? }
 */

export const CRITERIA_OPS = [
  { value: 'lte', label: 'at most' },
  { value: 'gte', label: 'at least' },
  { value: 'eq', label: 'is' },
];

const HOME_FIELDS = [
  { field: 'listPrice', label: 'List price ($)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'soldPrice', label: 'Sold price ($)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'acres', label: 'Acres', type: 'number', ops: ['lte', 'gte'] },
  { field: 'bedrooms', label: 'Bedrooms', type: 'number', ops: ['gte', 'lte', 'eq'] },
  { field: 'bathrooms', label: 'Bathrooms', type: 'number', ops: ['gte', 'lte', 'eq'] },
  { field: 'sqftLiving', label: 'Living sqft', type: 'number', ops: ['gte', 'lte'] },
  { field: 'yearBuilt', label: 'Year built', type: 'number', ops: ['gte', 'lte'] },
  { field: 'driveTimeMinutes', label: 'Drive time (min)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'isVacantLot', label: 'Vacant lot', type: 'boolean', ops: ['eq'] },
  { field: 'waterfront', label: 'Waterfront', type: 'boolean', ops: ['eq'] },
];

const BOAT_FIELDS = [
  { field: 'listPrice', label: 'Asking price ($)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'soldPrice', label: 'Sold price ($)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'lengthFt', label: 'Length (ft)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'yearBuilt', label: 'Year built', type: 'number', ops: ['gte', 'lte'] },
  { field: 'draftFt', label: 'Draft (ft)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'beamFt', label: 'Beam (ft)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'displacementLb', label: 'Displacement (lb)', type: 'number', ops: ['lte', 'gte'] },
  { field: 'fuelGal', label: 'Fuel (gal)', type: 'number', ops: ['gte', 'lte'] },
  { field: 'waterGal', label: 'Water (gal)', type: 'number', ops: ['gte', 'lte'] },
  { field: 'engineHp', label: 'Engine HP', type: 'number', ops: ['gte', 'lte'] },
  { field: 'propulsion', label: 'Propulsion', type: 'enum', ops: ['eq'], options: [
    { value: 'sail', label: 'Sail' },
    { value: 'motor', label: 'Motor' },
    { value: 'other', label: 'Other' },
  ] },
];

const FREETEXT_FIELD = { field: '_freetext', label: 'Other (manual check)', type: 'freetext', ops: ['eq'] };

export function criteriaFieldsForAssetType(assetType) {
  const base = assetType === 'boat' ? BOAT_FIELDS : HOME_FIELDS;
  return [...base, FREETEXT_FIELD];
}

export function fieldDef(assetType, field) {
  return criteriaFieldsForAssetType(assetType).find((row) => row.field === field) || null;
}

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createEmptyCriterion(assetType, fieldOverride) {
  const fields = criteriaFieldsForAssetType(assetType);
  const target = fieldOverride
    ? fields.find((f) => f.field === fieldOverride) || fields[0]
    : fields[0];
  return {
    id: newId(),
    field: target.field,
    op: target.ops[0],
    value: target.type === 'boolean' || target.type === 'freetext' ? true : '',
    ...(target.type === 'freetext' ? { label: '' } : {}),
  };
}

function normalizeValue(def, raw) {
  if (def?.type === 'boolean') {
    if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
    if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
    return null;
  }
  if (def?.type === 'enum') {
    const text = String(raw ?? '').trim();
    return text || null;
  }
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Sanitize an array from API/body into stored criteria. */
export function normalizeCriteriaList(raw, assetType) {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(criteriaFieldsForAssetType(assetType).map((f) => f.field));

  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const field = String(item.field || '').trim();
      if (!allowed.has(field)) return null;
      const def = fieldDef(assetType, field);
      const op = String(item.op || '').trim();
      if (!def.ops.includes(op)) return null;

      if (field === '_freetext') {
        const label = typeof item.label === 'string' ? item.label.trim() : '';
        if (!label) return null;
        return {
          id: typeof item.id === 'string' && item.id ? item.id : newId(),
          field,
          op,
          value: true,
          label,
        };
      }

      const value = normalizeValue(def, item.value);
      if (value == null) return null;
      return {
        id: typeof item.id === 'string' && item.id ? item.id : newId(),
        field,
        op,
        value,
        ...(typeof item.label === 'string' && item.label.trim()
          ? { label: item.label.trim() }
          : {}),
      };
    })
    .filter(Boolean);
}

function readListingValue(listing, field) {
  if (!listing) return null;
  const value = listing[field];
  if (value === '' || value == null) return null;
  return value;
}

function compare(op, listingValue, expected) {
  if (typeof expected === 'boolean') {
    return Boolean(listingValue) === expected;
  }
  if (typeof expected === 'string') {
    return String(listingValue).toLowerCase() === expected.toLowerCase();
  }
  const left = Number(listingValue);
  const right = Number(expected);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  if (op === 'lte') return left <= right;
  if (op === 'gte') return left >= right;
  if (op === 'eq') return left === right;
  return false;
}

function formatExpected(def, op, value) {
  const opLabel = CRITERIA_OPS.find((row) => row.value === op)?.label || op;
  if (def?.type === 'boolean') {
    return value ? 'yes' : 'no';
  }
  if (def?.type === 'enum') {
    const opt = def.options?.find((row) => row.value === value);
    return `${opLabel} ${opt?.label || value}`;
  }
  if (def?.field === 'listPrice' || def?.field === 'soldPrice') {
    return `${opLabel} $${Number(value).toLocaleString()}`;
  }
  return `${opLabel} ${value}`;
}

function formatListingValue(def, value) {
  if (value == null || value === '') return '—';
  if (def?.type === 'boolean') return value ? 'yes' : 'no';
  if (def?.type === 'enum') {
    const opt = def.options?.find((row) => row.value === value);
    return opt?.label || String(value);
  }
  if (def?.field === 'listPrice' || def?.field === 'soldPrice') {
    return `$${Number(value).toLocaleString()}`;
  }
  return String(value);
}

export function criterionLabel(criterion, assetType) {
  if (criterion.label) return criterion.label;
  const def = fieldDef(assetType, criterion.field);
  const name = def?.label || criterion.field;
  return `${name} ${formatExpected(def, criterion.op, criterion.value)}`;
}

function evaluateOne(criterion, listing, assetType) {
  if (criterion.field === '_freetext') {
    const overrides = listing?.criteriaOverrides;
    const override = overrides && typeof overrides === 'object' ? overrides[criterion.id] : undefined;
    return {
      id: criterion.id,
      field: criterion.field,
      label: criterion.label || 'Custom',
      met: override === true,
      unknown: override == null,
      listingValue: override === true ? 'yes' : override === false ? 'no' : '—',
      expected: 'yes',
      freetext: true,
    };
  }

  const def = fieldDef(assetType, criterion.field);
  const listingValue = readListingValue(listing, criterion.field);
  const hasValue = listingValue != null && listingValue !== '';
  const met = hasValue && compare(criterion.op, listingValue, criterion.value);
  return {
    id: criterion.id,
    field: criterion.field,
    label: criterionLabel(criterion, assetType),
    met,
    unknown: !hasValue,
    listingValue: formatListingValue(def, listingValue),
    expected: formatExpected(def, criterion.op, criterion.value),
  };
}

function summarizeBucket(items) {
  const met = items.filter((item) => item.met).length;
  return {
    met,
    total: items.length,
    items,
    allMet: items.length > 0 && met === items.length,
  };
}

/**
 * Evaluate must/nice criteria against a listing.
 */
export function evaluateListingCriteria(listing, searchOrCriteria, assetType) {
  const type = assetType
    || searchOrCriteria?.assetType
    || 'home';
  const mustHaves = normalizeCriteriaList(
    searchOrCriteria?.mustHaves ?? searchOrCriteria?.must ?? [],
    type,
  );
  const niceToHaves = normalizeCriteriaList(
    searchOrCriteria?.niceToHaves ?? searchOrCriteria?.nice ?? [],
    type,
  );

  const must = summarizeBucket(mustHaves.map((c) => evaluateOne(c, listing, type)));
  const nice = summarizeBucket(niceToHaves.map((c) => evaluateOne(c, listing, type)));

  return {
    must,
    nice,
    hasCriteria: must.total > 0 || nice.total > 0,
  };
}
