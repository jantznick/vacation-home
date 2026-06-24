export default function ListingPriceSignal({ signal, className = '' }) {
  if (!signal) {
    return null;
  }

  if (signal.direction === 'inline' || signal.percent === 0) {
    return (
      <p
        className={`text-xs text-pine-600 ${className}`}
        title="List price matches the model estimate from your saved listings"
      >
        In line with estimate
      </p>
    );
  }

  const isAbove = signal.direction === 'above';
  const label = isAbove ? 'above estimate' : 'below estimate';
  const colorClass = isAbove ? 'text-amber-800' : 'text-emerald-800';

  return (
    <p
      className={`inline-flex items-center justify-end gap-1 text-xs font-medium tabular-nums ${colorClass} ${className}`}
      title={`List price is ${signal.percent}% ${label}`}
    >
      {isAbove ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v8.69l3.22-3.22a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.66 9.28a.75.75 0 0 1 1.06-1.06l3.22 3.22V2.75A.75.75 0 0 1 8 2Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 shrink-0" aria-hidden="true">
          <path fillRule="evenodd" d="M8 14a.75.75 0 0 1-.75-.75V4.56L4.28 7.53a.75.75 0 0 1-1.06-1.06l4.25-4.25a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69A.75.75 0 0 1 8 14Z" clipRule="evenodd" />
        </svg>
      )}
      <span>{signal.percent}% {label}</span>
    </p>
  );
}
