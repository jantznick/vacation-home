/**
 * Shared boat-model encyclopedia specs for display (model + listing detail).
 */

import { tipForSpec } from './boatSpecGuides.js';

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

function row(id, label, value) {
  if (value == null || value === '') return null;
  return { id, label, value, tip: tipForSpec(id) };
}

/** Key numbers shown large at the top of a specs panel. */
export function buildBoatModelHighlights(model) {
  if (!model) return [];
  return [
    row('length', 'Length', fmtFt(model.loaFt)),
    row('beam', 'Beam', fmtFt(model.beamFt)),
    row('draft', 'Draft', fmtFt(model.draftFt)),
    row('sailArea', 'Sail area', fmtSqFt(model.sailAreaSqFt)),
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
        row('length', 'Length overall', fmtFt(model.loaFt)),
        row('waterline', 'Waterline', fmtFt(model.lwlFt)),
        row('beam', 'Beam', fmtFt(model.beamFt)),
        row('draft', 'Draft', fmtFt(model.draftFt)),
      ].filter(Boolean),
    },
    {
      title: 'Weight & sail',
      rows: [
        row('displacement', 'Displacement', fmtLb(model.displacementLb)),
        row('ballast', 'Ballast', ballast),
        row('sailArea', 'Sail area', fmtSqFt(model.sailAreaSqFt)),
      ].filter(Boolean),
    },
    {
      title: 'How she sails',
      rows: [
        row('saDispl', 'Sail / displacement', fmtRatio(model.saDispl)),
        row('dispLen', 'Displacement / length', fmtRatio(model.dispLen)),
        row('comfort', 'Comfort', fmtRatio(model.comfortRatio)),
        row('capsize', 'Capsize', fmtRatio(model.capsizeRatio)),
        row('hullSpeed', 'Hull speed', fmtKn(model.hullSpeedKn)),
      ].filter(Boolean),
    },
    {
      title: 'Design',
      rows: [
        row('hull', 'Hull', model.hullType),
        row('rig', 'Rig', model.rigType),
        row('designer', 'Designer', model.designer),
        row('builder', 'Builder', model.builder),
        row('construction', 'Construction', constructionLabel(model.construction)),
        row('built', 'Built', builtRange(model)),
        row('builtCount', 'Number built', model.builtCount != null ? fmtNum(model.builtCount, 0) : null),
      ].filter(Boolean),
    },
    {
      title: 'Engine & tanks',
      rows: [
        row('engine', 'Engine', engineLine(model)),
        row('fuel', 'Fuel', fmtGal(model.fuelGal)),
        row('water', 'Water', fmtGal(model.waterGal)),
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
