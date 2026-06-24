import { staleBadgeLabel } from '../lib/listingFreshness';

export default function ListingStaleBadge({ listing, className = '' }) {
  const label = staleBadgeLabel(listing);

  if (!label) {
    return null;
  }

  return (
    <span
      className={`inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 ${className}`}
    >
      {label}
    </span>
  );
}
