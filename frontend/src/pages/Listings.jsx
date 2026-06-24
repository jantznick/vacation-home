import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard from '../components/ClickableCard';
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

export default function Listings() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [staleCount, setStaleCount] = useState(0);

  const regionId = searchParams.get('regionId') || '';
  const isVacantLot = searchParams.get('isVacantLot') || '';
  const status = searchParams.get('status') || '';
  const needsRefresh = searchParams.get('needsRefresh') || '';
  const sortBy = searchParams.get('sortBy') || 'createdAt';
  const sortDir = searchParams.get('sortDir') || 'desc';

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const data = await api.regions.list();
        setRegions(data.regions);
      } catch (err) {
        setError(err.message);
      }
    };

    loadRegions();
  }, [api]);

  useEffect(() => {
    const loadListings = async () => {
      setLoading(true);
      try {
        const filters = {};
        if (regionId) filters.regionId = regionId;
        if (isVacantLot) filters.isVacantLot = isVacantLot;
        if (status) filters.status = status;
        if (needsRefresh) filters.needsRefresh = needsRefresh;
        if (sortBy) filters.sortBy = sortBy;
        if (sortDir) filters.sortDir = sortDir;
        filters.includePriceSignal = 'true';

        const data = await api.listings.list(filters);
        setListings(data.listings);

        const staleData = await api.listings.list({ needsRefresh: 'true' });
        setStaleCount(staleData.listings.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadListings();
  }, [api, regionId, isVacantLot, status, needsRefresh, sortBy, sortDir]);

  const reloadListings = async () => {
    const filters = {};
    if (regionId) filters.regionId = regionId;
    if (isVacantLot) filters.isVacantLot = isVacantLot;
    if (status) filters.status = status;
    if (needsRefresh) filters.needsRefresh = needsRefresh;
    if (sortBy) filters.sortBy = sortBy;
    if (sortDir) filters.sortDir = sortDir;
    filters.includePriceSignal = 'true';

    const [data, staleData] = await Promise.all([
      api.listings.list(filters),
      api.listings.list({ needsRefresh: 'true' }),
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
        title="Listings"
        description="Individual properties you're tracking — vacant lots and homes with structures."
        actions={canEdit ? (
          <>
            {staleCount > 0 && (
              <Button variant="secondary" onClick={handleBulkRefresh} disabled={refreshing}>
                {refreshing ? 'Refreshing...' : `Refresh stale (${staleCount})`}
              </Button>
            )}
            <Link to={searchPath(searchId, '/listings/new')}>
              <Button>Add listing</Button>
            </Link>
          </>
        ) : undefined}
      />

      <Card className="mb-6">
        <div className="grid gap-4 md:grid-cols-5">
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
          <div>
            <label className="mb-1 block text-sm font-medium text-pine-800">Status</label>
            <select
              value={status}
              onChange={(e) => updateFilter('status', e.target.value)}
              className="w-full rounded-md border border-pine-300 px-3 py-2 text-sm"
            >
              <option value="">All statuses</option>
              {LISTING_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
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
              <option value="pricePerAcre:asc">$/acre: low to high</option>
              <option value="pricePerAcre:desc">$/acre: high to low</option>
              <option value="pricePerSqft:asc">$/sqft: low to high</option>
              <option value="pricePerSqft:desc">$/sqft: high to low</option>
              <option value="acres:desc">Acres: largest first</option>
              <option value="acres:asc">Acres: smallest first</option>
            </select>
          </div>
        </div>
      </Card>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-pine-600">Loading listings...</p>
      ) : listings.length === 0 ? (
        <Card>
          <p className="text-sm text-pine-600">No listings match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ClickableCard key={listing.id} to={searchPath(searchId, `/listings/${listing.id}`)}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-medium text-pine-900">
                      {listing.address || 'Untitled listing'}
                    </p>
                    <ListingStaleBadge listing={listing} />
                  </div>
                  <p className="mt-1 text-sm text-pine-600">
                    {listing.region.name}
                    {listing.lake ? ` · ${listing.lake.name}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-pine-500">
                    {statusLabel(listing.status, LISTING_STATUSES)} · {listing.isVacantLot ? 'Vacant lot' : 'With home'}
                    {listing.waterfront ? ' · Waterfront' : ''}
                  </p>
                  <ListingPrimaryDriveTime
                    minutes={listing.driveTimeMinutes}
                    poiLabel={primaryPoiLabel}
                    className="mt-1 text-xs text-pine-500"
                  />
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-lg font-semibold tabular-nums text-pine-900">
                    {formatCurrency(listing.listPrice)}
                  </p>
                  <ListingPriceSignal signal={listing.priceSignal} />
                  {listing.acres && (
                    <p className="text-sm text-pine-600">
                      {listing.acres} acres
                      {listing.pricePerAcre ? ` · ${formatCurrency(listing.pricePerAcre)}/acre` : ''}
                    </p>
                  )}
                </div>
              </div>
            </ClickableCard>
          ))}
        </div>
      )}
    </div>
  );
}
