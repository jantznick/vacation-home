import { useState } from 'react';
import MarketingLayout from '../components/MarketingLayout';
import MarketingPricingDemo from '../components/MarketingPricingDemo';
import MarketingPricePickerDemo from '../components/MarketingPricePickerDemo';
import MarketingFeatureIcon from '../components/MarketingFeatureIcon';
import MarketingLink from '../components/MarketingLink';
import VacationTypeSelector, { getStoredScenarioId } from '../components/VacationTypeSelector';
import { APP_NAME, APP_TAGLINE } from '../lib/brand';
import {
  MARKETING_SCENARIOS,
  DEFAULT_SCENARIO_ID,
} from '../lib/marketingScenarios';

const PRICING_LENSES_STATIC = [
  {
    key: 'all',
    title: 'All listings',
    description:
      'What does your whole pipeline say this property should cost? Useful when you are still exploring widely.',
    boatDescription:
      'What does your whole saved fleet say this boat should cost? Useful when you are still shopping widely.',
  },
  {
    key: 'region',
    title: 'Same region',
    boatTitle: 'Same market',
    getDescription: (s) => s.pricingLensRegion,
  },
  {
    key: 'similar',
    title: 'Similar homes',
    boatTitleKey: 'pricingLensSimilarTitle',
    getDescription: (s) => s.pricingLensSimilar
      || 'A comp-style view matched on size, location, and property type from listings you have already saved.',
  },
];

const PRICING_BULLETS = [
  'Expected price from your model — with list price side by side',
  'Plain-language deal label: above, below, or in line with the model',
  'Sample count so you know how much data backs each estimate',
  'Confidence notes when your dataset is still thin (starts at 3+ priced listings per segment)',
  'Models retrain when you add, edit, or remove listings — no manual refresh',
];

