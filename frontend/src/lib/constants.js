export const REGION_STATUSES = [
  { value: 'RESEARCHING', label: 'Researching' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'RULED_OUT', label: 'Ruled Out' },
  { value: 'PURCHASED', label: 'Purchased' },
];

export const LISTING_STATUSES = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'OFF_MARKET', label: 'Off Market' },
  { value: 'INTERESTED', label: 'Interested' },
  { value: 'PASSED', label: 'Passed' },
];

export const WATERFRONT_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'LAKE', label: 'Lake' },
  { value: 'RIVER', label: 'River' },
  { value: 'CREEK', label: 'Creek' },
];

export function formatCurrency(value) {
  if (value == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value, suffix = '') {
  if (value == null) return '—';
  return `${value.toLocaleString()}${suffix}`;
}

export function statusLabel(options, value) {
  return options.find((option) => option.value === value)?.label || value;
}

export function emptyToNull(value) {
  return value === '' ? null : value;
}

export function parseNumber(value) {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}
