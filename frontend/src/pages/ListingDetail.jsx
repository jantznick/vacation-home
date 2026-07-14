import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import Comments from '../components/Comments';
import PriceHistory from '../components/PriceHistory';
import PhotoGallery from '../components/PhotoGallery';
import PriceEstimate from '../components/PriceEstimate';
import LocationDriveTime from '../components/LocationDriveTime';
import RouteMap from '../components/RouteMap';
import MapPanel, { buildListingMarker } from '../components/MapPanel';
import InlineEditable, { FeaturePill } from '../components/InlineEditable';
import EditableLineList from '../components/EditableLineList';
import usePrimaryPoi from '../hooks/usePrimaryPoi';
import useSearchAccess from '../hooks/useSearchAccess';
import {
  formatCurrency,
  formatDriveTime,
  formatNumber,
  statusLabel,
  LISTING_STATUSES,
} from '../lib/format';
import ListingStaleBadge from '../components/ListingStaleBadge';
import { formatFetchedAt } from '../lib/listingFreshness';
import { showError, showSuccess } from '../lib/toast';
import { BOAT_PROPULSIONS, isBoatSearch, parseLineList } from '../lib/assetTypes';
import { boatDisplayName, boatMakeModelLabel } from '../lib/boatTitle';
import BoatModelSpecs, { boatModelHasSpecs } from '../components/BoatModelSpecs';
import SistershipComps from '../components/SistershipComps';
import CriteriaFitBadge from '../components/CriteriaFitBadge';
import ShortlistStar from '../components/ShortlistStar';
import { normalizeCriteriaList } from '../lib/searchCriteria';

const STATUS_PILL = {
  active: 'bg-pine-100 text-pine-800',
  pending: 'bg-amber-100 text-amber-900',
  sold: 'bg-red-100 text-red-800',
  off_market: 'bg-stone-100 text-stone-700',
  interested: 'bg-emerald-100 text-emerald-900',
  passed: 'bg-stone-100 text-stone-600',
};

function propulsionLabel(value) {
  return BOAT_PROPULSIONS.find((option) => option.value === value)?.label || value;
}

function FreetextCriteriaChecklist({ listing, search, canEdit, onUpdate }) {
  const assetType = search?.assetType || 'home';
  const allMust = normalizeCriteriaList(search?.mustHaves, assetType);
  const allNice = normalizeCriteriaList(search?.niceToHaves, assetType);
  const mustFreetext = allMust.filter((c) => c.field === '_freetext');
  const niceFreetext = allNice.filter((c) => c.field === '_freetext');

  if (mustFreetext.length === 0 && niceFreetext.length === 0) return null;

  const overrides = listing.criteriaOverrides && typeof listing.criteriaOverrides === 'object'
    ? listing.criteriaOverrides
    : {};

  const toggle = (criterionId) => {
    const current = overrides[criterionId];
    const next = current === true ? false : current === false ? null : true;
    const updated = { ...overrides };
    if (next == null) {
      delete updated[criterionId];
    } else {
      updated[criterionId] = next;
    }
    onUpdate({ criteriaOverrides: Object.keys(updated).length > 0 ? updated : null });
  };

  const renderItem = (criterion) => {
    const val = overrides[criterion.id];
    const icon = val === true ? '✓' : val === false ? '✗' : '○';
    const color = val === true ? 'text-emerald-600' : val === false ? 'text-rose-500' : 'text-pine-300';
    return (
      <button
        key={criterion.id}
        type="button"
        disabled={!canEdit}
        onClick={() => toggle(criterion.id)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-pine-50 disabled:opacity-60"
      >
        <span className={`shrink-0 text-base font-medium ${color}`}>{icon}</span>
        <span className="text-pine-800">{criterion.label}</span>
        {canEdit && <span className="ml-auto text-[10px] text-pine-400">tap to toggle</span>}
      </button>
    );
  };

  return (
    <section className="mt-4 rounded-xl border border-pine-200 bg-white p-4 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-pine-500">Manual checks</h3>
      {mustFreetext.length > 0 && (
        <div className="mb-2">
          <p className="mb-1 text-xs font-medium text-pine-600">Must-haves</p>
          <div className="space-y-0.5">{mustFreetext.map(renderItem)}</div>
        </div>
      )}
      {niceFreetext.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-pine-600">Nice-to-haves</p>
          <div className="space-y-0.5">{niceFreetext.map(renderItem)}</div>
        </div>
      )}
      {canEdit && <p className="mt-2 text-[10px] text-pine-400">Tap each item to cycle: unchecked → yes → no</p>}
    </section>
  );
}

function parseOptionalNumber(raw) {
  if (raw === '' || raw == null) return null;
  const n = Number(raw);
  if (Number.isNaN(n)) throw new Error('Invalid number');
  return n;
}

function parseOptionalInt(raw) {
  const n = parseOptionalNumber(raw);
  return n == null ? null : Math.trunc(n);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

function SourcePill({ label, href }) {
  if (!label) return null;
  const className =
    'inline-flex shrink-0 items-center rounded-full border border-pine-200 bg-pine-50 px-2 py-0.5 text-[11px] font-medium text-pine-600';
  if (href) {
    return (
      <Link to={href} className={`${className} hover:border-pine-400 hover:text-pine-900`}>
        {label}
      </Link>
    );
  }
  return <span className={className}>{label}</span>;
}

function TaggedLine({ tone = 'pro', text, sourceLabel, sourceHref }) {
  return (
    <li className="flex items-start gap-2 text-sm text-pine-800">
      {tone === 'pro' ? <CheckIcon /> : <XIcon />}
      <span className="min-w-0 flex-1 leading-snug">{text}</span>
      <SourcePill label={sourceLabel} href={sourceHref} />
    </li>
  );
}

function TaggedNote({ text, sourceLabel, sourceHref }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-pine-50/80 px-3 py-2 text-sm text-pine-700">
      <p className="min-w-0 flex-1 whitespace-pre-wrap leading-relaxed">{text}</p>
      <SourcePill label={sourceLabel} href={sourceHref} />
    </div>
  );
}

