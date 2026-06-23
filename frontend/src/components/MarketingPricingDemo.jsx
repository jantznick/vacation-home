import { useEffect, useState } from 'react';
import PriceEstimateView from './PriceEstimateView';

/** Static listing-detail mock — pricing UI matches the app, colors follow marketing scenario. */
export default function MarketingPricingDemo({ demo, theme, className = '' }) {
  const [activeTab, setActiveTab] = useState(demo?.defaultTab || 'region');

  useEffect(() => {
    setActiveTab(demo?.defaultTab || 'region');
  }, [demo]);

  if (!demo) return null;

  const segment = demo.segments[activeTab] || demo.segments.region;
  const tabs = demo.tabs.map((tab) => ({
    key: tab.id,
    label: tab.label,
    count: tab.count,
  }));

  const shell = theme || {};
  const border = shell.demoBorder || 'border-pine-200/80';
  const headerBorder = shell.demoHeaderBorder || 'border-pine-100';
  const headerBg = shell.demoHeaderBg || 'bg-pine-50/80';
  const shadow = shell.demoShadow || 'shadow-pine-900/10 ring-pine-900/5';
  const statBg = shell.demoStatBg || 'bg-pine-50';

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-white shadow-xl ring-1 ${border} ${shadow} ${className}`}
    >
      <div className={`border-b px-4 py-3 ${headerBorder} ${headerBg}`}>
        <p className="text-xs font-medium uppercase tracking-wide text-pine-500">Listing detail</p>
        <p className="mt-0.5 font-semibold text-pine-900">{demo.title}</p>
        <p className="text-sm text-pine-600">Listed at {demo.listPrice}</p>
      </div>

      <div className="p-4">
        <PriceEstimateView
          embedded
          tabs={tabs}
          activeKey={activeTab}
          onTabChange={setActiveTab}
          tier={{
            estimatedPrice: segment.expectedPrice,
            deltaLabel: segment.deltaLabel,
            tone: segment.tone,
          }}
          tierKey={activeTab === 'all' ? 'allListings' : activeTab}
          hint={demo.featureHint}
          showSettings={false}
          tabActiveClass={shell.demoTabActive}
          tabIdleClass={shell.demoTabIdle}
        />

        {demo.stats?.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {demo.stats.map((stat) => (
              <div key={stat.label} className={`rounded-lg px-2 py-1.5 ${statBg}`}>
                <p className="text-[10px] uppercase tracking-wide text-pine-500">{stat.label}</p>
                <p className="text-sm font-medium text-pine-900">{stat.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
