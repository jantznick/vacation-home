import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSearchAPI, searchPath, useSearchId } from '../hooks/useSearch';
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

export default function ListingDetail() {
  const { id } = useParams();
  const searchId = useSearchId();
  const api = useSearchAPI();
  const navigate = useNavigate();
  const location = useLocation();
  const { canEdit } = useSearchAccess();
  const [listing, setListing] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [commutes, setCommutes] = useState([]);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [pricingNotice, setPricingNotice] = useState(location.state?.pricingNotice || null);
  const [locationError, setLocationError] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [calculatingDriveTime, setCalculatingDriveTime] = useState(false);
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

  useEffect(() => {
    if (!location.state?.pricingNotice) return;
    setPricingNotice(location.state.pricingNotice);
    navigate(location.pathname, { replace: true, state: {} });
  }, [location, navigate]);

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

  if (loading) {
    return <p className="text-pine-600">Loading listing...</p>;
  }

  if (!listing) {
    return <p className="text-red-700">{error || 'Listing not found'}</p>;
  }

  return (
    <div>
      <PageHeader
        title={listing.address || 'Untitled listing'}
        description={[listing.city, listing.state, listing.zip].filter(Boolean).join(', ')}
        actions={canEdit ? (
          <>
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

      {pricingNotice && (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {pricingNotice}
        </p>
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
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">Region</dt>
                <dd className="text-sm text-pine-900">
                  <Link to={searchPath(searchId, `/regions/${listing.regionId}`)} className="text-pine-700 hover:text-pine-900">
                    {listing.region?.name}
                  </Link>
                </dd>
              </div>
              {listing.lake && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-pine-500">Lake</dt>
                  <dd className="text-sm text-pine-900">{listing.lake.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wide text-pine-500">List price</dt>
                <dd className="text-sm font-medium text-pine-900">{formatCurrency(listing.listPrice)}</dd>
              </div>
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
                <h3 className="text-sm font-medium text-pine-800">Visit notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-pine-700">{listing.visitNotes}</p>
              </div>
            )}
          </Card>

          {snapshots.length > 0 && (
            <PriceHistory snapshots={snapshots} />
          )}
        </div>

        <div className="space-y-6">
          <Card className="h-fit">
            <h2 className="text-lg font-medium text-pine-900">Location</h2>
            <div className="mt-4">
              <LocationDriveTime
                locationLabel="Property"
                addressLine={listingAddressLine}
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
                  destinationLabel={listing.address || 'Listing'}
                  destinationSublabel={listingAddressLine}
                  destinationHref={searchPath(searchId, `/listings/${listing.id}`)}
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

          <Card className="h-fit">
            <h2 className="text-lg font-medium text-pine-900">Source</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {listing.sourceUrl && (
                <div>
                  <dt className="text-pine-500">Listing URL</dt>
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
                  <dt className="text-pine-500">MLS</dt>
                  <dd className="text-pine-900">{listing.mlsNumber}</dd>
                </div>
              )}
              {listing.daysOnMarket != null && (
                <div>
                  <dt className="text-pine-500">Days on market</dt>
                  <dd className="text-pine-900">{listing.daysOnMarket}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Comments targetType="listing" targetId={listing.id} />
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Delete listing"
          message={`Delete ${listing.address || 'this listing'}?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          loading={deleting}
          loadingLabel="Deleting..."
        />
      )}
    </div>
  );
}