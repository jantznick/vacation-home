import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import SoldCompCard from '../components/SoldCompCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import {
  formatCurrency,
  statusLabel,
  LISTING_STATUSES,
} from '../lib/format';
import useSearchAccess from '../hooks/useSearchAccess';
import usePrimaryPoi from '../hooks/usePrimaryPoi';
import ListingPrimaryDriveTime from '../components/ListingPrimaryDriveTime';
import ListingStaleBadge from '../components/ListingStaleBadge';
import ListingPriceSignal from '../components/ListingPriceSignal';
import { showError, showSuccess } from '../lib/toast';
import { BOAT_PROPULSIONS, isBoatSearch, supportsRegions } from '../lib/assetTypes';
import { formatBoatTitle } from '../lib/boatTitle';
import CriteriaFitBadge from '../components/CriteriaFitBadge';
import ShortlistStar from '../components/ShortlistStar';

function listingTitle(listing, boat) {
  if (boat) {
    return formatBoatTitle(listing);
  }
  return listing.address || 'Untitled listing';
}

export default function Listings() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const { search, assetType, loading: searchLoading } = useCurrentSearch();
  const boatMode = isBoatSearch(assetType);
  const homeMode = supportsRegions(assetType);
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [staleCount, setStaleCount] = useState(0);

  const shortlistCount = listings.filter((l) => l.shortlisted).length;

  const regionId = searchParams.get('regionId') || '';
  const isVacantLot = searchParams.get('isVacantLot') || '';
  const propulsion = searchParams.get('propulsion') || '';
  const status = searchParams.get('status') || '';
  const showAll = searchParams.get('showAll') === 'true';
  const needsRefresh = searchParams.get('needsRefresh') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') || 'desc';

  useEffect(() => {
    if (searchLoading || assetType == null) {
      return undefined;
    }

    if (!homeMode) {
      setRegions([]);
      return undefined;
    }

    const loadRegions = async () => {
      try {
        const data = await api.regions.list();
        setRegions(data.regions);
      } catch (err) {
        setError(err.message);
      }
    };

    loadRegions();
    return undefined;
  }, [api, homeMode, searchLoading, assetType]);

  useEffect(() => {
    if (searchLoading || assetType == null) {
      return undefined;
    }

    const loadListings = async () => {
      setLoading(true);
      setError('');
      try {
        const filters = {};
        if (homeMode && regionId) filters.regionId = regionId;
        if (homeMode && isVacantLot) filters.isVacantLot = isVacantLot;
        if (boatMode && propulsion) filters.propulsion = propulsion;
        if (status) filters.status = status;
        else if (showAll) filters.includeSold = 'true';
        if (needsRefresh) filters.needsRefresh = needsRefresh;
        if (sortBy) filters.sortBy = sortBy;
        if (sortDir) filters.sortDir = sortDir;
        filters.includePriceSignal = 'true';

        const data = await api.listings.list(filters);
        setListings(data.listings);

        if (homeMode) {
          const staleData = await api.listings.list({ needsRefresh: 'true' });
          setStaleCount(staleData.listings.length);
        } else {
          setStaleCount(0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadListings();
    return undefined;
  }, [api, homeMode, boatMode, searchLoading, assetType, regionId, isVacantLot, propulsion, status, showAll, needsRefresh, sortBy, sortDir]);

  const reloadListings = async () => {
    const filters = {};
    if (homeMode && regionId) filters.regionId = regionId;
    if (homeMode && isVacantLot) filters.isVacantLot = isVacantLot;
    if (boatMode && propulsion) filters.propulsion = propulsion;
    if (status) filters.status = status;
    else if (showAll) filters.includeSold = 'true';
    if (needsRefresh) filters.needsRefresh = needsRefresh;
    if (sortBy) filters.sortBy = sortBy;
    if (sortDir) filters.sortDir = sortDir;
    filters.includePriceSignal = 'true';

    const [data, staleData] = await Promise.all([
      api.listings.list(filters),
      homeMode
        ? api.listings.list({ needsRefresh: 'true' })
        : Promise.resolve({ listings: [] }),
    ]);
    setListings(data.listings);
    setStaleCount(staleData.listings.length);
  };

  const handleBulkRefresh = async () => {
    setRefreshing(true);
    setError('');

    try {
      const data = await api.listings.refreshBulk({ staleOnly: true });
      const { summary } = data;
      if (summary.total === 0) {
        showSuccess('No stale listings to refresh.');
      } else if (summary.failed === 0) {
        showSuccess(`Refreshed ${summary.succeeded} listing${summary.succeeded === 1 ? '' : 's'}.`);
      } else {
        showSuccess(`Refreshed ${summary.succeeded} of ${summary.total}. ${summary.failed} failed.`);
      }

      await reloadListings();
    } catch (err) {
      setError(err.message);
      showError(err.message);
    } finally {
      setRefreshing(false);
    }
  };

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

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  return (
    <div>
      <PageHeader
        title={boatMode ? 'Boats' : 'Listings'}
        description={
          boatMode
            ? 'Boats you’re researching. Sold listings stay available for pricing but stay out of the main list.'
            : 'Properties you’re researching. Sold listings stay available for pricing but stay out of the main list.'
        }
        actions={
          <>
            {shortlistCount > 0 && (
              <Link to={searchPath(searchId, '/compare')}>
                <Button variant="secondary">Compare shortlisted ({shortlistCount})</Button>
              </Link>
            )}
            {canEdit && (
              <>
                {homeMode && staleCount > 0 && (
                  <Button variant="secondary" onClick={handleBulkRefresh} disabled={refreshing}>
                    {refreshing ? 'Refreshing...' : `Refresh stale (${staleCount})`}
                  </Button>
                )}
                <Link to={searchPath(searchId, '/listings/new')}>
                  <Button>{boatMode ? 'Add boat' : 'Add listing'}</Button>
                </Link>
              </>
            )}
          </>
        }
      />

      <Card className="mb-6">
        <div className={`grid gap-4 ${boatMode ? 'md:grid-cols-3' : 'md:grid-cols-5'}`}>
          {homeMode && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-pine-800">Region</label>
                <select
                  value={regionId}
                  onChange={(e) => updateFilter('regionId', e.target.value)}
                  className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
                >
                  <option value="">All regions</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-pine-800">Property type</label>
                <select
                  value={isVacantLot}
                  onChange={(e) => updateFilter('isVacantLot', e.target.value)}
                  className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
                >
                  <option value="">All types</option>
                  <option value="true">Vacant lot</option>
                  <option value="false">With home</option>
                </select>
              </div>
            </>
          )}
          {boatMode && (
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Type</label>
              <select
                value={propulsion}
                onChange={(e) => updateFilter('propulsion', e.target.value)}
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              >
                <option value="">All boats</option>
                {BOAT_PROPULSIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Status</label>
            <select
              value={status === 'sold' ? 'sold' : showAll ? '__all__' : ''}
              onChange={(e) => {
                const value = e.target.value;
                const next = new URLSearchParams(searchParams);
                next.delete('status');
                next.delete('showAll');
                if (value === 'sold') next.set('status', 'sold');
                else if (value === '__all__') next.set('showAll', 'true');
                setSearchParams(next);
              }}
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            >
              <option value="">Currently researching</option>
              <option value="sold">Sold</option>
              <option value="__all__">Everything</option>
            </select>
          </div>
          {homeMode && (
            <div>
              <label className="mb-1 block text-sm font-medium text-pine-800">Freshness</label>
              <select
                value={needsRefresh}
                onChange={(e) => updateFilter('needsRefresh', e.target.value)}
                className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
              >
                <option value="">All listings</option>
                <option value="true">Needs refresh</option>
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Sort by</label>
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [nextSortBy, nextSortDir] = e.target.value.split(':');
                const next = new URLSearchParams(searchParams);
                next.set('sortBy', nextSortBy);
                next.set('sortDir', nextSortDir);
                setSearchParams(next);
              }}
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            >
              <option value="createdAt:desc">Newest first</option>
              <option value="createdAt:asc">Oldest first</option>
              <option value="listPrice:asc">Price: low to high</option>
              <option value="listPrice:desc">Price: high to low</option>
              {boatMode ? (
                <>
                  <option value="pricePerFoot:asc">$/ft: low to high</option>
                  <option value="pricePerFoot:desc">$/ft: high to low</option>
                  <option value="lengthFt:desc">Length: longest first</option>
                  <option value="lengthFt:asc">Length: shortest first</option>
                </>
              ) : (
                <>
                  <option value="pricePerAcre:asc">$/acre: low to high</option>
                  <option value="pricePerAcre:desc">$/acre: high to low</option>
                  <option value="pricePerSqft:asc">$/sqft: low to high</option>
                  <option value="pricePerSqft:desc">$/sqft: high to low</option>
                  <option value="acres:desc">Acres: largest first</option>
                  <option value="acres:asc">Acres: smallest first</option>
                </>
              )}
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading || searchLoading || assetType == null ? (
        <p className="text-pine-600">Loading listings...</p>
      ) : listings.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">
            {boatMode ? 'No boats match your filters.' : 'No listings match your filters.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <SoldCompCard key={listing.id} listing={listing} to={searchPath(searchId, `/listings/${listing.id}`)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ShortlistStar
                      active={listing.shortlisted}
                      canEdit={canEdit}
                      onToggle={() => toggleShortlist(listing)}
                    />
                    <p className="text-lg font-medium text-pine-900">
                      {listingTitle(listing, boatMode)}
                    </p>
                    <CriteriaFitBadge listing={listing} search={search} assetType={assetType} />
                    {homeMode && <ListingStaleBadge listing={listing} />}
                  </div>
                  <p className="mt-1 text-sm text-pine-600">
                    {boatMode
                      ? [
                          listing.lengthFt != null ? `${listing.lengthFt} ft` : null,
                          listing.yearBuilt,
                          listing.propulsion
                            ? BOAT_PROPULSIONS.find((o) => o.value === listing.propulsion)?.label
                            : null,
                        ].filter(Boolean).join(' · ') || 'Boat'
                      : [
                          listing.region?.name,
                          listing.lake?.name,
                        ].filter(Boolean).join(' · ') || 'No region'}
                  </p>
                  <p className="mt-1 text-xs text-pine-500">
                    {statusLabel(listing.status, LISTING_STATUSES)}
                    {boatMode
                      ? ''
                      : ` · ${listing.isVacantLot ? 'Vacant lot' : 'With home'}${listing.waterfront ? ' · Waterfront' : ''}`}
                  </p>
                  <ListingPrimaryDriveTime
                    minutes={listing.driveTimeMinutes}
                    poiLabel={primaryPoiLabel}
                    className="mt-1 text-xs text-pine-500"
                  />
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-lg font-semibold tabular-nums text-pine-900">
                    {formatCurrency(
                      listing.isSoldComp
                        ? (listing.soldPrice ?? listing.listPrice)
                        : listing.listPrice,
                    )}
                  </p>
                  <ListingPriceSignal signal={listing.priceSignal} />
                  {boatMode ? (
                    listing.lengthFt != null && (
                      <p className="text-sm text-pine-600">
                        {listing.lengthFt} ft
                        {listing.pricePerFoot ? ` · ${formatCurrency(listing.pricePerFoot)}/ft` : ''}
                      </p>
                    )
                  ) : (
                    listing.acres && (
                      <p className="text-sm text-pine-600">
                        {listing.acres} acres
                        {listing.pricePerAcre ? ` · ${formatCurrency(listing.pricePerAcre)}/acre` : ''}
                      </p>
                    )
                  )}
                </div>
              </div>
            </SoldCompCard>
          ))}
        </div>
      )}
    </div>
  );
}