function UnifiedEvaluation({ listing, boatMode, canEdit, searchId, onBoatChange }) {
  const modelHref = listing.boatMakeId && listing.boatModelId
    ? searchPath(searchId, `/makes/${listing.boatMakeId}/models/${listing.boatModelId}`)
    : null;
  const makeHref = listing.boatMakeId
    ? searchPath(searchId, `/makes/${listing.boatMakeId}`)
    : null;
  const modelLabel = listing.boatModel?.name || null;
  const makeLabel = listing.boatMake?.name || null;

  const boatPros = parseLineList(listing.pros);
  const boatCons = parseLineList(listing.cons);
  const modelPros = parseLineList(listing.boatModel?.pros);
  const modelCons = parseLineList(listing.boatModel?.cons);
  const makePros = parseLineList(listing.boatMake?.pros);
  const makeCons = parseLineList(listing.boatMake?.cons);

  const pros = [
    ...boatPros.map((text) => ({ text, sourceLabel: null, sourceHref: null })),
    ...modelPros.map((text) => ({ text, sourceLabel: modelLabel, sourceHref: modelHref })),
    ...makePros.map((text) => ({ text, sourceLabel: makeLabel, sourceHref: makeHref })),
  ];
  const cons = [
    ...boatCons.map((text) => ({ text, sourceLabel: null, sourceHref: null })),
    ...modelCons.map((text) => ({ text, sourceLabel: modelLabel, sourceHref: modelHref })),
    ...makeCons.map((text) => ({ text, sourceLabel: makeLabel, sourceHref: makeHref })),
  ];

  const descriptions = [];
  const modelDescription = listing.boatModel?.description;
  if (
    modelDescription
    && !/LOA\s+/i.test(modelDescription)
    && !(modelDescription.includes(' · ') && /draft|beam|disp/i.test(modelDescription))
  ) {
    descriptions.push({
      text: modelDescription,
      sourceLabel: modelLabel,
      sourceHref: modelHref,
    });
  }
  if (listing.boatMake?.description) {
    descriptions.push({
      text: listing.boatMake.description,
      sourceLabel: makeLabel,
      sourceHref: makeHref,
    });
  }

  const notes = [];
  if (listing.notes) {
    notes.push({ text: listing.notes, sourceLabel: null, sourceHref: null });
  }
  if (listing.boatModel?.notes) {
    notes.push({
      text: listing.boatModel.notes,
      sourceLabel: modelLabel,
      sourceHref: modelHref,
    });
  }
  if (listing.boatMake?.notes) {
    notes.push({
      text: listing.boatMake.notes,
      sourceLabel: makeLabel,
      sourceHref: makeHref,
    });
  }

  const empty = pros.length === 0 && cons.length === 0
    && descriptions.length === 0 && notes.length === 0
    && !canEdit;

  return (
    <div className="space-y-6 p-5">
      {descriptions.length > 0 && (
        <div className="space-y-2">
          {descriptions.map((item) => (
            <TaggedNote
              key={`d-${item.sourceLabel}-${item.text.slice(0, 24)}`}
              text={item.text}
              sourceLabel={item.sourceLabel}
              sourceHref={item.sourceHref}
            />
          ))}
        </div>
      )}

      <div>
        {canEdit ? (
          <EditableLineList
            label="Pros"
            value={listing.pros || ''}
            onChange={(next) => onBoatChange({ pros: next })}
            placeholder="What you like about this boat…"
          />
        ) : (
          pros.length > 0 && (
            <>
              <p className="mb-2 text-sm font-medium text-pine-800">Pros</p>
              <ul className="space-y-2">
                {pros.map((item) => (
                  <TaggedLine
                    key={`p-${item.sourceLabel}-${item.text}`}
                    tone="pro"
                    text={item.text}
                    sourceLabel={item.sourceLabel}
                    sourceHref={item.sourceHref}
                  />
                ))}
              </ul>
            </>
          )
        )}
        {canEdit && (modelPros.length > 0 || makePros.length > 0) && (
          <ul className="mt-3 space-y-2 border-t border-pine-100 pt-3">
            {[
              ...modelPros.map((text) => ({ text, sourceLabel: modelLabel, sourceHref: modelHref })),
              ...makePros.map((text) => ({ text, sourceLabel: makeLabel, sourceHref: makeHref })),
            ].map((item) => (
              <TaggedLine
                key={`xp-${item.sourceLabel}-${item.text}`}
                tone="pro"
                text={item.text}
                sourceLabel={item.sourceLabel}
                sourceHref={item.sourceHref}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        {canEdit ? (
          <EditableLineList
            label="Cons"
            value={listing.cons || ''}
            onChange={(next) => onBoatChange({ cons: next })}
            placeholder="Tradeoffs for this boat…"
          />
        ) : (
          cons.length > 0 && (
            <>
              <p className="mb-2 text-sm font-medium text-pine-800">Cons</p>
              <ul className="space-y-2">
                {cons.map((item) => (
                  <TaggedLine
                    key={`c-${item.sourceLabel}-${item.text}`}
                    tone="con"
                    text={item.text}
                    sourceLabel={item.sourceLabel}
                    sourceHref={item.sourceHref}
                  />
                ))}
              </ul>
            </>
          )
        )}
        {canEdit && (modelCons.length > 0 || makeCons.length > 0) && (
          <ul className="mt-3 space-y-2 border-t border-pine-100 pt-3">
            {[
              ...modelCons.map((text) => ({ text, sourceLabel: modelLabel, sourceHref: modelHref })),
              ...makeCons.map((text) => ({ text, sourceLabel: makeLabel, sourceHref: makeHref })),
            ].map((item) => (
              <TaggedLine
                key={`xc-${item.sourceLabel}-${item.text}`}
                tone="con"
                text={item.text}
                sourceLabel={item.sourceLabel}
                sourceHref={item.sourceHref}
              />
            ))}
          </ul>
        )}
      </div>

      <div>
        {canEdit ? (
          <div>
            <p className="mb-2 text-sm font-medium text-pine-800">Notes</p>
            <InlineEditable
              value={listing.notes}
              canEdit
              multiline
              placeholder="Extra notes on this boat…"
              ariaLabel="Notes"
              displayClassName="block w-full whitespace-pre-wrap text-sm text-pine-700"
              emptyClassName="block w-full text-sm text-pine-400"
              className="w-full"
              onSave={(next) => onBoatChange({ notes: next })}
            />
          </div>
        ) : null}
        {(canEdit ? notes.filter((n) => n.sourceLabel) : notes).length > 0 && (
          <div className={`space-y-2 ${canEdit ? 'mt-3' : ''}`}>
            {!canEdit && <p className="mb-2 text-sm font-medium text-pine-800">Notes</p>}
            {(canEdit ? notes.filter((n) => n.sourceLabel) : notes).map((item) => (
              <TaggedNote
                key={`n-${item.sourceLabel}-${item.text.slice(0, 24)}`}
                text={item.text}
                sourceLabel={item.sourceLabel}
                sourceHref={item.sourceHref}
              />
            ))}
          </div>
        )}
      </div>

      {empty && (
        <p className="text-sm text-pine-500">No notes yet.</p>
      )}

      {boatMode && (modelHref || makeHref) && (
        <p className="flex flex-wrap gap-3 text-xs text-pine-500">
          {modelHref && (
            <Link to={modelHref} className="hover:text-pine-800">Edit model notes →</Link>
          )}
          {makeHref && (
            <Link to={makeHref} className="hover:text-pine-800">Edit make notes →</Link>
          )}
        </p>
      )}
    </div>
  );
}

function InterestDots({ value, canEdit, onSave }) {
  const level = value || 0;
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Interest level">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= level;
        const className = `h-8 w-8 rounded-full text-lg transition-transform ${
          active ? 'text-amber-500' : 'text-pine-200'
        } ${canEdit ? 'hover:scale-110 hover:text-amber-400' : ''}`;

        if (!canEdit) {
          return (
            <span key={n} className={className} aria-hidden="true">
              ★
            </span>
          );
        }

        return (
          <button
            key={n}
            type="button"
            className={className}
            aria-label={`Interest ${n} of 5`}
            onClick={() => onSave(value === n ? null : n)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function CollapsibleModelSpecs({ listing, searchId }) {
  const [expanded, setExpanded] = useState(false);
  const titleTo = listing.boatMakeId && listing.boatModelId
    ? searchPath(searchId, `/makes/${listing.boatMakeId}/models/${listing.boatModelId}`)
    : null;

  return (
    <section className="rounded-2xl border border-pine-200 bg-white p-5 shadow-sm">
      <BoatModelSpecs
        model={listing.boatModel}
        title={listing.boatModel?.name || 'Model specs'}
        titleTo={titleTo}
        modelCheck={listing.modelCheck}
        compact
        showHighlights
        showSections={expanded}
      />
      <button
        type="button"
        className="mt-3 text-sm text-pine-500 hover:text-pine-800"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Show less ▴' : 'Show all specs ▾'}
      </button>
    </section>
  );
}

function AddCostModal({ boatMode, listing, onSave, onClose, api, initialTab = 'maintenance' }) {
  const editingCustomIndex = initialTab.startsWith('custom-') ? Number(initialTab.split('-')[1]) : null;
  const editingCustom = editingCustomIndex != null && Array.isArray(listing.additionalCosts) ? listing.additionalCosts[editingCustomIndex] : null;
  const [mode, setMode] = useState(editingCustom ? 'custom' : initialTab);
  const [marinas, setMarinas] = useState([]);
  const [marinasLoaded, setMarinasLoaded] = useState(false);
  const [form, setForm] = useState({
    downPaymentPct: listing.downPaymentPct ?? '',
    interestRate: listing.interestRate ?? '',
    loanTermYears: listing.loanTermYears ?? '',
    marinaId: listing.marinaId || '',
    slipIndex: listing.preferredSlipIndex ?? '',
    annualInsurance: listing.annualInsurance ?? '',
    annualTax: listing.annualTax ?? '',
    dpMode: 'pct',
    downPaymentDollars: listing.listPrice && listing.downPaymentPct != null
      ? String(Math.round(listing.listPrice * listing.downPaymentPct / 100))
      : '',
    maintenanceMode: 'flat',
    annualMaintenance: listing.annualMaintenance ?? '',
    maintenancePerFt: '',
    customName: editingCustom?.name || '',
    customAmount: editingCustom?.annualCost ?? '',
  });

  useEffect(() => {
    if (!boatMode || marinasLoaded) return;
    const load = async () => {
      try {
        const data = await api.marinas.list();
        setMarinas(data.marinas);
      } catch { /* ignore */ }
      setMarinasLoaded(true);
    };
    load();
  }, [api, boatMode, marinasLoaded]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    const updates = {};

    if (mode === 'loan') {
      if (form.dpMode === 'dollars' && form.downPaymentDollars && listing.listPrice) {
        updates.downPaymentPct = Math.round((Number(form.downPaymentDollars) / listing.listPrice) * 10000) / 100;
      } else {
        updates.downPaymentPct = form.downPaymentPct !== '' ? Number(form.downPaymentPct) : null;
      }
      updates.interestRate = form.interestRate !== '' ? Number(form.interestRate) : null;
      updates.loanTermYears = form.loanTermYears ? Number(form.loanTermYears) : null;
    } else if (mode === 'maintenance') {
      if (form.maintenanceMode === 'per_ft' && form.maintenancePerFt && listing.lengthFt) {
        updates.annualMaintenance = Math.round(Number(form.maintenancePerFt) * listing.lengthFt);
      } else if (form.annualMaintenance) {
        updates.annualMaintenance = Number(form.annualMaintenance);
      }
    } else if (mode === 'marina') {
      updates.marinaId = form.marinaId || null;
      updates.preferredSlipIndex = form.slipIndex !== '' ? Number(form.slipIndex) : null;
    } else if (mode === 'insurance') {
      updates.annualInsurance = form.annualInsurance ? Number(form.annualInsurance) : null;
    } else if (mode === 'tax') {
      updates.annualTax = form.annualTax ? Number(form.annualTax) : null;
    } else if (mode === 'custom') {
      if (form.customName.trim() && form.customAmount) {
        const current = Array.isArray(listing.additionalCosts) ? [...listing.additionalCosts] : [];
        const item = { name: form.customName.trim(), annualCost: Number(form.customAmount) };
        if (editingCustomIndex != null && editingCustomIndex < current.length) {
          current[editingCustomIndex] = item;
        } else {
          current.push(item);
        }
        updates.additionalCosts = current;
      }
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
    }
    onClose();
  };

  const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-pine-900">Carrying cost</h3>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {[
            { id: 'loan', label: 'Loan' },
            { id: 'maintenance', label: 'Maintenance' },
            ...(boatMode ? [{ id: 'marina', label: 'Marina + slip' }] : []),
            { id: 'insurance', label: 'Insurance' },
            { id: 'tax', label: 'Tax' },
            { id: 'custom', label: 'Other' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                mode === tab.id
                  ? 'bg-pine-800 text-white'
                  : 'bg-pine-100 text-pine-700 hover:bg-pine-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {mode === 'loan' && (() => {
            const dpPct = form.dpMode === 'dollars' && form.downPaymentDollars && listing.listPrice
              ? Number(form.downPaymentDollars) / listing.listPrice * 100
              : form.downPaymentPct !== '' ? Number(form.downPaymentPct) : null;
            const dpDollars = form.dpMode === 'pct' && form.downPaymentPct !== '' && listing.listPrice
              ? Math.round(listing.listPrice * Number(form.downPaymentPct) / 100)
              : form.downPaymentDollars !== '' ? Number(form.downPaymentDollars) : null;

            return (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">Down payment</label>
                  <div className="flex gap-2">
                    <label className="flex items-center gap-1.5 text-sm text-pine-700">
                      <input type="radio" name="dpMode" value="pct" checked={form.dpMode === 'pct'} onChange={handleChange} />
                      %
                    </label>
                    <label className="flex items-center gap-1.5 text-sm text-pine-700">
                      <input type="radio" name="dpMode" value="dollars" checked={form.dpMode === 'dollars'} onChange={handleChange} />
                      $
                    </label>
                  </div>
                  {form.dpMode === 'pct' ? (
                    <input name="downPaymentPct" type="number" step="0.1" min="0" max="100" value={form.downPaymentPct} onChange={handleChange} className={`mt-1.5 ${inputClass}`} placeholder="e.g. 20" autoFocus />
                  ) : (
                    <input name="downPaymentDollars" type="number" min="0" value={form.downPaymentDollars} onChange={handleChange} className={`mt-1.5 ${inputClass}`} placeholder="e.g. 15000" autoFocus />
                  )}
                  {form.dpMode === 'pct' && dpDollars != null && listing.listPrice && (
                    <p className="mt-1 text-xs text-pine-500">= {formatCurrency(dpDollars)}</p>
                  )}
                  {form.dpMode === 'dollars' && dpPct != null && (
                    <p className="mt-1 text-xs text-pine-500">= {dpPct.toFixed(1)}%</p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">Interest rate (%)</label>
                  <input name="interestRate" type="number" step="0.01" min="0" value={form.interestRate} onChange={handleChange} className={inputClass} placeholder="e.g. 7.5" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">Loan term (years)</label>
                  <input name="loanTermYears" type="number" min="1" max="30" value={form.loanTermYears} onChange={handleChange} className={inputClass} placeholder="e.g. 15" />
                </div>
                {listing.listPrice && dpDollars != null && form.interestRate && form.loanTermYears && (() => {
                  const loan = listing.listPrice - dpDollars;
                  if (loan <= 0) return null;
                  const r = Number(form.interestRate) / 100 / 12;
                  const n = Number(form.loanTermYears) * 12;
                  const mo = r > 0 ? Math.round(loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : Math.round(loan / n);
                  return (
                    <p className="text-sm text-pine-600">
                      {formatCurrency(dpDollars)} down → finance {formatCurrency(loan)} → {formatCurrency(mo)}/mo
                    </p>
                  );
                })()}
              </>
            );
          })()}

          {mode === 'maintenance' && (
            <>
              <div className="flex gap-3">
                <label className="flex items-center gap-1.5 text-sm text-pine-700">
                  <input type="radio" name="maintenanceMode" value="flat" checked={form.maintenanceMode === 'flat'} onChange={handleChange} />
                  Flat $/yr
                </label>
                {boatMode && listing.lengthFt && (
                  <label className="flex items-center gap-1.5 text-sm text-pine-700">
                    <input type="radio" name="maintenanceMode" value="per_ft" checked={form.maintenanceMode === 'per_ft'} onChange={handleChange} />
                    $/ft/yr
                  </label>
                )}
              </div>
              {form.maintenanceMode === 'flat' ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">Annual maintenance ($)</label>
                  <input name="annualMaintenance" type="number" value={form.annualMaintenance} onChange={handleChange} className={inputClass} placeholder="e.g. 3000" autoFocus />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">$/ft/year</label>
                  <input name="maintenancePerFt" type="number" step="1" value={form.maintenancePerFt} onChange={handleChange} className={inputClass} placeholder="e.g. 100" autoFocus />
                  {form.maintenancePerFt && listing.lengthFt && (
                    <p className="mt-1 text-sm text-pine-600">
                      = {formatCurrency(Math.round(Number(form.maintenancePerFt) * listing.lengthFt))}/yr for {listing.lengthFt} ft boat
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {mode === 'marina' && (() => {
            const selectedMarina = marinas.find((m) => m.id === form.marinaId);
            const slips = Array.isArray(selectedMarina?.slipOptions) ? selectedMarina.slipOptions : [];
            return (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium text-pine-800">Marina</label>
                  <select
                    name="marinaId"
                    value={form.marinaId}
                    onChange={(e) => setForm((f) => ({ ...f, marinaId: e.target.value, slipIndex: '' }))}
                    className={inputClass}
                  >
                    <option value="">No marina</option>
                    {marinas.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                  </select>
                </div>
                {slips.length > 0 && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-pine-800">Slip option</label>
                    {slips.map((opt, i) => {
                      const rate = opt.feeType === 'per_ft'
                        ? `${formatCurrency(Number(opt.feeAmount))}/ft`
                        : formatCurrency(Number(opt.feeAmount));
                      const period = { monthly: '/mo', seasonal: '/season', annual: '/yr' }[opt.feePeriod] || '';
                      let annual = null;
                      if (opt.feeAmount != null) {
                        const base = opt.feeType === 'per_ft' ? Number(opt.feeAmount) * (listing.lengthFt || 36) : Number(opt.feeAmount);
                        annual = (opt.feePeriod === 'annual' || opt.feePeriod === 'seasonal') ? Math.round(base) : Math.round(base * 12);
                      }
                      return (
                        <label key={i} className="mt-1.5 flex items-start gap-2.5 rounded-lg border border-pine-200 p-3 text-sm hover:bg-pine-50 cursor-pointer">
                          <input
                            type="radio"
                            name="slipIndex"
                            value={i}
                            checked={String(form.slipIndex) === String(i)}
                            onChange={handleChange}
                            className="mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-pine-900">{opt.name}</p>
                            <p className="mt-0.5 text-pine-600">
                              {rate}{period}
                              {annual != null && (
                                <span className="text-pine-500">
                                  {' '}· ≈ {formatCurrency(annual)}/yr{opt.feeType === 'per_ft' && listing.lengthFt ? ` for ${listing.lengthFt}'` : ''}
                                </span>
                              )}
                            </p>
                            {opt.notes && <p className="mt-0.5 text-xs text-pine-400">{opt.notes}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {slips.length === 0 && form.marinaId && (
                  <p className="text-xs text-pine-500">This marina has no slip options configured. Winter storage will still be applied.</p>
                )}
              </>
            );
          })()}

          {mode === 'insurance' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Annual insurance ($)</label>
              <input name="annualInsurance" type="number" value={form.annualInsurance} onChange={handleChange} className={inputClass} placeholder="e.g. 1200" autoFocus />
            </div>
          )}

          {mode === 'tax' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Annual tax ($)</label>
              <input name="annualTax" type="number" value={form.annualTax} onChange={handleChange} className={inputClass} placeholder="e.g. 500" autoFocus />
            </div>
          )}

          {mode === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-pine-800">Name</label>
                <input name="customName" value={form.customName} onChange={handleChange} className={inputClass} placeholder="e.g. Bottom paint, Haul-out" autoFocus />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-pine-800">Annual cost ($)</label>
                <input name="customAmount" type="number" value={form.customAmount} onChange={handleChange} className={inputClass} placeholder="e.g. 2000" />
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-md border border-pine-200 px-4 py-2.5 text-sm text-pine-700 hover:bg-pine-50">Cancel</button>
          <button type="button" onClick={handleSave} className="rounded-md bg-pine-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-pine-900">Save</button>
        </div>
      </div>
    </div>
  );
}

function CarryingCostCard({ listing, boatMode, canEdit, searchId, onUpdate, api }) {
  const cc = listing.carryingCost;
  if (!cc) return null;

  const [modalTab, setModalTab] = useState(null);

  const fd = cc.fromDefaults || {};
  const hasLoan = cc.loanPaymentMonthly != null;
  const hasAnyCost = cc.totalAnnual != null;
  const hasFinancingInputs = listing.downPaymentPct != null || listing.interestRate != null;

  if (!hasAnyCost && !canEdit) return null;

  const rows = [];

  if (hasLoan) {
    rows.push({
      key: 'loan',
      label: 'Loan payment',
      monthly: cc.loanPaymentMonthly,
      annual: cc.loanPaymentAnnual,
      note: `${cc.downPaymentPct ?? '?'}% down · ${cc.interestRate ?? '?'}% · ${cc.loanTermYears ?? '?'}yr`,
      editTab: 'loan',
      isDefault: fd.loan,
      onRemove: () => onUpdate({ downPaymentPct: null, interestRate: null, loanTermYears: null }),
    });
  }

  if (boatMode && cc.slipAnnual != null) {
    rows.push({ key: 'slip', label: cc.slipOptionName ? `Slip (${cc.slipOptionName})` : 'Slip fees', monthly: Math.round(cc.slipAnnual / 12), annual: cc.slipAnnual, editTab: 'marina',
      onRemove: () => onUpdate({ marinaId: null, preferredSlipIndex: null }),
    });
  }

  if (boatMode && cc.winterStorage != null) {
    rows.push({ key: 'winter', label: 'Winter storage', monthly: null, annual: cc.winterStorage, editTab: 'marina',
      isDefault: fd.winterStorage,
      onRemove: () => onUpdate({ marinaId: null, preferredSlipIndex: null }),
    });
  }

  if (cc.insurance != null) {
    rows.push({ key: 'insurance', label: 'Insurance', monthly: Math.round(cc.insurance / 12), annual: cc.insurance, editTab: 'insurance',
      isDefault: fd.insurance,
      onRemove: () => onUpdate({ annualInsurance: null }),
    });
  }
  if (cc.tax != null) {
    rows.push({ key: 'tax', label: 'Tax', monthly: Math.round(cc.tax / 12), annual: cc.tax, editTab: 'tax',
      isDefault: fd.tax,
      onRemove: () => onUpdate({ annualTax: null }),
    });
  }
  if (cc.maintenance != null) {
    rows.push({ key: 'maintenance', label: 'Maintenance', monthly: Math.round(cc.maintenance / 12), annual: cc.maintenance, editTab: 'maintenance',
      isDefault: fd.maintenance,
      onRemove: () => onUpdate({ annualMaintenance: null }),
    });
  }

  if (cc.customCosts?.length > 0) {
    cc.customCosts.forEach((c, i) => {
      rows.push({
        key: `custom-${i}`,
        label: c.name,
        monthly: Math.round(Number(c.annualCost) / 12),
        annual: Number(c.annualCost),
        editTab: `custom-${i}`,
        onRemove: () => {
          const current = Array.isArray(listing.additionalCosts) ? [...listing.additionalCosts] : [];
          current.splice(i, 1);
          onUpdate({ additionalCosts: current.length > 0 ? current : null });
        },
      });
    });
  }

  return (
    <section className="rounded-2xl border border-pine-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-pine-900">Carrying costs</h2>
          {boatMode && listing.marina && (
            <Link to={searchPath(searchId, `/marinas/${listing.marina.id}`)} className="text-sm text-pine-500 hover:text-pine-900">
              · {listing.marina.name}
            </Link>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setModalTab('maintenance')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-pine-200 text-pine-600 hover:bg-pine-50 hover:text-pine-900"
            title="Add cost"
            aria-label="Add cost"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
          </button>
        )}
      </div>

      {hasLoan && cc.downPaymentAmount != null && (
        <p className="mt-1 flex flex-wrap gap-x-1 text-sm text-pine-500">
          <span>{formatCurrency(listing.listPrice)}</span>
          <span>→ {formatCurrency(cc.downPaymentAmount)} down</span>
          <span>→ finance {formatCurrency(cc.loanAmount)}</span>
        </p>
      )}

      {rows.length > 0 ? (
        <div className="mt-3 space-y-0 divide-y divide-pine-100">
          {rows.map((row) => {
            const canClick = canEdit && row.editTab;
            const remove = row.onRemove || (row.removable != null ? () => handleRemoveCustomCost(row.removable) : null);
            return (
              <div
                key={row.key}
                className={`flex items-center gap-2 py-2.5 ${canClick ? 'cursor-pointer hover:bg-pine-50/50 -mx-2 px-2 rounded-lg' : ''}`}
                onClick={canClick ? () => setModalTab(row.editTab) : undefined}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-pine-700">{row.label}</span>
                  {row.isDefault && <span className="ml-1.5 rounded bg-pine-100 px-1 py-0.5 text-[10px] text-pine-500">default</span>}
                  {row.note && <span className="ml-1.5 text-xs text-pine-400 sm:inline block">{row.note}</span>}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-sm font-medium tabular-nums text-pine-900">
                    {row.monthly != null ? formatCurrency(row.monthly) : '—'}<span className="text-pine-400">/mo</span>
                  </span>
                  <span className="ml-3 hidden text-sm tabular-nums text-pine-600 sm:inline">
                    {row.annual != null ? formatCurrency(row.annual) : '—'}<span className="text-pine-400">/yr</span>
                  </span>
                </div>
                {canEdit && remove && (
                  <button
                    type="button"
                    className="shrink-0 cursor-pointer p-2 text-pine-300 hover:text-red-500"
                    title="Remove"
                    aria-label={`Remove ${row.label}`}
                    onClick={(e) => { e.stopPropagation(); remove(); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.519.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <div className="flex items-center gap-2 border-t-2 border-pine-200 pt-2.5">
            <span className="min-w-0 flex-1 text-sm font-semibold text-pine-900">Total</span>
            <div className="shrink-0 text-right">
              <span className="text-sm font-semibold tabular-nums text-pine-900">
                {cc.totalMonthly != null ? formatCurrency(cc.totalMonthly) : '—'}<span className="font-normal text-pine-400">/mo</span>
              </span>
              <span className="ml-3 hidden text-sm font-semibold tabular-nums text-pine-900 sm:inline">
                {cc.totalAnnual != null ? formatCurrency(cc.totalAnnual) : '—'}<span className="font-normal text-pine-400">/yr</span>
              </span>
            </div>
            {canEdit && <span className="w-6 shrink-0" />}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-pine-500">
          {canEdit ? 'Hit + to add maintenance, marina, insurance, or other costs.' : 'No cost data entered yet.'}
        </p>
      )}

      {canEdit && !hasFinancingInputs && listing.listPrice && (
        <div className="mt-3">
          <button
            type="button"
            className="text-xs text-pine-500 hover:text-pine-800"
            onClick={() => onUpdate(boatMode ? { downPaymentPct: 20, interestRate: 7.5, loanTermYears: 15 } : { downPaymentPct: 20, interestRate: 7, loanTermYears: 30 })}
          >
            + Add typical {boatMode ? 'boat loan' : 'mortgage'}
          </button>
        </div>
      )}

      {modalTab && (
        <AddCostModal boatMode={boatMode} listing={listing} api={api} initialTab={modalTab} onSave={onUpdate} onClose={() => setModalTab(null)} />
      )}
    </section>
  );
}

export default function ListingDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const { search, assetType } = useCurrentSearch();
  const [listing, setListing] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [commutes, setCommutes] = useState([]);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [calculatingDriveTime, setCalculatingDriveTime] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingPill, setEditingPill] = useState(null);
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const originLabel = primaryPoiLabel || 'your primary location';

  const loadListing = async () => {
    const [listingData, snapshotData, estimateResult, commutesData] = await Promise.all([
      api.listings.get(id),
      api.listings.snapshots(id),
      api.listings.priceEstimate(id).catch(() => null),
      api.listings.commutes(id).catch(() => ({ commutes: [] })),
    ]);

    setListing(listingData.listing);
    setSnapshots(snapshotData.snapshots);
    setPriceEstimate(estimateResult);
    setCommutes(commutesData.commutes || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        await loadListing();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, api]);

  const applyListingUpdate = async (partial, { refreshEstimate = false } = {}) => {
    try {
      const data = await api.listings.update(id, partial);
      setListing((current) => ({
        ...current,
        ...data.listing,
        region: data.listing.region ?? current?.region,
        lake: data.listing.lake ?? current?.lake,
        boatMake: data.listing.boatMake ?? current?.boatMake,
        boatModel: data.listing.boatModel ?? current?.boatModel,
        marina: data.listing.marina !== undefined ? data.listing.marina : current?.marina,
      }));
      if (refreshEstimate || partial.listPrice !== undefined || partial.lengthFt !== undefined
        || partial.yearBuilt !== undefined || partial.propulsion !== undefined
        || partial.bedrooms !== undefined || partial.acres !== undefined
        || partial.sqftLiving !== undefined || partial.isVacantLot !== undefined) {
        const estimateResult = await api.listings.priceEstimate(id).catch(() => null);
        setPriceEstimate(estimateResult);
      }
      return data.listing;
    } catch (err) {
      showError(err.message);
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await api.listings.remove(id);
      navigate(searchPath(searchId, '/listings'));
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const listingAddressLine = [listing?.address, listing?.city, listing?.state, listing?.zip]
    .filter(Boolean)
    .join(', ');

  const handleGeocodeListing = async () => {
    setGeocoding(true);
    setLocationError('');

    try {
      const data = await api.listings.geocode(id);
      setListing((current) => ({
        ...current,
        ...data.listing,
        region: data.listing.region ?? current?.region,
        lake: data.listing.lake ?? current?.lake,
      }));
      if (data.commutes?.length) {
        setCommutes(data.commutes);
      }
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setGeocoding(false);
    }
  };

  const handleListingDriveTime = async () => {
    setCalculatingDriveTime(true);
    setLocationError('');

    try {
      const data = await api.listings.driveTime(id);
      setListing((current) => ({
        ...current,
        ...data.listing,
        region: data.listing.region ?? current?.region,
        lake: data.listing.lake ?? current?.lake,
      }));
      setCommutes(data.commutes || []);
    } catch (err) {
      setLocationError(err.message);
    } finally {
      setCalculatingDriveTime(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError('');
    setMenuOpen(false);

    try {
      const data = await api.listings.refresh(id);
      setListing((current) => ({
        ...current,
        ...data.listing,
        region: data.listing.region ?? current?.region,
        lake: data.listing.lake ?? current?.lake,
        boatMake: data.listing.boatMake ?? current?.boatMake,
        boatModel: data.listing.boatModel ?? current?.boatModel,
      }));

      if (data.priceChanged) {
        const snapshotData = await api.listings.snapshots(id);
        setSnapshots(snapshotData.snapshots);
        showSuccess('Price updated.');
      } else {
        showSuccess('Refreshed.');
      }

      const estimateResult = await api.listings.priceEstimate(id).catch(() => null);
      setPriceEstimate(estimateResult);
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <p className="text-pine-600">Loading listing...</p>;
  }

  if (!listing) {
    return <p className="text-red-700">{error || 'Listing not found'}</p>;
  }

  const boatMode = isBoatSearch(assetType)
    || listing.lengthFt != null
    || listing.make
    || listing.propulsion;

  const makeModel = boatMakeModelLabel(listing);
  const title = boatMode
    ? boatDisplayName(listing)
    : (listing.address || 'Untitled listing');
  const placeLine = [listing.city, listing.state].filter(Boolean).join(', ');

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to={searchPath(searchId, '/listings')}
          className="text-sm text-pine-600 transition-colors hover:text-pine-900"
        >
          ← Listings
        </Link>

        {canEdit && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded-full border border-pine-200 bg-white px-3 py-1.5 text-sm text-pine-700 shadow-sm hover:bg-pine-50"
              aria-label="More actions"
            >
              ···
            </button>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-pine-200 bg-white py-1 shadow-lg">
                  {listing.canRefresh && (
                    <button
                      type="button"
                      disabled={refreshing}
                      onClick={handleRefresh}
                      className="block w-full px-4 py-2 text-left text-sm text-pine-800 hover:bg-pine-50"
                    >
                      {refreshing ? 'Refreshing…' : boatMode ? 'Refresh YachtWorld' : 'Refresh Zillow'}
                    </button>
                  )}
                  <Link
                    to={searchPath(searchId, `/listings/${id}/edit`)}
                    className="block px-4 py-2 text-sm text-pine-800 hover:bg-pine-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    {boatMode ? 'Import / full form' : 'Full form'}
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setShowDeleteConfirm(true);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-pine-200 bg-gradient-to-br from-white via-pine-50/40 to-sky-50/50 p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-pine-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 h-48 w-48 rounded-full bg-sky-200/25 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-pine-950 sm:text-3xl">
              {boatMode ? (
                (listing.nickname || canEdit) ? (
                  <InlineEditable
                    value={listing.nickname}
                    canEdit={canEdit}
                    placeholder="Add a nickname…"
                    ariaLabel="Nickname"
                    displayClassName="font-semibold text-pine-950"
                    emptyClassName="font-semibold text-pine-400"
                    onSave={(nickname) => applyListingUpdate({ nickname })}
                  />
                ) : (
                  makeModel || 'Untitled boat'
                )
              ) : (
                <InlineEditable
                  value={listing.address}
                  canEdit={canEdit}
                  placeholder="Address"
                  ariaLabel="Address"
                  displayClassName="font-semibold text-pine-950"
                  emptyClassName="font-semibold text-pine-400"
                  onSave={(address) => applyListingUpdate({ address })}
                />
              )}
            </h1>

            {boatMode && (listing.nickname || canEdit || makeModel) && (
              <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-base text-pine-600">
                {canEdit ? (
                  <>
                    <InlineEditable
                      value={listing.make}
                      canEdit
                      placeholder="Make"
                      ariaLabel="Make"
                      displayClassName="text-pine-600"
                      emptyClassName="text-pine-400"
                      onSave={(make) => applyListingUpdate({ make, model: listing.model })}
                    />
                    <span className="text-pine-300" aria-hidden="true">·</span>
                    <InlineEditable
                      value={listing.model}
                      canEdit
                      placeholder="Model"
                      ariaLabel="Model"
                      displayClassName="text-pine-600"
                      emptyClassName="text-pine-400"
                      onSave={(model) => applyListingUpdate({ make: listing.make, model })}
                    />
                  </>
                ) : (
                  <>
                    {listing.boatMakeId && listing.make ? (
                      <Link
                        to={searchPath(searchId, `/makes/${listing.boatMakeId}`)}
                        className="hover:text-pine-900"
                      >
                        {listing.make}
                      </Link>
                    ) : (
                      <span>{listing.make}</span>
                    )}
                    {listing.make && listing.model && (
                      <span className="text-pine-300" aria-hidden="true">·</span>
                    )}
                    {listing.boatModelId && listing.boatMakeId && listing.model ? (
                      <Link
                        to={searchPath(searchId, `/makes/${listing.boatMakeId}/models/${listing.boatModelId}`)}
                        className="hover:text-pine-900"
                      >
                        {listing.model}
                      </Link>
                    ) : (
                      <span>{listing.model}</span>
                    )}
                  </>
                )}
              </div>
            )}

            {!boatMode && placeLine && (
              <p className="mt-1 text-sm text-pine-600">{placeLine}{listing.zip ? ` ${listing.zip}` : ''}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <InlineEditable
                value={listing.status}
                canEdit={canEdit}
                options={LISTING_STATUSES}
                formatDraft={(v) => v || 'active'}
                parse={(v) => v || 'active'}
                ariaLabel="Status"
                display={
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_PILL[listing.status] || STATUS_PILL.active}`}>
                    {statusLabel(listing.status, LISTING_STATUSES)}
                  </span>
                }
                onSave={(status) => applyListingUpdate({ status })}
              />

              <ShortlistStar
                active={listing.shortlisted}
                canEdit={canEdit}
                onToggle={(shortlisted) => applyListingUpdate({ shortlisted })}
              />

              <InterestDots
                value={listing.interestLevel}
                canEdit={canEdit}
                onSave={(interestLevel) => applyListingUpdate({ interestLevel })}
              />

              <CriteriaFitBadge
                listing={listing}
                search={search}
                assetType={assetType}
                size="md"
              />

              {listing.isSoldComp && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Sold comp
                </span>
              )}

              {listing.canRefresh && <ListingStaleBadge listing={listing} />}
            </div>

            {boatMode && (listing.sourceUrl || listing.mlsNumber) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {listing.sourceUrl && (
                  <a
                    href={listing.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-pine-200 bg-white/80 px-3 py-1.5 text-sm font-medium text-pine-800 shadow-sm hover:border-pine-400"
                  >
                    Open on YachtWorld ↗
                  </a>
                )}
                {listing.mlsNumber && (
                  <span className="inline-flex rounded-full border border-pine-200/80 bg-white/60 px-3 py-1.5 text-sm tabular-nums text-pine-600">
                    YW {listing.mlsNumber}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 text-left lg:text-right">
            <p className="text-xs font-medium uppercase tracking-wide text-pine-500">
              {listing.isSoldComp ? 'Sold for' : 'Asking'}
            </p>
            <InlineEditable
              value={listing.isSoldComp ? listing.soldPrice : listing.listPrice}
              canEdit={canEdit}
              type="number"
              parse={parseOptionalInt}
              formatDraft={(v) => (v == null ? '' : String(v))}
              display={formatCurrency(listing.isSoldComp ? (listing.soldPrice ?? listing.listPrice) : listing.listPrice)}
              ariaLabel={listing.isSoldComp ? 'Sold price' : 'List price'}
              displayClassName="text-3xl font-semibold tabular-nums tracking-tight text-pine-950"
              emptyClassName="text-3xl font-semibold text-pine-300"
              className="lg:justify-end"
              onSave={(price) => applyListingUpdate(
                listing.isSoldComp ? { soldPrice: price } : { listPrice: price },
                { refreshEstimate: true },
              )}
            />
            {listing.isSoldComp && listing.listPrice != null && (
              <p className="mt-1 text-sm text-pine-500">
                Was {formatCurrency(listing.listPrice)}
              </p>
            )}
            {boatMode && listing.pricePerFoot != null && (
              <p className="mt-1 text-sm tabular-nums text-pine-600">
                {formatCurrency(listing.pricePerFoot)}/ft
              </p>
            )}
            {!boatMode && listing.pricePerAcre != null && (
              <p className="mt-1 text-sm tabular-nums text-pine-600">
                {formatCurrency(listing.pricePerAcre)}/acre
              </p>
            )}
          </div>

          {boatMode && listing.latitude != null && listing.longitude != null && (
            <div className="w-full shrink-0 sm:w-40 lg:w-44">
              <MapPanel
                key={`glimpse-${listing.id}-${listing.latitude}-${listing.longitude}`}
                markers={[buildListingMarker(listing, searchId)].filter(Boolean)}
                height={120}
                singleZoom={6}
                initialZoom={6}
                className="!rounded-xl"
              />
              {placeLine && (
                <p className="mt-1.5 text-xs text-pine-500">{placeLine}</p>
              )}
            </div>
          )}

          {boatMode && listing.latitude == null && canEdit && (listing.city || listing.address) && (
            <div className="w-full shrink-0 sm:w-40 lg:w-44">
              <button
                type="button"
                onClick={handleGeocodeListing}
                disabled={geocoding}
                className="flex h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-pine-300 bg-white/70 px-3 text-center text-sm text-pine-600 hover:border-pine-400 hover:text-pine-900"
              >
                {geocoding ? 'Pinning…' : 'Pin on map'}
              </button>
            </div>
          )}
        </div>

        {/* Feature pills */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {boatMode ? (
            <>
              {editingPill === 'length' ? (
                <InlineEditable
                  value={listing.lengthFt}
                  canEdit
                  autoEdit
                  type="number"
                  parse={parseOptionalNumber}
                  formatDraft={(v) => (v == null ? '' : String(v))}
                  ariaLabel="Length in feet"
                  displayClassName="text-sm"
                  className="min-w-[7rem]"
                  onCancelEdit={() => setEditingPill(null)}
                  onSave={async (lengthFt) => {
                    await applyListingUpdate({ lengthFt }, { refreshEstimate: true });
                    setEditingPill(null);
                  }}
                />
              ) : (
                <FeaturePill canEdit={canEdit} onClick={() => setEditingPill('length')} title="Length">
                  <span aria-hidden="true">↕</span>
                  {listing.lengthFt != null ? `${listing.lengthFt} ft` : 'Length'}
                </FeaturePill>
              )}

              {editingPill === 'year' ? (
                <InlineEditable
                  value={listing.yearBuilt}
                  canEdit
                  autoEdit
                  type="number"
                  parse={parseOptionalInt}
                  formatDraft={(v) => (v == null ? '' : String(v))}
                  ariaLabel="Year built"
                  className="min-w-[6rem]"
                  onCancelEdit={() => setEditingPill(null)}
                  onSave={async (yearBuilt) => {
                    await applyListingUpdate({ yearBuilt }, { refreshEstimate: true });
                    setEditingPill(null);
                  }}
                />
              ) : (
                <FeaturePill canEdit={canEdit} onClick={() => setEditingPill('year')} title="Year">
                  {listing.yearBuilt ?? 'Year'}
                </FeaturePill>
              )}

              {editingPill === 'propulsion' ? (
                <InlineEditable
                  value={listing.propulsion || 'sail'}
                  canEdit
                  autoEdit
                  options={BOAT_PROPULSIONS}
                  formatDraft={(v) => v || 'sail'}
                  ariaLabel="Propulsion"
                  onCancelEdit={() => setEditingPill(null)}
                  onSave={async (propulsion) => {
                    await applyListingUpdate({ propulsion }, { refreshEstimate: true });
                    setEditingPill(null);
                  }}
                />
              ) : (
                <FeaturePill canEdit={canEdit} onClick={() => setEditingPill('propulsion')} title="Propulsion">
                  {propulsionLabel(listing.propulsion) || 'Propulsion'}
                </FeaturePill>
              )}

              {editingPill === 'dom' ? (
                <InlineEditable
                  value={listing.daysOnMarket}
                  canEdit
                  autoEdit
                  type="number"
                  parse={parseOptionalInt}
                  formatDraft={(v) => (v == null ? '' : String(v))}
                  ariaLabel="Days on market"
                  className="min-w-[6rem]"
                  onCancelEdit={() => setEditingPill(null)}
                  onSave={async (daysOnMarket) => {
                    await applyListingUpdate({ daysOnMarket });
                    setEditingPill(null);
                  }}
                />
              ) : (
                (listing.daysOnMarket != null || canEdit) && (
                  <FeaturePill canEdit={canEdit} onClick={() => setEditingPill('dom')} title="Days on market">
                    {listing.daysOnMarket != null ? `${listing.daysOnMarket}d on market` : 'Days on market'}
                  </FeaturePill>
                )
              )}

              {editingPill === 'place' ? (
                <span className="inline-flex gap-1">
                  <InlineEditable
                    value={listing.city}
                    canEdit
                    autoEdit
                    placeholder="City"
                    ariaLabel="City"
                    onSave={async (city) => {
                      await applyListingUpdate({ city });
                    }}
                  />
                  <InlineEditable
                    value={listing.state}
                    canEdit
                    placeholder="ST"
                    ariaLabel="State"
                    className="w-14 uppercase"
                    onCancelEdit={() => setEditingPill(null)}
                    onSave={async (state) => {
                      await applyListingUpdate({ state });
                      setEditingPill(null);
                    }}
                  />
                </span>
              ) : (
                (placeLine || canEdit) && (
                  <FeaturePill canEdit={canEdit} onClick={() => setEditingPill('place')} title="Location">
                    {placeLine || 'Location'}
                  </FeaturePill>
                )
              )}

              {listing.marina && (
                <Link to={searchPath(searchId, `/marinas/${listing.marina.id}`)}>
                  <FeaturePill>{listing.marina.name}</FeaturePill>
                </Link>
              )}

              {listing.visited && (
                <FeaturePill>Inspected</FeaturePill>
              )}
            </>
          ) : (
            <>
              {!listing.isVacantLot && listing.bedrooms != null && (
                <FeaturePill>{listing.bedrooms} bed</FeaturePill>
              )}
              {!listing.isVacantLot && listing.bathrooms != null && (
                <FeaturePill>{listing.bathrooms} bath</FeaturePill>
              )}
              {!listing.isVacantLot && listing.sqftLiving != null && (
                <FeaturePill>{formatNumber(listing.sqftLiving)} sqft</FeaturePill>
              )}
              {listing.acres != null && (
                <FeaturePill>{listing.acres} acres</FeaturePill>
              )}
              {listing.isVacantLot && <FeaturePill>Vacant lot</FeaturePill>}
              {listing.waterfront && <FeaturePill>Waterfront</FeaturePill>}
              {listing.yearBuilt != null && <FeaturePill>{listing.yearBuilt}</FeaturePill>}
              {listing.region && (
                <Link to={searchPath(searchId, `/regions/${listing.regionId}`)}>
                  <FeaturePill>{listing.region.name}</FeaturePill>
                </Link>
              )}
              {listing.lake && <FeaturePill>{listing.lake.name}</FeaturePill>}
            </>
          )}
        </div>

        {listing.fetchedAt && (
          <p className="relative mt-3 text-xs text-pine-500">
            Last refreshed {formatFetchedAt(listing.fetchedAt)}
          </p>
        )}
      </section>

      <FreetextCriteriaChecklist
        listing={listing}
        search={search}
        canEdit={canEdit}
        onUpdate={applyListingUpdate}
      />

      {(listing.photoUrls?.length > 0 || priceEstimate) && (
        <div className="mt-6 grid min-w-0 gap-6 lg:grid-cols-5">
          <div className="order-2 min-w-0 lg:order-1 lg:col-span-2">
            <PriceEstimate data={priceEstimate} />
          </div>
          {listing.photoUrls?.length > 0 && (
            <div className="order-1 min-w-0 lg:order-2 lg:col-span-3">
              <PhotoGallery photoUrls={listing.photoUrls} />
            </div>
          )}
        </div>
      )}

      <div className={`mt-6 grid min-w-0 gap-6 ${boatMode ? '' : 'lg:grid-cols-5'}`}>
        <div className={`min-w-0 space-y-6 ${boatMode ? '' : 'lg:col-span-3'}`}>

          {boatMode && (boatModelHasSpecs(listing.boatModel) || listing.modelCheck) && (
            <CollapsibleModelSpecs
              listing={listing}
              searchId={searchId}
            />
          )}

          {boatMode && listing.boatModelId && (
            <SistershipComps
              listing={listing}
              searchId={searchId}
              api={api}
              canEdit={canEdit}
              onListingUpdate={applyListingUpdate}
            />
          )}

          <CarryingCostCard
            listing={listing}
            boatMode={boatMode}
            canEdit={canEdit}
            searchId={searchId}
            onUpdate={applyListingUpdate}
            api={api}
          />

          <Card className="!p-0 overflow-hidden">
            <UnifiedEvaluation
              listing={listing}
              boatMode={boatMode}
              canEdit={canEdit}
              searchId={searchId}
              onBoatChange={(partial) => {
                setListing((current) => ({ ...current, ...partial }));
                return applyListingUpdate(partial);
              }}
            />

            {!boatMode && (listing.visitNotes || canEdit) && (
              <div className="border-t border-pine-100 px-5 py-5">
                <p className="mb-2 text-sm font-medium text-pine-800">Visit notes</p>
                <InlineEditable
                  value={listing.visitNotes}
                  canEdit={canEdit}
                  multiline
                  placeholder="What you noticed on site…"
                  ariaLabel="Visit notes"
                  displayClassName="block w-full whitespace-pre-wrap text-sm text-pine-700"
                  emptyClassName="block w-full text-sm text-pine-400"
                  className="w-full"
                  onSave={(visitNotes) => {
                    setListing((current) => ({ ...current, visitNotes }));
                    return applyListingUpdate({ visitNotes });
                  }}
                />
                {canEdit && (
                  <label className="mt-3 flex items-center gap-2 text-sm text-pine-700">
                    <input
                      type="checkbox"
                      checked={Boolean(listing.visited)}
                      onChange={(e) => {
                        const visited = e.target.checked;
                        setListing((current) => ({ ...current, visited }));
                        applyListingUpdate({ visited });
                      }}
                    />
                    Visited in person
                  </label>
                )}
              </div>
            )}
          </Card>

          {snapshots.length > 0 && (
            <PriceHistory snapshots={snapshots} />
          )}
        </div>

        {!boatMode && (
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="h-fit">
              <div className="mt-1">
                <LocationDriveTime
                  locationLabel="Property"
                  addressLine={listingAddressLine || (canEdit ? 'Add city / address' : null)}
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  driveTimeMinutes={listing.driveTimeMinutes}
                  driveDistanceMiles={listing.driveDistanceMiles}
                  onGeocode={canEdit && listing.latitude == null ? handleGeocodeListing : undefined}
                  onDriveTime={canEdit ? handleListingDriveTime : undefined}
                  geocoding={geocoding}
                  calculating={calculatingDriveTime}
                  error={locationError}
                  originLabel={originLabel}
                />
              </div>
              {listing.latitude != null && listing.longitude != null && (
                <div className="mt-4">
                  <RouteMap
                    key={`${listing.id}-${listing.latitude}-${listing.longitude}`}
                    destination={listing}
                    destinationType="listing"
                    destinationLabel={title}
                    destinationSublabel={listingAddressLine}
                    destinationHref={searchPath(searchId, `/listings/${listing.id}`)}
                    isLoadingRoute
                  />
                </div>
              )}
              {commutes.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-pine-100 pt-4">
                  {commutes.map((commute) => (
                    <li
                      key={commute.poiId}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="text-pine-800">
                        {commute.poi.label}
                        {commute.poi.isPrimary && (
                          <span className="ml-2 rounded-full bg-pine-100 px-1.5 py-0.5 text-xs text-pine-600">
                            Home base
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums text-pine-600">
                        {commute.driveTimeMinutes != null
                          ? formatDriveTime(commute.driveTimeMinutes)
                          : '—'}
                        {commute.driveDistanceMiles != null && (
                          <> · {commute.driveDistanceMiles} mi</>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

          {(listing.sourceUrl || listing.mlsNumber) && (
            <div className="flex flex-wrap gap-2">
              {listing.sourceUrl && (
                <a
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-pine-200 bg-white px-3 py-1.5 text-sm font-medium text-pine-800 shadow-sm hover:border-pine-400"
                >
                  Open on {listing.sourceSite || 'source'} ↗
                </a>
              )}
              {listing.mlsNumber && (
                <span className="inline-flex rounded-full border border-pine-200 bg-white px-3 py-1.5 text-sm text-pine-600">
                  MLS {listing.mlsNumber}
                </span>
              )}
            </div>
          )}

          <Comments targetType="listing" targetId={listing.id} />
        </div>
        )}
      </div>

      {boatMode && (
        <section className="mt-6 rounded-2xl border border-pine-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-pine-800">Inspection notes</p>
              <InlineEditable
                value={listing.visitNotes}
                canEdit={canEdit}
                multiline
                placeholder="What you noticed aboard…"
                ariaLabel="Inspection notes"
                displayClassName="block w-full whitespace-pre-wrap text-sm text-pine-700"
                emptyClassName="block w-full text-sm text-pine-400"
                className="w-full"
                onSave={(visitNotes) => {
                  setListing((current) => ({ ...current, visitNotes }));
                  return applyListingUpdate({ visitNotes });
                }}
              />
              {canEdit && (
                <label className="mt-3 flex items-center gap-2 text-sm text-pine-700">
                  <input
                    type="checkbox"
                    checked={Boolean(listing.visited)}
                    onChange={(e) => {
                      const visited = e.target.checked;
                      setListing((current) => ({ ...current, visited }));
                      applyListingUpdate({ visited });
                    }}
                  />
                  Inspected in person
                </label>
              )}
            </div>
            <div>
              <Comments targetType="listing" targetId={listing.id} />
            </div>
          </div>
        </section>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title={boatMode ? 'Delete boat' : 'Delete listing'}
          message={`Delete ${title}?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}
