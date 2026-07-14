/**
 * Compact listing ↔ model compare, meant to live inside the model specs panel.
 */
export default function ListingModelCheck({ modelCheck }) {
  if (!modelCheck?.summary) return null;

  const matches = (modelCheck.checks || []).filter((item) => item.status === 'match');
  const mismatches = (modelCheck.checks || []).filter((item) => item.status === 'mismatch');
  const missingOnListing = (modelCheck.checks || []).filter(
    (item) => item.status === 'missing' && item.listingValue == null && item.modelValue != null,
  );

  const tone = modelCheck.summary.tone;
  const hasCompared = matches.length > 0 || mismatches.length > 0;
  if (!hasCompared && missingOnListing.length === 0) return null;

  return (
    <details className="mt-5 border-t border-pine-100 pt-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-pine-800 [&::-webkit-details-marker]:hidden">
        <CompareStatusIcon tone={tone} />
        <span className="font-medium">{compareSummaryLabel(modelCheck)}</span>
        <span className="text-pine-400">·</span>
        <span className="text-pine-600">Listing vs model</span>
      </summary>

      <div className="mt-3 space-y-4 text-sm">
        {mismatches.length > 0 && (
          <CompareGroup title="Different" tone="warn">
            {mismatches.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="font-medium text-pine-900">{item.label}</span>
                <span className="tabular-nums text-pine-700">
                  Listing {item.listingValue ?? '—'}
                  <span className="text-pine-400"> · </span>
                  Model {item.modelValue ?? '—'}
                </span>
              </li>
            ))}
          </CompareGroup>
        )}

        {matches.length > 0 && (
          <CompareGroup title="Match" tone="ok">
            {matches.map((item) => (
              <li key={item.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="text-pine-800">{item.label}</span>
                <span className="tabular-nums text-pine-600">
                  {item.listingValue ?? item.modelValue}
                </span>
              </li>
            ))}
          </CompareGroup>
        )}

        {missingOnListing.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-pine-600 hover:text-pine-900">
              Not on this listing ({missingOnListing.length})
            </summary>
            <ul className="mt-2 space-y-1.5 text-pine-600">
              {missingOnListing.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>{item.label}</span>
                  <span className="tabular-nums text-pine-500">Model {item.modelValue}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  );
}

function compareSummaryLabel(modelCheck) {
  const mismatches = modelCheck.mismatches?.length || 0;
  const matches = modelCheck.matches || 0;
  if (mismatches > 0) {
    return `${mismatches} differ · ${matches} match`;
  }
  if (matches > 0) {
    return `${matches} match`;
  }
  return 'Limited compare';
}

function CompareGroup({ title, tone, children }) {
  const color = tone === 'warn' ? 'text-amber-800' : 'text-emerald-800';
  return (
    <div>
      <p className={`mb-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
        {title}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

export function CompareStatusIcon({ tone, className = '' }) {
  if (tone === 'ok') {
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ${className}`}
        title="Listing matches model specs"
        aria-label="Listing matches model specs"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <path d="M6.5 11.2 3.3 8l1.1-1.1 2.1 2.1 4.6-4.6L12.2 5.5 6.5 11.2Z" />
        </svg>
      </span>
    );
  }

  if (tone === 'alert' || tone === 'warn') {
    return (
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-800 ${className}`}
        title="Listing differs from model specs"
        aria-label="Listing differs from model specs"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
          <path d="M8 1.6 14.4 13H1.6L8 1.6Zm0 3.2-.9 4.8h1.8L8 4.8ZM8 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-pine-100 text-pine-500 ${className}`}
      title="Not enough overlapping fields to compare"
      aria-label="Not enough overlapping fields to compare"
    >
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <circle cx="8" cy="8" r="1.4" />
        <path fillRule="evenodd" d="M8 2.2a5.8 5.8 0 1 0 0 11.6A5.8 5.8 0 0 0 8 2.2ZM3.5 8a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0Z" clipRule="evenodd" />
      </svg>
    </span>
  );
}
