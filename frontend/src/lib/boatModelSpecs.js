/**
 * Shared boat-model encyclopedia specs for display (model + listing detail).
 */

function fmtNum(value, digits = 1) {
  if (value == null || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) ? 0 : Math.min(digits, 2),
  });
}

function fmtFt(value) {
  const n = fmtNum(value, 2);
  return n == null ? null : `${n} ft`;
}

function fmtLb(value) {
  const n = fmtNum(value, 0);
  return n == null ? null : `${n} lb`;
}

function fmtSqFt(value) {
  const n = fmtNum(value, 0);
  return n == null ? null : `${n} ft²`;
}

function fmtGal(value) {
  const n = fmtNum(value, 0);
  return n == null ? null : `${n} gal`;
}

function fmtRatio(value) {
  return fmtNum(value, 2);
}

function fmtPct(value) {
  const n = fmtNum(value, 2);
  return n == null ? null : `${n}%`;
}

function fmtKn(value) {
  const n = fmtNum(value, 2);
  return n == null ? null : `${n} kn`;
}

function builtRange(model) {
  if (model.firstBuilt && model.lastBuilt) {
    return `${model.firstBuilt}–${model.lastBuilt}`;
  }
  if (model.firstBuilt) return String(model.firstBuilt);
  if (model.lastBuilt) return String(model.lastBuilt);
  return null;
}

function engineLine(model) {
  const parts = [
    model.engineMake,
    model.engineType,
    model.engineHp != null ? `${fmtNum(model.engineHp, 0)} HP` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

function constructionLabel(value) {
  if (!value) return null;
  if (/^fg$/i.test(value)) return 'Fiberglass';
  return value;
}

function row(label, value) {
  if (value == null || value === '') return null;
  return { label, value };
}

/** Key numbers shown large at the top of a specs panel. */
export function buildBoatModelHighlights(model) {
  if (!model) return [];
  return [
    row('Length', fmtFt(model.loaFt)),
    row('Beam', fmtFt(model.beamFt)),
    row('Draft', fmtFt(model.draftFt)),
    row('Sail area', fmtSqFt(model.sailAreaSqFt)),
  ].filter(Boolean);
}

/** Grouped sections for readable scan. */
export function buildBoatModelSpecSections(model) {
  if (!model) return [];

  const ballast = model.ballastLb != null
    ? `${fmtLb(model.ballastLb)}${model.ballastRatio != null ? ` · ${fmtPct(model.ballastRatio)}` : ''}`
    : fmtPct(model.ballastRatio);

  const sections = [
    {
      title: 'Size',
      rows: [
        row('Length overall', fmtFt(model.loaFt)),
        row('Waterline', fmtFt(model.lwlFt)),
        row('Beam', fmtFt(model.beamFt)),
        row('Draft', fmtFt(model.draftFt)),
      ].filter(Boolean),
    },
    {
      title: 'Weight & sail',
      rows: [
        row('Displacement', fmtLb(model.displacementLb)),
        row('Ballast', ballast),
        row('Sail area', fmtSqFt(model.sailAreaSqFt)),
      ].filter(Boolean),
    },
    {
      title: 'How she sails',
      rows: [
        row('Sail / displacement', fmtRatio(model.saDispl)),
        row('Displacement / length', fmtRatio(model.dispLen)),
        row('Comfort', fmtRatio(model.comfortRatio)),
        row('Capsize', fmtRatio(model.capsizeRatio)),
        row('Hull speed', fmtKn(model.hullSpeedKn)),
      ].filter(Boolean),
    },
    {
      title: 'Design',
      rows: [
        row('Hull', model.hullType),
        row('Rig', model.rigType),
        row('Designer', model.designer),
        row('Builder', model.builder),
        row('Construction', constructionLabel(model.construction)),
        row('Built', builtRange(model)),
        row('Number built', model.builtCount != null ? fmtNum(model.builtCount, 0) : null),
      ].filter(Boolean),
    },
    {
      title: 'Engine & tanks',
      rows: [
        row('Engine', engineLine(model)),
        row('Fuel', fmtGal(model.fuelGal)),
        row('Water', fmtGal(model.waterGal)),
      ].filter(Boolean),
    },
  ];

  return sections.filter((section) => section.rows.length > 0);
}

/** Flat rows (legacy / simple consumers). */
export function buildBoatModelSpecRows(model) {
  return buildBoatModelSpecSections(model).flatMap((section) => section.rows);
}

export function boatModelHasSpecs(model) {
  return buildBoatModelSpecSections(model).length > 0;
}

export const BOAT_MODEL_SPEC_FIELD_KEYS = [
  'hullType',
  'rigType',
  'loaFt',
  'lwlFt',
  'beamFt',
  'draftFt',
  'displacementLb',
  'ballastLb',
  'ballastRatio',
  'sailAreaSqFt',
  'construction',
  'designer',
  'builder',
  'firstBuilt',
  'lastBuilt',
  'builtCount',
  'saDispl',
  'dispLen',
  'comfortRatio',
  'capsizeRatio',
  'hullSpeedKn',
  'engineMake',
  'engineType',
  'engineHp',
  'fuelGal',
  'waterGal',
  'sailboatDataUrl',
  'sailboatDataFetchedAt',
];
