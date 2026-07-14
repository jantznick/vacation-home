import { Link } from 'react-router-dom';
import {
  buildBoatModelHighlights,
  buildBoatModelSpecSections,
  boatModelHasSpecs,
} from '../lib/boatModelSpecs';
import InfoTooltip from './InfoTooltip';
import ListingModelCheck, { CompareStatusIcon } from './ListingModelCheck';

function SpecLabel({ label, tip }) {
  return (
    <span className="inline-flex items-center">
      <span>{label}</span>
      {tip && <InfoTooltip tip={tip} label={label} />}
    </span>
  );
}

/** Map modelCheck ids → encyclopedia row ids for inline markers. */
const CHECK_TO_SPEC = {
  loa: 'length',
  lwl: 'waterline',
  beam: 'beam',
  draft: 'draft',
  displacement: 'displacement',
  ballast: 'ballast',
  fuel: 'fuel',
  water: 'water',
  engineHp: 'engine',
  engineMake: 'engine',
};

function checksBySpecId(modelCheck) {
  const map = {};
  for (const check of modelCheck?.checks || []) {
    const specId = CHECK_TO_SPEC[check.id];
    if (!specId) continue;
    // Prefer mismatch over match if both engine checks exist.
    if (!map[specId] || check.status === 'mismatch') {
      map[specId] = check;
    }
  }
  return map;
}

function RowStatus({ check }) {
  if (!check || check.status === 'missing' || check.status === 'note') return null;
  if (check.status === 'match') {
    return (
      <span
        className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
        title={`Matches listing (${check.listingValue})`}
        aria-label={`Matches listing: ${check.listingValue}`}
      />
    );
  }
  if (check.status === 'mismatch') {
    return (
      <span
        className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
        title={`Listing ${check.listingValue} · model ${check.modelValue}`}
        aria-label={`Differs from listing: ${check.listingValue}`}
      />
    );
  }
  return null;
}

/**
 * Readable encyclopedia specs — highlights + grouped rows.
 * Optional modelCheck quietly marks listing agreement on listing pages.
 */
export default function BoatModelSpecs({
  model,
  title = 'Specs',
  titleTo = null,
  className = '',
  compact = false,
  showTitle = true,
  showSummary = true,
  showHighlights = true,
  modelCheck = null,
}) {
  if (!boatModelHasSpecs(model) && !modelCheck) return null;
  if (!boatModelHasSpecs(model)) {
    return (
      <div className={className}>
        <ListingModelCheck modelCheck={modelCheck} />
      </div>
    );
  }

  const highlights = showHighlights ? buildBoatModelHighlights(model) : [];
  const sections = buildBoatModelSpecSections(model);
  const sourceUrl = model.sailboatDataUrl;
  const summary = [model.rigType, model.hullType].filter(Boolean).join(' · ');
  const titleClass = `font-semibold text-pine-950 ${compact ? 'text-base' : 'text-lg'}`;
  const bySpec = checksBySpecId(modelCheck);

  return (
    <div className={className}>
      {(showTitle || sourceUrl || modelCheck?.summary) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {showTitle ? (
              titleTo ? (
                <Link to={titleTo} className={`${titleClass} hover:underline`}>
                  {title}
                </Link>
              ) : (
                <h3 className={titleClass}>{title}</h3>
              )
            ) : null}
            {modelCheck?.summary && (
              <CompareStatusIcon tone={modelCheck.summary.tone} />
            )}
          </div>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-pine-600 underline-offset-2 hover:text-pine-950 hover:underline"
            >
              Source on Sailboatdata
            </a>
          )}
        </div>
      )}

      {showSummary && summary && (
        <p className={`text-pine-700 ${compact ? 'mb-3 text-sm' : 'mb-4 text-sm sm:text-base'}`}>
          {summary}
        </p>
      )}

      {highlights.length > 0 && (
        <div
          className={`grid gap-3 rounded-xl bg-gradient-to-br from-pine-50 via-white to-sky-50/70 ${
            compact ? 'grid-cols-2 p-3 sm:grid-cols-4' : 'grid-cols-2 p-4 sm:grid-cols-4'
          }`}
        >
          {highlights.map((item) => (
            <div key={item.id || item.label} className="min-w-0">
              <p className="text-xs text-pine-500">
                <SpecLabel label={item.label} tip={item.tip} />
                <RowStatus check={bySpec[item.id]} />
              </p>
              <p
                className={`mt-0.5 font-semibold tabular-nums tracking-tight text-pine-950 ${
                  compact ? 'text-base' : 'text-lg sm:text-xl'
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div
        className={`grid gap-x-10 gap-y-6 ${
          compact ? 'mt-5 sm:grid-cols-2' : 'mt-6 sm:grid-cols-2'
        }`}
      >
        {sections.map((section) => (
          <section key={section.title} className="min-w-0">
            <h4 className="mb-1 border-b border-pine-200 pb-1.5 text-sm font-semibold text-pine-900">
              {section.title}
            </h4>
            <dl>
              {section.rows.map((item) => (
                <div
                  key={item.id || item.label}
                  className="flex items-baseline justify-between gap-4 border-b border-pine-100 py-2 last:border-0"
                >
                  <dt className="min-w-0 shrink text-sm text-pine-600">
                    <SpecLabel label={item.label} tip={item.tip} />
                    <RowStatus check={bySpec[item.id]} />
                  </dt>
                  <dd className="text-right text-sm font-medium tabular-nums text-pine-950">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      {modelCheck && <ListingModelCheck modelCheck={modelCheck} />}
    </div>
  );
}

export { boatModelHasSpecs };
