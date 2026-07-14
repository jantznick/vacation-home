import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
import useCurrentSearch from '../hooks/useCurrentSearch';
import Card from '../components/Card';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ConfirmModal from '../components/ConfirmModal';
import Comments from '../components/Comments';
import PriceHistory from '../components/PriceHistory';
import PhotoGallery from '../components/PhotoGallery';
import PriceEstimate from '../components/PriceEstimate';
import LocationDriveTime from '../components/LocationDriveTime';
import RouteMap from '../components/RouteMap';
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
import { BOAT_PROPULSIONS, isBoatSearch } from '../lib/assetTypes';

function boatTitle(listing) {
  const name = [listing.make, listing.model].filter(Boolean).join(' ');
  if (name) return name;
  if (listing.lengthFt) return `${listing.lengthFt} ft boat`;
  return listing.address || 'Untitled boat';
}

function propulsionLabel(value) {
  return BOAT_PROPULSIONS.find((option) => option.value === value)?.label || value;
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

    try {
      const data = await api.listings.refresh(id);
      setListing((current) => ({
        ...current,
        ...data.listing,
        region: data.listing.region ?? current?.region,
        lake: data.listing.lake ?? current?.lake,
      }));

      if (data.priceChanged) {
        const snapshotData = await api.listings.snapshots(id);
        setSnapshots(snapshotData.snapshots);
        showSuccess('Listing refreshed — price updated.');
      } else {
        showSuccess('Listing refreshed.');
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

  const title = boatMode ? boatTitle(listing) : (listing.address || 'Untitled listing');
  const description = boatMode
    ? [listing.city, listing.state].filter(Boolean).join(', ')
    : [listing.city, listing.state, listing.zip].filter(Boolean).join(', ');

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={canEdit ? (
          <>
            {listing.canRefresh && (
              <Button variant="secondary" onClick={handleRefresh} disabled={refreshing}>
                {refreshing
                  ? 'Refreshing...'
                  : boatMode
                    ? 'Refresh from YachtWorld'
                    : 'Refresh from Zillow'}
              </Button>
            )}
            <Link to={searchPath(searchId, `/listings/${id}/edit`)}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button variant="danger" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </Button>
          </>
        ) : undefined}
      />

      {error && (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {listing.isSoldComp && (
        <p className="mb-4 rounded-md border-2 border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          <span className="mr-2 inline-block rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Sold
          </span>
          Hidden from your active research list
          {listing.soldPrice != null ? ` · sold for ${formatCurrency(listing.soldPrice)}` : ''}.
          Still used for price comparisons.
        </p>
      )}

      {listing.canRefresh && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-pine-600">
          <ListingStaleBadge listing={listing} />
          {listing.fetchedAt ? (
            <span>Last refreshed {formatFetchedAt(listing.fetchedAt)}</span>
          ) : (
            <span>
              Not refreshed from {boatMode ? 'YachtWorld' : 'Zillow'} yet
            </span>
          )}
        </div>
      )}

      {listing.photoUrls?.length > 0 && (
        <div className="mb-6">
          <PhotoGallery photoUrls={listing.photoUrls} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PriceEstimate data={priceEstimate} />

          <Card>
            <h2 className="text-lg font-medium text-pine-900">Overview</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">Status</dt>
                <dd className="text-sm text-pine-900">{statusLabel(listing.status, LISTING_STATUSES)}</dd>
              </div>
              {!boatMode && listing.regionId && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Region</dt>
                  <dd className="text-sm text-pine-900">
                    <Link to={searchPath(searchId, `/regions/${listing.regionId}`)} className="text-pine-700 hover:text-pine-900">
                      {listing.region?.name || 'Unknown region'}
                    </Link>
                  </dd>
                </div>
              )}
              {!boatMode && listing.lake && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Lake</dt>
                  <dd className="text-sm text-pine-900">{listing.lake.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">
                  {listing.isSoldComp ? 'Sold price' : 'List price'}
                </dt>
                <dd className="text-sm font-medium text-pine-900">
                  {formatCurrency(
                    listing.isSoldComp
                      ? (listing.soldPrice ?? listing.listPrice)
                      : listing.listPrice,
                  )}
                </dd>
              </div>
              {listing.isSoldComp && listing.listPrice != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Last list price</dt>
                  <dd className="text-sm text-pine-900">{formatCurrency(listing.listPrice)}</dd>
                </div>
              )}
              {boatMode ? (
                <>
                  {(listing.make || listing.model) && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Make / model</dt>
                      <dd className="text-sm text-pine-900">
                        {[listing.make, listing.model].filter(Boolean).join(' ')}
                      </dd>
                    </div>
                  )}
                  {listing.lengthFt != null && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Length</dt>
                      <dd className="text-sm text-pine-900">
                        {listing.lengthFt} ft
                        {listing.pricePerFoot ? ` · ${formatCurrency(listing.pricePerFoot)}/ft` : ''}
                      </dd>
                    </div>
                  )}
                  {listing.propulsion && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Propulsion</dt>
                      <dd className="text-sm text-pine-900">{propulsionLabel(listing.propulsion)}</dd>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-pine-500">Type</dt>
                    <dd className="text-sm text-pine-900">
                      {listing.isVacantLot ? 'Vacant lot' : 'With home'}
                      {listing.waterfront ? ' · Waterfront' : ''}
                    </dd>
                  </div>
                  {listing.acres != null && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Acres</dt>
                      <dd className="text-sm text-pine-900">
                        {listing.acres}
                        {listing.pricePerAcre ? ` · ${formatCurrency(listing.pricePerAcre)}/acre` : ''}
                      </dd>
                    </div>
                  )}
                  {listing.sqftLiving != null && !listing.isVacantLot && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Living sqft</dt>
                      <dd className="text-sm text-pine-900">
                        {formatNumber(listing.sqftLiving)}
                        {listing.pricePerSqft ? ` · ${formatCurrency(listing.pricePerSqft)}/sqft` : ''}
                      </dd>
                    </div>
                  )}
                  {listing.bedrooms != null && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Bedrooms</dt>
                      <dd className="text-sm text-pine-900">{listing.bedrooms}</dd>
                    </div>
                  )}
                  {listing.bathrooms != null && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-pine-500">Bathrooms</dt>
                      <dd className="text-sm text-pine-900">{listing.bathrooms}</dd>
                    </div>
                  )}
                </>
              )}
              {listing.yearBuilt != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Year built</dt>
                  <dd className="text-sm text-pine-900">{listing.yearBuilt}</dd>
                </div>
              )}
              {listing.interestLevel != null && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Interest</dt>
                  <dd className="text-sm text-pine-900">{listing.interestLevel}/5</dd>
                </div>
              )}
            </dl>

            {listing.pros && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Pros</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{listing.pros}</p>
              </div>
            )}
            {listing.cons && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Cons</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{listing.cons}</p>
              </div>
            )}
            {listing.notes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">Notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{listing.notes}</p>
              </div>
            )}
            {listing.visitNotes && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-pine-800">
                  {boatMode ? 'Inspection notes' : 'Visit notes'}
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{listing.visitNotes}</p>
              </div>
            )}
          </Card>

          {snapshots.length > 0 && (
            <PriceHistory snapshots={snapshots} />
          )}
        </div>

        <div className="space-y-6">
          {(!boatMode || listingAddressLine || listing.latitude != null || listing.city || listing.state) && (
            <Card className="h-fit">
              <h2 className="text-lg font-medium text-pine-900">Location</h2>
              <div className="mt-4">
                <LocationDriveTime
                  locationLabel={boatMode ? 'Boat location' : 'Property'}
                  addressLine={listingAddressLine}
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
                <div className="mt-4 border-t border-pine-100 pt-4">
                  <h3 className="text-sm font-medium text-pine-800">Drive times from your locations</h3>
                  <ul className="mt-3 space-y-2">
                    {commutes.map((commute) => (
                      <li
                        key={commute.poiId}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-pine-800">
                          {commute.poi.label}
                          {commute.poi.isPrimary && (
                            <span className="ml-2 rounded bg-pine-100 px-1.5 py-0.5 text-xs text-pine-600">
                              Primary
                            </span>
                          )}
                        </span>
                        <span className="text-pine-600">
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
                </div>
              )}
            </Card>
          )}

          <Card className="h-fit">
            <h2 className="text-lg font-medium text-pine-900">Source</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {listing.sourceUrl && (
                <div>
                  <dd className="mt-1 break-all">
                    <a
                      href={listing.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-pine-700 hover:text-pine-900"
                    >
                      View on {listing.sourceSite || 'source'}
                    </a>
                  </dd>
                </div>
              )}
              {listing.mlsNumber && (
                <div>
                  <dt className="text-pine-500">{isBoatSearch(assetType) ? 'YachtWorld ID' : 'MLS'}</dt>
                  <dd className="text-pine-900">{listing.mlsNumber}</dd>
                </div>
              )}
              {listing.daysOnMarket != null && (
                <div>
                  <dt className="text-pine-500">Days on market</dt>
                  <dd className="text-pine-900">{listing.daysOnMarket}</dd>
                </div>
              )}
              {!listing.sourceUrl && !listing.mlsNumber && listing.daysOnMarket == null && (
                <p className="text-pine-600">No source details yet.</p>
              )}
            </dl>
          </Card>

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
