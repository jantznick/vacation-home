import { Link } from 'react-router-dom';
import MarketingLayout from './MarketingLayout';
import { LEGAL_LAST_UPDATED } from '../lib/brand';

export default function MarketingContentPage({
  title,
  intro,
  lastUpdated = LEGAL_LAST_UPDATED,
  children,
}) {
  return (
    <MarketingLayout>
      <article className="mx-auto max-w-2xl px-4 py-14 sm:px-6 sm:py-16">
        <p className="text-sm text-pine-500">
          <Link to="/" className="cursor-pointer hover:text-pine-800">
            ← Home
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-pine-900 sm:text-4xl">
          {title}
        </h1>
        {intro && (
          <p className="mt-4 text-base leading-relaxed text-pine-700">{intro}</p>
        )}
        {lastUpdated && (
          <p className="mt-3 text-sm text-pine-500">Last updated: {lastUpdated}</p>
        )}
        <div className="mt-8 space-y-8 text-pine-700">{children}</div>
      </article>
    </MarketingLayout>
  );
}

export function ContentSection({ title, children }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-pine-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed sm:text-base">{children}</div>
    </section>
  );
}

export function ContentList({ items }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
