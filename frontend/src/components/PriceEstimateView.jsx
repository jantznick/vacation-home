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
const TAB_BUTTON_DISABLED = 'bg-pine-50 text-pine-400';
const TAB_BUTTON_DISABLED_ACTIVE = 'bg-pine-100 text-pine-500 ring-1 ring-pine-200';

function PricingTabs({ tabs, activeKey, onChange, tabActiveClass, tabIdleClass }) {
  const active = tabActiveClass || TAB_BUTTON_ACTIVE;
  const idle = tabIdleClass || TAB_BUTTON_IDLE;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Pricing segments">
      {tabs.map((tab) => {
        const selected = activeKey === tab.key;
        const disabled = Boolean(tab.disabled);

        let className = idle;
        if (disabled) {
          className = selected ? TAB_BUTTON_DISABLED_ACTIVE : TAB_BUTTON_DISABLED;
        } else if (selected) {
          className = active;
        }

        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-disabled={disabled}
            title={tab.disabledHint || undefined}
            onClick={() => onChange(tab.key)}
            className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${className}`}
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
  if ((tier.message && tier.estimatedPrice == null) || tier.estimatedPrice === 0) {
    return (
      <div className="mt-3 rounded-xl border border-pine-200 bg-pine-50/80 p-4">
        <p className="text-sm text-pine-600">
          {tier.estimatedPrice === 0
            ? 'Could not produce a reliable estimate from current data.'
            : tier.message}
        </p>
        {tier.criteria && <p className="mt-2 text-xs text-pine-500">{tier.criteria}</p>}
      </div>
    );
  }

  const tone = getDealTone(tier);
  const summary = formatDealSummary(tier, tierKey);

  return (
    <div className={`mt-3 rounded-xl border p-4 ${DEAL_BOX_CLASSES[tone]}`}>
      {tier.listPrice != null && (
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 border-b border-pine-200/80 pb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-pine-500">List price</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-pine-900">
              {formatDisplayPrice(tier.listPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pine-500">Model expects</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-pine-900">
              {formatDisplayPrice(tier.estimatedPrice)}
            </p>
          </div>
        </div>
      )}

      {tier.listPrice == null && (
        <>
          <p className="text-xs font-medium uppercase tracking-wide text-pine-500">Expected price</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-pine-900">
            {formatDisplayPrice(tier.estimatedPrice)}
          </p>
        </>
      )}

      {summary && (
        <p className={`text-sm font-medium ${DEAL_TEXT_CLASSES[tone]}`}>{summary}</p>
      )}
      {hint && <p className="mt-2 text-xs text-pine-600">{hint}</p>}
      {tier.confidenceNote && (
        <p className="mt-2 text-xs text-amber-800">{tier.confidenceNote}</p>
      )}
    </div>
  );
}

function PriceEstimateContent({
  title,
  subtitle,
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
          <h2 className="text-base font-semibold text-pine-900">{title}</h2>
          <p className="mt-1 text-sm text-pine-600">
            {subtitle}
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
  title = 'Is this a good price?',
  subtitle = 'Compared to what your saved homes predict',
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
          title={title}
          subtitle={subtitle}
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
        title={title}
        subtitle={subtitle}
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

export { PricingTabs, PricingResult, TAB_BUTTON_ACTIVE, TAB_BUTTON_IDLE, TAB_BUTTON_DISABLED };
