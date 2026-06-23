import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import Card from '../components/Card';
import ClickableCard, { ClickableRow } from '../components/ClickableCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { formatCurrency, formatDriveTime, statusLabel, REGION_STATUSES } from '../lib/format';
import useSearchAccess from '../hooks/useSearchAccess';
import usePrimaryPoi from '../hooks/usePrimaryPoi';
import ListingPrimaryDriveTime from '../components/ListingPrimaryDriveTime';

export default function Dashboard() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const [regions, setRegions] = useState([]);
  const [listings, setListings] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [regionsData, listingsData, dropsData] = await Promise.all([
          api.regions.list(),
          api.listings.list(),
          api.analysis.priceDrops(),
        ]);
        setRegions(regionsData.regions);
        setListings(listingsData.listings);
        setPriceDrops(dropsData.drops);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [api]);

  const interestedListings = listings.filter((listing) => listing.status === 'interested');
  const vacantLots = listings.filter((listing) => listing.isVacantLot);
  const withHomes = listings.filter((listing) => !listing.isVacantLot);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your vacation home research at a glance. Build this dataset over the next 6–12 months before you buy."
        actions={canEdit ? (
          <>
            <Link to={searchPath(searchId, '/map')}>
              <Button variant="secondary">Map</Button>
            </Link>
            <Link to={searchPath(searchId, '/regions/new')}>
              <Button variant="secondary">Add region</Button>
            </Link>
            <Link to={searchPath(searchId, '/listings/new')}>
              <Button>Add listing</Button>
            </Link>
          </>
        ) : (
          <Link to={searchPath(searchId, '/map')}>
            <Button variant="secondary">Map</Button>
          </Link>
        )}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-pine-600">Loading dashboard...</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ClickableCard to={searchPath(searchId, '/regions')}>
              <p className="text-sm text-pine-600">Regions</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{regions.length}</p>
            </ClickableCard>
            <ClickableCard to={searchPath(searchId, '/listings')}>
              <p className="text-sm text-pine-600">Total listings</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{listings.length}</p>
            </ClickableCard>
            <ClickableCard to={searchPath(searchId, '/listings?isVacantLot=true')}>
              <p className="text-sm text-pine-600">Vacant lots</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{vacantLots.length}</p>
            </ClickableCard>
            <ClickableCard to={searchPath(searchId, '/listings?status=interested')}>
              <p className="text-sm text-pine-600">Interested</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{interestedListings.length}</p>
            </ClickableCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="text-lg font-medium text-pine-900">Regions</h2>
              {regions.length === 0 ? (
                <p className="mt-3 text-sm text-pine-600">No regions yet.</p>
              ) : (
                <ul className="mt-4 space-y-1">
                  {regions.map((region) => (
                    <li key={region.id}>
                      <ClickableRow to={searchPath(searchId, `/regions/${region.id}`)}>
                        <div>
                          <p className="font-medium text-pine-800">{region.name}</p>
                          <p className="text-xs text-pine-500">
                            {statusLabel(region.status, REGION_STATUSES)} · {region._count.listings} listings
                          </p>
                        </div>
                        {region.driveTimeMinutes && (
                          <span className="text-sm text-pine-600">{formatDriveTime(region.driveTimeMinutes)}</span>
                        )}
                      </ClickableRow>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-medium text-pine-900">Recent listings</h2>
              {listings.length === 0 ? (
                <p className="mt-3 text-sm text-pine-600">No listings yet.</p>
              ) : (
                <ul className="mt-4 space-y-1">
                  {listings.slice(0, 6).map((listing) => (
                    <li key={listing.id}>
                      <ClickableRow to={searchPath(searchId, `/listings/${listing.id}`)}>
                        <div>
                          <p className="font-medium text-pine-800">
                            {listing.address || 'Untitled listing'}
                          </p>
                          <p className="text-xs text-pine-500">
                            {listing.region.name} · {listing.isVacantLot ? 'Vacant lot' : 'With home'}
                          </p>
                          <ListingPrimaryDriveTime
                            minutes={listing.driveTimeMinutes}
                            poiLabel={primaryPoiLabel}
                          />
                        </div>
                        <span className="text-sm font-medium text-pine-800">
                          {formatCurrency(listing.listPrice)}
                        </span>
                      </ClickableRow>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {priceDrops.length > 0 && (
            <Card className="mt-6">
              <h2 className="text-lg font-medium text-pine-900">Recent price drops</h2>
              <ul className="mt-4 space-y-1">
                {priceDrops.slice(0, 8).map((drop) => (
                  <li key={drop.listingId}>
                    <ClickableRow to={`/listings/${drop.listingId}`} stackOnMobile>
                      <div>
                        <p className="font-medium text-pine-800">
                          {drop.address || 'Untitled listing'}
                        </p>
                        <p className="text-xs text-pine-500">
                          {drop.region.name} · {new Date(drop.droppedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm font-medium text-emerald-700">
                          −{formatCurrency(drop.dropAmount)} ({drop.dropPercent}%)
                        </p>
                        <p className="text-xs text-pine-500">
                          {formatCurrency(drop.previousPrice)} → {formatCurrency(drop.currentPrice)}
                        </p>
                      </div>
                    </ClickableRow>
                  </li>
                ))}
              </ul>
            </Card>
          )}

        </>
      )}
    </div>
  );
}
