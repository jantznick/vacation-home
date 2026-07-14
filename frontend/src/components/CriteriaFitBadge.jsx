import {
  criteriaFitSummary,
  criteriaFitTone,
  evaluateListingCriteria,
} from '../lib/searchCriteria';
import InfoTooltip from './InfoTooltip';

/**
 * Quiet must/nice fit badge with tooltip breakdown.
 */
export default function CriteriaFitBadge({ listing, search, assetType, size = 'sm' }) {
  if (!search || !listing) return null;

  const fit = evaluateListingCriteria(listing, search, assetType || search.assetType);
  if (!fit.hasCriteria) return null;

  const summary = criteriaFitSummary(fit);
  const tone = criteriaFitTone(fit);
  const tipBody = buildTipBody(fit);

  const toneClass = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-900',
    muted: 'border-pine-200 bg-pine-50 text-pine-700',
  }[tone];

  const pad = size === 'md' ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border font-medium ${toneClass} ${pad}`}>
      <FitGlyph tone={tone} />
      <span className="tabular-nums">{summary}</span>
      <InfoTooltip
        tip={{
          title: 'Must & nice to haves',
          body: tipBody,
        }}
        label="criteria fit"
      />
    </span>
  );
}

function FitGlyph({ tone }) {
  if (tone === 'ok') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M6.5 11.2 3.3 8l1.1-1.1 2.1 2.1 4.6-4.6L12.2 5.5 6.5 11.2Z" />
      </svg>
    );
  }
  if (tone === 'warn') {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M8 1.6 14.4 13H1.6L8 1.6Zm0 3.2-.9 4.8h1.8L8 4.8ZM8 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
      </svg>
    );
  }
  return (
    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
  );
}

function buildTipBody(fit) {
  const lines = [];
  if (fit.must.total > 0) {
    lines.push('Must-haves');
    fit.must.items.forEach((item) => {
      lines.push(`${item.met ? '✓' : '✗'} ${item.label} · listing ${item.listingValue}`);
    });
  }
  if (fit.nice.total > 0) {
    if (lines.length) lines.push('');
    lines.push('Nice-to-haves');
    fit.nice.items.forEach((item) => {
      lines.push(`${item.met ? '✓' : '✗'} ${item.label} · listing ${item.listingValue}`);
    });
  }
  return lines.join('\n');
}
