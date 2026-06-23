export function buildPricingNotice(pricing) {
  if (!pricing?.updated) {
    return 'Listing saved. Add more priced listings to activate segment models.';
  }

  const active = (pricing.models || []).some((model) => model.allReady);
  if (!active) {
    return 'Listing saved. Segment models activate at 3+ listings with list prices.';
  }

  return 'Listing saved. Pricing models updated for affected segments.';
}
