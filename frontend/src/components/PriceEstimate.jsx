import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from './Card';
import PriceEstimateView from './PriceEstimateView';
import { useSearchId, searchPath } from '../hooks/useSearch';

const TIER_ORDER = ['allListings', 'region', 'similar'];

export default function PriceEstimate({ data }) {
  const searchId = useSearchId();
  const [activeTier, setActiveTier] = useState('allListings');

  const tiers = data?.tiers;

  useEffect(() => {
    if (!tiers) return;
    const firstWithEstimate = TIER_ORDER.find((key) => tiers[key]?.estimatedPrice != null);
    if (firstWithEstimate) {
      setActiveTier(firstWithEstimate);
    }
  }, [tiers]);

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
            to={searchPath(searchId, '/pricing-models')}
            className="font-medium text-pine-700 hover:text-pine-900"
          >
            Pricing settings →
          </Link>
        </p>
      </Card>
    );
  }

  const tierList = TIER_ORDER.map((key) => ({
    key,
    label: tierData[key].title,
    count:
      tierData[key].estimatedPrice != null && tierData[key].sampleCount != null
        ? tierData[key].sampleCount
        : null,
  }));

  const activeTierData = tierData[activeTier];

  return (
    <PriceEstimateView
      modelName={model?.name}
      message={message}
      tabs={tierList}
      activeKey={activeTier}
      onTabChange={setActiveTier}
      tier={activeTierData}
      tierKey={activeTier}
      settingsHref={searchPath(searchId, '/pricing-models')}
    />
  );
}
