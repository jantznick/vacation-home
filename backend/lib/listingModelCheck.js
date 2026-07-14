/**
 * Compare a boat listing's measured / advertised specs to its linked BoatModel
 * encyclopedia expectations (usually from Sailboatdata).
 */

function num(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function nearlyEqual(a, b, { abs = 0.5, pct = 0.04 } = {}) {
  if (a == null || b == null) return null;
  const delta = Math.abs(a - b);
  const tol = Math.max(abs, Math.abs(b) * pct);
  return delta <= tol;
}

function fmtFt(value) {
  const n = num(value);
  if (n == null) return null;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ft`;
}

function fmtLb(value) {
  const n = num(value);
  if (n == null) return null;
  return `${Math.round(n).toLocaleString()} lb`;
}

function fmtGal(value) {
  const n = num(value);
  if (n == null) return null;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 1 })} gal`;
}

function fmtHp(value) {
  const n = num(value);
  if (n == null) return null;
  return `${Math.round(n)} HP`;
}

function pushCheck(checks, item) {
  if (!item) return;
  checks.push(item);
}

/**
 * @returns {{
 *   hasModel: boolean,
 *   comparable: number,
 *   matches: number,
 *   mismatches: Array<object>,
 *   missing: Array<object>,
 *   notes: Array<object>,
 *   checks: Array<object>,
 * }}
 */
export function compareListingToBoatModel(listing, model = listing?.boatModel) {
  const checks = [];

  if (!listing || !model) {
    return {
      hasModel: Boolean(model),
      comparable: 0,
      matches: 0,
      mismatches: [],
      missing: [],
      notes: [],
      checks: [],
    };
  }

  const compareNumber = ({
    id,
    label,
    listingValue,
    modelValue,
    format = fmtFt,
    abs,
    pct,
    severity = 'warn',
    hint,
  }) => {
    const left = num(listingValue);
    const right = num(modelValue);
    if (left == null && right == null) return;
    if (left == null || right == null) {
      pushCheck(checks, {
        id,
        label,
        status: 'missing',
        listingValue: left == null ? null : format(left),
        modelValue: right == null ? null : format(right),
        severity: 'info',
        message: left == null
          ? `Model expects ${format(right)}; listing doesn’t publish this.`
          : `Listing shows ${format(left)}; model encyclopedia has no value yet.`,
      });
      return;
    }

    const ok = nearlyEqual(left, right, { abs, pct });
    pushCheck(checks, {
      id,
      label,
      status: ok ? 'match' : 'mismatch',
      listingValue: format(left),
      modelValue: format(right),
      delta: Math.round((left - right) * 100) / 100,
      severity: ok ? 'ok' : severity,
      message: ok
        ? `${label} looks consistent with this model.`
        : (hint || `${label} differs from the expected model value.`),
    });
  };

  compareNumber({
    id: 'loa',
    label: 'Length overall',
    listingValue: listing.lengthFt,
    modelValue: model.loaFt,
    abs: 0.6,
    pct: 0.03,
    hint: 'LOA is off the model figure — confirm this is the right model or a different deck/bowsprit layout.',
  });

  compareNumber({
    id: 'lwl',
    label: 'Waterline',
    listingValue: listing.lwlFt,
    modelValue: model.lwlFt,
    abs: 0.6,
    pct: 0.03,
  });

  compareNumber({
    id: 'beam',
    label: 'Beam',
    listingValue: listing.beamFt,
    modelValue: model.beamFt,
    abs: 0.35,
    pct: 0.03,
  });

  compareNumber({
    id: 'draft',
    label: 'Draft',
    listingValue: listing.draftFt,
    modelValue: model.draftFt,
    abs: 0.35,
    pct: 0.05,
    severity: 'high',
    hint: 'Draft is a common deep vs shallow keel tell. Broker copy and keel type may explain this.',
  });

  if (num(listing.draftMinFt) != null && num(model.draftFt) != null) {
    const boardUp = num(listing.draftMinFt);
    const modelDraft = num(model.draftFt);
    if (boardUp < modelDraft - 0.75) {
      pushCheck(checks, {
        id: 'draftMin',
        label: 'Board-up draft',
        status: 'note',
        listingValue: fmtFt(boardUp),
        modelValue: fmtFt(modelDraft),
        severity: 'info',
        message: `Listing also shows a shallower ${fmtFt(boardUp)} draft (board/keel up) vs model ${fmtFt(modelDraft)}.`,
      });
    }
  }

  compareNumber({
    id: 'displacement',
    label: 'Displacement',
    listingValue: listing.displacementLb,
    modelValue: model.displacementLb,
    format: fmtLb,
    abs: 400,
    pct: 0.08,
  });

  compareNumber({
    id: 'ballast',
    label: 'Ballast',
    listingValue: listing.ballastLb,
    modelValue: model.ballastLb,
    format: fmtLb,
    abs: 250,
    pct: 0.1,
  });

  compareNumber({
    id: 'fuel',
    label: 'Fuel',
    listingValue: listing.fuelGal,
    modelValue: model.fuelGal,
    format: fmtGal,
    abs: 5,
    pct: 0.15,
    severity: 'info',
    hint: 'Tankage often changes with refits — useful, but not a model identity test.',
  });

  compareNumber({
    id: 'water',
    label: 'Water',
    listingValue: listing.waterGal,
    modelValue: model.waterGal,
    format: fmtGal,
    abs: 8,
    pct: 0.15,
    severity: 'info',
    hint: 'Water tankage is frequently modified; treat mismatches as curiosity, not a red flag.',
  });

  compareNumber({
    id: 'engineHp',
    label: 'Engine power',
    listingValue: listing.engineHp,
    modelValue: model.engineHp,
    format: fmtHp,
    abs: 3,
    pct: 0.12,
    severity: 'info',
    hint: 'Different HP often means a repower — check engine year/hours rather than model identity.',
  });

  const listingEngine = [listing.engineMake, listing.engineModel].filter(Boolean).join(' ');
  const modelEngine = [model.engineMake, model.engineType].filter(Boolean).join(' ');
  if (listing.engineMake && model.engineMake) {
    const sameMake = listing.engineMake.toLowerCase() === model.engineMake.toLowerCase();
    pushCheck(checks, {
      id: 'engineMake',
      label: 'Engine',
      status: sameMake ? 'match' : 'mismatch',
      listingValue: listingEngine || listing.engineMake,
      modelValue: modelEngine || model.engineMake,
      severity: sameMake ? 'ok' : 'info',
      message: sameMake
        ? 'Engine make matches the model encyclopedia.'
        : `Listing engine (${listingEngine || listing.engineMake}) differs from model default (${modelEngine || model.engineMake}) — common after a repower.`,
    });
  }

  const year = num(listing.yearBuilt);
  if (year != null && (model.firstBuilt != null || model.lastBuilt != null)) {
    const first = num(model.firstBuilt);
    const last = num(model.lastBuilt) ?? first;
    const start = first ?? last;
    const end = last ?? first;
    const inRange = year >= start - 0 && year <= end + 0;
    // small grace for early/late production quirks
    const nearRange = year >= start - 1 && year <= end + 1;
    pushCheck(checks, {
      id: 'year',
      label: 'Year',
      status: inRange ? 'match' : nearRange ? 'note' : 'mismatch',
      listingValue: String(Math.round(year)),
      modelValue: first && last && first !== last ? `${first}–${last}` : String(start),
      severity: inRange ? 'ok' : nearRange ? 'info' : 'warn',
      message: inRange
        ? 'Year falls in this model’s production run.'
        : nearRange
          ? 'Year is just outside published production years — verify the model code.'
          : 'Year is outside this model’s published production run — wrong model link is possible.',
    });
  }

  if (listing.keelType && model.hullType) {
    pushCheck(checks, {
      id: 'keel',
      label: 'Keel / hull',
      status: 'note',
      listingValue: listing.keelType,
      modelValue: model.hullType,
      severity: 'info',
      message: `Listing keel: ${listing.keelType}. Model hull: ${model.hullType}.`,
    });
  }

  const mismatches = checks.filter((c) => c.status === 'mismatch');
  const missing = checks.filter((c) => c.status === 'missing');
  const notes = checks.filter((c) => c.status === 'note');
  const matches = checks.filter((c) => c.status === 'match').length;
  const comparable = checks.filter((c) => c.status === 'match' || c.status === 'mismatch').length;

  return {
    hasModel: true,
    comparable,
    matches,
    mismatches,
    missing,
    notes,
    checks,
  };
}

export function summarizeListingModelCheck(result) {
  if (!result?.hasModel) {
    return { tone: 'muted', title: 'No model linked', detail: 'Link a make/model to compare against encyclopedia specs.' };
  }
  if (result.comparable === 0) {
    return {
      tone: 'muted',
      title: 'Not enough overlap yet',
      detail: 'Import Sailboatdata on the model and refresh this YachtWorld listing to compare.',
    };
  }
  if (result.mismatches.some((m) => m.severity === 'high')) {
    return {
      tone: 'alert',
      title: 'Important difference from model',
      detail: result.mismatches.find((m) => m.severity === 'high')?.message
        || 'Something meaningful differs from the encyclopedia specs.',
    };
  }
  if (result.mismatches.length > 0) {
    return {
      tone: 'warn',
      title: `${result.mismatches.length} difference${result.mismatches.length === 1 ? '' : 's'} from model`,
      detail: 'Worth a quick look before you treat this as a stock example of the model.',
    };
  }
  return {
    tone: 'ok',
    title: 'Looks like this model',
    detail: `${result.matches} check${result.matches === 1 ? '' : 's'} line up with the encyclopedia specs.`,
  };
}
