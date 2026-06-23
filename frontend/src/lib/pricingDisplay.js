export const DEAL_BOX_CLASSES = {
  above: 'border-amber-200 bg-amber-50/80',
  below: 'border-emerald-200 bg-emerald-50/80',
  inline: 'border-pine-200 bg-pine-50/80',
};

export const DEAL_TEXT_CLASSES = {
  above: 'text-amber-800',
  below: 'text-emerald-800',
  inline: 'text-pine-700',
};

export function formatDisplayPrice(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function getDealTone(tier) {
  if (tier?.tone) return tier.tone;
  if (tier?.delta == null) return 'inline';
  if (tier.delta > 0) return 'below';
  if (tier.delta < 0) return 'above';
  return 'inline';
}

export function formatDealSummary(tier, tierKey) {
  if (tier?.deltaLabel) return tier.deltaLabel;

  if (tier?.estimatedPrice == null || tier?.listPrice == null) {
    return tier?.dealLabel || null;
  }

  const delta = tier.estimatedPrice - tier.listPrice;
  const percent = Math.round((Math.abs(delta) / tier.listPrice) * 100);
  const count = tier.sampleCount;
  const homes = count === 1 ? 'home' : 'homes';

  if (delta === 0) {
    return `In line with model · based on ${count} ${homes}`;
  }

  const direction = delta > 0 ? 'below' : 'above';

  if (tierKey === 'region' && tier.title?.startsWith('All in ')) {
    const place = tier.title.replace(/^All in /, '');
    return `About ${percent}% ${direction} model · based on ${count} ${homes} in ${place}`;
  }

  if (tierKey === 'similar') {
    return `About ${percent}% ${direction} model · based on ${count} similar ${homes}`;
  }

  return `About ${percent}% ${direction} model · based on ${count} saved ${count === 1 ? 'listing' : 'listings'}`;
}
