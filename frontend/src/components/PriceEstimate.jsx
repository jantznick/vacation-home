import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';
import PriceEstimateView from './PriceEstimateView';
import { useSearchId, searchPath } from '../hooks/useSearch';

const DEFAULT_TIER_ORDER = ['allListings', 'region', 'similar'];

function isTierAvailable(tier) {
  return tier?.available !== false && tier?.estimatedPrice != null && tier.estimatedPrice > 0;
}

function buildTierTabs(tierData, tierOrder) {
  return tierOrder
    .filter((key) => tierData[key])
    .map((key) => {
      const tier = tierData[key];
      const available = isTierAvailable(tier);

      return {
        key,
        label: tier.title,
        count: tier.sampleCount ?? null,
        disabled: !available,
        disabledHint: available ? undefined : tier.message,
      };
    });
}

export default function PriceEstimate({
  data,
  title,
  subtitle,
  planningMode = false,
}) {
  const searchId = useSearchId();
  const [activeTier, setActiveTier] = useState('allListings');

  const tiers = data?.tiers;
  const tierOrder = data?.visibleTiers || DEFAULT_TIER_ORDER;

  useEffect(() => {
    if (!tiers) return;
    const preferred = data.recommendedTier
      || tierOrder.find((key) => isTierAvailable(tiers[key]))
      || tierOrder[0];
    setActiveTier(preferred);
  }, [tiers, data?.recommendedTier, tierOrder]);

  if (!data) {
    return null;
  }

  const { tiers: tierData, model, message } = data;

  if (!tierData) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-pine-900">Is this a good price?</h2>
        <p className="mt-2 text-sm text-pine-600">{data.message || 'No estimate available yet.'}</p>
        <p className="mt-2 text-sm">
          <Link
            to={searchPath(searchId, '/settings')}
            className="font-medium text-pine-700 hover:text-pine-900"
          >
            Search settings →
          </Link>
        </p>
      </Card>
    );
  }

  const tierList = buildTierTabs(tierData, tierOrder);
  const activeTierData = tierData[activeTier] || tierData[tierOrder[0]];
  const activeAvailable = isTierAvailable(activeTierData);

  const hint = planningMode && activeAvailable && activeTierData?.sampleCount != null
    ? `Planning estimate from ${activeTierData.sampleCount} saved ${
      activeTierData.sampleCount === 1 ? 'listing' : 'listings'
    }`
    : undefined;

  return (
    <PriceEstimateView
      title={title}
      subtitle={subtitle}
      modelName={model?.name}
      message={message}
      tabs={tierList}
      activeKey={activeTier}
      onTabChange={setActiveTier}
      tier={activeTierData}
      tierKey={activeTier}
      hint={hint}
      settingsHref={searchPath(searchId, '/settings')}
    />
  );
}
