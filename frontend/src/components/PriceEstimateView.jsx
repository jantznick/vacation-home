import { Link } from 'react-router-dom';
import Card from './Card';
import { formatDisplayPrice } from '../lib/pricingDisplay';
import {
  DEAL_BOX_CLASSES,
  DEAL_TEXT_CLASSES,
  formatDealSummary,
  getDealTone,
} from '../lib/pricingDisplay';

const TAB_BUTTON_ACTIVE = 'bg-pine-700 text-white';
const TAB_BUTTON_IDLE = 'bg-pine-100 text-pine-700 hover:bg-pine-200';

function PricingTabs({ tabs, activeKey, onChange, tabActiveClass, tabIdleClass }) {
  const active = tabActiveClass || TAB_BUTTON_ACTIVE;
  const idle = tabIdleClass || TAB_BUTTON_IDLE;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Pricing segments">
      {tabs.map((tab) => {
        const selected = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.key)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              selected ? active : idle
            }`}
          >
            {tab.label}
            {tab.count != null ? ` (${tab.count})` : ''}
          </button>
        );
      })}
    </div>
  );
}

function PricingResult({ tier, tierKey, hint }) {
  if (tier.message && tier.estimatedPrice == null) {
    return (
      <div className="mt-3 rounded-xl border border-pine-200 bg-pine-50/80 p-4">
        <p className="text-sm text-pine-600">{tier.message}</p>
        {tier.criteria && <p className="mt-2 text-xs text-pine-500">{tier.criteria}</p>}
      </div>
    );
  }

  const tone = getDealTone(tier);
  const summary = formatDealSummary(tier, tierKey);

  return (
    <div className={`mt-3 rounded-xl border p-4 ${DEAL_BOX_CLASSES[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-pine-500">Expected price</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-pine-900">
        {formatDisplayPrice(tier.estimatedPrice)}
      </p>
      {summary && (
        <p className={`mt-2 text-sm font-medium ${DEAL_TEXT_CLASSES[tone]}`}>{summary}</p>
      )}
      {hint && <p className="mt-2 text-xs text-pine-600">{hint}</p>}
      {tier.confidenceNote && (
        <p className="mt-2 text-xs text-amber-800">{tier.confidenceNote}</p>
      )}
    </div>
  );
}

function PriceEstimateContent({
  modelName,
  message,
  tabs,
  activeKey,
  onTabChange,
  tier,
  tierKey,
  hint,
  settingsHref,
  showSettings,
  tabActiveClass,
  tabIdleClass,
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-pine-900">Is this a good price?</h2>
          <p className="mt-1 text-sm text-pine-600">
            Compared to what your saved homes predict
            {modelName ? ` (${modelName})` : ''}
          </p>
          {message && <p className="mt-1 text-xs text-amber-700">{message}</p>}
        </div>
        {showSettings && settingsHref && (
          <Link to={settingsHref} className="text-xs font-medium text-pine-700 hover:text-pine-900">
            Settings
          </Link>
        )}
      </div>

      <PricingTabs
        tabs={tabs}
        activeKey={activeKey}
        onChange={onTabChange}
        tabActiveClass={tabActiveClass}
        tabIdleClass={tabIdleClass}
      />
      <PricingResult tier={tier} tierKey={tierKey} hint={hint} />
    </>
  );
}

export default function PriceEstimateView({
  modelName,
  message,
  tabs,
  activeKey,
  onTabChange,
  tier,
  tierKey,
  hint,
  settingsHref = '/pricing-models',
  showSettings = true,
  embedded = false,
  className = '',
  tabActiveClass,
  tabIdleClass,
}) {
  if (embedded) {
    return (
      <div className={className}>
        <PriceEstimateContent
          modelName={modelName}
          message={message}
          tabs={tabs}
          activeKey={activeKey}
          onTabChange={onTabChange}
          tier={tier}
          tierKey={tierKey}
          hint={hint}
          settingsHref={settingsHref}
          showSettings={showSettings}
          tabActiveClass={tabActiveClass}
          tabIdleClass={tabIdleClass}
        />
      </div>
    );
  }

  return (
    <Card className={className}>
      <PriceEstimateContent
        modelName={modelName}
        message={message}
        tabs={tabs}
        activeKey={activeKey}
        onTabChange={onTabChange}
        tier={tier}
        tierKey={tierKey}
        hint={hint}
        settingsHref={settingsHref}
        showSettings={showSettings}
        tabActiveClass={tabActiveClass}
        tabIdleClass={tabIdleClass}
      />
    </Card>
  );
}

export { PricingTabs, PricingResult, TAB_BUTTON_ACTIVE, TAB_BUTTON_IDLE };
