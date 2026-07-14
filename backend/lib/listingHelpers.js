import { getListingFreshness } from './listingFreshness.js';
import {
  isSoldCompListing,
  trainingListPrice,
} from './listingBrowse.js';
import {
  compareListingToBoatModel,
  summarizeListingModelCheck,
} from './listingModelCheck.js';

/**
 * Pick the best slip option from a marina for a given boat length.
 * Prefers per_ft options that fit, falls back to any fixed option.
 */
function bestSlipOption(marina, lengthFt) {
  const options = Array.isArray(marina?.slipOptions) ? marina.slipOptions : [];
  if (options.length === 0) return null;

  const fitting = options.filter(
    (o) => o.maxLengthFt == null || (lengthFt && lengthFt <= o.maxLengthFt),
  );
  const pool = fitting.length > 0 ? fitting : options;

  const perFt = pool.find((o) => o.feeType === 'per_ft');
  if (perFt) return perFt;
  return pool[0];
}

function slipAnnualFromOption(opt, lengthFt) {
  if (!opt || opt.feeAmount == null) return null;
  const amount = Number(opt.feeAmount);
  const base = opt.feeType === 'per_ft' ? amount * (lengthFt || 0) : amount;
  if (opt.feePeriod === 'annual' || opt.feePeriod === 'seasonal') return Math.round(base);
  return Math.round(base * 12);
}

/**
 * Standard monthly payment for a fixed-rate loan.
 */
function monthlyPayment(principal, annualRate, years) {
  if (!principal || !annualRate || !years) return null;
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return Math.round(principal / n);
  const payment = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment);
}

/**
 * Compute annual carrying cost breakdown for a listing.
 */
function computeCarryingCost(listing, { listPrice, lengthFt }) {
  const price = listPrice ?? 0;
  const downPct = listing.downPaymentPct ?? null;
  const rate = listing.interestRate ?? null;
  const termYears = listing.loanTermYears ?? null;

  let loanPaymentMonthly = null;
  let loanPaymentAnnual = null;
  let downPaymentAmount = null;
  let loanAmount = null;

  if (price && downPct != null && rate != null && termYears) {
    downPaymentAmount = Math.round(price * downPct / 100);
    loanAmount = price - downPaymentAmount;
    loanPaymentMonthly = monthlyPayment(loanAmount, rate, termYears);
    loanPaymentAnnual = loanPaymentMonthly ? loanPaymentMonthly * 12 : null;
  }

  const marina = listing.marina || null;
  const options = Array.isArray(marina?.slipOptions) ? marina.slipOptions : [];
  const slip = listing.preferredSlipIndex != null && options[listing.preferredSlipIndex]
    ? options[listing.preferredSlipIndex]
    : bestSlipOption(marina, lengthFt);
  const slipAnnual = slip ? slipAnnualFromOption(slip, lengthFt) : null;
  const winterStorage = marina?.winterStorageCost ?? null;

  const insurance = listing.annualInsurance ?? null;
  const tax = listing.annualTax ?? null;
  const maintenance = listing.annualMaintenance ?? null;

  const customCosts = Array.isArray(listing.additionalCosts)
    ? listing.additionalCosts.filter((c) => c && c.name && c.annualCost != null)
    : [];
  const customTotal = customCosts.reduce((s, c) => s + Number(c.annualCost), 0) || null;

  const parts = [loanPaymentAnnual, slipAnnual, winterStorage, insurance, tax, maintenance, customTotal];
  const knownParts = parts.filter((p) => p != null);
  const totalAnnual = knownParts.length > 0 ? knownParts.reduce((s, v) => s + v, 0) : null;

  return {
    loanPaymentMonthly,
    loanPaymentAnnual,
    downPaymentAmount,
    loanAmount,
    slipAnnual,
    slipOptionName: slip?.name ?? null,
    winterStorage,
    insurance,
    tax,
    maintenance,
    customCosts,
    totalAnnual,
    totalMonthly: totalAnnual != null ? Math.round(totalAnnual / 12) : null,
  };
}

/**
 * Serialize a listing for API responses with derived metrics.
 */