export default function Home() {
  const [scenarioId, setScenarioId] = useState(() => getStoredScenarioId() || DEFAULT_SCENARIO_ID);
  const scenario = MARKETING_SCENARIOS[scenarioId] || MARKETING_SCENARIOS[DEFAULT_SCENARIO_ID];
  const theme = scenario.theme;
  const isBoat = Boolean(scenario.isBoat);
  const heroBody = scenario.heroBody
    .replace('{appName}', APP_NAME)
    .replace('{listingType}', scenario.listingType);

  const pricingLenses = PRICING_LENSES_STATIC.map((lens) => ({
    title: isBoat
      ? (lens.boatTitle || scenario[lens.boatTitleKey] || lens.title)
      : lens.title,
    description: isBoat && lens.boatDescription
      ? lens.boatDescription
      : (lens.getDescription ? lens.getDescription(scenario) : lens.description),
  }));

  return (
    <MarketingLayout theme={theme}>
      {/* Hero */}
      <section className={`relative overflow-hidden border-b ${theme.heroBorder}`}>
        <div className={`pointer-events-none absolute inset-0 ${theme.heroRadial}`} aria-hidden />
        <div className={`pointer-events-none absolute inset-0 ${theme.heroDots}`} aria-hidden />

        <div className="relative mx-auto min-w-0 max-w-6xl px-4 py-14 sm:px-6 sm:py-16 lg:grid lg:grid-cols-2 lg:items-center lg:gap-10 lg:py-20">
          <div className="min-w-0">
            <h1 className="text-balance text-4xl font-semibold tracking-tight text-pine-950 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
              Is it{' '}
              <span className={theme.accent}>{scenario.heroAccent}</span>
              {' '}{scenario.heroAction}?
            </h1>

            <VacationTypeSelector value={scenarioId} onChange={setScenarioId} theme={theme} />

            <p className="mt-5 text-lg leading-relaxed text-pine-700">
              {APP_TAGLINE}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-pine-600">
              {heroBody}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <MarketingLink
                to="/register"
                variant="primary"
                className={`min-h-12 px-6 text-base ${theme.primaryBtn}`}
              >
                Start free
              </MarketingLink>
              <MarketingLink
                href="#price-picker"
                variant="secondary"
                className={`min-h-12 px-6 text-base ${theme.secondaryBtn}`}
              >
                Try price picker
              </MarketingLink>
            </div>
            <p className="mt-4 text-sm text-pine-500">
              No credit card · Open registration · Your data stays in your search
            </p>
          </div>

          <div className="mt-12 min-w-0 overflow-hidden lg:mt-0">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              <div
                className={`pointer-events-none absolute -inset-2 rounded-3xl bg-gradient-to-br blur-2xl sm:-inset-4 ${theme.heroGlow}`}
                aria-hidden
              />
              <MarketingPricingDemo
                key={scenarioId}
                demo={scenario.demo}
                theme={theme}
                className="relative"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Price picker */}
      <section id="price-picker" className={`scroll-mt-20 border-b ${theme.heroBorder} ${theme.pageBg}`}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl text-center" key={`picker-intro-${scenarioId}`}>
            <p className="text-sm font-medium uppercase tracking-wide text-pine-500">
              Explore before you save listings
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-pine-950 sm:text-4xl">
              {scenario.pricePickerTitle || 'See how price moves — and how regions compare'}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-pine-600">
              {scenario.pricePickerLead || (
                <>
                  Price picker holds your dream property steady while you slide one detail at a time.
                  With multiple regions selected, <strong className="font-medium text-pine-800">steeper lines mean that variable matters more there</strong> — the same acre or waterfront flag can mean something different in Eagle River vs Minocqua, Destin vs 30A, or Breckenridge vs Keystone.
                </>
              )}
              {' '}{scenario.pricePickerBlurb}
            </p>
          </div>

          <div className="relative mt-10">
            <div
              className={`pointer-events-none absolute -inset-3 rounded-3xl bg-gradient-to-br blur-2xl sm:-inset-6 ${theme.heroGlow}`}
              aria-hidden
            />
            <MarketingPricePickerDemo
              key={scenarioId}
              scenarioId={scenarioId}
              theme={theme}
              className="relative"
            />
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-pine-500">
            Demo uses illustrative {scenario.label.toLowerCase()} numbers. After you sign up, curves
            train on the listings you save.{' '}
            <a href="#pricing" className="font-medium text-pine-700 underline hover:text-pine-900">
              How pricing models work
            </a>
          </p>
        </div>
      </section>

      {/* ML Pricing */}
      <section id="pricing" className={`scroll-mt-20 border-b text-white ${theme.pricingSection}`}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="max-w-3xl" key={`pricing-intro-${scenarioId}`}>
            <p className="text-sm font-medium uppercase tracking-wide text-white/60">
              The key differentiator
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Pricing models that learn from your {scenario.label.toLowerCase()} search
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-white/80">
              {isBoat ? (
                <>
                  Generic online estimates use a black box. We use{' '}
                  <strong className="font-medium text-white">ML models trained on the boats you save</strong>
                  — retrained automatically as your fleet grows — to answer one question on every listing:
                </>
              ) : (
                <>
                  Zillow&apos;s Zestimate uses their black box. We use{' '}
                  <strong className="font-medium text-white">ML models trained on the listings you save</strong>
                  — retrained automatically as your dataset grows — to answer one question on every property:
                </>
              )}
            </p>
            <p className="mt-3 text-xl font-medium text-white">
              &ldquo;Is this a good price?&rdquo;
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3" key={`lenses-${scenarioId}`}>
            {pricingLenses.map((lens) => (
              <div key={lens.title} className={`rounded-xl border p-5 ${theme.pricingCard}`}>
                <h3 className="text-lg font-semibold text-white">{lens.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{lens.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <h3 className="text-xl font-semibold text-white">What you get on every listing</h3>
              <ul className="mt-6 space-y-4">
                {PRICING_BULLETS.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/90">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${theme.pricingBullet}`} />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <p className="text-sm font-medium text-white/60">Features you can train on</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {scenario.pricingFeatures.map((feature) => (
                    <span
                      key={feature}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${theme.pricingTag}`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-5 sm:p-6 ${theme.pricingWhyBox}`} key={`why-${scenarioId}`}>
              <p className={`text-sm font-medium ${theme.pricingHighlight}`}>Why this matters</p>
              <p className="mt-4 leading-relaxed text-white/90">{scenario.pricingInsight}</p>
              <p className="mt-4 leading-relaxed text-white/90">
                As you save listings over weeks or years, {APP_NAME} builds a private comp library from
                the {isBoat ? 'boats' : 'homes'} you track — and tells you when ask prices in your markets look high or like a
                genuine opportunity.
              </p>
              <p className="mt-6 text-sm text-white/50">
                Not financial advice — a research tool to calibrate your expectations before you tour
                or make an offer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting features */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold text-pine-900 sm:text-3xl">
            Everything else a {scenario.label.toLowerCase()} search needs
          </h2>
          <p className="mt-4 text-lg text-pine-600">
            Pricing models are the draw — the rest keeps your research organized for as long as the
            hunt takes.
          </p>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" key={`features-${scenarioId}`}>
          {scenario.features.map((feature) => (
            <li
              key={feature.title}
              className={`rounded-xl border p-5 shadow-sm transition-shadow hover:shadow-md ${theme.featuresCard}`}
            >
              <MarketingFeatureIcon name={feature.icon} className={theme.featureIcon} />
              <h3 className="mt-4 text-lg font-semibold text-pine-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-pine-600">{feature.description}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How it works */}
      <section className={`border-y ${theme.stepsSection}`}>
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-center text-2xl font-semibold text-pine-900 sm:text-3xl">
            How it works
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-pine-600">
            There is no rush. Some searches take a summer of weekends; others span years of
            watching the market. The app keeps pace either way.
          </p>

          <ol className="relative mt-10 grid gap-8 md:grid-cols-3 md:gap-6" key={`steps-${scenarioId}`}>
            <div
              className={`pointer-events-none absolute left-0 right-0 top-5 hidden h-0.5 md:block ${theme.stepsLine}`}
              aria-hidden
            />
            {scenario.steps.map((item) => (
              <li key={item.step} className="relative text-center md:text-left">
                <span className={`relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white shadow-md md:mx-0 ${theme.stepCircle}`}>
                  {item.step}
                </span>
                <h3 className="mt-5 text-lg font-semibold text-pine-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-pine-600">{item.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
        <div className={`relative overflow-hidden rounded-2xl border px-6 py-12 text-center sm:px-10 sm:py-14 ${theme.ctaBorder} ${theme.ctaBg}`}>
          <div className={`pointer-events-none absolute inset-0 ${theme.ctaGlow}`} aria-hidden />
          <div className="relative" key={`cta-${scenarioId}`}>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              {scenario.ctaHeadline}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-white/80">
              Create a free account, {isBoat ? 'import your first boats' : `paste your first ${scenario.label.toLowerCase()} listings`}, and see
              pricing models come alive as your dataset grows — on your timeline.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <MarketingLink to="/register" variant="onDark" className="min-h-12 px-7 text-base">
                Create free account
              </MarketingLink>
              <MarketingLink to="/login" variant="onDarkOutline" className="min-h-12 px-7 text-base">
                Sign in
              </MarketingLink>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
