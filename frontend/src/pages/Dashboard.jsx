import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import ClickableCard, { ClickableRow } from '../components/ClickableCard';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import { formatCurrency, formatDriveTime, statusLabel, REGION_STATUSES } from '../lib/format';
import useSearchAccess from '../hooks/useSearchAccess';
import usePrimaryPoi from '../hooks/usePrimaryPoi';
import ListingPrimaryDriveTime from '../components/ListingPrimaryDriveTime';
import ListingStaleBadge from '../components/ListingStaleBadge';
import { isBoatSearch, parseLineList, supportsRegions } from '../lib/assetTypes';
import { formatBoatTitle } from '../lib/boatTitle';

function listingTitle(listing, boat) {
  if (boat) {
    return formatBoatTitle(listing);
  }
  return listing.address || 'Untitled listing';
}

function listingSubtitle(listing, boat) {
  if (boat) {
    const parts = [];
    if (listing.lengthFt) parts.push(`${listing.lengthFt} ft`);
    if (listing.yearBuilt) parts.push(String(listing.yearBuilt));
    if (listing.propulsion) parts.push(listing.propulsion);
    return parts.join(' · ') || 'Boat';
  }
  return `${listing.region?.name || 'No region'} · ${listing.isVacantLot ? 'Vacant lot' : 'With home'}`;
}

export default function Dashboard() {
  const searchId = useSearchId();
  const api = useSearchAPI();
  const { canEdit } = useSearchAccess();
  const { search, assetType, loading: searchLoading } = useCurrentSearch();
  const { label: primaryPoiLabel } = usePrimaryPoi();
  const [regions, setRegions] = useState([]);
  const [listings, setListings] = useState([]);
  const [priceDrops, setPriceDrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const homeMode = supportsRegions(assetType);
  const boatMode = isBoatSearch(assetType);
  const categoryPros = parseLineList(search?.pros);
  const categoryCons = parseLineList(search?.cons);

  useEffect(() => {
    if (searchLoading || assetType == null) {
      return undefined;
    }

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const requests = [
          api.listings.list(),
          api.analysis.priceDrops(),
        ];
        if (homeMode) {
          requests.unshift(api.regions.list());
        }

        const results = await Promise.all(requests);
        if (homeMode) {
          setRegions(results[0].regions);
          setListings(results[1].listings);
          setPriceDrops(results[2].drops);
        } else {
          setRegions([]);
          setListings(results[0].listings);
          setPriceDrops(results[1].drops);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    load();
    return undefined;
  }, [api, homeMode, searchLoading, assetType]);

  const interestedListings = listings.filter((listing) => listing.status === 'interested');
  const vacantLots = listings.filter((listing) => listing.isVacantLot);
  const sailboats = listings.filter((listing) => listing.propulsion === 'sail');

  return (
    <div>
      <PageHeader
        title={search?.name || 'Dashboard'}
        description={
          search?.description
          || (boatMode
            ? 'Boats you’re considering, with pros, cons, and pricing at a glance.'
            : 'Your vacation home research at a glance.')
        }
        actions={canEdit ? (
          <>
            <Link to={searchPath(searchId, '/map')}>
              <Button variant="secondary">Map</Button>
            </Link>
            {homeMode && (
              <Link to={searchPath(searchId, '/regions/new')}>
                <Button variant="secondary">Add region</Button>
              </Link>
            )}
            <Link to={searchPath(searchId, '/listings/new')}>
              <Button>{boatMode ? 'Add boat' : 'Add listing'}</Button>
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
          {(categoryPros.length > 0 || categoryCons.length > 0) && (
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {categoryPros.length > 0 && (
                <Card>
                  <h2 className="text-sm font-medium uppercase tracking-wide text-pine-500">Pros of this search</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-pine-800">
                    {categoryPros.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              )}
              {categoryCons.length > 0 && (
                <Card>
                  <h2 className="text-sm font-medium uppercase tracking-wide text-pine-500">Cons / tradeoffs</h2>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-pine-800">
                    {categoryCons.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homeMode && (
              <ClickableCard to={searchPath(searchId, '/regions')}>
                <p className="text-sm text-pine-600">Regions</p>
                <p className="mt-1 text-3xl font-semibold text-pine-900">{regions.length}</p>
              </ClickableCard>
            )}
            <ClickableCard to={searchPath(searchId, '/listings')}>
              <p className="text-sm text-pine-600">{boatMode ? 'Boats' : 'Total listings'}</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{listings.length}</p>
            </ClickableCard>
            {homeMode ? (
              <ClickableCard to={searchPath(searchId, '/listings?isVacantLot=true')}>
                <p className="text-sm text-pine-600">Vacant lots</p>
                <p className="mt-1 text-3xl font-semibold text-pine-900">{vacantLots.length}</p>
              </ClickableCard>
            ) : (
              <ClickableCard to={searchPath(searchId, '/listings?propulsion=sail')}>
                <p className="text-sm text-pine-600">Sailboats</p>
                <p className="mt-1 text-3xl font-semibold text-pine-900">{sailboats.length}</p>
              </ClickableCard>
            )}
            <ClickableCard to={searchPath(searchId, '/listings?status=interested')}>
              <p className="text-sm text-pine-600">Interested</p>
              <p className="mt-1 text-3xl font-semibold text-pine-900">{interestedListings.length}</p>
            </ClickableCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {homeMode && (
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
            )}

            <Card className={homeMode ? undefined : 'lg:col-span-2'}>
              <h2 className="text-lg font-medium text-pine-900">
                {boatMode ? 'Recent boats' : 'Recent listings'}
              </h2>
              {listings.length === 0 ? (
                <p className="mt-3 text-sm text-pine-600">
                  {boatMode ? 'No boats yet.' : 'No listings yet.'}
                </p>
              ) : (
                <ul className="mt-4 space-y-1">
                  {listings.slice(0, 6).map((listing) => (
                    <li key={listing.id}>
                      <ClickableRow to={searchPath(searchId, `/listings/${listing.id}`)}>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-pine-800">
                              {listingTitle(listing, boatMode)}
                            </p>
                            {homeMode && <ListingStaleBadge listing={listing} />}
                          </div>
                          <p className="text-xs text-pine-500">
                            {listingSubtitle(listing, boatMode)}
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
                    <ClickableRow to={searchPath(searchId, `/listings/${drop.listingId}`)} stackOnMobile>
                      <div>
                        <p className="font-medium text-pine-800">
                          {drop.address || 'Untitled listing'}
                        </p>
                        <p className="text-xs text-pine-500">
                          {drop.region?.name ? `${drop.region.name} · ` : ''}
                          {new Date(drop.droppedAt).toLocaleDateString()}
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
