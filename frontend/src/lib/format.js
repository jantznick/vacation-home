export function formatCurrency(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value, suffix = '') {
  if (value === null || value === undefined) return '—';
  return `${value}${suffix}`;
}

/** e.g. 45 → "45 min", 314 → "5h 14m" */
export function formatDriveTime(minutes) {
  if (minutes === null || minutes === undefined) return '—';
  const total = Math.round(Number(minutes));
  if (Number.isNaN(total)) return '—';
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export const REGION_STATUSES = [
  { value: 'researching', label: 'Researching' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'ruled_out', label: 'Ruled out' },
  { value: 'purchased', label: 'Purchased' },
];

export const LISTING_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'sold', label: 'Sold' },
  { value: 'off_market', label: 'Off market' },
  { value: 'interested', label: 'Interested' },
  { value: 'passed', label: 'Passed' },
];

export function statusLabel(status, options) {
  return options.find((option) => option.value === status)?.label || status;
}