export function serializeListing(listing) {
  const { rawScrapedData: _rawScrapedData, ...rest } = listing;
  const listPrice = listing.listPrice != null ? Number(listing.listPrice) : null;
  const soldPrice = listing.soldPrice != null ? Number(listing.soldPrice) : null;
  const acres = listing.acres != null ? Number(listing.acres) : null;
  const sqftLiving = listing.sqftLiving != null ? Number(listing.sqftLiving) : null;
  const compPrice = trainingListPrice(listing);
  const freshness = getListingFreshness(listing);

  const lengthFt = listing.lengthFt != null ? Number(listing.lengthFt) : null;

  const modelCheck = listing.boatModel
    ? (() => {
      const comparison = compareListingToBoatModel(listing, listing.boatModel);
      return {
        ...comparison,
        summary: summarizeListingModelCheck(comparison),
      };
    })()
    : null;

  const carryingCost = computeCarryingCost(listing, { listPrice, lengthFt });

  return {
    ...rest,
    listPrice,
    soldPrice,
    acres,
    sqftLiving,
    lengthFt,
    isSoldComp: isSoldCompListing(listing),
    pricePerAcre: compPrice && acres ? Math.round(compPrice / acres) : null,
    pricePerSqft: compPrice && sqftLiving ? Math.round(compPrice / sqftLiving) : null,
    pricePerFoot: compPrice && lengthFt ? Math.round(compPrice / lengthFt) : null,
    modelCheck,
    carryingCost,
    ...freshness,
    canRefresh: freshness.canRefresh && !isSoldCompListing(listing),
  };
}

export function serializeListings(listings) {
  return listings.map(serializeListing);
}

/**
 * Build Prisma create/update data from scraped ingest fields.
 */
export function scrapedFieldsToListingData(scraped, { fetchedAt = new Date() } = {}) {
  return {
    sourceUrl: scraped.sourceUrl ?? null,
    sourceSite: scraped.sourceSite ?? null,
    mlsNumber: scraped.mlsNumber ?? null,
    status: scraped.status ?? undefined,
    address: scraped.address ?? null,
    city: scraped.city ?? null,
    state: scraped.state ?? null,
    zip: scraped.zip ?? null,
    latitude: scraped.latitude ?? null,
    longitude: scraped.longitude ?? null,
    listPrice: scraped.listPrice ?? null,
    soldPrice: scraped.soldPrice ?? null,
    isVacantLot: scraped.isVacantLot ?? false,
    bedrooms: scraped.bedrooms ?? null,
    bathrooms: scraped.bathrooms ?? null,
    sqftLiving: scraped.sqftLiving ?? null,
    sqftLot: scraped.sqftLot ?? null,
    acres: scraped.acres ?? null,
    yearBuilt: scraped.yearBuilt ?? null,
    waterfront: scraped.waterfront ?? false,
    waterfrontType: scraped.waterfrontType ?? null,
    lengthFt: scraped.lengthFt ?? null,
    lwlFt: scraped.lwlFt ?? null,
    beamFt: scraped.beamFt ?? null,
    draftFt: scraped.draftFt ?? null,
    draftMinFt: scraped.draftMinFt ?? null,
    displacementLb: scraped.displacementLb ?? null,
    ballastLb: scraped.ballastLb ?? null,
    engineMake: scraped.engineMake ?? null,
    engineModel: scraped.engineModel ?? null,
    engineHp: scraped.engineHp ?? null,
    engineHours: scraped.engineHours ?? null,
    fuelGal: scraped.fuelGal ?? null,
    waterGal: scraped.waterGal ?? null,
    hullMaterial: scraped.hullMaterial ?? null,
    keelType: scraped.keelType ?? null,
    make: scraped.make ?? null,
    model: scraped.model ?? null,
    propulsion: scraped.propulsion ?? null,
    listingDate: scraped.listingDate ? new Date(scraped.listingDate) : null,
    daysOnMarket: scraped.daysOnMarket ?? null,
    photoUrls: scraped.photoUrls ?? null,
    rawScrapedData: scraped.rawScrapedData ?? null,
    fetchedAt,
  };
}

export function snapshotFromListing(listing) {
  return {
    listPrice: listing.listPrice ?? null,
    soldPrice: listing.soldPrice ?? null,
    status: listing.status ?? null,
    daysOnMarket: listing.daysOnMarket ?? null,
  };
}

export function parseOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseOptionalInt(value) {
  const parsed = parseOptionalNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}
