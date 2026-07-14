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
  if (listing.boatModel?.description) {
    descriptions.push({
      text: listing.boatModel.description,
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

export default function ListingDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const { canEdit } = useSearchAccess();
  const { assetType } = useCurrentSearch();
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

              <InterestDots
                value={listing.interestLevel}
                canEdit={canEdit}
                onSave={(interestLevel) => applyListingUpdate({ interestLevel })}
              />

              {listing.isSoldComp && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Sold comp
                </span>
              )}

              {listing.canRefresh && <ListingStaleBadge listing={listing} />}
            </div>
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

      {listing.photoUrls?.length > 0 && (
        <div className="mt-6">
          <PhotoGallery photoUrls={listing.photoUrls} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <PriceEstimate data={priceEstimate} />

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

            {(listing.visitNotes || canEdit) && (
              <div className="border-t border-pine-100 px-5 py-5">
                <p className="mb-2 text-sm font-medium text-pine-800">
                  {boatMode ? 'Inspection notes' : 'Visit notes'}
                </p>
                <InlineEditable
                  value={listing.visitNotes}
                  canEdit={canEdit}
                  multiline
                  placeholder={boatMode ? 'What you noticed aboard…' : 'What you noticed on site…'}
                  ariaLabel={boatMode ? 'Inspection notes' : 'Visit notes'}
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
                    {boatMode ? 'Inspected in person' : 'Visited in person'}
                  </label>
                )}
              </div>
            )}
          </Card>

          {snapshots.length > 0 && (
            <PriceHistory snapshots={snapshots} />
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          {(!boatMode || listingAddressLine || listing.latitude != null || listing.city || listing.state || canEdit) && (
            <Card className="h-fit">
              <div className="mt-1">
                <LocationDriveTime
                  locationLabel={boatMode ? 'Where it sits' : 'Property'}
                  addressLine={listingAddressLine || (canEdit ? 'Add city / address' : null)}
                  latitude={listing.latitude}
                  longitude={listing.longitude}
                  driveTimeMinutes={listing.driveTimeMinutes}
                  driveDistanceMiles={listing.driveDistanceMiles}
                  onGeocode={canEdit && listing.latitude == null ? handleGeocodeListing : undefined}
                  onDriveTime={canEdit && !boatMode ? handleListingDriveTime : undefined}
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
                    isLoadingRoute={!boatMode}
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
          )}

          {(listing.sourceUrl || listing.mlsNumber || listing.daysOnMarket != null) && (
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
                  {boatMode ? 'YW' : 'MLS'} {listing.mlsNumber}
                </span>
              )}
            </div>
          )}

          <Comments targetType="listing" targetId={listing.id} />
        </div>
      </div>

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
