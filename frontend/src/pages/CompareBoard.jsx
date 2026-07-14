import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import useSearchAccess from '../hooks/useSearchAccess';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ShortlistStar from '../components/ShortlistStar';
import CriteriaFitBadge from '../components/CriteriaFitBadge';
import { formatCurrency, statusLabel, LISTING_STATUSES } from '../lib/format';
import { isBoatSearch, supportsRegions, parseLineList } from '../lib/assetTypes';
import { formatBoatTitle } from '../lib/boatTitle';
import { formatFetchedAt } from '../lib/listingFreshness';
import { showError } from '../lib/toast';

function listingTitle(listing, boat) {
  if (boat) return formatBoatTitle(listing);
  return listing.address || 'Untitled listing';
}

function fmt(v, suffix = '') {
  if (v == null) return '—';
  return `${v.toLocaleString()}${suffix}`;
}

function ProConList({ text, tone }) {
  const items = parseLineList(text);
  if (!items.length) return <span className="text-pine-300">—</span>;
  const icon = tone === 'pro' ? '✓' : '✗';
  const color = tone === 'pro' ? 'text-emerald-600' : 'text-rose-500';
  return (
    <ul className="space-y-0.5 text-left">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1">
          <span className={`shrink-0 ${color}`}>{icon}</span>
          <span className="leading-snug">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function CellPhoto({ listing, searchId, boat }) {
  const photo = Array.isArray(listing.photoUrls) ? listing.photoUrls[0] : null;
  return (
    <Link to={searchPath(searchId, `/listings/${listing.id}`)} className="block group">
      {photo ? (
        <img
          src={photo}
          alt={listingTitle(listing, boat)}
          className="h-28 w-full rounded-lg object-cover transition-shadow group-hover:shadow-md"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center rounded-lg bg-pine-100 text-xs text-pine-400">
          No photo
        </div>
      )}
    </Link>
  );
}

const BOAT_ROWS = [
  { key: 'pricePerFoot', label: '$/ft', render: (l) => formatCurrency(l.pricePerFoot) },
  { key: 'lengthFt', label: 'Length', render: (l) => fmt(l.lengthFt, ' ft') },
  { key: 'beamFt', label: 'Beam', render: (l) => fmt(l.beamFt, ' ft') },
  { key: 'draftFt', label: 'Draft', render: (l) => fmt(l.draftFt, ' ft') },
  { key: 'displacementLb', label: 'Displacement', render: (l) => fmt(l.displacementLb, ' lb') },
  { key: 'engineHours', label: 'Engine hours', render: (l) => fmt(l.engineHours) },
  { key: 'fuelGal', label: 'Fuel', render: (l) => fmt(l.fuelGal, ' gal') },
  { key: 'waterGal', label: 'Water', render: (l) => fmt(l.waterGal, ' gal') },
];

const HOME_ROWS = [
  { key: 'pricePerAcre', label: '$/acre', render: (l) => formatCurrency(l.pricePerAcre) },
  { key: 'pricePerSqft', label: '$/sqft', render: (l) => formatCurrency(l.pricePerSqft) },
  { key: 'bedrooms', label: 'Beds', render: (l) => fmt(l.bedrooms) },
  { key: 'bathrooms', label: 'Baths', render: (l) => fmt(l.bathrooms) },
  { key: 'sqftLiving', label: 'Sqft', render: (l) => fmt(l.sqftLiving) },
  { key: 'acres', label: 'Acres', render: (l) => fmt(l.acres) },
  { key: 'waterfront', label: 'Waterfront', render: (l) => l.waterfront ? (l.waterfrontType || 'Yes') : '—' },
  { key: 'driveTimeMinutes', label: 'Drive time', render: (l) => l.driveTimeMinutes != null ? `${l.driveTimeMinutes} min` : '—' },
];

export default function CompareBoard() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const { search, assetType, loading: searchLoading } = useCurrentSearch();
  const boatMode = isBoatSearch(assetType);
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const explicitIds = searchParams.get('ids');
  const modelFilter = searchParams.get('boatModelId');
  const heading = modelFilter
    ? 'Sistership comparison'
    : 'Comparison board';
  const description = explicitIds
    ? 'Comparing selected listings side by side.'
    : modelFilter
      ? 'All tracked listings of this model, side by side.'
      : 'Shortlisted listings, side by side.';

  useEffect(() => {
    if (searchLoading || !assetType) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const filters = {};
        if (explicitIds) {
          filters.ids = explicitIds;
          filters.includeSold = 'true';
        } else if (modelFilter) {
          filters.boatModelId = modelFilter;
          filters.includeSold = 'true';
        } else {
          filters.shortlisted = 'true';
        }
        filters.sortBy = 'listPrice';
        filters.sortDir = 'asc';

        const data = await api.listings.list(filters);
        setListings(data.listings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api, searchLoading, assetType, explicitIds, modelFilter]);

  const toggleShortlist = async (listing) => {
    const next = !listing.shortlisted;
    try {
      const data = await api.listings.update(listing.id, { shortlisted: next });
      setListings((prev) =>
        prev.map((l) => (l.id === listing.id ? { ...l, ...data.listing } : l)),
      );
    } catch (err) {
      showError(err.message);
    }
  };

  const removeListing = (id) => {
    setListings((prev) => prev.filter((l) => l.id !== id));
  };

  if (loading || searchLoading) {
    return (
      <div>
        <PageHeader title={heading} description={description} />
        <p className="text-pine-600">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title={heading} description={description} />
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div>
        <PageHeader
          title={heading}
          description={description}
          actions={
            <Link to={searchPath(searchId, '/listings')}>
              <Button variant="secondary">Back to listings</Button>
            </Link>
          }
        />
        <Card>
          <p className="text-sm text-pine-600">
            {modelFilter
              ? 'No listings tracked for this model yet.'
              : 'No shortlisted listings yet. Star some listings to compare them here.'}
          </p>
        </Card>
      </div>
    );
  }

  const assetRows = boatMode ? BOAT_ROWS : HOME_ROWS;
  const anyHasRow = (key) => listings.some((l) => l[key] != null);
  const visibleAssetRows = assetRows.filter((r) => anyHasRow(r.key));

  const colWidth = listings.length <= 3 ? 'min-w-[220px]' : 'min-w-[180px]';
  const labelWidth = 'min-w-[120px] max-w-[140px]';

  return (
    <div>
      <PageHeader
        title={heading}
        description={description}
        actions={
          <Link to={searchPath(searchId, '/listings')}>
            <Button variant="secondary">Back to listings</Button>
          </Link>
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={`${labelWidth} p-2`} />
              {listings.map((listing) => (
                <th key={listing.id} className={`${colWidth} p-2 text-center align-top`}>
                  <CellPhoto listing={listing} searchId={searchId} boat={boatMode} />
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <ShortlistStar
                      active={listing.shortlisted}
                      canEdit={canEdit}
                      onToggle={() => toggleShortlist(listing)}
                    />
                    <Link
                      to={searchPath(searchId, `/listings/${listing.id}`)}
                      className="font-semibold text-pine-900 hover:text-pine-700"
                    >
                      {listingTitle(listing, boatMode)}
                    </Link>
                  </div>
                  {explicitIds && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-pine-400 hover:text-red-500"
                      onClick={() => removeListing(listing.id)}
                    >
                      remove
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="Price" listings={listings} render={(l) => (
              <span className="font-semibold">{formatCurrency(l.isSoldComp ? (l.soldPrice ?? l.listPrice) : l.listPrice)}</span>
            )} />
            <CompareRow label="Year" listings={listings} render={(l) => fmt(l.yearBuilt)} />
            <CompareRow label="Status" listings={listings} render={(l) => statusLabel(l.status, LISTING_STATUSES)} />
            <CompareRow label="Interest" listings={listings} render={(l) => (
              <span className="text-amber-500">{'★'.repeat(l.interestLevel || 0)}{'☆'.repeat(5 - (l.interestLevel || 0))}</span>
            )} />
            <CompareRow label="Fit" listings={listings} render={(l) => (
              <CriteriaFitBadge listing={l} search={search} assetType={assetType} />
            )} />

            {visibleAssetRows.length > 0 && (
              <tr>
                <td
                  colSpan={listings.length + 1}
                  className="border-t-2 border-pine-200 px-2 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-pine-500"
                >
                  {boatMode ? 'Boat specs' : 'Property details'}
                </td>
              </tr>
            )}
            {visibleAssetRows.map((row) => (
              <CompareRow key={row.key} label={row.label} listings={listings} render={row.render} />
            ))}

            <tr>
              <td
                colSpan={listings.length + 1}
                className="border-t-2 border-pine-200 px-2 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-pine-500"
              >
                Evaluation
              </td>
            </tr>
            <CompareRow label="Pros" listings={listings} render={(l) => <ProConList text={l.pros} tone="pro" />} />
            <CompareRow label="Cons" listings={listings} render={(l) => <ProConList text={l.cons} tone="con" />} />
            <CompareRow label="Notes" listings={listings} render={(l) => (
              l.notes ? <span className="whitespace-pre-wrap leading-snug">{l.notes}</span> : <span className="text-pine-300">—</span>
            )} />

            <tr>
              <td
                colSpan={listings.length + 1}
                className="border-t-2 border-pine-200 px-2 pt-4 pb-1 text-xs font-bold uppercase tracking-wide text-pine-500"
              >
                Meta
              </td>
            </tr>
            <CompareRow label="Last refreshed" listings={listings} render={(l) => (
              <span className="text-pine-500">{l.fetchedAt ? formatFetchedAt(l.fetchedAt) : '—'}</span>
            )} />
            <CompareRow label="Days on market" listings={listings} render={(l) => fmt(l.daysOnMarket)} />
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CompareRow({ label, listings, render }) {
  return (
    <tr className="border-t border-pine-100">
      <td className="whitespace-nowrap px-2 py-2 text-xs font-medium text-pine-600 align-top">
        {label}
      </td>
      {listings.map((listing) => (
        <td key={listing.id} className="px-2 py-2 text-center text-sm text-pine-800 align-top">
          {render(listing)}
        </td>
      ))}
    </tr>
  );
}
