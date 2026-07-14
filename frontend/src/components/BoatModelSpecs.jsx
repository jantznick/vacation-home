import { Link } from 'react-router-dom';
import {
  buildBoatModelHighlights,
  buildBoatModelSpecSections,
  boatModelHasSpecs,
} from '../lib/boatModelSpecs';
import InfoTooltip from './InfoTooltip';

function SpecLabel({ label, tip }) {
  return (
    <span className="inline-flex items-center">
      <span>{label}</span>
      {tip && <InfoTooltip tip={tip} label={label} />}
    </span>
  );
}

/**
 * Readable encyclopedia specs — highlights + grouped rows.
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
}) {
  if (!boatModelHasSpecs(model)) return null;

  const highlights = showHighlights ? buildBoatModelHighlights(model) : [];
  const sections = buildBoatModelSpecSections(model);
  const sourceUrl = model.sailboatDataUrl;
  const summary = [model.rigType, model.hullType].filter(Boolean).join(' · ');
  const titleClass = `font-semibold text-pine-950 ${compact ? 'text-base' : 'text-lg'}`;

  return (
    <div className={className}>
      {(showTitle || sourceUrl) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {showTitle ? (
            titleTo ? (
              <Link to={titleTo} className={`${titleClass} hover:underline`}>
                {title}
              </Link>
            ) : (
              <h3 className={titleClass}>{title}</h3>
            )
          ) : (
            <span />
          )}
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
    </div>
  );
}

export { boatModelHasSpecs };
